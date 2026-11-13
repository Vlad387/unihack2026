import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app import db
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
