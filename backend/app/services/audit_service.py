"""
Audit service — writes every mutating action to audit_logs.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    staff_id: uuid.UUID | None,
    action: str,
    entity: str | None = None,
    entity_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        staff_id=staff_id,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id else None,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(entry)
    await db.commit()
