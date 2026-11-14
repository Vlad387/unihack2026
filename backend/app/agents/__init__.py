"""AI agents (owner: Bordos, role A). Pure functions: no DB, no FastAPI, no imports from clustering/.

intake, mediate, critic, name_camps and proxy are real (Gemini); docs in the repo root README.md.
Every agent raises app.agents.gemini.AgentError when Gemini fails.
"""

from app.agents.critic_agent import critic
from app.agents.gemini import AgentError
from app.agents.intake_agent import intake
from app.agents.mediate_agent import mediate
from app.agents.naming_agent import name_camps
from app.agents.proxy_agent import proxy

__all__ = ["AgentError", "critic", "intake", "mediate", "name_camps", "proxy"]
