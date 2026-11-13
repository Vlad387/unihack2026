"""Deterministic participant features -> UMAP layout -> HDBSCAN camps."""

import hashlib

import numpy as np
from numpy.typing import NDArray
from sklearn.cluster import HDBSCAN
from umap import UMAP

from app.schemas import Camp, ClusterResult, Point, Statement, Vote


def _unit(vector: NDArray[np.float64]) -> NDArray[np.float64]:
    norm = np.linalg.norm(vector)
    return vector / norm if norm else vector


def _features(
    statements: list[Statement], votes: list[Vote]
) -> tuple[list[str], list[str], NDArray[np.float64]]:
    by_id = {s.id: s for s in statements}
    if len(by_id) != len(statements):
        raise ValueError("Statement ids must be unique")
    if any(s.flag is not None for s in statements):
        raise ValueError("Clustering accepts only approved statements")
    vectors: dict[str, NDArray[np.float64]] = {}
    dimensions: set[int] = set()
    for statement in statements:
        if statement.embedding is None:
            continue
        vector = np.asarray(statement.embedding, dtype=np.float64)
        if vector.ndim != 1 or not vector.size or not np.isfinite(vector).all():
            raise ValueError("Embeddings must be nonempty finite vectors")
        norm = np.linalg.norm(vector)
        if not np.isfinite(norm) or norm == 0:
            raise ValueError("Embeddings must have a finite nonzero norm")
        dimensions.add(vector.size)
        vectors[statement.id] = vector / norm
    if len(dimensions) > 1:
        raise ValueError("Embedding dimensions must match")
    participants = sorted(
        {s.author_id for s in statements if s.author_id is not None}
        | {v.participant_id for v in votes}
    )
    stances: dict[str, dict[str, int]] = {pid: {} for pid in participants}
    for statement in statements:
        if statement.author_id is not None:
            stances[statement.author_id][statement.id] = 1
    seen: set[tuple[str, str]] = set()
    for vote in votes:
        if vote.statement_id not in by_id:
            raise ValueError("Vote references an unknown statement")
        key = (vote.participant_id, vote.statement_id)
        if key in seen:
            raise ValueError("Expected one latest vote per participant and statement")
        seen.add(key)
        stances[vote.participant_id][vote.statement_id] = {
            "agree": 1,
            "disagree": -1,
            "pass": 0,
        }[vote.value]
    embedded_ids = sorted(vectors)
    active, features = [], []
    for pid in participants:
        signs = np.array([stances[pid].get(sid, 0) for sid in embedded_ids])
        if not np.any(signs):
            continue
        semantic = sum(
            (sign * vectors[sid] for sid, sign in zip(embedded_ids, signs)),
            start=np.zeros(next(iter(dimensions))),
        )
        # Keep vote disagreement even when semantic vectors cancel each other.
        feature = np.concatenate([_unit(semantic), _unit(signs.astype(float))])
        active.append(pid)
        features.append(_unit(feature))
    return participants, active, np.asarray(features, dtype=np.float64)


def cluster(statements: list[Statement], votes: list[Vote]) -> ClusterResult:
    """Use supplied embeddings only; missing evidence leaves participants unassigned."""
    statements = sorted(statements, key=lambda s: s.id)
    participants, active, features = _features(statements, votes)
    positions = {pid: (0.0, 0.0) for pid in participants}
    assignments: dict[str, str] = {}
    camps: list[Camp] = []
    # Two camps of at least three people need six evidenced participants.
    if len(active) >= 6 and len(np.unique(features, axis=0)) > 1:
        layout = UMAP(
            n_components=2,
            n_neighbors=min(10, len(active) - 1),
            min_dist=0.1,
            metric="euclidean",
            init="random",
            random_state=42,
            n_jobs=1,
            compatibility_layout=True,
        ).fit_transform(features)
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
                        authored[0][:200]
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
