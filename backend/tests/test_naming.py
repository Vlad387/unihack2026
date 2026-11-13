import json

import pytest

from app.agents import name_camps
from app.schemas import Camp, Statement
from tests.conftest import GeminiCalls


def _camp(cid: str, author: str | None) -> Camp:
    statements = (
        [Statement(id=f"s-{cid}", text="Terasele să închidă la 23.", author_id=author)]
        if author
        else []
    )
    return Camp(
        id=cid,
        name=f"Tabăra {cid}",
        description="Participanți cu poziții de vot similare.",
        size=1,
        member_ids=[author or f"voter-{cid}"],
        statements=statements,
    )


def test_names_every_camp_in_one_call_keeping_ids_and_order(
    fake_gemini: GeminiCalls,
) -> None:
    camps = [_camp("c1", "ana"), _camp("c2", "bogdan")]
    named = name_camps(camps, ["Centru viu"])

    assert [c.id for c in named] == ["c1", "c2"]
    assert [c.name for c in named] == ["Nume c1", "Nume c2"]
    assert named[0].member_ids == ["ana"] and named[0].description
    assert len(fake_gemini.naming) == 1
    sent = json.loads(fake_gemini.naming[0]["contents"][0])
    assert sent["taken_names"] == ["Centru viu"]
    assert sent["camps"][0]["arguments"] == ["Terasele să închidă la 23."]


def test_camps_without_arguments_skip_gemini(fake_gemini: GeminiCalls) -> None:
    camps = [_camp("c1", None)]
    assert name_camps(camps) == camps
    assert fake_gemini.naming == []


def test_only_camps_with_arguments_are_sent(fake_gemini: GeminiCalls) -> None:
    named = name_camps([_camp("c1", None), _camp("c2", "ana")])
    assert [c.name for c in named] == ["Tabăra c1", "Nume c2"]
    sent = json.loads(fake_gemini.naming[0]["contents"][0])
    assert [c["id"] for c in sent["camps"]] == ["c2"]


def test_missing_or_duplicate_names_keep_the_placeholder(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def sloppy(model, system, contents, schema, **_):
        return schema(
            camps=[
                {"camp_id": "c1", "name": "Liniște", "description": "a"},
                {"camp_id": "c2", "name": "liniște", "description": "b"},
                {"camp_id": "c9", "name": "Inventată", "description": "c"},
            ]
        )

    monkeypatch.setattr("app.agents.naming_agent.generate", sloppy)
    camps = [_camp("c1", "ana"), _camp("c2", "bogdan"), _camp("c3", "dan")]
    named = name_camps(camps, ["Centru viu"])
    assert [c.name for c in named] == ["Liniște", "Tabăra c2", "Tabăra c3"]


def test_taken_names_are_never_reused(monkeypatch: pytest.MonkeyPatch) -> None:
    def reuses(model, system, contents, schema, **_):
        return schema(
            camps=[{"camp_id": "c1", "name": "Centru Viu", "description": "x"}]
        )

    monkeypatch.setattr("app.agents.naming_agent.generate", reuses)
    [camp] = name_camps([_camp("c1", "ana")], ["Centru viu"])
    assert camp.name == "Tabăra c1"
