"""Give new camps real names via the name_camps agent (agents/README.md, section 14).

Runs inside the map update, after camp_ids.stabilize(), which already keeps the name of
a camp that survives. So Gemini is only asked when a camp is new ("Tabăra N").
The map update runs after every vote, so a failure (e.g. 429) pauses naming for a while
instead of calling Gemini on every vote; the map always goes out, with "Tabăra N" if needed.
"""

import asyncio
import logging
import time

from app.agents import name_camps
from app.schemas import ClusterResult

log = logging.getLogger(__name__)

GENERIC_PREFIX = "Tabăra "
TIMEOUT_S = 15.0
PAUSE_AFTER_FAILURE_S = 60.0


class CampNamer:
    def __init__(self) -> None:
        self._retry_at = 0.0

    async def name_new(self, result: ClusterResult) -> ClusterResult:
        new = [c for c in result.camps if c.name.startswith(GENERIC_PREFIX)]
        if not new or time.monotonic() < self._retry_at:
            return result
        taken = [c.name for c in result.camps if c not in new]
        try:
            named = await asyncio.wait_for(
                asyncio.to_thread(name_camps, new, taken), TIMEOUT_S
            )
        # naming is cosmetic: never let it block or break the live map
        except Exception:
            log.exception("naming camps failed, keeping generic names for now")
            self._retry_at = time.monotonic() + PAUSE_AFTER_FAILURE_S
            return result

        # copy only name + description: ids, members and statements stay ours
        by_id = {c.id: c for c in named}
        camps = [
            c.model_copy(
                update={
                    "name": by_id[c.id].name,
                    "description": by_id[c.id].description,
                }
            )
            if c.id in by_id
            else c
            for c in result.camps
        ]
        return ClusterResult(camps=camps, points=result.points)
