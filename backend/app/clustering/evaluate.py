"""Measure SYNTHETIC seed quality, warm latency and one-vote perturbations."""

import argparse
import hashlib
import json
import platform
import random
import statistics
from collections import Counter
from importlib.metadata import version
from pathlib import Path
from time import perf_counter

import numpy as np
from scipy.optimize import linear_sum_assignment
from sklearn.metrics import adjusted_rand_score, silhouette_score

from app.clustering import bridges, cluster
from app.clustering.algorithm import _features
from app.schemas import ClusterResult, Statement, Vote

SEED = Path(__file__).resolve().parents[3] / "seed"


def load_seed() -> tuple[list[Statement], list[Vote]]:
    statements = [
        Statement.model_validate(r)
        for r in json.loads((SEED / "statements.json").read_text())
    ]
    votes = [
        Vote.model_validate(r) for r in json.loads((SEED / "votes.json").read_text())
    ]
    return statements, votes


def labels(result: ClusterResult, participants: list[str]) -> list[int]:
    by_camp = {c.id: i for i, c in enumerate(result.camps)}
    by_pid = {p.participant_id: by_camp.get(p.camp_id, -1) for p in result.points}
    return [by_pid[pid] for pid in participants]


def retained_members(before: list[int], after: list[int]) -> int:
    """Best one-to-one label matching; never count a changed noise status as stable."""
    old_ids = sorted(set(before) - {-1})
    new_ids = sorted(set(after) - {-1})
    overlap = np.array(
        [
            [
                sum(a == old and b == new for a, b in zip(before, after))
                for new in new_ids
            ]
            for old in old_ids
        ],
        dtype=int,
    )
    kept = sum(a == b == -1 for a, b in zip(before, after))
    if old_ids and new_ids:
        rows, cols = linear_sum_assignment(-overlap)
        kept += int(overlap[rows, cols].sum())
    return kept


def benchmark(statements: list[Statement], votes: list[Vote], runs: int = 10) -> dict:
    times = []
    for _ in range(runs):
        start = perf_counter()
        result = cluster(statements, votes)
        common = bridges(votes, result.camps)
        times.append((perf_counter() - start) * 1000)
    return {
        "runs": runs,
        "median_ms": round(statistics.median(times), 3),
        "p95_ms": round(float(np.percentile(times, 95)), 3),
        "max_ms": round(max(times), 3),
        "camps": len(result.camps),
        "bridge_count": len(common),
    }


def with_load_voters(statements: list[Statement], votes: list[Vote]) -> list[Vote]:
    """Add ten demo-only voters copying existing stances; never write them to seed files."""
    extra = []
    for i in range(1, 11):
        source, pid = f"seed-{i:03}", f"seed-load-{i:03}"
        extra.extend(
            v.model_copy(update={"participant_id": pid})
            for v in votes
            if v.participant_id == source
        )
        extra.extend(
            Vote(participant_id=pid, statement_id=s.id, value="agree")
            for s in statements
            if s.author_id == source
        )
    return votes + extra


def evaluate() -> dict:
    statements, votes = load_seed()
    statements.sort(key=lambda s: s.id)
    result = cluster(statements, votes)
    common = bridges(votes, result.camps)
    participants, active, matrix = _features(statements, votes)
    group_labels = labels(result, active)
    keep = [i for i, label in enumerate(group_labels) if label != -1]
    assigned_labels = [group_labels[i] for i in keep]
    silhouette = None
    if 1 < len(set(assigned_labels)) < len(keep):
        silhouette = float(
            silhouette_score(matrix[keep], assigned_labels, metric="euclidean")
        )
    before = labels(result, participants)
    existing = {(v.participant_id, v.statement_id) for v in votes}
    candidates = [
        (pid, s.id)
        for pid in participants
        for s in statements
        if s.author_id != pid and (pid, s.id) not in existing
    ]
    rng = random.Random(20261114)
    cases = []
    for pid, sid in rng.sample(candidates, min(20, len(candidates))):
        value = rng.choice(["agree", "disagree"])
        changed = cluster(
            statements,
            votes + [Vote(participant_id=pid, statement_id=sid, value=value)],
        )
        after = labels(changed, participants)
        cases.append(
            {
                "participant_id": pid,
                "statement_id": sid,
                "value": value,
                "adjusted_rand_index": round(adjusted_rand_score(before, after), 6),
                "retained_participants": retained_members(before, after),
                "camps": len(changed.camps),
                "noise": sum(p.camp_id is None for p in changed.points),
            }
        )
    nonzero_cases = [c for c in cases if c["value"] != "pass"]
    groups = Counter(
        r["group"] for r in json.loads((SEED / "responses.json").read_text())
    )
    fingerprints = {
        name: hashlib.sha256((SEED / name).read_bytes()).hexdigest()
        for name in ("responses.json", "statements.json", "votes.json")
    }
    return {
        "synthetic": True,
        "dataset_sha256": fingerprints,
        "environment": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "packages": {
                p: version(p) for p in ["numpy", "scikit-learn", "umap-learn", "numba"]
            },
        },
        "participants": len(participants),
        "statements": len(statements),
        "votes": len(votes),
        "vote_values": dict(Counter(v.value for v in votes)),
        "coverage": {
            "seed_context_groups": dict(groups),
            "note": "Equal fictional contexts are fixture design, not population representation.",
        },
        "quality": {
            "camp_sizes": [c.size for c in result.camps],
            "noise_count": len(participants) - len(keep),
            "silhouette_original_vote_space_assigned_only": silhouette,
            "silhouette_participants": len(keep),
            "note": "Not ground-truth accuracy. Noise excluded; 2D projection not used for scoring.",
        },
        "bridges": [{"id": s.id, "text": s.text} for s in common],
        "warm_latency": {
            "50": benchmark(statements, votes),
            "60": benchmark(statements, with_load_voters(statements, votes)),
        },
        "one_added_vote_stability": {
            "cases": cases,
            "nonzero_cases": len(nonzero_cases),
            "median_ari_nonzero": statistics.median(
                c["adjusted_rand_index"] for c in nonzero_cases
            ),
            "minimum_ari_nonzero": min(c["adjusted_rand_index"] for c in nonzero_cases),
            "minimum_retained_nonzero": min(
                c["retained_participants"] for c in nonzero_cases
            ),
            "note": "Each case independently adds ONE previously missing agree/disagree vote. Pass additions are excluded because they are matrix no-ops. Labels matched one-to-one; noise preserved.",
        },
        "limitations": [
            "Designed synthetic pitch fixture, not measured citizen consensus.",
            "Timings exclude process import/Numba warm-up, API, DB, WebSocket and Gemini.",
            "ARI compares all 50 participants with noise as a label; retained counts include unchanged noise.",
            "Fixed random seed does not prevent layout, camp-ID or color changes on new votes.",
            "Only one machine and one constructed dataset; no deployment or population-quality claim.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Save a JSON report")
    args = parser.parse_args()
    report = evaluate()
    text = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.output:
        args.output.write_text(text)
    summary = {
        k: v for k, v in report.items() if k not in ("environment", "dataset_sha256")
    }
    summary["one_added_vote_stability"] = {
        k: v for k, v in report["one_added_vote_stability"].items() if k != "cases"
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
