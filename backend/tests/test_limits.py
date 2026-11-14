"""Audio uploads are bounded and not kept; Gemini-costing endpoints are rate limited."""

import asyncio
import io
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import db
from app.api import live as live_module
from app.api import ratelimit, responses
from app.api.live import live
from app.api.models import ResponseRow
from app.main import app

WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 100


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


def answer(client: TestClient, ip: str | None = None, **files):
    headers = {"X-Forwarded-For": ip} if ip else {}
    return client.post(
        "/responses",
        data={"participant_id": "ana", "text": "Vrem autobuze."},
        files=files or None,
        headers=headers,
    )


def test_an_oversized_upload_is_refused_before_it_is_read(client: TestClient) -> None:
    big = io.BytesIO(b"\x00" * (responses.MAX_REQUEST_BYTES + 1))
    res = answer(client, audio=("a.webm", big, "audio/webm"))
    assert res.status_code == 413
    assert (
        answer(client, audio=("a.webm", io.BytesIO(WEBM), "audio/webm")).status_code
        == 202
    )


def test_chunked_read_stops_past_the_cap() -> None:
    upload = UploadFile(io.BytesIO(b"\x00" * (responses.MAX_AUDIO_BYTES + 1)))
    with pytest.raises(HTTPException) as e:
        asyncio.run(responses._read_capped(upload))
    assert e.value.status_code == 413
    ok = UploadFile(io.BytesIO(WEBM))
    assert asyncio.run(responses._read_capped(ok)) == WEBM


def stored_audio(rid: str) -> bytes | None:
    with db.SessionLocal() as s:
        return s.get(ResponseRow, rid).audio


def test_audio_is_deleted_after_intake_but_kept_for_a_retry(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    rid = answer(client, audio=("a.webm", io.BytesIO(WEBM), "audio/webm")).json()["id"]
    real_intake = live_module.intake

    def down(text, audio):
        raise RuntimeError("429 quota")

    monkeypatch.setattr(live_module, "intake", down)
    assert live_module.process_response(rid) is False
    assert stored_audio(rid) == WEBM, "kept: the retry needs it"

    monkeypatch.setattr(live_module, "intake", real_intake)
    assert live_module.process_response(rid) is True
    assert stored_audio(rid) is None


def test_answers_are_limited_per_ip_and_globally(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(ratelimit, "TRUST_FORWARDED", True)
    codes = [answer(client, ip="1.1.1.1").status_code for _ in range(21)]
    assert codes[:20] == [202] * 20 and codes[20] == 429
    # other IPs still get through, until the global cap protects the quota
    others = [answer(client, ip=f"2.2.2.{i}").status_code for i in range(25)]
    assert others.count(202) == responses.GLOBAL.per_minute - 20
    assert others[-1] == 429


def make_request(xff: str | None, host: str = "10.0.0.9") -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    return Request({"type": "http", "headers": headers, "client": (host, 1234)})


def test_client_ip_only_trusts_the_proxy_header_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ratelimit, "TRUST_FORWARDED", False)
    assert ratelimit.client_ip(make_request("6.6.6.6")) == "10.0.0.9"
    monkeypatch.setattr(ratelimit, "TRUST_FORWARDED", True)
    # a client-sent value comes first; the proxy appends the real one last (with :port)
    assert ratelimit.client_ip(make_request("6.6.6.6, 81.2.3.4:51234")) == "81.2.3.4"
    assert ratelimit.client_ip(make_request(None)) == "10.0.0.9"


def test_chat_cannot_dodge_the_limit_by_changing_participant_id(
    client: TestClient,
) -> None:
    def ask(pid: str) -> int:
        body = {
            "participant_id": pid,
            "page": "/",
            "messages": [{"role": "user", "text": "?"}],
        }
        return client.post("/chat", json=body).status_code

    codes = [ask(f"p{i}") for i in range(31)]
    assert codes[:30] == [200] * 30 and codes[30] == 429


def test_refused_requests_cost_no_memory_and_no_budget() -> None:
    per_key, global_cap = ratelimit.RateLimit(5), ratelimit.RateLimit(60)

    def call(key: str) -> bool:
        try:
            ratelimit.enforce((global_cap, "all"), (per_key, key))
            return True
        except HTTPException:
            return False

    # an attacker rotating 500 fresh ids in a minute: only allowed requests add keys
    allowed = sum(call(f"k{i}") for i in range(500))
    assert allowed == 60 and len(per_key._hits) == 60

    # one key over its own limit must not keep eating the global budget
    per_key2, global2 = ratelimit.RateLimit(2), ratelimit.RateLimit(10)
    for _ in range(50):
        try:
            ratelimit.enforce((per_key2, "spammer"), (global2, "all"))
        except HTTPException:
            pass
    assert len(global2._hits["all"]) == 2  # only the 2 allowed calls counted
