from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .core import audit
from .core.db import engine, get_db
from .core.models import AuditEvent, FeatureFlag, KycCase, Refund, User
from .core.security import (
    COOKIE, RedirectToLogin, clear_session, require_role, require_user,
    set_session, signer, verify_password,
)
from .core.seed import seed

HIGH_VALUE_REFUND_CENTS = 50_000  # $500 requires lead approval

app = FastAPI(title="InternalOps Platform")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


@app.exception_handler(RedirectToLogin)
async def login_redirect(request, exc):
    return RedirectResponse("/login", status_code=303)


@app.exception_handler(401)
async def unauthorized(request, exc):
    return RedirectResponse("/login", status_code=303)


@app.on_event("startup")
def startup():
    seed()


def page(request: Request, name: str, user: User, **ctx):
    return templates.TemplateResponse(request, name, {
        "user": user, "active": ctx.pop("active", ""), **ctx,
    })


# ---------- auth ----------

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html", {"error": None})


@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...),
          db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(request, "login.html", {
            "error": "Invalid email or password",
        }, status_code=401)
    resp = RedirectResponse("/", status_code=303)
    set_session(resp, user)
    audit.log(db, user.email, "auth", "login")
    return resp


@app.post("/logout")
def logout(db: Session = Depends(get_db), user: User = Depends(require_user)):
    resp = RedirectResponse("/login", status_code=303)
    clear_session(resp)
    audit.log(db, user.email, "auth", "logout")
    return resp


@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db), user: User = Depends(require_user)):
    return page(request, "home.html", user, active="home",
                pending_kyc=db.query(KycCase).filter(KycCase.status.in_(["pending", "awaiting_second_review"])).count(),
                pending_refunds=db.query(Refund).filter(Refund.status == "pending").count(),
                flags_on=db.query(FeatureFlag).filter(FeatureFlag.enabled.is_(True)).count(),
                flags_total=db.query(FeatureFlag).count())


# ---------- app 1: KYC review queue ----------

@app.get("/apps/kyc", response_class=HTMLResponse)
def kyc_queue(request: Request, status: str = "", risk: str = "",
              db: Session = Depends(get_db), user: User = Depends(require_user)):
    q = db.query(KycCase).order_by(KycCase.submitted_at.desc())
    if status:
        q = q.filter(KycCase.status == status)
    if risk:
        q = q.filter(KycCase.risk_level == risk)
    return page(request, "kyc/list.html", user, active="kyc",
                cases=q.all(), status=status, risk=risk)


@app.get("/apps/kyc/{case_id}", response_class=HTMLResponse)
def kyc_detail(case_id: int, request: Request,
               db: Session = Depends(get_db), user: User = Depends(require_user)):
    case = db.get(KycCase, case_id)
    if not case:
        return RedirectResponse("/apps/kyc", status_code=303)
    return page(request, "kyc/detail.html", user, active="kyc", case=case)


@app.post("/apps/kyc/{case_id}/decide")
def kyc_decide(case_id: int, decision: str = Form(...), note: str = Form(""),
               db: Session = Depends(get_db), user: User = Depends(require_user)):
    case = db.get(KycCase, case_id)
    if not case or decision not in ("approve", "reject"):
        return RedirectResponse("/apps/kyc", status_code=303)
    if case.status in ("approved", "rejected"):
        return RedirectResponse(f"/apps/kyc/{case_id}", status_code=303)

    needs_dual = case.risk_level == "high"
    # Maker-checker: high-risk cases need sign-off from a *different* user.
    if needs_dual and case.status != "awaiting_second_review":
        case.status = "awaiting_second_review"
        case.first_decision_by = user.email
        case.first_decision = decision
        case.decision_note = note
        db.commit()
        audit.log(db, user.email, "kyc", "first_review", "kyc_case", case_id,
                  f"{decision} on high-risk case; awaiting second review")
    elif needs_dual and case.first_decision_by == user.email:
        return RedirectResponse(f"/apps/kyc/{case_id}?error=self_approval", status_code=303)
    else:
        case.status = "approved" if decision == "approve" else "rejected"
        case.decided_by = user.email
        case.decision_note = note
        case.decided_at = datetime.now(timezone.utc)
        db.commit()
        audit.log(db, user.email, "kyc", "final_decision", "kyc_case", case_id,
                  f"{decision} ({'second review' if needs_dual else 'single review'})")
    return RedirectResponse(f"/apps/kyc/{case_id}", status_code=303)


