"""AI agents (owner: Bordos, role A). Pure functions: no DB, no FastAPI, no imports from clustering/.

intake is real (Gemini). mediate and critic are still STUBS with the contract signatures.
Every real agent raises app.agents.gemini.AgentError when Gemini fails.
"""

import uuid

from app.agents.gemini import AgentError
from app.agents.intake_agent import intake
from app.schemas import Camp, CampTradeoff, Proposal, ProxyOpinion, Statement, Verdict

__all__ = ["AgentError", "critic", "intake", "mediate"]


def mediate(
    camps: list[Camp],
    bridges: list[Statement],
    critiques: list[str],
    proxies: list[ProxyOpinion],
) -> Proposal:
    return Proposal(
        id=f"p-{uuid.uuid4().hex[:8]}",
        # the API sets the real round number
        round=1,
        text=(
            "Terasele închid la 00:00 în zilele lucrătoare și la 02:00 în weekend, "
            "cu autobuze de noapte și patrule în weekend."
        ),
        tradeoffs=[
            CampTradeoff(
                camp_id=c.id,
                gains="Program clar și previzibil.",
                gives_up="Renunță la o parte din ce și-a dorit inițial.",
            )
            for c in camps
        ],
    )


def critic(proposal: Proposal, camps: list[Camp]) -> Verdict:
    return Verdict(
        faithful=True,
        balanced=len(proposal.tradeoffs) == len(camps),
        feasible=True,
        notes="Verdict simulat (stub): propunerea pare echilibrată.",
    )
