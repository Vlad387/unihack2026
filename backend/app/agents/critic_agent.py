"""Critic agent: checks a mediate() Proposal against the camps -> Verdict."""

import json

from app.agents.gemini import CRITIC_MODEL, AgentError, generate, load_prompt
from app.agents.mediate_agent import camp_arguments
from app.schemas import Camp, Proposal, Verdict


def _payload(proposal: Proposal, camps: list[Camp]) -> str:
    names = {c.id: c.name for c in camps}
    data = {
        "proposal": {
            "text": proposal.text,
            "tradeoffs": [
                {
                    "camp": names.get(t.camp_id, t.camp_id),
                    "gains": t.gains,
                    "gives_up": t.gives_up,
                }
                for t in proposal.tradeoffs
            ],
        },
        "camps": [
            {"id": c.id, "name": c.name, "size": c.size, "arguments": camp_arguments(c)}
            for c in camps
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=1)


def critic(proposal: Proposal, camps: list[Camp]) -> Verdict:
    """Raises AgentError if Gemini fails: the API then publishes without a verdict."""
    if not camps:
        raise AgentError("critic needs at least one camp")

    verdict = generate(
        CRITIC_MODEL, load_prompt("critic"), [_payload(proposal, camps)], Verdict
    )
    # A camp with no tradeoff line is unbalanced by definition: don't trust the model on it.
    covered = {t.camp_id for t in proposal.tradeoffs}
    missing = [c.name for c in camps if c.id not in covered]
    if missing:
        note = f"Lipsesc câștigurile și cedările pentru: {', '.join(missing)}."
        verdict = verdict.model_copy(
            update={"balanced": False, "notes": f"{note} {verdict.notes}".strip()}
        )
    return verdict
