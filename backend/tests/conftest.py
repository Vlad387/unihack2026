import json

import pytest

from app.agents import intake_agent, mediate_agent


@pytest.fixture(autouse=True)
def fake_gemini(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Tests never call the real Gemini API: offline, free, deterministic.

    One fake per agent, mimicking the shape of a real answer. Each call is recorded
    so tests can check what the agent sent.
    Live checks: `uv run python -m app.agents.demo_intake` / `demo_mediate`.
    """
    calls: list[dict] = []

    def record(model, system, contents):
        calls.append({"model": model, "system": system, "contents": contents})

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

    monkeypatch.setattr(intake_agent, "generate", fake_intake)
    monkeypatch.setattr(mediate_agent, "generate", fake_mediate)
    return calls
