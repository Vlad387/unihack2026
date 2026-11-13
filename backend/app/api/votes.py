from fastapi import APIRouter, HTTPException, Response, status

from app import db
from app.api.live import live
from app.api.models import StatementRow, VoteRow
from app.schemas import Vote

router = APIRouter(tags=["votes"])


@router.post("/votes", status_code=status.HTTP_204_NO_CONTENT)
def cast_vote(vote: Vote) -> Response:
    """Voting again on the same statement overwrites the earlier vote."""
    with db.SessionLocal() as s:
        st = s.get(StatementRow, vote.statement_id)
        if st is None or st.flag is not None:
            raise HTTPException(404, "statement not found")
        s.merge(
            VoteRow(
                participant_id=vote.participant_id,
                statement_id=vote.statement_id,
                value=vote.value,
            )
        )
        s.commit()
    live.notify()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
