"""SYNTHETIC layout experiment. Does not wire alignment into the API."""

import argparse
import hashlib
import json
import statistics
from pathlib import Path
from time import perf_counter

import numpy as np

from app.clustering import cluster
from app.clustering.evaluate import SEED, load_seed
from app.clustering.layout import align_layout
from app.schemas import ClusterResult, Vote


def positions(result: ClusterResult, ids: list[str], screen: bool) -> np.ndarray:
    points = {p.participant_id: np.array([p.x, p.y]) for p in result.points}
    if screen:
        # Match the current frontend's per-axis D3 extent domain and 800x560 viewBox.
        all_xy = np.array(list(points.values()))
        lo, hi = all_xy.min(axis=0), all_xy.max(axis=0)
        flat = lo == hi
        lo[flat], hi[flat] = -1, 1
        points = {
            pid: (xy - lo) / (hi - lo) * [704, -464] + [48, 512]
            for pid, xy in points.items()
        }
    return np.array([points[pid] for pid in ids])


def rms(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(a - b).sum(axis=1))))


def evaluate() -> dict:
    source = SEED / "pitch_metrics.json"
    report = json.loads(source.read_text(encoding="utf-8"))
    for name, expected in report["dataset_sha256"].items():
        assert hashlib.sha256((SEED / name).read_bytes()).hexdigest() == expected
    statements, votes = load_seed()
    baseline = cluster(statements, votes)
    cases = []
    for case in report["one_added_vote_stability"]["cases"]:
        new_vote = Vote.model_validate(
            {k: case[k] for k in ("participant_id", "statement_id", "value")}
        )
        current = cluster(statements, votes + [new_vote])
        started = perf_counter()
        aligned = align_layout(current, baseline)
        elapsed_ms = (perf_counter() - started) * 1000
        old_ids = {p.participant_id for p in baseline.points if p.camp_id is not None}
        ids = [
            p.participant_id
            for p in current.points
            if p.camp_id is not None and p.participant_id in old_ids
        ]
        assert aligned.camps == current.camps
        row = {
            "participant_id": new_vote.participant_id,
            "statement_id": new_vote.statement_id,
            "value": new_vote.value,
            "anchors": len(ids),
            "alignment_ms": elapsed_ms,
        }
        for screen, prefix in ((False, "raw"), (True, "viewbox")):
            old = positions(baseline, ids, screen)
            row[f"{prefix}_rms_before"] = rms(positions(current, ids, screen), old)
            row[f"{prefix}_rms_after"] = rms(positions(aligned, ids, screen), old)
        cases.append(row)
    return {
        "synthetic": True,
        "cases": cases,
        "source_report_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "trials": len(cases),
        "median_raw_rms_before": statistics.median(c["raw_rms_before"] for c in cases),
        "median_raw_rms_after": statistics.median(c["raw_rms_after"] for c in cases),
        "median_viewbox_rms_before": statistics.median(
            c["viewbox_rms_before"] for c in cases
        ),
        "median_viewbox_rms_after": statistics.median(
            c["viewbox_rms_after"] for c in cases
        ),
        "viewbox_improved_or_equal_trials": sum(
            c["viewbox_rms_after"] <= c["viewbox_rms_before"] + 1e-9 for c in cases
        ),
        "max_alignment_ms": max(c["alignment_ms"] for c in cases),
        "limitations": [
            "Standalone experiment; API integration belongs to Rares and is not active yet.",
            "Rigid alignment preserves the fresh partition and pairwise distances; it does not improve ARI or stop real membership changes.",
            "ViewBox units use current D3 scaling, not physical pixels; stack fan-out, animation and phone scaling are excluded.",
            "Per-axis autoscaling and changing extents can still move the map.",
            "20 independent one-vote additions to one synthetic baseline; not a live-sequence or population validation.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = evaluate()
    if args.output:
        args.output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps({k: v for k, v in report.items() if k != "cases"}, indent=2))


if __name__ == "__main__":
    main()
