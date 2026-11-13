"""Mediator agent: camps + common ground (+ critiques) -> one compromise Proposal."""

import json
import uuid

from pydantic import BaseModel

from app.agents.gemini import PRO_MODEL, AgentError, generate, load_prompt
from app.schemas import Camp, CampTradeoff, Proposal, ProxyOpinion, Statement

# keeps the prompt small and the latency stable with hundreds of participants
MAX_ARGUMENTS_PER_CAMP = 20


class _Tradeoff(BaseModel):
    camp_id: str
    gains: str
    gives_up: str


class _MediateOutput(BaseModel):
    text: str
    tradeoffs: list[_Tradeoff]


def _arguments(camp: Camp) -> list[str]:
    # A camp's own arguments are what its members wrote, not everything they voted on.
    members = set(camp.member_ids)
    own = [s for s in camp.statements if s.author_id in members and not s.flag]
    return [s.text for s in own[:MAX_ARGUMENTS_PER_CAMP]]


def _payload(
    camps: list[Camp],
    bridges: list[Statement],
    critiques: list[str],
    proxies: list[ProxyOpinion],
) -> str:
    data = {
        "camps": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "size": c.size,
                "arguments": _arguments(c),
            }
            for c in camps
        ],
        "common_ground": [s.text for s in bridges if not s.flag],
        "critiques": [c for c in critiques if c.strip()],
        "simulated_voices": [{"group": p.group, "text": p.text} for p in proxies],
    }
    return json.dumps(data, ensure_ascii=False, indent=1)


def mediate(
    camps: list[Camp],
    bridges: list[Statement],
    critiques: list[str],
    proxies: list[ProxyOpinion],
) -> Proposal:
    """Raises AgentError if Gemini fails or skips a camp: the caller retries later."""
    if not camps:
        raise AgentError("mediate needs at least one camp")

    output = generate(
        PRO_MODEL,
        load_prompt("mediate"),
        [_payload(camps, bridges, critiques, proxies)],
        _MediateOutput,
    )

    by_camp = {t.camp_id: t for t in reversed(output.tradeoffs)}
    missing = [c.id for c in camps if c.id not in by_camp]
    if missing:
        raise AgentError(f"mediate returned no tradeoff for camps {missing}")

    return Proposal(
        id=f"p-{uuid.uuid4().hex[:12]}",
        # the API owns the round counter and overwrites this
        round=1,
        text=output.text.strip(),
        tradeoffs=[
            CampTradeoff(
                camp_id=c.id,
                gains=by_camp[c.id].gains.strip(),
                gives_up=by_camp[c.id].gives_up.strip(),
            )
            for c in camps
        ],
    )
