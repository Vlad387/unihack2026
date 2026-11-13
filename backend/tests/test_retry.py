"""Answers survive a Gemini quota outage: endless backoff + organizer 'retry now'."""

import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import live as live_module
from app.api.live import live, retry_delay
from app.api.models import ResponseRow
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


def quota_exhausted(text: str | None, audio: bytes | None) -> list:
    raise RuntimeError("429 RESOURCE_EXHAUSTED: daily quota")


def wait_until(check, seconds: float = 5) -> None:
    deadline = time.monotonic() + seconds
    while not check():
        if time.monotonic() > deadline:
            pytest.fail("timed out")
        time.sleep(0.02)


def status_of(rid: str) -> str:
    with db.SessionLocal() as s:
        return s.get(ResponseRow, rid).status


def test_backoff_doubles_up_to_ten_minutes() -> None:
    assert [retry_delay(n) for n in (1, 2, 3, 4)] == [15, 30, 60, 120]
    assert retry_delay(50) == 600


def test_an_answer_is_never_given_up(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(live_module, "RETRY_EVERY_S", 0.01)
    monkeypatch.setattr(live_module, "RETRY_MAX_S", 0.05)
    calls: list[float] = []

    def down(text: str | None, audio: bytes | None) -> list:
        calls.append(time.monotonic())
        return quota_exhausted(text, audio)

    monkeypatch.setattr(live_module, "intake", down)
    with client:
        rid = client.post(
            "/responses", data={"participant_id": "ana", "text": "Vrem autobuze."}
        ).json()["id"]
        # the old code stopped after 5 attempts
        wait_until(lambda: len(calls) >= 8)

    with db.SessionLocal() as s:
        row = s.get(ResponseRow, rid)
        assert row.status == "failed" and row.text == "Vrem autobuze."


def test_retry_now_skips_the_backoff_once_gemini_is_back(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # a long backoff: without "retry now" the answer would wait 30 s
    monkeypatch.setattr(live_module, "RETRY_EVERY_S", 30.0)
    real_intake = live_module.intake
    monkeypatch.setattr(live_module, "intake", quota_exhausted)
    with client:
        rid = client.post(
            "/responses", data={"participant_id": "ana", "text": "Vrem autobuze."}
        ).json()["id"]
        wait_until(lambda: status_of(rid) == "failed")
        assert client.get("/responses/stats").json() == {
            "pending": 0,
            "failed": 1,
            "done": 0,
        }

        # billing enabled / new day: Gemini answers again
        monkeypatch.setattr(live_module, "intake", real_intake)
        assert client.post("/responses/retry").status_code == 200
        wait_until(lambda: status_of(rid) == "done", seconds=3)
        assert client.get("/responses/stats").json()["done"] == 1


def test_stats_and_retry_need_the_organizer_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ORGANIZER_TOKEN", "s3cret")
    assert client.get("/responses/stats").status_code == 401
    assert client.post("/responses/retry").status_code == 401
    ok = {"X-Organizer-Token": "s3cret"}
    assert client.get("/responses/stats", headers=ok).status_code == 200
