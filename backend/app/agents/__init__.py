"""AI agents (owner: Bordos, role A). Pure functions: no DB, no FastAPI, no imports from clustering/.

intake, mediate and critic are real (Gemini); docs in README.md next to this file.
Every agent raises app.agents.gemini.AgentError when Gemini fails.
"""

from app.agents.critic_agent import critic
from app.agents.gemini import AgentError
from app.agents.intake_agent import intake
from app.agents.mediate_agent import mediate

__all__ = ["AgentError", "critic", "intake", "mediate"]
