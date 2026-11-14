"""Checks for cross-camp endorsement thresholds and synthetic seed fixtures."""

import json
from pathlib import Path

import pytest

from app.clustering import bridges
from app.schemas import Camp, Statement, Vote


def fixtures() -> tuple[list[Camp], list[Vote]]:
    statement = Statement(id="bus", text="Vrem transport de noapte.")
    camps = [
        Camp(
            id=cid,
            name=cid,
            description="Synthetic test camp",
            size=10,
            member_ids=[f"{cid}-{i}" for i in range(10)],
            statements=[statement],
        )
        for cid in ["quiet", "lively"]
    ]
    votes = [
        Vote(participant_id=pid, statement_id="bus", value="agree")
        for camp in camps
        for pid in camp.member_ids[:7]
    ]
    return camps, votes


def test_seventy_percent_in_every_camp() -> None:
    camps, votes = fixtures()
    assert [s.id for s in bridges(votes, camps)] == ["bus"]
    assert bridges(votes[:-1], camps) == []


def test_missing_pass_and_disagree_do_not_supply_support() -> None:
    camps, votes = fixtures()
    for value in ["pass", "disagree"]:
        changed = votes[:-1] + [votes[-1].model_copy(update={"value": value})]
        assert bridges(changed, camps) == []
    assert bridges([], camps) == []
    assert bridges(votes, camps[:1]) == []


def test_noise_votes_do_not_inflate_support() -> None:
    camps, votes = fixtures()
    votes = votes[:-1] + [
        Vote(participant_id=f"noise-{i}", statement_id="bus", value="agree")
        for i in range(100)
    ]
    assert bridges(votes, camps) == []


def test_duplicate_votes_are_rejected() -> None:
    camps, votes = fixtures()
    with pytest.raises(ValueError, match="latest vote"):
        bridges(votes + [votes[0]], camps)


def test_flagged_statements_are_excluded() -> None:
    camps, votes = fixtures()
    for camp in camps:
        camp.statements[0] = camp.statements[0].model_copy(update={"flag": "abuse"})
    assert bridges(votes, camps) == []


def test_seed_replay_with_explicitly_synthetic_votes() -> None:
    seed_path = Path(__file__).resolve().parents[3] / "seed" / "responses.json"
    rows = json.loads(seed_path.read_text(encoding="utf-8"))
    statement = Statement(id="seed-034", text=rows[33]["text"], author_id="seed-034")
    # Test-only memberships/votes: neither inferred camps nor measured consensus.
    camps = [
        Camp(
            id=f"test-{i}",
            name="Test",
            description="Synthetic fixture",
            size=len(part),
            member_ids=[r["id"] for r in part],
            statements=[statement],
        )
        for i, part in enumerate([rows[:25], rows[25:]])
    ]
    votes = [
        Vote(participant_id=r["id"], statement_id=statement.id, value="agree")
        for r in rows
    ]
    assert bridges(votes, camps) == [statement]
    assert bridges(votes[:25], camps) == []


def test_overlapping_members_are_rejected() -> None:
    camps, votes = fixtures()
    camps[1].member_ids[0] = camps[0].member_ids[0]
    with pytest.raises(ValueError, match="overlap"):
        bridges(votes, camps)


def test_candidate_must_be_available_in_every_camp() -> None:
    camps, votes = fixtures()
    camps[1].statements = []
    assert bridges(votes, camps) == []


def test_authors_support_their_statement_without_a_self_vote() -> None:
    statement = Statement(id="bus", text="Vrem autobuze de noapte.", author_id="a0")
    camps = [
        Camp(
            id=cid,
            name=cid,
            description="",
            size=3,
            member_ids=[f"{cid}{i}" for i in range(3)],
            statements=[statement],
        )
        for cid in ("a", "b")
    ]
    votes = [
        Vote(participant_id=pid, statement_id=statement.id, value="agree")
        for camp in camps
        for pid in camp.member_ids
        if pid != statement.author_id
    ]
    assert bridges(votes, camps) == [statement]
    # An explicit self-vote replaces inferred authorship support, never adds to it.
    self_agree = Vote(participant_id="a0", statement_id="bus", value="agree")
    assert bridges(votes + [self_agree], camps) == [statement]
    for value in ("disagree", "pass"):
        assert (
            bridges(votes + [self_agree.model_copy(update={"value": value})], camps)
            == []
        )


def test_an_author_self_vote_does_not_count_twice() -> None:
    statement = Statement(id="bus", text="Vrem autobuze de noapte.", author_id="a0")
    camps = [
        Camp(
            id=cid,
            name=cid,
            description="",
            size=3,
            member_ids=[f"{cid}{i}" for i in range(3)],
            statements=[statement],
        )
        for cid in ("a", "b")
    ]
    votes = [
        Vote(participant_id=pid, statement_id="bus", value="agree")
        for pid in ("a0", "a1", "b0", "b1", "b2")
    ]
    assert bridges(votes, camps) == []


@pytest.mark.parametrize(("size", "required"), [(3, 3), (4, 3), (5, 4)])
def test_small_camps_require_seventy_percent_in_each_camp(
    size: int, required: int
) -> None:
    statement = Statement(id="shared", text="Vrem transport de noapte.")
    camps = [
        Camp(
            id=f"c{k}",
            name=f"c{k}",
            description="",
            size=size,
            member_ids=[f"p{k}-{i}" for i in range(size)],
            statements=[statement],
        )
        for k in range(3)
    ]
    votes = [
        Vote(participant_id=pid, statement_id="shared", value="agree")
        for camp in camps
        for pid in camp.member_ids[:required]
    ]
    assert bridges(votes, camps) == [statement]
    assert bridges(votes[:-1], camps) == []
    missing_pid = camps[-1].member_ids[required - 1]
    for value in ("pass", "disagree"):
        assert (
            bridges(
                votes[:-1]
                + [
                    Vote(
                        participant_id=missing_pid,
                        statement_id="shared",
                        value=value,
                    )
                ],
                camps,
            )
            == []
        )
