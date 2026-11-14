"""Chat assistant agent: a confused citizen's conversation + app state -> one helpful reply.

The reply may suggest ONE next step (a screen, or a draft answer / report). Drafts are
never submitted here: the citizen confirms them in the UI.
"""

import json
from typing import Literal

from pydantic import BaseModel

from app.agents.gemini import ASSIST_MODEL, AgentError, generate, load_prompt
from app.schemas import (
    ChatAction,
    ChatActionType,
    ChatContext,
    ChatMessage,
    ChatReply,
    ReportDraft,
)

# a chat bubble is small: long replies are cut at a sentence end
MAX_REPLY_CHARS = 700
MAX_DRAFT_CHARS = 1000


class _AssistOutput(BaseModel):
    text: str
    action: ChatActionType
    # "" / "none" instead of null: structured output handles plain values more reliably
    prefill: str
    report_kind: Literal["none", "abuse", "personal_data", "bug", "other"]
    report_text: str


def _payload(messages: list[ChatMessage], context: ChatContext) -> str:
    data = {
        "context": context.model_dump(),
        "messages": [{"role": m.role, "text": m.text} for m in messages],
    }
    return json.dumps(data, ensure_ascii=False, indent=1)


def _shorten(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    return cut[: end + 1] if end > limit // 2 else cut.rstrip() + "…"


def assist(messages: list[ChatMessage], context: ChatContext) -> ChatReply:
    """Raises AgentError if Gemini fails or answers nothing: the API sends a fixed reply."""
    if not messages or messages[-1].role != "user":
        raise AgentError("assist needs the conversation to end with a user message")

    out = generate(
        ASSIST_MODEL,
        load_prompt("assist"),
        [_payload(messages, context)],
        _AssistOutput,
        thinking="low",
    )

    text = _shorten(out.text, MAX_REPLY_CHARS)
    if not text:
        raise AgentError("assist returned an empty reply")

    action = out.action
    # there is nothing to vote on before the first round
    if action == "proposal" and context.round is None:
        action = "none"

    prefill = _shorten(out.prefill, MAX_DRAFT_CHARS) if action == "answer" else ""

    report = None
    if action == "report":
        last_user = messages[-1].text
        report = ReportDraft(
            kind="other" if out.report_kind == "none" else out.report_kind,
            # the organizer must always get something readable, even if Gemini left it blank
            text=_shorten(out.report_text or last_user, MAX_DRAFT_CHARS),
        )

    return ChatReply(
        text=text,
        action=ChatAction(type=action, prefill=prefill or None),
        report=report,
    )
