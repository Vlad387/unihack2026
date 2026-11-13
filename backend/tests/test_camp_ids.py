"""Camp ids/names stay stable between map updates, so screen 4 keeps matching camps."""

import asyncio
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api.camp_ids import stabilize
from app.api.live import live, load_inputs
from app.clustering import cluster
from app.main import app
from app.schemas import Camp, ClusterResult, Point
from tests.test_proposals import run_round, with_camps


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(
        db, "SessionLocal", sessionmaker(engine, expire_on_commit=False)
    )
    monkeypatch.delenv("ORGANIZER_TOKEN", raising=False)
    db.init_db()
    live.reset()
    yield TestClient(app)


def camp(cid: str, name: str, members: list[str]) -> Camp:
    return Camp(
        id=cid, name=name, description="", size=len(members), member_ids=members
    )


def result(*camps: Camp, noise: tuple[str, ...] = ()) -> ClusterResult:
    points = [
        Point(participant_id=m, x=0, y=0, camp_id=c.id)
        for c in camps
        for m in c.member_ids
    ] + [Point(participant_id=n, x=0, y=0) for n in noise]
    return ClusterResult(camps=list(camps), points=points)


def test_same_members_keep_id_and_name() -> None:
    old = [camp("h1", "Tabăra 1", ["a", "b", "c"])]
    new = stabilize(result(camp("h1", "Tabăra 1", ["a", "b", "c"])), old)
    assert [(c.id, c.name) for c in new.camps] == [("h1", "Tabăra 1")]


def test_a_new_member_keeps_the_camp_id_and_name() -> None:
    old = [
        camp("h1", "Tabăra 1", ["a", "b", "c"]),
        camp("h2", "Tabăra 2", ["x", "y", "z"]),
    ]
    # cluster() re-hashed both ids and numbered the camps the other way round
    raw = result(
        camp("h9", "Tabăra 1", ["x", "y", "z"]),
        camp("h8", "Tabăra 2", ["a", "b", "c", "d"]),
        noise=("n",),
    )
    new = stabilize(raw, old)
    assert [(c.id, c.name) for c in new.camps] == [
        ("h2", "Tabăra 2"),
        ("h1", "Tabăra 1"),
    ]
    by_pid = {p.participant_id: p.camp_id for p in new.points}
    assert by_pid["d"] == "h1" and by_pid["x"] == "h2" and by_pid["n"] is None


def test_on_a_split_the_bigger_part_keeps_the_id() -> None:
    old = [camp("h1", "Tabăra 1", ["a", "b", "c", "d", "e", "f"])]
    raw = result(
        camp("h7", "Tabăra 1", ["a", "b"]),
        camp("h8", "Tabăra 2", ["c", "d", "e", "f"]),
    )
    new = stabilize(raw, old)
    assert [c.id for c in new.camps] == ["h7", "h1"]
    names = [c.name for c in new.camps]
    assert names[1] == "Tabăra 1" and len(set(names)) == 2


def test_an_unrelated_camp_gets_its_own_id_and_a_free_name() -> None:
    old = [camp("h1", "Tabăra 1", ["a", "b", "c"])]
    raw = result(
        camp("h5", "Tabăra 1", ["x", "y", "z"]), camp("h6", "Tabăra 2", ["a", "b", "c"])
    )
    new = stabilize(raw, old)
    assert [(c.id, c.name) for c in new.camps] == [
        ("h5", "Tabăra 2"),
        ("h1", "Tabăra 1"),
    ]


def test_nothing_to_match() -> None:
    raw = result(camp("h1", "Tabăra 1", ["a", "b", "c"]))
    assert stabilize(raw, []) == raw
    assert stabilize(result(noise=("a",)), [camp("h1", "T", ["a"])]).camps == []


def latecomer_votes_with_group_a(client: TestClient) -> None:
    statements = client.get("/statements", params={"participant_id": "late"}).json()
    for j, st in enumerate(statements):
        value = "agree" if j == 0 else "disagree"
        vote = {"participant_id": "late", "statement_id": st["id"], "value": value}
        assert client.post("/votes", json=vote).status_code == 204


def test_proposal_camps_still_match_the_map_after_more_votes(
    client: TestClient,
) -> None:
    with_camps(client)
    with client:
        proposal = run_round(client)
        names = {c["id"]: c["name"] for c in client.get("/clusters").json()["camps"]}
        round_ids = {t["camp_id"] for t in proposal["tradeoffs"]}

        latecomer_votes_with_group_a(client)
        deadline = time.monotonic() + 5
        while not any(
            p["participant_id"] == "late" and p["camp_id"]
            for p in client.get("/clusters").json()["points"]
        ):
            assert time.monotonic() < deadline, "the latecomer never joined a camp"
            time.sleep(0.05)

        now = {c["id"]: c["name"] for c in client.get("/clusters").json()["camps"]}
        # the test is meaningful: cluster()'s own ids did change
        raw_ids = {c.id for c in cluster(*load_inputs()).camps}
        assert not round_ids <= raw_ids
        # ...but the map keeps the ids (and names) screen 4 shows for the proposal
        assert round_ids <= set(now)
        assert all(now[i] == names[i] for i in round_ids)


def test_camp_ids_survive_a_restart(client: TestClient) -> None:
    with_camps(client)
    before = {c.id: c.name for c in live.result.camps}
    latecomer_votes_with_group_a(client)

    live.reset()  # server restart: nothing in memory
    asyncio.run(live.recompute())

    after = {c.id: c.name for c in live.result.camps}
    assert after == before
