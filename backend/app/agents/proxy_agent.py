"""Proxy agent: question + camps -> simulated voices of groups that did not take part."""

import json
import logging

from pydantic import BaseModel

from app.agents.gemini import PROXY_MODEL, generate, load_prompt
from app.agents.mediate_agent import camp_arguments
from app.schemas import Camp, ProxyOpinion

log = logging.getLogger(__name__)

# more simulated voices than this would start to drown out the real camps
MAX_VOICES = 3


class _Voice(BaseModel):
    group: str
    text: str


class _ProxyOutput(BaseModel):
    voices: list[_Voice]


def proxy(
    question: str,
    camps: list[Camp],
    groups: list[str] | None = None,
    max_groups: int = 2,
) -> list[ProxyOpinion]:
    """Simulated views of missing groups, ALWAYS simulated=True, never votes.

    groups: the organizer's choice ("Părinți cu copii mici", ...). Empty or None lets
    Gemini pick up to max_groups groups whose concerns the camps did not raise.
    The result goes to mediate(..., proxies) and to the UI, never to cluster/bridges.
    Raises AgentError if Gemini fails: the caller simply runs mediate without proxies.
    """
    wanted = [g.strip() for g in groups or [] if g.strip()]
    limit = min(max(len(wanted), max_groups), MAX_VOICES)
    if limit < 1:
        return []

    payload = {
        "question": question,
        "camps": [
            {
                "name": c.name,
                "description": c.description,
                "size": c.size,
                "arguments": camp_arguments(c),
            }
            for c in camps
        ],
        "groups": wanted,
        "max_groups": limit,
    }
    output = generate(
        PROXY_MODEL,
        load_prompt("proxy"),
        [json.dumps(payload, ensure_ascii=False, indent=1)],
        _ProxyOutput,
        thinking="low",
    )

    voices: list[ProxyOpinion] = []
    seen: set[str] = set()
    for v in output.voices:
        group, text = v.group.strip(), v.text.strip()
        # an empty or repeated group would show as a blank or doubled card in the UI
        if not group or not text or group.casefold() in seen:
            log.warning("proxy dropped an empty or duplicate voice: %r", group)
            continue
        seen.add(group.casefold())
        voices.append(ProxyOpinion(group=group, text=text))
    return voices[:limit]
