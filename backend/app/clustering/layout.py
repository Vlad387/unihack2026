"""Pure display alignment; membership and the clustering algorithm are unchanged."""

import numpy as np
from scipy.linalg import orthogonal_procrustes

from app.schemas import ClusterResult


def align_layout(current: ClusterResult, previous: ClusterResult) -> ClusterResult:
    """Fit rotation/reflection and translation on shared assigned people.

    The API supplies the previous map explicitly. No history is stored here.
    Genuine movement or membership changes remain; this only changes the frame.
    """
    old = {p.participant_id: p for p in previous.points if p.camp_id is not None}
    anchors = [
        p for p in current.points if p.camp_id is not None and p.participant_id in old
    ]
    if len(anchors) < 3:
        return current
    x = np.array([[p.x, p.y] for p in anchors], dtype=float)
    y = np.array([[old[p.participant_id].x, old[p.participant_id].y] for p in anchors])
    x_center, y_center = x.mean(axis=0), y.mean(axis=0)
    x, y = x - x_center, y - y_center
    if np.linalg.matrix_rank(x) < 2 or np.linalg.matrix_rank(y) < 2:
        return current
    rotation, _ = orthogonal_procrustes(x, y)
    points = np.array([[p.x, p.y] for p in current.points])
    # Do not fit scale: repeated noisy updates must not progressively shrink the map.
    aligned = (points - x_center) @ rotation + y_center
    if not np.isfinite(aligned).all():
        return current
    return current.model_copy(
        update={
            "points": [
                p.model_copy(update={"x": float(xy[0]), "y": float(xy[1])})
                for p, xy in zip(current.points, aligned)
            ]
        }
    )
