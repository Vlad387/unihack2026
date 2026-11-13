import pytest

from app.agents import intake_agent


@pytest.fixture(autouse=True)
def fake_gemini(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Tests never call the real Gemini API: offline, free, deterministic.

    The fake splits text on periods like the old stub. Each call is recorded so tests
    can check what the agent sent. Live checks: `uv run python -m app.agents.demo_intake`.
    """
    calls: list[dict] = []

    def fake_generate(model, system, contents, schema, **_):
        calls.append({"model": model, "system": system, "contents": contents})
        text = next((c for c in contents if isinstance(c, str)), "Zgomot noaptea.")
        text = text.split("\n", 1)[-1]
        parts = [p.strip() for p in text.split(".") if p.strip()]
        return schema(statements=[{"text": p + ".", "flag": "none"} for p in parts])

    monkeypatch.setattr(intake_agent, "generate", fake_generate)
    return calls
