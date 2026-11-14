"""POST /chat: the chat assistant. The server builds the context, assist() answers."""

import asyncio
import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException

from app.agents import assist
from app.api.live import live
from app.api.proposals import QUESTION, latest_proposal
from app.schemas import ChatAction, ChatContext, ChatReply, ChatRequest

router = APIRouter(tags=["chat"])
log = logging.getLogger(__name__)

# every chat message is one Gemini call: cap it per participant.
# shortcut: in-memory and keyed by participant_id (client-chosen), so it stops loops and
# casual spam, not a determined attacker; add an IP-based limit if that becomes a problem.
CHAT_PER_MINUTE = 10
_recent: dict[str, deque[float]] = defaultdict(deque)

UNAVAILABLE = ChatReply(
    text="Asistentul nu este disponibil acum. Încearcă din nou în câteva minute.",
    action=ChatAction(type="none"),
)


def _allow(participant_id: str) -> bool:
    now, window = time.monotonic(), _recent[participant_id]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= CHAT_PER_MINUTE:
        return False
    window.append(now)
    return True


@router.post("/chat", response_model=ChatReply)
async def chat(req: ChatRequest) -> ChatReply:
    if not _allow(req.participant_id):
        raise HTTPException(429, "too many messages, wait a minute")
    proposal = await asyncio.to_thread(latest_proposal)
    context = ChatContext(
        question=QUESTION,
        page=req.page,
        round=proposal.round if proposal else None,
        proposal_text=proposal.text if proposal else None,
        # empty for the first seconds after a restart, until the first map is computed
        camp_names=[c.name for c in live.result.camps],
    )
    try:
        return await asyncio.to_thread(assist, req.messages, context)
    # the chat is a helper: a Gemini failure must not break the page
    except Exception:
        log.exception("assist failed")
        return UNAVAILABLE
