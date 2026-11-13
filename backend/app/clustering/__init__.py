"""Pure opinion clustering and cross-camp bridge detection."""

from app.clustering.algorithm import cluster
from app.schemas import Camp, Statement, Vote

__all__ = ["bridges", "cluster"]


def bridges(votes: list[Vote], camps: list[Camp]) -> list[Statement]:
    """Return statements supported by at least 70% of members in every camp.

    Passes and missing votes do not provide support. Using the full membership
    as denominator prevents a few votes from looking like camp-wide agreement.
    """
    if len(camps) < 2 or any(not c.member_ids for c in camps):
        return []
    membership: dict[str, str] = {}
    for camp in camps:
        if camp.size != len(set(camp.member_ids)):
            raise ValueError("Camp size must match unique members")
        for pid in camp.member_ids:
            if pid in membership:
                raise ValueError("Camp membership must not overlap")
            membership[pid] = camp.id
    if len({c.id for c in camps}) != len(camps):
        raise ValueError("Camp ids must be unique")

    candidates = set.intersection(*({s.id for s in c.statements} for c in camps))
    by_id: dict[str, Statement] = {}
    for camp in camps:
        for statement in camp.statements:
            previous = by_id.get(statement.id)
            if previous is not None and previous != statement:
                raise ValueError("Conflicting copies of a statement")
            by_id[statement.id] = statement

    seen: set[tuple[str, str]] = set()
    support: dict[tuple[str, str], int] = {}
    for vote in votes:
        key = (vote.participant_id, vote.statement_id)
        if key in seen:
            raise ValueError("Expected one latest vote per participant and statement")
        seen.add(key)
        cid = membership.get(vote.participant_id)
        if cid is not None and vote.value == "agree":
            count_key = (cid, vote.statement_id)
            support[count_key] = support.get(count_key, 0) + 1

    return [
        by_id[sid]
        for sid in sorted(candidates)
        if by_id[sid].flag is None
        and all(support.get((c.id, sid), 0) * 10 >= c.size * 7 for c in camps)
    ]
