"""Demo data: load Eidrien's seed fixture without Gemini, show counts, reset the DB.

From backend/ (uses DATABASE_URL from the repo-root .env):
    uv run python -m app.api.demo load         # add/refresh seed-* demo data, keeps real data
    uv run python -m app.api.demo status       # real vs demo counts
    uv run python -m app.api.demo reset --yes  # DELETE EVERYTHING (real + demo)
Restart the API afterwards: it keeps the live map in memory.

Demo participants are seed-* and never count as real citizens (proposals.DEMO_PREFIX).
"""

import argparse
import json
import urllib.request
from pathlib import Path

from sqlalchemy import delete, func, select

from app import db
from app.api.models import (
    MapStateRow,
    ProposalRow,
    ProposalVoteRow,
    ResponseRow,
    StatementRow,
    VoteRow,
)
from app.api.proposals import DEMO_PREFIX
from app.schemas import Statement, Vote

SEED = Path(__file__).resolve().parents[3] / "seed"


def load(seed_dir: Path = SEED) -> tuple[int, int]:
    """Upsert the fixture with its own ids, so votes keep pointing at the right
    statements. Never deletes: real votes on demo statements survive a reload."""
    statements = [
        Statement.model_validate(s)
        for s in json.loads((seed_dir / "statements.json").read_text(encoding="utf-8"))
    ]
    votes = [
        Vote.model_validate(v)
        for v in json.loads((seed_dir / "votes.json").read_text(encoding="utf-8"))
    ]
    raw = {
        r["id"]: r["text"]
        for r in json.loads((seed_dir / "responses.json").read_text(encoding="utf-8"))
    }
    for st in statements:
        if not (st.author_id or "").startswith(DEMO_PREFIX):
            raise ValueError(f"{st.id}: demo authors must start with {DEMO_PREFIX!r}")
    for v in votes:
        if not v.participant_id.startswith(DEMO_PREFIX):
            raise ValueError(f"demo voters must start with {DEMO_PREFIX!r}")

    db.init_db()
    with db.SessionLocal() as s:
        for st in statements:
            # statement seed-statement-017 comes from response seed-017 (its author)
            s.merge(
                ResponseRow(
                    id=st.author_id,
                    participant_id=st.author_id,
                    text=raw.get(st.author_id, st.text),
                    status="done",
                )
            )
        s.flush()
        for st in statements:
            s.merge(
                StatementRow(
                    id=st.id,
                    response_id=st.author_id,
                    author_id=st.author_id,
                    text=st.text,
                    flag=None,
                )
            )
        s.flush()
        for v in votes:
            s.merge(
                VoteRow(
                    participant_id=v.participant_id,
                    statement_id=v.statement_id,
                    value=v.value,
                )
            )
        s.commit()
    return len(statements), len(votes)


def status() -> dict[str, int]:
    demo = f"{DEMO_PREFIX}%"
    with db.SessionLocal() as s:

        def count(model, column, is_demo: bool) -> int:
            cond = column.like(demo) if is_demo else column.not_like(demo)
            return s.scalar(select(func.count()).select_from(model).where(cond)) or 0

        return {
            "demo_participants": count(ResponseRow, ResponseRow.participant_id, True),
            "real_responses": count(ResponseRow, ResponseRow.participant_id, False),
            "demo_statements": count(StatementRow, StatementRow.author_id, True),
            "real_statements": count(StatementRow, StatementRow.author_id, False),
            "demo_votes": count(VoteRow, VoteRow.participant_id, True),
            "real_votes": count(VoteRow, VoteRow.participant_id, False),
            "proposals": s.scalar(select(func.count()).select_from(ProposalRow)) or 0,
        }


def reset() -> None:
    """Delete ALL data, real and demo: a clean start before the test or the pitch."""
    with db.SessionLocal() as s:
        for model in (
            ProposalVoteRow,
            ProposalRow,
            VoteRow,
            StatementRow,
            ResponseRow,
            MapStateRow,
        ):
            s.execute(delete(model))
        s.commit()


def _api_running() -> bool:
    try:
        with urllib.request.urlopen("http://localhost:8000/health", timeout=1):
            return True
    except OSError:
        return False


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.api.demo")
    parser.add_argument("command", choices=["load", "status", "reset"])
    parser.add_argument("--yes", action="store_true", help="confirm reset")
    args = parser.parse_args(argv)

    if args.command == "reset":
        if not args.yes:
            raise SystemExit("reset deletes ALL data (real + demo): add --yes")
        reset()
        print("deleted all data")
    elif args.command == "load":
        n_st, n_votes = load()
        print(f"loaded demo fixture: {n_st} statements, {n_votes} votes (no Gemini)")
    for key, value in status().items():
        print(f"  {key}: {value}")
    if args.command != "status" and _api_running():
        print("⚠️  the API is running: restart it so the live map reloads")


if __name__ == "__main__":
    main()
