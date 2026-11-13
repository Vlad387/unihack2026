"""Real clustering through DB loading, API serialization and WebSocket snapshots."""

import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api.live import live
from app.api.models import ResponseRow, StatementRow, VoteRow
from app.clustering.demo import make_inputs
from app.main import app


def test_seed_votes_reach_api_and_websocket(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'live.db'}", connect_args={"check_same_thread": False}
    )
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(
        db, "SessionLocal", sessionmaker(engine, expire_on_commit=False)
    )
    db.init_db()
    live.reset()
    statements, votes = make_inputs()
    # Demo policies need real authors to match what the API loads from persistence.
    authors = ["seed-001", "seed-001", "seed-002", "seed-002", "seed-003", "seed-003"]
    for i, author in enumerate(authors):
        next(s for s in statements if s.id == f"demo-{i}").author_id = author
    statements[-1].author_id = "seed-001"
    by_id = {s.id: s for s in statements}
    votes = [v for v in votes if by_id[v.statement_id].author_id != v.participant_id]
    try:
        with db.SessionLocal() as session:
            for statement in statements[:50]:
                session.add(
                    ResponseRow(
                        id=f"r-{statement.id}",
                        participant_id=statement.author_id,
                        text=statement.text,
                        status="done",
                    )
                )
            session.commit()
            for statement in statements:
                session.add(
                    StatementRow(
                        id=statement.id,
                        response_id=f"r-{statement.author_id}",
                        author_id=statement.author_id,
                        text=statement.text,
                    )
                )
            session.commit()
            session.add_all([VoteRow(**v.model_dump()) for v in votes])
            session.commit()
        asyncio.run(live.tick())
        client = TestClient(app)
        payload = client.get("/clusters").json()
        common = client.get("/bridges").json()
        assert len(payload["points"]) == 50
        assert len(payload["camps"]) >= 2
        assert all(p["text"] for p in payload["points"])
        assert all("statements" not in c for c in payload["camps"])
        assert "demo-bridge" in {s["id"] for s in common}
        assert all("embedding" not in s for s in common)
        with client.websocket_connect("/ws") as ws:
            assert ws.receive_json() == {"type": "map_updated", "data": payload}
            assert ws.receive_json() == {"type": "bridges_updated", "data": common}
    finally:
        live.reset()
        engine.dispose()
