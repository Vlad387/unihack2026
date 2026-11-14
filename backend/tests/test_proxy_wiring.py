"""Proposal rounds use proxy() (simulated voices) before mediate(); proxy is optional."""

import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.agents import AgentError
from app.api import proposals as proposals_module
from app.api.live import live
from app.main import app
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


def test_round_publishes_simulated_voices_and_mediate_gets_them(
    client: TestClient, fake_gemini
) -> None:
    with_camps(client)
    with client:
        proposal = run_round(client)

    assert proposal["proxies"] == [
        {
            "group": "Părinți cu copii mici",
            "text": "Noi am avea nevoie de liniște.",
            "simulated": True,
        }
    ]
    assert len(fake_gemini.proxy) == 1
    asked = json.loads(fake_gemini.proxy[0]["contents"][0])
    assert asked["question"] == proposals_module.QUESTION
    # mediate was told about the missing group (fake_gemini[-1] is the mediate call)
    sent = json.loads(fake_gemini[-1]["contents"][0])
    assert [v["group"] for v in sent["simulated_voices"]] == ["Părinți cu copii mici"]


def test_a_failing_proxy_never_blocks_the_round(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def quota_exhausted(question, camps, groups=None, max_groups=2):
        raise AgentError("429 quota")

    monkeypatch.setattr(proposals_module, "proxy", quota_exhausted)
    with_camps(client)
    with client:
        proposal = run_round(client)  # asserts state == "idle", no error
    assert proposal["round"] == 1 and proposal["proxies"] == []
