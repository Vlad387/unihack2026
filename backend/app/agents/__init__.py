"""AI agents (owner: Bordos, role A). Pure functions: no DB, no FastAPI, no imports from clustering/.

intake and mediate are real (Gemini). critic is still a STUB with the contract signature.
Every real agent raises app.agents.gemini.AgentError when Gemini fails.
"""

from app.agents.gemini import AgentError
from app.agents.intake_agent import intake
from app.agents.mediate_agent import mediate
from app.schemas import Camp, Proposal, Verdict

__all__ = ["AgentError", "critic", "intake", "mediate"]


def critic(proposal: Proposal, camps: list[Camp]) -> Verdict:
    return Verdict(
        faithful=True,
        balanced=len(proposal.tradeoffs) == len(camps),
        feasible=True,
        notes="Verdict simulat (stub): propunerea pare echilibrată.",
    )
