"""Keep camp ids and names stable between map updates.

cluster() derives a camp's id from its exact member list, so one new voter changes it.
Screen 4 shows a proposal's camps by id (name, color, "tabăra ta"), and a proposal is
written once per round: without stable ids its camps lose their names after the next vote.
cluster() stays a pure function; the API remembers the previous camps instead.
"""

from app import db
from app.api.models import MapStateRow
from app.schemas import Camp, ClusterResult

# a new camp inherits an old camp's id if they share at least this share of members
MIN_OVERLAP = 0.3


def _free_name(taken: set[str]) -> str:
    k = 1
    while f"Tabăra {k}" in taken:
        k += 1
    return f"Tabăra {k}"


def stabilize(result: ClusterResult, previous: list[Camp]) -> ClusterResult:
    if not previous or not result.camps:
        return result

    pairs = []
    for i, new in enumerate(result.camps):
        for j, old in enumerate(previous):
            a, b = set(new.member_ids), set(old.member_ids)
            if a & b:
                pairs.append((len(a & b) / len(a | b), i, j))
    # best overlaps first: on a split, the bigger part keeps the old identity
    match: dict[int, Camp] = {}
    for overlap, i, j in sorted(pairs, reverse=True):
        if overlap < MIN_OVERLAP:
            break
        if i not in match and previous[j] not in match.values():
            match[i] = previous[j]

    taken_ids = {c.id for c in match.values()}
    taken_names = {c.name for c in match.values()}
    renamed: dict[str, str] = {}
    camps: list[Camp] = []
    for i, camp in enumerate(result.camps):
        if i in match:
            update = {"id": match[i].id, "name": match[i].name}
        else:
            cid = camp.id if camp.id not in taken_ids else f"{camp.id}-{i}"
            name = (
                camp.name if camp.name not in taken_names else _free_name(taken_names)
            )
            update = {"id": cid, "name": name}
            taken_ids.add(cid)
            taken_names.add(name)
        renamed[camp.id] = update["id"]
        camps.append(camp.model_copy(update=update))

    points = [
        p.model_copy(update={"camp_id": renamed[p.camp_id]}) if p.camp_id else p
        for p in result.points
    ]
    return ClusterResult(camps=camps, points=points)


def load_previous() -> list[Camp]:
    with db.SessionLocal() as s:
        row = s.get(MapStateRow, 1)
        return [Camp.model_validate(c) for c in row.camps] if row else []


def save(camps: list[Camp]) -> None:
    with db.SessionLocal() as s:
        # Camp.statements is excluded from the dump: only id, name, members are needed
        s.merge(MapStateRow(id=1, camps=[c.model_dump(mode="json") for c in camps]))
        s.commit()
