"""Deterministic participant features -> UMAP layout -> HDBSCAN camps."""

import hashlib

import numpy as np
from numpy.typing import NDArray
from sklearn.cluster import HDBSCAN

from app.schemas import Camp, ClusterResult, Point, Statement, Vote


def _features(
    statements: list[Statement], votes: list[Vote]
) -> tuple[list[str], list[str], NDArray[np.float64]]:
    by_id = {s.id: i for i, s in enumerate(statements)}
    if len(by_id) != len(statements):
        raise ValueError("Statement ids must be unique")
    if any(s.flag is not None for s in statements):
        raise ValueError("Clustering accepts only approved statements")
    participants = sorted(
        {s.author_id for s in statements if s.author_id is not None}
        | {v.participant_id for v in votes}
    )
    rows = {pid: i for i, pid in enumerate(participants)}
    matrix = np.zeros((len(participants), len(statements)), dtype=np.float64)
    for statement in statements:
        if statement.author_id is not None:
            matrix[rows[statement.author_id], by_id[statement.id]] = 1
    seen: set[tuple[str, str]] = set()
    for vote in votes:
        if vote.statement_id not in by_id:
            raise ValueError("Vote references an unknown statement")
        key = (vote.participant_id, vote.statement_id)
        if key in seen:
            raise ValueError("Expected one latest vote per participant and statement")
        seen.add(key)
        matrix[rows[vote.participant_id], by_id[vote.statement_id]] = {
            "agree": 1,
            "disagree": -1,
            "pass": 0,
        }[vote.value]
    active_mask = np.any(matrix != 0, axis=1)
    active = [pid for pid, valid in zip(participants, active_mask) if valid]
    return participants, active, matrix[active_mask]


def _project(features: NDArray[np.float64]) -> NDArray[np.float64]:
    from umap import UMAP

    return UMAP(
        n_components=2,
        n_neighbors=min(10, len(features) - 1),
        n_epochs=100,
        min_dist=0.1,
        metric="euclidean",
        init="random",
        random_state=42,
        n_jobs=1,
        low_memory=True,
        compatibility_layout=True,
    ).fit_transform(features)


def warmup() -> None:
    """Compile UMAP before the API starts accepting real responses and votes."""
    _project(np.random.default_rng(42).normal(size=(12, 4)))


def cluster(statements: list[Statement], votes: list[Vote]) -> ClusterResult:
    """Cluster the participant-by-statement vote matrix, without embeddings."""
    statements = sorted(statements, key=lambda s: s.id)
    participants, active, features = _features(statements, votes)
    positions = {pid: (0.0, 0.0) for pid in participants}
    assignments: dict[str, str] = {}
    camps: list[Camp] = []
    # Equal pairwise distances contain no evidence of camps (e.g. authorship only).
    if len(active) >= 6:
        distances = np.linalg.norm(features[:, None] - features[None, :], axis=2)
        variation = np.ptp(distances[np.triu_indices(len(active), k=1)])
    else:
        variation = 0.0
    if variation > 1e-12:
        layout = _project(features)
        if not np.isfinite(layout).all():
            raise ValueError("UMAP produced nonfinite coordinates")
        labels = HDBSCAN(
            min_cluster_size=max(3, min(5, len(active) // 10)),
            min_samples=3,
            allow_single_cluster=False,
            copy=True,
        ).fit_predict(layout)
        centered = layout - layout.mean(axis=0)
        scale = np.abs(centered).max()
        normalized = centered / scale if scale else centered
        positions.update({pid: tuple(xy) for pid, xy in zip(active, normalized)})
        for label in sorted(set(labels) - {-1}):
            members = [pid for pid, value in zip(active, labels) if value == label]
            cid = "c-" + hashlib.sha256("\0".join(members).encode()).hexdigest()[:12]
            assignments.update(dict.fromkeys(members, cid))
            touched = {v.statement_id for v in votes if v.participant_id in members}
            candidates = [
                s for s in statements if s.author_id in members or s.id in touched
            ]
            authored = [s.text for s in candidates if s.author_id in members]
            camps.append(
                Camp(
                    id=cid,
                    name=f"Tabăra {len(camps) + 1}",
                    description=(
                        f"Exemplu de opinie: {authored[0][:200]}"
                        if authored
                        else "Participanți cu poziții de vot similare."
                    ),
                    size=len(members),
                    member_ids=members,
                    statements=candidates,
                )
            )
    return ClusterResult(
        camps=camps,
        points=[
            Point(
                participant_id=pid,
                x=float(positions[pid][0]),
                y=float(positions[pid][1]),
                camp_id=assignments.get(pid),
            )
            for pid in participants
        ],
    )
