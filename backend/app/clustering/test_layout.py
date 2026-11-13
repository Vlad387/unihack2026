"""Display alignment must preserve membership, geometry and input objects."""

import numpy as np
import pytest

from app.clustering.layout import align_layout
from app.schemas import Camp, ClusterResult, Point


def make_map(coords: np.ndarray, camp_id: str = "c") -> ClusterResult:
    members = [f"p{i}" for i in range(len(coords))]
    return ClusterResult(
        camps=[
            Camp(
                id=camp_id,
                name=camp_id,
                description="",
                size=len(members),
                member_ids=members,
            )
        ],
        points=[
            Point(
                participant_id=pid,
                x=float(xy[0]),
                y=float(xy[1]),
                camp_id=camp_id,
                text=pid,
            )
            for pid, xy in zip(members, coords)
        ],
    )


@pytest.mark.parametrize("reflection", [False, True])
def test_alignment_recovers_frame_and_places_new_people(reflection: bool) -> None:
    square = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [2.0, 2.0]])
    transform = np.array([[0.0, -1.0], [1.0, 0.0]])
    if reflection:
        transform[:, 0] *= -1
    previous = make_map(square[:4], "old")
    current = make_map(square @ transform + [3.0, 4.0], "new")
    saved_current, saved_previous = (
        current.model_copy(deep=True),
        previous.model_copy(deep=True),
    )
    aligned = align_layout(current, previous)
    np.testing.assert_allclose([[p.x, p.y] for p in aligned.points], square, atol=1e-12)
    assert aligned.camps == current.camps
    assert [p.model_dump(exclude={"x", "y"}) for p in aligned.points] == [
        p.model_dump(exclude={"x", "y"}) for p in current.points
    ]
    assert current == saved_current and previous == saved_previous


def test_alignment_without_enough_anchors_or_spread_is_noop() -> None:
    current = make_map(np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]))
    assert align_layout(current, ClusterResult(camps=[], points=[])) is current
    assert (
        align_layout(current, make_map(np.array([[0.0, 0.0], [1.0, 0.0]]))) is current
    )
    flat = make_map(np.array([[0.0, 0.0], [1.0, 0.0], [2.0, 0.0]]))
    assert align_layout(flat, flat) is flat
    noise = ClusterResult(
        camps=[], points=[Point(participant_id=f"p{i}", x=i, y=i) for i in range(3)]
    )
    assert align_layout(current, noise) is current


def test_layout_measurement_matches_frontend_viewbox_and_rms() -> None:
    from app.clustering.evaluate_layout import positions, rms

    result = make_map(np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]))
    np.testing.assert_allclose(
        positions(result, ["p0", "p1", "p2"], screen=True),
        [[48, 512], [752, 512], [48, 48]],
    )
    center = make_map(np.array([[0.0, 0.0]]))
    np.testing.assert_allclose(positions(center, ["p0"], screen=True), [[400, 280]])
    assert rms(np.array([[0.0, 0.0]]), np.array([[3.0, 4.0]])) == 5


def test_alignment_does_not_rescale_a_new_frame() -> None:
    coords = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    current = make_map(coords)
    previous = make_map(coords * 0.01)
    aligned = align_layout(current, previous)
    xy = np.array([[p.x, p.y] for p in aligned.points])
    np.testing.assert_allclose(
        np.linalg.norm(xy[:, None] - xy[None, :], axis=2),
        np.linalg.norm(coords[:, None] - coords[None, :], axis=2),
        atol=1e-12,
    )
