from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from .db import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # agent | lead | admin
    password_hash = Column(String, nullable=False)


class KycCase(Base):
    __tablename__ = "kyc_cases"

    id = Column(Integer, primary_key=True)
    customer_name = Column(String, nullable=False)
    customer_ref = Column(String, nullable=False)
    country = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)  # low | medium | high
    status = Column(String, nullable=False, default="pending")
    # pending | awaiting_second_review | approved | rejected
    docs_summary = Column(Text, default="")
    submitted_at = Column(DateTime, default=utcnow)
    first_decision_by = Column(String)
    first_decision = Column(String)
    decided_by = Column(String)
    decision_note = Column(Text, default="")
    decided_at = Column(DateTime)


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True)
    customer_name = Column(String, nullable=False)
    customer_ref = Column(String, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, default="USD")
    reason = Column(String, default="")
    status = Column(String, nullable=False, default="pending")  # pending | approved | denied
    requested_at = Column(DateTime, default=utcnow)
    decided_by = Column(String)
    decision_note = Column(Text, default="")
    decided_at = Column(DateTime)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    description = Column(String, default="")
    enabled = Column(Boolean, default=False)
    updated_by = Column(String)
    updated_at = Column(DateTime)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True)
    ts = Column(DateTime, default=utcnow, index=True)
    actor = Column(String, nullable=False)
    app = Column(String, nullable=False)  # kyc | refunds | flags | auth
    action = Column(String, nullable=False)
    entity_type = Column(String, default="")
    entity_id = Column(String, default="")
    detail = Column(Text, default="")
