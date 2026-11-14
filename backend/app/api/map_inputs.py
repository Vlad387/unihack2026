"""What the live map is computed from: approved statements, votes, and who said what."""

from sqlalchemy import select

from app import db
from app.api.models import StatementRow, VoteRow
from app.schemas import ClusterResult, Statement, Vote


def load_inputs() -> tuple[list[Statement], list[Vote]]:
    """Approved statements + votes on them. The composite key already keeps one vote
    per (participant, statement), so the 'latest vote wins' rule holds here."""
    with db.SessionLocal() as s:
        rows = s.scalars(
            select(StatementRow)
            .where(StatementRow.flag.is_(None))
            .order_by(StatementRow.created_at)
        ).all()
        approved = {r.id for r in rows}
        votes = [
            Vote.model_validate(
                {
                    "participant_id": v.participant_id,
                    "statement_id": v.statement_id,
                    "value": v.value,
                }
            )
            for v in s.scalars(select(VoteRow))
            if v.statement_id in approved
        ]
        return [r.to_schema() for r in rows], votes


def with_texts(result: ClusterResult, statements: list[Statement]) -> ClusterResult:
    said: dict[str, list[str]] = {}
    for st in statements:
        if st.author_id:
            said.setdefault(st.author_id, []).append(st.text)
    points = [
        p.model_copy(update={"text": " ".join(said[p.participant_id])})
        if p.participant_id in said
        else p
        for p in result.points
    ]
    return result.model_copy(update={"points": points})
