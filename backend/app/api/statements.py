from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app import db
from app.api.models import StatementRow, VoteRow
from app.schemas import Statement

router = APIRouter(tags=["statements"])


@router.get("/statements", response_model=list[Statement])
def statements_to_vote(
    participant_id: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Statement]:
    """Approved statements this participant did not write and has not voted on yet."""
    voted = select(VoteRow.statement_id).where(VoteRow.participant_id == participant_id)
    with db.SessionLocal() as s:
        rows = s.scalars(
            select(StatementRow)
            .where(StatementRow.flag.is_(None))
            .where(StatementRow.author_id != participant_id)
            .where(StatementRow.id.not_in(voted))
            .order_by(StatementRow.created_at)
            .limit(limit)
        ).all()
        return [r.to_schema() for r in rows]
