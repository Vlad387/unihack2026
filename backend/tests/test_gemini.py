"""The shared Gemini helper: quota fallback and errors, with a fake client (offline)."""

import pytest
from google import genai
from pydantic import BaseModel

from app.agents import AgentError, gemini


class _Out(BaseModel):
    ok: bool


class _Response:
    parsed = _Out(ok=True)
    text = '{"ok": true}'


def _client(fail: dict[str, int], calls: list[str]) -> object:
    """Fake client: models listed in `fail` raise that HTTP code, others answer."""

    class Models:
        @staticmethod
        def generate_content(model: str, **_: object) -> _Response:
            calls.append(model)
            if model in fail:
                raise genai.errors.APIError(fail[model], {"error": {"message": "x"}})
            return _Response()

    class Client:
        models = Models

    return Client


def _generate(monkeypatch: pytest.MonkeyPatch, fail: dict[str, int]) -> list[str]:
    calls: list[str] = []
    monkeypatch.setattr(gemini, "client", lambda: _client(fail, calls))
    gemini.generate("primary", "system", ["x"], _Out)
    return calls


def test_quota_exhausted_falls_back_once(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _generate(monkeypatch, {"primary": 429})
    assert calls == ["primary", gemini.FALLBACK_MODEL]


def test_other_errors_do_not_fall_back(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(AgentError, match="400"):
        _generate(monkeypatch, {"primary": 400})


def test_fallback_also_exhausted_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(AgentError, match=f"{gemini.FALLBACK_MODEL} failed: 429"):
        _generate(monkeypatch, {"primary": 429, gemini.FALLBACK_MODEL: 429})
