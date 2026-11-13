"""Clustering (owner: Eidrien, role B). Pure functions: no DB, no FastAPI, no imports from agents/.

cluster() is still a stub: fake data that follows the contract in app/schemas.py, so api/ and frontend/ can be
built in parallel. Eidrien replaces the bodies, never the signatures.
"""

import hashlib
import math

from app.schemas import Camp, ClusterResult, Point, Statement, Vote

_FAKE_CAMPS = [
    (
        "c1",
        "Liniște pentru locuitori",
        "Vor program redus și control al zgomotului.",
        (-0.6, 0.4),
    ),
    ("c2", "Centru viu", "Susțin barurile și evenimentele de noapte.", (0.6, 0.3)),
    ("c3", "Siguranță întâi", "Pun accent pe pază și transport.", (0.0, -0.6)),
]
# below this many participants the stub reports everyone as noise
_MIN_PARTICIPANTS = 3


def _stable_hash(s: str) -> int:
    # built-in hash() changes between runs; the map must not jump on every refresh
    return int(hashlib.md5(s.encode()).hexdigest(), 16)


def cluster(statements: list[Statement], votes: list[Vote]) -> ClusterResult:
    participants = sorted(
        {v.participant_id for v in votes}
        | {s.author_id for s in statements if s.author_id}
    )
    if len(participants) < _MIN_PARTICIPANTS:
        return ClusterResult(
            camps=[],
            points=[Point(participant_id=p, x=0.0, y=0.0) for p in participants],
        )

    members: dict[str, list[str]] = {c[0]: [] for c in _FAKE_CAMPS}
    points: list[Point] = []
    for pid in participants:
        h = _stable_hash(pid)
        camp_id, _, _, (cx, cy) = _FAKE_CAMPS[h % len(_FAKE_CAMPS)]
        members[camp_id].append(pid)
        points.append(
            Point(
                participant_id=pid,
                x=cx + math.sin(h % 1000) * 0.25,
                y=cy + math.cos(h % 997) * 0.25,
                camp_id=camp_id,
            )
        )

    camps = []
    for cid, name, desc, _ in _FAKE_CAMPS:
        ids = set(members[cid])
        touched = {v.statement_id for v in votes if v.participant_id in ids}
        camps.append(
            Camp(
                id=cid,
                name=name,
                description=desc,
                size=len(ids),
                member_ids=members[cid],
                statements=[
                    s for s in statements if s.author_id in ids or s.id in touched
                ],
            )
        )
    return ClusterResult(camps=[c for c in camps if c.size], points=points)


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
