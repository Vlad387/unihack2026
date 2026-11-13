"""Seed texts with SYNTHETIC votes, never measured citizen votes."""

import json
from pathlib import Path
from time import perf_counter

import numpy as np

from app.clustering import bridges, cluster
from app.schemas import Statement, Vote


def make_inputs(count: int = 50) -> tuple[list[Statement], list[Vote]]:
    if count not in (50, 60):
        raise ValueError("Demo supports 50 or 60 participants")
    rows = json.loads(
        (Path(__file__).resolve().parents[3] / "seed/responses.json").read_text()
    )
    statements = [
        Statement(id=r["id"], text=r["text"], author_id=r["id"]) for r in rows
    ]
    statements += [
        Statement(
            id=f"seed-load-{i}",
            text="Răspuns sintetic de încărcare.",
            author_id=f"seed-load-{i}",
        )
        for i in range(count - 50)
    ]
    participants = [s.author_id for s in statements]
    anchors = [
        "Terasele să închidă la 23.",
        "Să limităm muzica în exterior.",
        "Cluburile să rămână deschise târziu.",
        "Să avem concerte nocturne.",
        "Transportul de noapte să fie prioritar.",
        "Să finanțăm iluminatul stradal.",
    ]
    statements += [
        Statement(id=f"demo-{i}", text=text) for i, text in enumerate(anchors)
    ]
    statements.append(Statement(id="demo-bridge", text="Să păstrăm centrul curat."))
    patterns = [[1, 1, -1, -1, 0, 0], [-1, -1, 1, 1, 0, 0], [0, 0, -1, -1, 1, 1]]
    values = {-1: "disagree", 0: "pass", 1: "agree"}
    votes = []
    for i, pid in enumerate(participants):
        for j, sign in enumerate(patterns[i % 3]):
            votes.append(
                Vote(participant_id=pid, statement_id=f"demo-{j}", value=values[sign])
            )
        votes.append(
            Vote(participant_id=pid, statement_id="demo-bridge", value="agree")
        )
    return statements, votes


def main() -> None:
    print("SYNTHETIC votes, not measured consensus. Import warm-up complete.")
    for count in (50, 60):
        statements, votes = make_inputs(count)
        timings = []
        for _ in range(5):
            start = perf_counter()
            result = cluster(statements, votes)
            common = bridges(votes, result.camps)
            timings.append(perf_counter() - start)
        print(
            f"{count} participants: camps={[(c.name, c.size) for c in result.camps]}, "
            f"noise={sum(p.camp_id is None for p in result.points)}"
        )
        print("Bridges:", [s.text for s in common])
        print(f"Seconds: median={np.median(timings):.3f}, max={max(timings):.3f}")
        assert len(result.points) == count
        assert common
        assert max(timings) < 2, "Live performance target missed on this machine"


if __name__ == "__main__":
    main()
