"""Demo loader (seed fixture, no Gemini) + the empty-timeout-error regression."""

import asyncio
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import db
from app.api import demo
from app.api import proposals as proposals_module
from app.api.live import live
from app.api.models import ResponseRow, StatementRow, VoteRow


@pytest.fixture(autouse=True)
def sqlite(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
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


def test_load_gives_the_expected_demo_map(fake_gemini) -> None:
    assert demo.load() == (50, 737)
    counts = demo.status()
    assert counts["demo_participants"] == 50
    assert counts["demo_statements"] == 50 and counts["demo_votes"] == 737
    assert counts["real_responses"] == counts["real_votes"] == 0

    asyncio.run(live.recompute())
    # Eidrien's baseline for this fixture (seed/HANDOFF_PITCH.md)
    assert sorted(c.size for c in live.result.camps) == [15, 35]
    assert len(live.bridges) == 4
    assert not fake_gemini, "intake/mediate never called while loading"


def test_reload_is_idempotent_and_keeps_real_votes_on_demo_statements() -> None:
    demo.load()
    with db.SessionLocal() as s:
        s.add(ResponseRow(id="r-real", participant_id="ana", text="x", status="done"))
        s.add(
            VoteRow(
                participant_id="ana", statement_id="seed-statement-001", value="agree"
            )
        )
        s.commit()

    demo.load()
    counts = demo.status()
    assert (counts["demo_statements"], counts["demo_votes"]) == (50, 737)
    assert (counts["real_responses"], counts["real_votes"]) == (1, 1)


def test_demo_rows_link_statements_to_their_source_answers() -> None:
    demo.load()
    with db.SessionLocal() as s:
        st = s.get(StatementRow, "seed-statement-017")
        resp = s.get(ResponseRow, st.response_id)
        assert st.author_id == resp.participant_id == "seed-017"
        assert resp.status == "done" and resp.text  # the original seed answer


def test_reset_needs_yes_and_then_deletes_everything() -> None:
    demo.load()
    with pytest.raises(SystemExit, match="--yes"):
        demo.main(["reset"])
    assert demo.status()["demo_votes"] == 737

    demo.main(["reset", "--yes"])
    assert all(v == 0 for v in demo.status().values())
    with db.SessionLocal() as s:
        assert s.scalars(select(StatementRow)).first() is None


def test_a_map_timeout_is_reported_as_a_failed_round(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # nothing computes the first map, so the round's wait times out
    monkeypatch.setattr(proposals_module, "MAP_READY_TIMEOUT_S", 0.05)
    live.round_running = True
    asyncio.run(proposals_module.run_round())
    status = proposals_module.round_status()
    assert status.state == "failed"
    assert status.error == "TimeoutError"