# ---------- app 2: refunds dashboard ----------

@app.get("/apps/refunds", response_class=HTMLResponse)
def refunds_list(request: Request, status: str = "",
                 db: Session = Depends(get_db), user: User = Depends(require_user)):
    q = db.query(Refund).order_by(Refund.requested_at.desc())
    if status:
        q = q.filter(Refund.status == status)
    refunds = q.all()
    pending_total = sum(r.amount_cents for r in refunds if r.status == "pending")
    return page(request, "refunds/list.html", user, active="refunds",
                refunds=refunds, status=status, pending_total=pending_total,
                threshold=HIGH_VALUE_REFUND_CENTS)


@app.post("/apps/refunds/{refund_id}/decide")
def refund_decide(refund_id: int, request: Request, decision: str = Form(...),
                  note: str = Form(""), db: Session = Depends(get_db),
                  user: User = Depends(require_user)):
    refund = db.get(Refund, refund_id)
    if not refund or decision not in ("approve", "deny") or refund.status != "pending":
        return RedirectResponse("/apps/refunds", status_code=303)
    if refund.amount_cents >= HIGH_VALUE_REFUND_CENTS and user.role == "agent":
        return RedirectResponse(f"/apps/refunds?error=highvalue", status_code=303)
    refund.status = "approved" if decision == "approve" else "denied"
    refund.decided_by = user.email
    refund.decision_note = note
    refund.decided_at = datetime.now(timezone.utc)
    db.commit()
    audit.log(db, user.email, "refunds", "decision", "refund", refund_id,
              f"{decision} ${refund.amount_cents/100:.2f}")
    return RedirectResponse("/apps/refunds", status_code=303)


# ---------- app 3: feature-flag admin ----------

@app.get("/apps/flags", response_class=HTMLResponse)
def flags_list(request: Request, db: Session = Depends(get_db),
               user: User = Depends(require_user)):
    flags = db.query(FeatureFlag).order_by(FeatureFlag.key).all()
    return page(request, "flags/list.html", user, active="flags", flags=flags)


@app.post("/apps/flags/{flag_id}/toggle")
def flag_toggle(flag_id: int, db: Session = Depends(get_db),
                user: User = Depends(require_role("lead"))):
    flag = db.get(FeatureFlag, flag_id)
    if not flag:
        return RedirectResponse("/apps/flags", status_code=303)
    flag.enabled = not flag.enabled
    flag.updated_by = user.email
    flag.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit.log(db, user.email, "flags", "toggle", "feature_flag", flag.key,
              f"enabled={flag.enabled}")
    return RedirectResponse("/apps/flags", status_code=303)


@app.post("/apps/flags/new")
def flag_new(key: str = Form(...), description: str = Form(""),
             db: Session = Depends(get_db), user: User = Depends(require_role("lead"))):
    key = key.strip().lower().replace(" ", "_")
    if key and not db.query(FeatureFlag).filter(FeatureFlag.key == key).first():
        db.add(FeatureFlag(key=key, description=description.strip(), enabled=False,
                           updated_by=user.email, updated_at=datetime.now(timezone.utc)))
        db.commit()
        audit.log(db, user.email, "flags", "create", "feature_flag", key)
    return RedirectResponse("/apps/flags", status_code=303)


# ---------- audit log ----------

@app.get("/audit", response_class=HTMLResponse)
def audit_log(request: Request, db: Session = Depends(get_db),
              user: User = Depends(require_role("lead"))):
    events = db.query(AuditEvent).order_by(AuditEvent.ts.desc()).limit(200).all()
    return page(request, "audit.html", user, active="audit", events=events)
