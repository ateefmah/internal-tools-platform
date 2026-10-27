import hashlib
import hmac
import os
import secrets

from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, URLSafeSerializer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

SECRET = os.environ.get("SESSION_SECRET", "dev-only-secret-change-me")
signer = URLSafeSerializer(SECRET, salt="internalops-session")
COOKIE = "internalops_session"

ROLE_ORDER = {"agent": 1, "lead": 2, "admin": 3}


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()


def make_password_hash(password: str) -> str:
    salt = secrets.token_hex(8)
    return f"{salt}${hash_password(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), expected)


def set_session(response: RedirectResponse, user: User):
    response.set_cookie(COOKIE, signer.dumps({"uid": user.id}), httponly=True, samesite="lax")


def clear_session(response: RedirectResponse):
    response.delete_cookie(COOKIE)


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE)
    if token:
        try:
            uid = signer.loads(token)["uid"]
        except BadSignature:
            uid = None
        if uid:
            user = db.get(User, uid)
            if user:
                return user
    raise HTTPException(status_code=401)


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    try:
        return current_user(request, db)
    except HTTPException:
        raise RedirectToLogin()


class RedirectToLogin(HTTPException):
    def __init__(self):
        super().__init__(status_code=303, headers={"Location": "/login"})


def require_role(min_role: str):
    def dep(user: User = Depends(require_user)) -> User:
        if ROLE_ORDER[user.role] < ROLE_ORDER[min_role]:
            raise HTTPException(status_code=403, detail=f"Requires {min_role} role")
        return user

    return dep
