"""The live map aligns each fresh layout to the previous one (clustering/layout.py)."""

import asyncio
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import live as live_module
from app.api.live import live
from app.main import app
from app.schemas import ClusterResult
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


def coords(result: ClusterResult) -> dict[str, tuple[float, float]]:
    return {p.participant_id: (p.x, p.y) for p in result.points}


def test_a_rotated_fresh_layout_is_put_back_where_people_were(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    with_camps(client)
    before = live.result
    assert len(before.points) >= 3

    # same people and camps, but UMAP "spun" the map 90 degrees and shifted it
    spun = ClusterResult(
        camps=before.camps,
        points=[
            p.model_copy(update={"x": -p.y + 0.3, "y": p.x - 0.2, "text": None})
            for p in before.points
        ],
    )
    monkeypatch.setattr(live_module, "cluster", lambda statements, votes: spun)
    asyncio.run(live.recompute())

    old, raw, now = coords(before), coords(spun), coords(live.result)
    jump = max(abs(raw[k][0] - old[k][0]) + abs(raw[k][1] - old[k][1]) for k in old)
    drift = max(abs(now[k][0] - old[k][0]) + abs(now[k][1] - old[k][1]) for k in old)
    assert jump > 0.5, "the raw layout really moved"
    assert drift < 1e-6, f"published map should be back in place, drift={drift}"
    # alignment only moves dots: camps and memberships are untouched
    assert [p.camp_id for p in live.result.points] == [p.camp_id for p in before.points]
