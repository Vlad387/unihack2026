"""API tests on a throwaway SQLite file: no Docker or Gemini needed."""

import asyncio
import itertools
import threading
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import live as live_module
from app.api.live import live
from app.api.models import ResponseRow, VoteRow
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
    db.init_db()
    live.reset()
    yield TestClient(app)


def answer(client: TestClient, pid: str, text: str) -> str:
    res = client.post("/responses", data={"participant_id": pid, "text": text})
    assert res.status_code == 202
    return res.json()["id"]


def process() -> None:
    asyncio.run(live.tick())


def test_answer_becomes_statements_others_can_vote_on(client: TestClient) -> None:
    answer(client, "ana", "Terasele să închidă la 23. Vrem autobuze de noapte.")
    process()

    for_bogdan = client.get("/statements", params={"participant_id": "bogdan"}).json()
    assert [s["text"] for s in for_bogdan] == [
        "Terasele să închidă la 23.",
        "Vrem autobuze de noapte.",
    ]
    assert all(s["author_id"] == "ana" for s in for_bogdan)
    # nobody votes on their own statements
    assert client.get("/statements", params={"participant_id": "ana"}).json() == []


def test_empty_answer_is_rejected(client: TestClient) -> None:
    res = client.post("/responses", data={"participant_id": "ana", "text": "   "})
    assert res.status_code == 422


def test_latest_vote_wins_and_voted_statements_disappear(client: TestClient) -> None:
    answer(client, "ana", "Vrem autobuze de noapte.")
    process()
    [st] = client.get("/statements", params={"participant_id": "bogdan"}).json()

    for value in ("agree", "disagree"):
        vote = {"participant_id": "bogdan", "statement_id": st["id"], "value": value}
        assert client.post("/votes", json=vote).status_code == 204

    with db.SessionLocal() as s:
        assert [v.value for v in s.scalars(select(VoteRow))] == ["disagree"]
    assert client.get("/statements", params={"participant_id": "bogdan"}).json() == []


def test_vote_on_unknown_statement_is_404(client: TestClient) -> None:
    vote = {"participant_id": "bogdan", "statement_id": "nope", "value": "agree"}
    assert client.post("/votes", json=vote).status_code == 404


def test_gemini_failure_keeps_the_answer_and_retries(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    rid = answer(client, "ana", "Vrem autobuze de noapte.")
    real_intake = live_module.intake

    def gemini_down(text: str | None, audio: bytes | None) -> list:
        raise RuntimeError("503 high demand")

    monkeypatch.setattr(live_module, "intake", gemini_down)
    process()
    with db.SessionLocal() as s:
        row = s.get(ResponseRow, rid)
        assert (row.status, row.attempts, row.text) == (
            "failed",
            1,
            "Vrem autobuze de noapte.",
        )

    monkeypatch.setattr(live_module, "intake", real_intake)
    process()
    with db.SessionLocal() as s:
        assert s.get(ResponseRow, rid).status == "done"


def test_map_shows_what_each_participant_said(client: TestClient) -> None:
    for pid in ("ana", "bogdan", "carmen"):
        answer(client, pid, f"Opinia lui {pid}.")
    process()

    points = {p["participant_id"]: p for p in client.get("/clusters").json()["points"]}
    assert set(points) == {"ana", "bogdan", "carmen"}
    assert points["ana"]["text"] == "Opinia lui ana."


def test_websocket_sends_snapshot_then_live_updates(client: TestClient) -> None:
    with client, client.websocket_connect("/ws") as ws:
        # a screen that joins gets the current state right away
        assert ws.receive_json()["type"] == "map_updated"

        answer(client, "ana", "Vrem autobuze de noapte.")
        for _ in range(10):
            event = ws.receive_json()
            if event["type"] != "map_updated":
                continue
            if any(
                p["text"] == "Vrem autobuze de noapte." for p in event["data"]["points"]
            ):
                break
        else:
            pytest.fail("no map_updated with the new answer")


def test_slow_intake_does_not_freeze_the_map(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    answer(client, "ana", "Vrem autobuze de noapte.")
    process()
    [st] = client.get("/statements", params={"participant_id": "dan"}).json()

    # Gemini "hangs" on the next answer until we release it (real calls take 5-60 s)
    gemini_released = threading.Event()

    def stuck_intake(text: str | None, audio: bytes | None) -> list:
        gemini_released.wait(timeout=10)
        return []

    monkeypatch.setattr(live_module, "intake", stuck_intake)
    try:
        with client, client.websocket_connect("/ws") as ws:
            answer(client, "bogdan", "Un răspuns care așteaptă după Gemini.")
            vote = {"participant_id": "dan", "statement_id": st["id"], "value": "agree"}
            assert client.post("/votes", json=vote).status_code == 204
            voted_at = time.monotonic()

            for _ in range(10):
                event = ws.receive_json()
                ids = (
                    [p["participant_id"] for p in event["data"]["points"]]
                    if (event["type"] == "map_updated")
                    else []
                )
                if "dan" in ids:
                    break
            else:
                pytest.fail("the vote never reached the map")

            # the map moved on while Gemini was still stuck on bogdan's answer
            assert not gemini_released.is_set()
            assert time.monotonic() - voted_at < 5
            gemini_released.set()
    finally:
        gemini_released.set()


def test_failed_intake_is_retried_on_time(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(live_module, "RETRY_EVERY_S", 0.5)
    calls: list[float] = []

    def gemini_down(text: str | None, audio: bytes | None) -> list:
        calls.append(time.monotonic())
        raise RuntimeError("503 high demand")

    monkeypatch.setattr(live_module, "intake", gemini_down)
    with client:
        rid = answer(client, "ana", "Vrem autobuze de noapte.")
        deadline = time.monotonic() + 5
        while len(calls) < 3 and time.monotonic() < deadline:
            time.sleep(0.05)

    assert len(calls) >= 3, f"only {len(calls)} attempts in 5 s"
    gaps = [b - a for a, b in itertools.pairwise(calls)]
    assert all(0.4 < g < 1.5 for g in gaps), gaps
    with db.SessionLocal() as s:
        row = s.get(ResponseRow, rid)
        assert row.status == "failed" and row.text == "Vrem autobuze de noapte."
