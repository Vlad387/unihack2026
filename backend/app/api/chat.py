"""POST /chat: the chat assistant. The server builds the context, assist() answers."""

import asyncio
import logging

from fastapi import APIRouter, Request

from app.agents import assist
from app.api.live import live
from app.api.proposals import QUESTION, latest_proposal
from app.api.ratelimit import client_ip, enforce, limit
from app.schemas import ChatAction, ChatContext, ChatReply, ChatRequest

router = APIRouter(tags=["chat"])
log = logging.getLogger(__name__)

# every chat message is one Gemini call. Per participant stops loops; per IP is generous
# because a whole venue Wi-Fi shares one IP; the global cap protects the daily quota.
PER_PARTICIPANT = limit(10)
PER_IP = limit(30)
GLOBAL = limit(60)

UNAVAILABLE = ChatReply(
    text="Asistentul nu este disponibil acum. Încearcă din nou în câteva minute.",
    action=ChatAction(type="none"),
)


@router.post("/chat", response_model=ChatReply)
async def chat(req: ChatRequest, request: Request) -> ChatReply:
    enforce(
        (PER_PARTICIPANT, req.participant_id),
        (PER_IP, client_ip(request)),
        (GLOBAL, "all"),
    )
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
