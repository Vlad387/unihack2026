import json

import pytest

from app.agents import proxy
from app.schemas import Camp, ProxyOpinion, Statement
from tests.conftest import GeminiCalls

QUESTION = "Ce facem cu viața de noapte din centru?"


def _camps() -> list[Camp]:
    return [
        Camp(
            id="c1",
            name="Liniște pentru locuitori",
            description="Vor program redus.",
            size=1,
            member_ids=["ana"],
            statements=[
                Statement(id="s1", text="Terasele să închidă la 23.", author_id="ana")
            ],
        )
    ]


def test_organizer_groups_are_sent_and_every_voice_is_simulated(
    fake_gemini: GeminiCalls,
) -> None:
    voices = proxy(QUESTION, _camps(), ["Lucrători în ture de noapte", "  "])

    assert [v.group for v in voices] == ["Lucrători în ture de noapte"]
    assert all(isinstance(v, ProxyOpinion) and v.simulated for v in voices)
    sent = json.loads(fake_gemini.proxy[0]["contents"][0])
    assert sent["question"] == QUESTION
    assert sent["groups"] == ["Lucrători în ture de noapte"]
    assert sent["camps"][0]["arguments"] == ["Terasele să închidă la 23."]
    # proxy never pollutes the mediate call list that other tests read
    assert list(fake_gemini) == []


def test_without_groups_gemini_picks_them(fake_gemini: GeminiCalls) -> None:
    voices = proxy(QUESTION, _camps())
    assert [v.group for v in voices] == ["Părinți cu copii mici"]
    assert json.loads(fake_gemini.proxy[0]["contents"][0])["max_groups"] == 2


def test_zero_groups_requested_skips_gemini(fake_gemini: GeminiCalls) -> None:
    assert proxy(QUESTION, _camps(), max_groups=0) == []
    assert fake_gemini.proxy == []


def test_empty_duplicate_and_extra_voices_are_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def sloppy(model, system, contents, schema, **_):
        return schema(
            voices=[
                {"group": "Părinți", "text": "Vrem liniște după 22."},
                {"group": "părinți", "text": "Repetat."},
                {"group": "", "text": "Fără grup."},
                {"group": "Curieri", "text": "  "},
                {"group": "Turiști", "text": "Vrem transport noaptea."},
                {"group": "Prea mulți", "text": "Peste limită."},
            ]
        )

    monkeypatch.setattr("app.agents.proxy_agent.generate", sloppy)
    voices = proxy(QUESTION, _camps(), max_groups=2)
    assert [v.group for v in voices] == ["Părinți", "Turiști"]


def test_never_more_than_three_voices(monkeypatch: pytest.MonkeyPatch) -> None:
    def many(model, system, contents, schema, **_):
        assert json.loads(contents[0])["max_groups"] == 3
        return schema(voices=[{"group": f"G{i}", "text": "t"} for i in range(5)])

    monkeypatch.setattr("app.agents.proxy_agent.generate", many)
    assert len(proxy(QUESTION, _camps(), [f"G{i}" for i in range(5)])) == 3
