import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app import db
from app.api.auth import require_organizer
from app.api.live import live
from app.api.models import ResponseRow

router = APIRouter(tags=["responses"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024


class ResponseAccepted(BaseModel):
    id: str
    status: str


@router.post(
    "/responses",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ResponseAccepted,
)
async def create_response(
    participant_id: Annotated[str, Form(min_length=1)],
    text: Annotated[str | None, Form()] = None,
    neighborhood: Annotated[str | None, Form()] = None,
    age: Annotated[int | None, Form(ge=10, le=120)] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> ResponseAccepted:
    """Multipart form. Saved first, intake runs in the background (202 Accepted)."""
    text = text.strip() if text and text.strip() else None
    data = await audio.read() if audio else None
    if not text and not data:
        raise HTTPException(422, "send text or audio")
    if data and len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "audio larger than 10 MB")

    row = ResponseRow(
        id=f"r-{uuid.uuid4().hex[:12]}",
        participant_id=participant_id,
        text=text,
        audio=data or None,
        neighborhood=neighborhood or None,
        age=age,
    )
    with db.SessionLocal() as s:
        s.add(row)
        s.commit()
    live.new_response()
    return ResponseAccepted(id=row.id, status="pending")


class ResponseStats(BaseModel):
    pending: int
    failed: int
    done: int


def _stats() -> ResponseStats:
    with db.SessionLocal() as s:
        counts = dict(
            s.execute(
                select(ResponseRow.status, func.count()).group_by(ResponseRow.status)
            ).all()
        )
    return ResponseStats(
        pending=counts.get("pending", 0),
        failed=counts.get("failed", 0),
        done=counts.get("done", 0),
    )


@router.get(
    "/responses/stats",
    response_model=ResponseStats,
    dependencies=[Depends(require_organizer)],
)
def response_stats() -> ResponseStats:
    """Organizer: how many answers are still waiting for intake, failed or done."""
    return _stats()


@router.post(
    "/responses/retry",
    response_model=ResponseStats,
    dependencies=[Depends(require_organizer)],
)
def retry_failed() -> ResponseStats:
    """Organizer: Gemini works again -> retry every waiting/failed answer right now."""
    live.retry_failed_now()
    return _stats()
