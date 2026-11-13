"""The loader fixture must remain reproducible, varied, and usable by pure clustering."""

import json
import runpy
import shutil
import subprocess
import sys
from pathlib import Path
from typing import IO

import pytest

from app.clustering import bridges, cluster
from app.clustering.evaluate import SEED, load_seed, retained_members


def test_fixture_references_unique_votes_and_all_participants() -> None:
    statements, votes = load_seed()
    participants = {f"seed-{i:03}" for i in range(1, 51)}
    assert {s.author_id for s in statements} == participants
    assert {v.participant_id for v in votes} == participants
    assert {v.value for v in votes} == {"agree", "disagree", "pass"}
    assert len({(v.participant_id, v.statement_id) for v in votes}) == len(votes)
    by_id = {s.id: s for s in statements}
    assert len(by_id) == len(statements) == 50
    assert all(v.statement_id in by_id for v in votes)
    assert all(by_id[v.statement_id].author_id != v.participant_id for v in votes)
    assert len(votes) < len(participants) * (len(statements) - 1)
    result = cluster(statements, votes)
    assert len(result.points) == 50
    assert 2 <= len(result.camps) <= 3
    assert bridges(votes, result.camps)
    for camp in result.camps:
        values = [
            {
                v.value
                for v in votes
                if v.statement_id == s.id and v.participant_id in camp.member_ids
            }
            for s in statements
        ]
        assert any({"agree", "disagree"} <= seen for seen in values)
    assert result == cluster(list(reversed(statements)), list(reversed(votes)))


def test_fixture_generator_is_reproducible_without_writing() -> None:
    subprocess.run(
        [sys.executable, str(SEED / "build_votes.py"), "--check"], check=True
    )
    rows = json.loads((SEED / "responses.json").read_text(encoding="utf-8"))
    assert all(s.author_id in {r["id"] for r in rows} for s in load_seed()[0])


def test_stability_matching_is_one_to_one_and_preserves_noise() -> None:
    assert retained_members([0, 0, 1, 1, -1], [4, 4, 2, 2, -1]) == 5
    assert retained_members([0, 0, 0, 0], [1, 1, 2, 2]) == 2
    assert retained_members([-1, -1, 0, 0], [-1, 0, 1, 1]) == 3
    assert retained_members([-1, -1], [-1, -1]) == 2
    assert retained_members([0, 0], [-1, -1]) == 0


def test_fixture_generation_and_check_with_windows_default_encoding(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    script = tmp_path / "build_votes.py"
    shutil.copyfile(SEED / "build_votes.py", script)
    shutil.copyfile(SEED / "responses.json", tmp_path / "responses.json")
    original_open = Path.open

    def windows_open(
        path: Path, mode: str = "r", *args: object, **kwargs: object
    ) -> IO:
        if "b" not in mode and kwargs.get("encoding") in (None, "locale"):
            kwargs["encoding"] = "cp1252"
        return original_open(path, mode, *args, **kwargs)

    with monkeypatch.context() as patch:
        patch.setattr(Path, "open", windows_open)
        patch.setattr(sys, "argv", [str(script)])
        runpy.run_path(str(script), run_name="__main__")
        patch.setattr(sys, "argv", [str(script), "--check"])
        runpy.run_path(str(script), run_name="__main__")
        statements, _ = load_seed()
        assert statements[0].text == "Terasele ar trebui să închidă la ora 23."
    for name in ("statements.json", "votes.json"):
        assert json.loads((tmp_path / name).read_text(encoding="utf-8")) == json.loads(
            (SEED / name).read_text(encoding="utf-8")
        )
