"""Synthetic embeddings verify mechanics, not real opinion clustering quality."""

import json
from pathlib import Path

import numpy as np
import pytest

from app.clustering import cluster
from app.schemas import Statement, Vote


def synthetic() -> list[Statement]:
    rows = json.loads(
        (Path(__file__).resolve().parents[3] / "seed/responses.json").read_text()
    )
    rng = np.random.default_rng(7)
    return [
        Statement(
            id=row["id"],
            text=row["text"],
            author_id=row["id"],
            embedding=(np.eye(3)[i % 3] + rng.normal(0, 0.015, 3)).tolist(),
        )
        for i, row in enumerate(rows)
    ]


def test_seed_synthetic_embeddings() -> None:
    statements = synthetic()
    result = cluster(statements, [])
    assert len(result.points) == 50
    assert len(result.camps) >= 2
    groups = {s.author_id: i % 3 for i, s in enumerate(statements)}
    for camp in result.camps:
        counts = [sum(groups[pid] == g for pid in camp.member_ids) for g in range(3)]
        assert max(counts) / camp.size >= 0.9
    assert all(abs(p.x) <= 1.00001 and abs(p.y) <= 1.00001 for p in result.points)
    assert result == cluster(list(reversed(statements)), [])
    print(
        "Synthetic seed:",
        len(result.camps),
        "camps;",
        sum(p.camp_id is None for p in result.points),
        "noise points",
    )


def test_empty_missing_and_small_inputs() -> None:
    assert cluster([], []).points == []
    statements = [Statement(id=f"s{i}", text="x", author_id="author") for i in range(3)]
    votes = [Vote(participant_id="voter", statement_id="s0", value="pass")]
    result = cluster(statements, votes)
    assert [p.participant_id for p in result.points] == ["author", "voter"]
    assert result.camps == []
    assert all(p.camp_id is None for p in result.points)


def test_identical_evidence_does_not_fabricate_camps() -> None:
    statements = [Statement(id="s", text="x", embedding=[1.0, 0.0])]
    votes = [
        Vote(participant_id=f"p{i}", statement_id="s", value="agree") for i in range(20)
    ]
    assert cluster(statements, votes).camps == []


@pytest.mark.parametrize("embedding", [[], [0.0, 0.0], [float("nan")], [float("inf")]])
def test_invalid_embeddings_fail_clearly(embedding: list[float]) -> None:
    with pytest.raises(ValueError, match="Embeddings"):
        cluster([Statement(id="s", text="x", embedding=embedding)], [])


def test_mixed_dimensions_are_rejected() -> None:
    with pytest.raises(ValueError, match="dimensions"):
        cluster(
            [
                Statement(id="a", text="x", embedding=[1.0]),
                Statement(id="b", text="y", embedding=[1.0, 2.0]),
            ],
            [],
        )


def test_invalid_input_references_are_rejected() -> None:
    statement = Statement(id="s", text="x")
    vote = Vote(participant_id="p", statement_id="s", value="agree")
    with pytest.raises(ValueError, match="unique"):
        cluster([statement, statement], [])
    with pytest.raises(ValueError, match="unknown"):
        cluster([], [vote])
    with pytest.raises(ValueError, match="latest vote"):
        cluster([statement], [vote, vote])
    with pytest.raises(ValueError, match="approved"):
        cluster([statement.model_copy(update={"flag": "abuse"})], [])


def test_vote_direction_passes_and_partial_embeddings() -> None:
    from app.clustering.algorithm import _features

    statements = [
        Statement(id="s", text="x", embedding=[1.0, 0.0]),
        Statement(id="missing", text="y", author_id="no-evidence"),
    ]
    votes = [
        Vote(participant_id=pid, statement_id="s", value=value)
        for pid, value in [("a", "agree"), ("b", "disagree"), ("c", "pass")]
    ]
    participants, active, features = _features(statements, votes)
    assert participants == ["a", "b", "c", "no-evidence"]
    assert active == ["a", "b"]
    np.testing.assert_allclose(features[0], -features[1])
    assert statements[0].embedding == [1.0, 0.0]


def test_small_embedded_dataset_stays_unassigned() -> None:
    statements = synthetic()[:5]
    result = cluster(statements, [])
    assert result.camps == []
    assert len(result.points) == 5
    assert all(p.camp_id is None for p in result.points)
