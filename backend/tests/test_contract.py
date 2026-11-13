"""Worked examples of the shared contract (app/schemas.py) for A, B and C."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.clustering import bridges, cluster
from app.schemas import (
    Camp,
    ClusterResult,
    MapUpdated,
    Point,
    ProxyOpinion,
    Statement,
    Vote,
)

SEED = Path(__file__).resolve().parents[2] / "seed" / "responses.json"


def _camp(cid: str, members: list[str], statements: list[Statement]) -> Camp:
    return Camp(
        id=cid,
        name=cid,
        description="",
        size=len(members),
        member_ids=members,
        statements=statements,
    )


# participant "ana" wrote two statements; "bogdan" wrote one
S_NOISE = Statement(id="s1", text="Terasele să închidă la 23.", author_id="ana")
S_BUS = Statement(id="s2", text="Vrem autobuze de noapte.", author_id="ana")
S_CLUB = Statement(id="s3", text="Cluburile să rămână deschise.", author_id="bogdan")
VOTES = [
    Vote(participant_id="ana", statement_id="s2", value="agree"),
    Vote(participant_id="bogdan", statement_id="s2", value="agree"),
    Vote(participant_id="bogdan", statement_id="s1", value="pass"),  # "nu știu"
    # ana never voted on s3: a missing vote is no Vote object at all
]


def test_bridges_returns_real_statements_using_only_its_inputs() -> None:
    quiet = _camp("c1", ["ana"], [S_NOISE, S_BUS])
    lively = _camp("c2", ["bogdan"], [S_CLUB, S_BUS, S_NOISE])

    result = bridges(VOTES, [quiet, lively])

    assert S_BUS in result
    assert all(isinstance(s, Statement) for s in result)


def test_one_point_per_participant_even_with_many_statements() -> None:
    result = cluster(
        [S_NOISE, S_BUS, S_CLUB],
        VOTES + [Vote(participant_id="carmen", statement_id="s3", value="disagree")],
    )
    assert sorted(p.participant_id for p in result.points) == [
        "ana",
        "bogdan",
        "carmen",
    ]


def test_noise_point_has_no_camp() -> None:
    result = ClusterResult(
        camps=[_camp("c1", ["ana", "bogdan"], [])],
        points=[
            Point(participant_id="ana", x=-0.5, y=0.1, camp_id="c1"),
            Point(participant_id="bogdan", x=-0.4, y=0.2, camp_id="c1"),
            Point(participant_id="dan", x=0.9, y=0.9, camp_id=None),
        ],
    )
    assert result.points[2].camp_id is None


@pytest.mark.parametrize(
    ("statements", "votes"),
    [([], []), ([S_NOISE], [])],
    ids=["empty", "single-participant"],
)
def test_too_little_data_means_no_camps(
    statements: list[Statement], votes: list[Vote]
) -> None:
    result = cluster(statements, votes)
    assert result.camps == []
    assert all(p.camp_id is None for p in result.points)
    assert bridges(votes, result.camps) == []


def test_overlapping_camps_are_rejected() -> None:
    with pytest.raises(ValidationError, match="overlaps"):
        ClusterResult(
            camps=[_camp("c1", ["ana"], []), _camp("c2", ["ana"], [])],
            points=[Point(participant_id="ana", x=0, y=0, camp_id="c1")],
        )


def test_point_with_unknown_camp_is_rejected() -> None:
    with pytest.raises(ValidationError, match="unknown camp"):
        ClusterResult(
            camps=[], points=[Point(participant_id="ana", x=0, y=0, camp_id="c9")]
        )


@pytest.mark.parametrize("bad", [float("nan"), float("inf")])
def test_coordinates_must_be_finite(bad: float) -> None:
    with pytest.raises(ValidationError):
        Point(participant_id="ana", x=bad, y=0)


def test_proxy_opinions_cannot_be_votes_or_statements() -> None:
    proxy = ProxyOpinion(group="șoferi de taxi", text="Vrem stații clare noaptea.")
    assert proxy.simulated is True
    with pytest.raises(ValidationError):
        Vote.model_validate(proxy.model_dump())
    with pytest.raises(ValidationError):
        Statement.model_validate(proxy.model_dump())


def test_websocket_payload_matches_frontend_types() -> None:
    camp = _camp("c1", ["ana"], [S_BUS])
    s = S_BUS.model_copy(update={"embedding": [0.1, 0.2]})
    event = MapUpdated(
        data=ClusterResult(
            camps=[camp],
            points=[Point(participant_id="ana", x=0.1, y=0.2, camp_id="c1")],
        )
    )
    payload = json.loads(event.model_dump_json())

    assert payload["type"] == "map_updated"
    # internal fields stay on the server
    assert "statements" not in payload["data"]["camps"][0]
    assert "embedding" not in s.model_dump()


def test_seed_runs_through_the_stub_pipeline() -> None:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    statements = [
        Statement(id=r["id"], text=r["text"], author_id=r["id"]) for r in seed
    ]
    result = cluster(statements, [])
    assert len(result.points) == len(seed)
    assert {p.participant_id for p in result.points} == {r["id"] for r in seed}
