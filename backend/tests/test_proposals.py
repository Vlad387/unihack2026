"""Screen 4: proposal rounds and votes, on a throwaway SQLite file (Gemini faked)."""

import asyncio
import json
import threading
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import proposals as proposals_module
from app.api.live import live
from app.main import app


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


def with_camps(client: TestClient) -> None:
    """Two opposed groups of 10 voters, so real clustering finds camps.

    Real clustering never invents camps from answers alone: people must vote differently.
    """
    for pid, text in (
        ("ana", "Terasele să închidă la 23."),
        ("bogdan", "Barurile să rămână deschise noaptea."),
    ):
        res = client.post("/responses", data={"participant_id": pid, "text": text})
        assert res.status_code == 202
    asyncio.run(live.tick())

    statements = client.get("/statements", params={"participant_id": "v0"}).json()
    assert len(statements) == 2
    for i in range(20):
        for j, st in enumerate(statements):
            value = "agree" if (i < 10) == (j == 0) else "disagree"
            vote = {"participant_id": f"v{i}", "statement_id": st["id"], "value": value}
            assert client.post("/votes", json=vote).status_code == 204
    asyncio.run(live.recompute())
    assert len(live.result.camps) >= 2, "two opposed groups should form camps"


def wait_for_round(client: TestClient) -> dict:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        status = client.get("/proposals/status").json()
        if status["state"] != "running":
            return status
        time.sleep(0.05)
    pytest.fail("the round never finished")


def run_round(client: TestClient) -> dict:
    assert client.post("/proposals").status_code == 202
    assert wait_for_round(client) == {"state": "idle", "error": None}
    return client.get("/proposal").json()


def vote(client: TestClient, pid: str, proposal: dict, support: bool, critique=None):
    body = {"participant_id": pid, "proposal_id": proposal["id"], "support": support}
    if critique is not None:
        body["critique"] = critique
    return client.post("/proposal-votes", json=body)


def test_nothing_before_the_first_round(client: TestClient) -> None:
    assert client.get("/proposal").json() is None
    assert client.get("/support").json() == []
    assert client.get("/proposals/status").json()["state"] == "idle"


def test_round_without_camps_fails_cleanly(client: TestClient) -> None:
    with client:
        assert client.post("/proposals").status_code == 202
        status = wait_for_round(client)
    assert status["state"] == "failed"
    assert "camp" in status["error"]
    assert client.get("/proposal").json() is None


def test_round_publishes_a_proposal_with_real_round_and_verdict(
    client: TestClient,
) -> None:
    with_camps(client)
    with client, client.websocket_connect("/ws") as ws:
        # started right after startup, before the first map exists: must wait, not fail
        proposal = run_round(client)
        camps = client.get("/clusters").json()["camps"]
        assert camps, "the map has camps"

        for _ in range(20):
            event = ws.receive_json()
            if event["type"] == "proposal_published":
                assert event["data"]["id"] == proposal["id"]
                break
        else:
            pytest.fail("no proposal_published event")

    assert proposal["round"] == 1
    assert [t["camp_id"] for t in proposal["tradeoffs"]] == [c["id"] for c in camps]
    assert proposal["verdict"] is not None


def test_votes_support_and_critiques_feed_the_next_round(
    client: TestClient, fake_gemini: list[dict]
) -> None:
    with_camps(client)
    with client:
        first = run_round(client)
        assert vote(client, "dan", first, True).status_code == 204
        # dan changes his mind: only the latest vote counts
        assert (
            vote(
                client, "dan", first, False, "  Prea târziu pentru vecini.  "
            ).status_code
            == 204
        )
        assert vote(client, "elena", first, True).status_code == 204
        # demo participants never count as real citizens
        assert (
            vote(client, "seed-001", first, False, "Critică demo.").status_code == 204
        )

        assert client.get("/support").json() == [{"round": 1, "agree": 1, "total": 2}]

        second = run_round(client)
        assert second["round"] == 2
        sent = json.loads(fake_gemini[-1]["contents"][0])
        assert sent["critiques"] == ["Prea târziu pentru vecini."]

        assert vote(client, "dan", first, True).status_code == 409
        missing = {"id": "nope"}
        assert vote(client, "dan", missing, True).status_code == 404
        assert client.get("/support").json() == [
            {"round": 1, "agree": 1, "total": 2},
            {"round": 2, "agree": 0, "total": 0},
        ]


def test_only_one_round_at_a_time(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    with_camps(client)
    released = threading.Event()
    real_mediate = proposals_module.mediate

    def slow_mediate(*args):
        released.wait(timeout=10)
        return real_mediate(*args)

    monkeypatch.setattr(proposals_module, "mediate", slow_mediate)
    try:
        with client:
            assert client.post("/proposals").status_code == 202
            assert client.post("/proposals").status_code == 409
            released.set()
            assert wait_for_round(client)["state"] == "idle"
    finally:
        released.set()


def test_starting_a_round_needs_the_organizer_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ORGANIZER_TOKEN", "s3cret")
    with_camps(client)
    with client:
        assert client.post("/proposals").status_code == 401
        wrong = {"X-Organizer-Token": "guess"}
        assert client.post("/proposals", headers=wrong).status_code == 401
        ok = {"X-Organizer-Token": "s3cret"}
        assert client.post("/proposals", headers=ok).status_code == 202
        wait_for_round(client)
