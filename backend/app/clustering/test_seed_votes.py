"""The loader fixture must remain reproducible, varied, and usable by pure clustering."""

import json
import subprocess
import sys

from app.clustering import bridges, cluster
from app.clustering.evaluate import SEED, load_seed, retained_members


def test_fixture_references_unique_votes_and_all_participants() -> None:
    statements, votes = load_seed()
    participants = {f"seed-{i:03}" for i in range(1, 51)}
    assert {s.author_id for s in statements} == participants
    assert {v.participant_id for v in votes} == participants
    assert {v.value for v in votes} == {"agree", "disagree", "pass"}
    assert len({(v.participant_id, v.statement_id) for v in votes}) == len(votes)
    by_id = {s.id: s for s in statements}
    assert len(by_id) == len(statements) == 50
    assert all(v.statement_id in by_id for v in votes)
    assert all(by_id[v.statement_id].author_id != v.participant_id for v in votes)
    assert len(votes) < len(participants) * (len(statements) - 1)
    result = cluster(statements, votes)
    assert len(result.points) == 50
    assert 2 <= len(result.camps) <= 3
    assert bridges(votes, result.camps)
    for camp in result.camps:
        values = [
            {
                v.value
                for v in votes
                if v.statement_id == s.id and v.participant_id in camp.member_ids
            }
            for s in statements
        ]
        assert any({"agree", "disagree"} <= seen for seen in values)
    assert result == cluster(list(reversed(statements)), list(reversed(votes)))


def test_fixture_generator_is_reproducible_without_writing() -> None:
    subprocess.run(
        [sys.executable, str(SEED / "build_votes.py"), "--check"], check=True
    )
    rows = json.loads((SEED / "responses.json").read_text())
    assert all(s.author_id in {r["id"] for r in rows} for s in load_seed()[0])


def test_stability_matching_is_one_to_one_and_preserves_noise() -> None:
    assert retained_members([0, 0, 1, 1, -1], [4, 4, 2, 2, -1]) == 5
    assert retained_members([0, 0, 0, 0], [1, 1, 2, 2]) == 2
    assert retained_members([-1, -1, 0, 0], [-1, 0, 1, 1]) == 3
    assert retained_members([-1, -1], [-1, -1]) == 2
    assert retained_members([0, 0], [-1, -1]) == 0
