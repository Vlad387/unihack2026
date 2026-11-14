"""New camps get AI names (name_camps) once; failures never block the live map."""

import asyncio
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.agents import AgentError
from app.api import camp_names
from app.api.live import live
from app.main import app
from tests.test_camp_ids import latecomer_votes_with_group_a
from tests.test_proposals import with_camps


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


def names() -> list[str]:
    return [c.name for c in live.result.camps]


def test_new_camps_get_ai_names_once(client: TestClient, fake_gemini) -> None:
    with_camps(client)
    assert len(fake_gemini.naming) == 1
    assert all(n.startswith("Nume ") for n in names()), names()
    assert all(c.description == "Descriere de test." for c in live.result.camps)
    # the API serves the AI names too
    assert {c["name"] for c in client.get("/clusters").json()["camps"]} == set(names())


def test_surviving_camps_are_not_renamed_on_every_vote(
    client: TestClient, fake_gemini
) -> None:
    with_camps(client)
    before = names()
    latecomer_votes_with_group_a(client)
    asyncio.run(live.recompute())
    asyncio.run(live.recompute())
    assert names() == before
    assert len(fake_gemini.naming) == 1


def test_ai_names_survive_a_restart_without_asking_gemini_again(
    client: TestClient, fake_gemini
) -> None:
    with_camps(client)
    before = names()
    live.reset()  # server restart
    asyncio.run(live.recompute())
    assert names() == before
    assert len(fake_gemini.naming) == 1


def test_failure_keeps_generic_names_and_pauses_naming(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = []

    def quota_exhausted(camps, taken=None):
        calls.append(1)
        raise AgentError("429 quota")

    monkeypatch.setattr(camp_names, "name_camps", quota_exhausted)
    with_camps(client)
    assert names() and all(n.startswith("Tabăra ") for n in names())
    tried = len(calls)
    asyncio.run(live.recompute())
    asyncio.run(live.recompute())
    assert len(calls) == tried, "no Gemini call on every vote while paused"

    # after the pause, the next map update tries again
    live.namer._retry_at = 0.0
    asyncio.run(live.recompute())
    assert len(calls) == tried + 1


def test_a_hanging_gemini_never_blocks_the_map(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(camp_names, "TIMEOUT_S", 0.2)

    def hangs(camps, taken=None):
        time.sleep(2)
        return camps

    monkeypatch.setattr(camp_names, "name_camps", hangs)
    started = time.monotonic()
    with_camps(client)
    assert names() and all(n.startswith("Tabăra ") for n in names())
    # with_camps updates the map a few times; each waits at most TIMEOUT_S for naming
    assert time.monotonic() - started < 10
