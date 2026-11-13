"""Intake agent: one citizen answer (text and/or audio) -> atomic, moderated Statements."""

import uuid
from typing import Literal

from google.genai import types
from pydantic import BaseModel

from app.agents.gemini import FLASH_MODEL, generate, load_prompt
from app.schemas import Statement


class _Item(BaseModel):
    text: str
    # "none" instead of null: structured output handles a plain enum more reliably
    flag: Literal["none", "abuse", "personal_data", "off_topic"]


class _IntakeOutput(BaseModel):
    statements: list[_Item]


def _audio_mime(audio: bytes) -> str:
    # The contract passes raw bytes without a content type, so sniff the container
    # MediaRecorder produced: webm (Chrome/Firefox), mp4 (Safari), or an uploaded file.
    if audio.startswith(b"\x1a\x45\xdf\xa3"):
        return "audio/webm"
    if audio[4:8] == b"ftyp":
        return "audio/mp4"
    if audio.startswith(b"OggS"):
        return "audio/ogg"
    if audio.startswith(b"RIFF"):
        return "audio/wav"
    if audio.startswith(b"ID3") or audio[:2] in (b"\xff\xfb", b"\xff\xf3"):
        return "audio/mpeg"
    return "audio/webm"


def intake(text: str | None, audio: bytes | None) -> list[Statement]:
    """Raises AgentError if Gemini fails: the caller keeps the raw answer and retries."""
    text = text.strip() if text else None
    if not text and not audio:
        return []

    contents: list[types.Part | str] = []
    if audio:
        contents.append(types.Part.from_bytes(data=audio, mime_type=_audio_mime(audio)))
    if text:
        contents.append(f"Răspunsul cetățeanului:\n{text}")

    # splitting + moderation is easy for Flash; low thinking cuts latency ~severalfold
    output = generate(
        FLASH_MODEL, load_prompt("intake"), contents, _IntakeOutput, thinking="low"
    )
    return [
        Statement(
            id=f"s-{uuid.uuid4().hex[:12]}",
            text=item.text.strip(),
            flag=None if item.flag == "none" else item.flag,
        )
        for item in output.statements
        if item.text.strip()
    ]
