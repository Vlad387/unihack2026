import json

import pytest

from app.agents import AgentError, mediate
from app.agents.mediate_agent import MAX_ARGUMENTS_PER_CAMP
from app.schemas import Camp, ProxyOpinion, Statement


def _camp(cid: str, members: list[str], statements: list[Statement]) -> Camp:
    return Camp(
        id=cid,
        name=f"Tabăra {cid}",
        description="",
        size=len(members),
        member_ids=members,
        statements=statements,
    )


QUIET = _camp(
    "c1",
    ["ana"],
    [
        Statement(id="s1", text="Terasele să închidă la 22.", author_id="ana"),
        Statement(id="s2", text="Insultă.", author_id="ana", flag="abuse"),
        # bogdan is not in c1: a statement c1 only voted on is not c1's argument
        Statement(id="s3", text="Cluburile până la 5.", author_id="bogdan"),
    ],
)
LIVELY = _camp(
    "c2",
    ["bogdan"],
    [Statement(id="s3", text="Cluburile până la 5.", author_id="bogdan")],
)
BRIDGE = Statement(id="s9", text="Vrem autobuze de noapte.")


def _sent(fake_gemini: list[dict]) -> dict:
    return json.loads(fake_gemini[-1]["contents"][0])


def test_one_tradeoff_per_camp_in_camp_order(fake_gemini: list[dict]) -> None:
    proposal = mediate([QUIET, LIVELY], [BRIDGE], [], [])
    assert [t.camp_id for t in proposal.tradeoffs] == ["c1", "c2"]
    assert proposal.text
    assert proposal.id.startswith("p-")
    assert "Mediator agent" in fake_gemini[0]["system"]


def test_payload_uses_only_own_unflagged_arguments(fake_gemini: list[dict]) -> None:
    mediate([QUIET, LIVELY], [BRIDGE], ["  ", "Prea târziu."], [])
    sent = _sent(fake_gemini)
    assert sent["camps"][0]["arguments"] == ["Terasele să închidă la 22."]
    assert sent["camps"][1]["arguments"] == ["Cluburile până la 5."]
    assert sent["common_ground"] == ["Vrem autobuze de noapte."]
    assert sent["critiques"] == ["Prea târziu."]


def test_arguments_are_capped(fake_gemini: list[dict]) -> None:
    many = [
        Statement(id=f"s{i}", text=f"Argument {i}.", author_id="ana")
        for i in range(MAX_ARGUMENTS_PER_CAMP + 5)
    ]
    mediate([_camp("c1", ["ana"], many)], [], [], [])
    assert len(_sent(fake_gemini)["camps"][0]["arguments"]) == MAX_ARGUMENTS_PER_CAMP


def test_proxies_are_sent_as_simulated_voices(fake_gemini: list[dict]) -> None:
    proxy = ProxyOpinion(group="taximetriști", text="Vrem stații clare.")
    mediate([QUIET], [], [], [proxy])
    assert _sent(fake_gemini)["simulated_voices"] == [
        {"group": "taximetriști", "text": "Vrem stații clare."}
    ]


def test_no_camps_is_an_error(fake_gemini: list[dict]) -> None:
    with pytest.raises(AgentError, match="at least one camp"):
        mediate([], [BRIDGE], [], [])
    assert fake_gemini == []


def test_missing_camp_tradeoff_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def forgets_c2(model, system, contents, schema, **_):
        return schema(
            text="x",
            tradeoffs=[
                {"camp_id": "c1", "gains": "a", "gives_up": "b"},
                {"camp_id": "c9", "gains": "invented", "gives_up": "camp"},
            ],
        )

    monkeypatch.setattr("app.agents.mediate_agent.generate", forgets_c2)
    with pytest.raises(AgentError, match="c2"):
        mediate([QUIET, LIVELY], [], [], [])
