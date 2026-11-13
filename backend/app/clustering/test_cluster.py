"""Vote clustering checks; seed votes below are explicitly synthetic."""

import numpy as np
import pytest

from app.clustering import cluster
from app.clustering.algorithm import _features
from app.schemas import Statement, Vote


def test_empty_small_and_authorship_only_inputs_are_noise() -> None:
    assert cluster([], []).points == []
    for count in [1, 5, 20]:
        statements = [
            Statement(id=f"s{i}", text="x", author_id=f"p{i}") for i in range(count)
        ]
        result = cluster(statements, [])
        assert result.camps == []
        assert len(result.points) == count
        assert all(p.camp_id is None and p.text is None for p in result.points)


def test_identical_votes_do_not_fabricate_camps() -> None:
    statements = [Statement(id="s", text="x")]
    votes = [
        Vote(participant_id=f"p{i}", statement_id="s", value="agree") for i in range(20)
    ]
    assert cluster(statements, votes).camps == []


def test_matrix_semantics_and_no_embedding_dependency() -> None:
    statements = [
        Statement(id="s", text="x", author_id="a", embedding=[float("nan")]),
        Statement(id="s2", text="y", author_id="a"),
    ]
    votes = [
        Vote(participant_id=pid, statement_id="s", value=value)
        for pid, value in [("a", "disagree"), ("b", "agree"), ("c", "pass")]
    ]
    participants, active, matrix = _features(statements, votes)
    assert participants == ["a", "b", "c"]
    assert active == ["a", "b"]
    np.testing.assert_array_equal(matrix, [[-1, 1], [1, 0]])
    assert statements[0].author_id == "a"
    assert votes[0].value == "disagree"
    result = cluster(statements, votes)
    assert [p.participant_id for p in result.points] == participants


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


def test_seed_votes_clusters_bridges_and_order_stability() -> None:
    from app.clustering import bridges
    from app.clustering.demo import make_inputs

    statements, votes = make_inputs(50)
    result = cluster(statements, votes)
    assert len(result.points) == 50
    assert len(result.camps) >= 2
    assert all(p.text is None for p in result.points)
    assert all(abs(p.x) <= 1.00001 and abs(p.y) <= 1.00001 for p in result.points)
    assert result == cluster(list(reversed(statements)), list(reversed(votes)))
    for camp in result.camps:
        touched = {v.statement_id for v in votes if v.participant_id in camp.member_ids}
        expected = {
            s.id
            for s in statements
            if s.author_id in camp.member_ids or s.id in touched
        }
        assert {s.id for s in camp.statements} == expected
        assert camp.size == len(camp.member_ids)
    assert {s.id for s in bridges(votes, result.camps)} >= {"demo-bridge"}
