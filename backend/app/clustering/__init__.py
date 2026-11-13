"""Clustering (owner: Eidrien, role B). Pure functions: no DB, no FastAPI, no imports from agents/.

STUBS: fake data that follows the contract in app/schemas.py, so api/ and frontend/ can be
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
    # STUB: candidates seen by every camp. Eidrien adds the real rule:
    # high agreement measured separately inside EVERY camp.
    if len(camps) < 2:
        return []
    common = set.intersection(*({s.id for s in c.statements} for c in camps))
    by_id = {s.id: s for c in camps for s in c.statements}
    return [by_id[sid] for sid in sorted(common)]
