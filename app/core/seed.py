import random
from datetime import timedelta

from .db import Base, SessionLocal, engine
from .models import FeatureFlag, KycCase, Refund, User, utcnow
from .security import make_password_hash

FIRST = ["Amara", "Liam", "Priya", "Diego", "Mei", "Noah", "Fatima", "Ivan",
         "Sofia", "Kenji", "Zara", "Omar", "Ingrid", "Tunde", "Clara", "Ravi"]
LAST = ["Okafor", "Smith", "Sharma", "Garcia", "Chen", "Kim", "Haddad",
        "Petrov", "Rossi", "Tanaka", "Ali", "Ndiaye", "Larsen", "Mbeki", "Dubois", "Patel"]
COUNTRIES = ["US", "GB", "DE", "NG", "BR", "IN", "SG", "CA", "FR", "AE"]
REASONS = ["Duplicate charge", "Service not delivered", "Unauthorized transaction",
           "Subscription cancel refund", "Billing error", "Goodwill adjustment"]

FLAGS = [
    ("checkout_v2", "New checkout flow with saved-payment support", True),
    ("kyc_auto_escalation", "Auto-escalate KYC cases from sanctioned-country list", True),
    ("refund_instant_payout", "Instant payout rail for approved refunds", False),
    ("dark_mode_admin", "Dark mode across internal consoles", False),
    ("risk_model_v3_shadow", "Run v3 risk model in shadow mode alongside v2", True),
    ("beta_virtual_cards", "Virtual card issuance for beta customers", False),
]


def seed():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    if db.query(User).count():
        db.close()
        return

    db.add_all([
        User(email="analyst@fintech.dev", name="Alex Analyst", role="agent",
             password_hash=make_password_hash("password")),
        User(email="lead@fintech.dev", name="Lee Lead", role="lead",
             password_hash=make_password_hash("password")),
        User(email="admin@fintech.dev", name="Ada Admin", role="admin",
             password_hash=make_password_hash("password")),
    ])

    rng = random.Random(42)
    for i in range(14):
        risk = rng.choices(["low", "medium", "high"], weights=[5, 4, 3])[0]
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        db.add(KycCase(
            customer_name=name,
            customer_ref=f"CUST-{10000 + i}",
            country=rng.choice(COUNTRIES),
            risk_level=risk,
            status="pending",
            docs_summary=rng.choice([
                "Passport + utility bill submitted",
                "National ID + bank statement submitted",
                "Driver's license + proof of address submitted",
                "Passport only; proof of address pending",
            ]),
            submitted_at=utcnow() - timedelta(days=rng.randint(0, 9), hours=rng.randint(0, 23)),
        ))

    for i in range(12):
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        db.add(Refund(
            customer_name=name,
            customer_ref=f"CUST-{10000 + i}",
            amount_cents=rng.choice([1899, 4500, 12900, 34900, 78000, 120000, 2599, 64500]),
            currency="USD",
            reason=rng.choice(REASONS),
            status="pending",
            requested_at=utcnow() - timedelta(days=rng.randint(0, 6), hours=rng.randint(0, 23)),
        ))

    for key, desc, enabled in FLAGS:
        db.add(FeatureFlag(key=key, description=desc, enabled=enabled,
                           updated_by="seed", updated_at=utcnow()))

    db.commit()
    db.close()
