"""The bridge diagnostic counts votes independently of clustering.bridges()."""

from app.api.diagnose_bridges import breakdown, report
from app.clustering import bridges
from app.schemas import Camp, Statement, Vote

A = [f"a{i}" for i in range(5)]
B = [f"b{i}" for i in range(5)]
BUS = Statement(id="s-bus", text="Autobuze de noapte.", author_id="a0")
LATE = Statement(id="s-late", text="Barurile până la 2.", author_id="b0")


def camps(*statements: Statement) -> list[Camp]:
    return [
        Camp(
            id=cid,
            name=cid,
            description="",
            size=5,
            member_ids=members,
            statements=list(statements),
        )
        for cid, members in (("ca", A), ("cb", B))
    ]


def votes(statement: Statement, plan: dict[str, str]) -> list[Vote]:
    return [
        Vote(participant_id=pid, statement_id=statement.id, value=value)
        for pid, value in plan.items()
    ]


def test_sparse_voting_shows_up_as_missing_votes() -> None:
    # only 2 of 5 in each camp agreed, nobody else voted: sparse, not a bug
    vs = votes(BUS, {"a1": "agree", "a2": "agree", "b1": "agree", "b2": "agree"})
    ca, cb = breakdown(BUS, vs, camps(BUS))
    # in camp A the author (a0) adds implicit support: 2 votes + 1 author = 3
    assert (ca.agree, ca.missing, ca.author_support, ca.endorsed, ca.needed) == (
        2,
        2,
        1,
        3,
        4,
    )
    assert (cb.agree, cb.missing, cb.endorsed, cb.needed) == (2, 3, 2, 4)
    assert not ca.ok and not cb.ok
    for r in (ca, cb):
        assert r.agree + r.disagree + r.pass_ + r.missing + r.author_support == r.size
    assert bridges(vs, camps(BUS)) == []


def test_an_explicit_vote_replaces_the_authors_implicit_support() -> None:
    vs = votes(BUS, {"a0": "pass"})
    [ca, _] = breakdown(BUS, vs, camps(BUS))
    assert (ca.author_support, ca.pass_, ca.endorsed) == (0, 1, 0)


def test_counts_agree_with_bridges_exactly() -> None:
    # BUS: 4 of 5 endorse in both camps (bridge); LATE: only camp B (not a bridge)
    vs = votes(
        BUS, {"a1": "agree", "a2": "agree", "a3": "agree", "a4": "disagree"}
    ) + votes(BUS, {"b1": "agree", "b2": "agree", "b3": "agree", "b4": "agree"})
    vs += votes(LATE, {"b1": "agree", "b2": "agree", "b3": "agree", "a1": "disagree"})
    cs = camps(BUS, LATE)

    ours = {s.id for s in (BUS, LATE) if all(r.ok for r in breakdown(s, vs, cs))}
    assert ours == {s.id for s in bridges(vs, cs)} == {"s-bus"}


def test_report_is_readable() -> None:
    text = report(BUS, votes(BUS, {"a1": "agree"}), camps(BUS))
    assert "s-bus" in text and "endorsed/needed" in text and "❌" in text
