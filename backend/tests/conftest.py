import json

import pytest

from app.agents import (
    critic_agent,
    intake_agent,
    mediate_agent,
    naming_agent,
    proxy_agent,
)


class GeminiCalls(list):
    """intake and mediate calls, in order. critic, naming and proxy calls go to
    `.critic` / `.naming` / `.proxy` instead: the API runs them around mediate and on map updates, and tests
    read fake_gemini[-1] as the mediate call (tests/test_proposals.py)."""

    def __init__(self) -> None:
        super().__init__()
        self.critic: list[dict] = []
        self.naming: list[dict] = []
        self.proxy: list[dict] = []


@pytest.fixture(autouse=True)
def fake_gemini(monkeypatch: pytest.MonkeyPatch) -> GeminiCalls:
    """Tests never call the real Gemini API: offline, free, deterministic.

    One fake per agent, mimicking the shape of a real answer. Each call is recorded
    so tests can check what the agent sent.
    Live checks: `uv run python -m app.agents.demo_intake` / `demo_mediate` / `demo_critic`.
    """
    calls = GeminiCalls()

    def record(model, system, contents, into: list[dict] = calls):
        into.append({"model": model, "system": system, "contents": contents})

    def fake_intake(model, system, contents, schema, **_):
        record(model, system, contents)
        text = next((c for c in contents if isinstance(c, str)), "Zgomot noaptea.")
        text = text.split("\n", 1)[-1]
        parts = [p.strip() for p in text.split(".") if p.strip()]
        return schema(statements=[{"text": p + ".", "flag": "none"} for p in parts])

    def fake_mediate(model, system, contents, schema, **_):
        record(model, system, contents)
        camps = json.loads(contents[0])["camps"]
        return schema(
            text="Terasele închid la 23, interiorul la 02 în weekend.",
            tradeoffs=[
                {"camp_id": c["id"], "gains": "Câștigă ceva.", "gives_up": "Cedează."}
                for c in camps
            ],
        )

    def fake_critic(model, system, contents, schema, **_):
        record(model, system, contents, into=calls.critic)
        return schema(
            faithful=True, balanced=True, feasible=True, notes="Verdict de test."
        )

    def fake_naming(model, system, contents, schema, **_):
        record(model, system, contents, into=calls.naming)
        camps = json.loads(contents[0])["camps"]
        return schema(
            camps=[
                {
                    "camp_id": c["id"],
                    "name": f"Nume {c['id']}",
                    "description": "Descriere de test.",
                }
                for c in camps
            ]
        )

    def fake_proxy(model, system, contents, schema, **_):
        record(model, system, contents, into=calls.proxy)
        sent = json.loads(contents[0])
        groups = sent["groups"] or ["Părinți cu copii mici"]
        return schema(
            voices=[
                {"group": g, "text": "Noi am avea nevoie de liniște."} for g in groups
            ]
        )

    monkeypatch.setattr(intake_agent, "generate", fake_intake)
    monkeypatch.setattr(mediate_agent, "generate", fake_mediate)
    monkeypatch.setattr(critic_agent, "generate", fake_critic)
    monkeypatch.setattr(naming_agent, "generate", fake_naming)
    monkeypatch.setattr(proxy_agent, "generate", fake_proxy)
    return calls
