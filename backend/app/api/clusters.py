from fastapi import APIRouter

from app.api.live import live
from app.schemas import ClusterResult, Statement

router = APIRouter(tags=["map"])


@router.get("/clusters", response_model=ClusterResult)
def get_clusters() -> ClusterResult:
    """Latest map computed by the live worker (same data as the map_updated event)."""
    return live.result


@router.get("/bridges", response_model=list[Statement])
def get_bridges() -> list[Statement]:
    return live.bridges
