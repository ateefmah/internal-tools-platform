from sqlalchemy.orm import Session

from .models import AuditEvent


def log(db: Session, actor: str, app: str, action: str,
        entity_type: str = "", entity_id="", detail: str = ""):
    db.add(AuditEvent(
        actor=actor, app=app, action=action,
        entity_type=entity_type, entity_id=str(entity_id), detail=detail,
    ))
    db.commit()
