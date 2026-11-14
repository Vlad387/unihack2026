"""POST /chat (server-built context, assist() fallback, rate limit) and the reports API."""

import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import chat as chat_module
from app.api import demo
from app.api.live import live
from app.main import app
from app.schemas import MAX_CHAT_MESSAGES, ChatAction, ChatReply
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
    chat_module._recent.clear()
    db.init_db()
    live.reset()
    yield TestClient(app)


def ask(client: TestClient, pid: str = "p1", n: int = 1, page: str = "/vote"):
    messages = [{"role": "user", "text": "Nu înțeleg ce trebuie să fac."}] * n
    return client.post(
        "/chat", json={"participant_id": pid, "page": page, "messages": messages}
    )


def test_chat_answers_with_the_context_built_by_the_server(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen = []

    def fake_assist(messages, context):
        seen.append(context)
        return ChatReply(text="Apasă Votează.", action=ChatAction(type="vote"))

    monkeypatch.setattr(chat_module, "assist", fake_assist)
    with_camps(client)
    with client:
        # like a real screen, wait for the first map after startup
        deadline = time.monotonic() + 10
        while not client.get("/clusters").json()["camps"]:
            assert time.monotonic() < deadline, "no map"
            time.sleep(0.05)
        before = ask(client, page="/participa")
        proposal = run_round(client)
        after = ask(client)

    assert before.status_code == 200
    assert before.json() == {
        "text": "Apasă Votează.",
        "action": {"type": "vote", "prefill": None},
        "report": None,
    }
    first, second = seen
    assert first.page == "/participa" and first.question == chat_module.QUESTION
    assert first.round is None and first.proposal_text is None
    assert first.camp_names == [c.name for c in live.result.camps] != []
    assert (second.round, second.proposal_text) == (proposal["round"], proposal["text"])
    assert after.status_code == 200


def test_a_failing_assistant_still_answers_politely(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def down(messages, context):
        raise RuntimeError("429 quota")

    monkeypatch.setattr(chat_module, "assist", down)
    res = ask(client)
    assert res.status_code == 200
    assert (
        res.json()["action"]["type"] == "none"
        and "nu este disponibil" in res.json()["text"]
    )


def test_chat_limits(client: TestClient) -> None:
    assert ask(client, n=MAX_CHAT_MESSAGES + 1).status_code == 422
    codes = [ask(client, pid="spammer").status_code for _ in range(11)]
    assert codes[:10] == [200] * 10 and codes[10] == 429
    assert ask(client, pid="someone-else").status_code == 200


def test_reports_are_saved_and_listed_for_the_organizer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    first = client.post(
        "/reports",
        json={
            "participant_id": "p1",
            "kind": "abuse",
            "text": "Jignire.",
            "statement_id": "s1",
        },
    )
    assert first.status_code == 201
    body = first.json()
    assert body["id"].startswith("rep-") and body["created_at"]
    assert (
        client.post(
            "/reports",
            json={"participant_id": "p1", "kind": "bug", "text": "Butonul nu merge."},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/reports", json={"participant_id": "p1", "kind": "spam", "text": "x"}
        ).status_code
        == 422
    )

    monkeypatch.setenv("ORGANIZER_TOKEN", "s3cret")
    assert client.get("/reports").status_code == 401
    listed = client.get("/reports", headers={"X-Organizer-Token": "s3cret"}).json()
    assert [r["kind"] for r in listed] == ["bug", "abuse"]  # newest first

    demo.reset()
    assert client.get("/reports", headers={"X-Organizer-Token": "s3cret"}).json() == []
