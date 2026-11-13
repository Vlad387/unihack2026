"""Live updates: intake jobs + ONE map loop + WebSocket broadcast.

- Intake (Gemini, 5-60 s per answer) runs as independent background jobs, so a slow
  answer never freezes the live map.
- Only the map loop computes cluster() + bridges() and broadcasts, one run at a time,
  so an older map can never overwrite a newer one.
Endpoints only write to the DB, then call new_response() or notify().
"""

import asyncio
import logging
import time

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app import db
from app.agents import intake
from app.api import camp_ids, camp_names
from app.api.map_inputs import load_inputs, with_texts
from app.api.models import ResponseRow, StatementRow
from app.clustering import bridges, cluster
from app.schemas import (
    BridgesUpdated,
    Camp,
    ClusterResult,
    ConsultationEvent,
    MapUpdated,
    Statement,
)

log = logging.getLogger(__name__)

# A failed intake (Gemini down, daily quota 429) is retried after RETRY_EVERY_S, then
# twice as long each time up to RETRY_MAX_S, forever: an answer is never given up on,
# because a daily quota can come back hours later (billing enabled, new day).
RETRY_EVERY_S = 15.0
RETRY_MAX_S = 600.0
INTAKE_PARALLEL = 8


def retry_delay(failures: int) -> float:
    return min(RETRY_EVERY_S * 2 ** (failures - 1), RETRY_MAX_S)


def pending_response_ids() -> list[str]:
    with db.SessionLocal() as s:
        return list(
            s.scalars(
                select(ResponseRow.id)
                .where(ResponseRow.status.in_(["pending", "failed"]))
                .order_by(ResponseRow.created_at)
            )
        )


def process_response(response_id: str) -> bool:
    with db.SessionLocal() as s:
        row = s.get(ResponseRow, response_id)
        if row is None:
            return False
        row.attempts += 1
        try:
            statements = intake(row.text, row.audio)
        # Gemini down or bad output: keep the answer, retry later
        except Exception as e:
            log.exception("intake failed for response %s", response_id)
            row.status, row.error = "failed", str(e)[:500]
            s.commit()
            return False
        for st in statements:
            s.add(
                StatementRow(
                    id=st.id,
                    response_id=row.id,
                    author_id=row.participant_id,
                    text=st.text,
                    flag=st.flag,
                )
            )
        row.status, row.error = "done", None
        s.commit()
        return True


async def _wait(event: asyncio.Event, timeout: float) -> None:
    try:
        await asyncio.wait_for(event.wait(), timeout)
    except TimeoutError:
        pass
    event.clear()


class Live:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        # asyncio primitives bind to one event loop: recreate them for each app startup
        self._map_wake = asyncio.Event()
        self._intake_wake = asyncio.Event()
        self._slots = asyncio.Semaphore(INTAKE_PARALLEL)
        self._in_flight: set[str] = set()
        self._retry_after: dict[str, float] = {}
        self._failures: dict[str, int] = {}
        # the app's event loop, set by run(); signals from worker threads go through it
        self._loop: asyncio.AbstractEventLoop | None = None
        self._jobs: set[asyncio.Task[None]] = set()
        self.clients: set[WebSocket] = set()
        self.result = ClusterResult(camps=[], points=[])
        self.bridges: list[Statement] = []
        # set after the first map since startup: until then `result` is empty even if
        # the DB is full (real clustering takes a while on a cold start)
        self.map_ready = asyncio.Event()
        # last non-empty camps, to keep their ids stable (None = not loaded from DB yet)
        self._known_camps: list[Camp] | None = None
        self.namer = camp_names.CampNamer()
        # proposal rounds (api/proposals.py): one mediate run at a time
        self.round_running = False
        self.round_error: str | None = None
        # support counts are computed + broadcast one at a time, so they never go back
        self.support_lock = asyncio.Lock()

    def track(self, job: asyncio.Task[None]) -> None:
        """Keep a background job alive until it ends; cancelled on shutdown."""
        self._jobs.add(job)
        job.add_done_callback(self._jobs.discard)

    def _signal(self, event: asyncio.Event) -> None:
        # Plain `def` endpoints (e.g. POST /votes) run in worker threads, and asyncio
        # Events are not thread-safe: hand the signal to the event loop from there.
        loop = self._loop
        try:
            on_loop = asyncio.get_running_loop() is loop
        except RuntimeError:
            on_loop = False
        if loop is None or on_loop:
            event.set()
        else:
            loop.call_soon_threadsafe(event.set)

    def notify(self) -> None:
        """Data changed (vote, finished intake): rebuild the map soon."""
        self._signal(self._map_wake)

    def new_response(self) -> None:
        self._signal(self._intake_wake)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.add(ws)
        # a screen that joins late gets the current state immediately
        await ws.send_text(MapUpdated(data=self.result).model_dump_json())
        await ws.send_text(BridgesUpdated(data=self.bridges).model_dump_json())

    def disconnect(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    async def broadcast(self, event: ConsultationEvent) -> None:
        msg = event.model_dump_json()
        for ws in list(self.clients):
            try:
                await ws.send_text(msg)
            except (WebSocketDisconnect, RuntimeError):
                log.info("dropping closed websocket")
                self.clients.discard(ws)

    async def _intake_job(self, response_id: str) -> None:
        try:
            async with self._slots:
                ok = await asyncio.to_thread(process_response, response_id)
            if ok:
                self._retry_after.pop(response_id, None)
                self._failures.pop(response_id, None)
                self.notify()
            else:
                failures = self._failures.get(response_id, 0) + 1
                self._failures[response_id] = failures
                delay = retry_delay(failures)
                self._retry_after[response_id] = time.monotonic() + delay
                # wake the intake loop exactly when the retry is due, not on its next lap
                asyncio.get_running_loop().call_later(delay, self._intake_wake.set)
        finally:
            self._in_flight.discard(response_id)

    def retry_failed_now(self) -> None:
        """Organizer: Gemini works again (billing on, new day) -> retry everything now."""
        self._retry_after.clear()
        self._failures.clear()
        self._signal(self._intake_wake)

    async def start_intakes(
        self, ignore_backoff: bool = False
    ) -> list[asyncio.Task[None]]:
        """Start one background job per waiting answer; does NOT wait for them."""
        ids = await asyncio.to_thread(pending_response_ids)
        now = time.monotonic()
        started = []
        for rid in ids:
            if rid in self._in_flight:
                continue
            if not ignore_backoff and self._retry_after.get(rid, 0) > now:
                continue
            self._in_flight.add(rid)
            job = asyncio.create_task(self._intake_job(rid))
            self._jobs.add(job)
            job.add_done_callback(self._jobs.discard)
            started.append(job)
        return started

    async def recompute(self) -> None:
        statements, votes = await asyncio.to_thread(load_inputs)
        result = await asyncio.to_thread(cluster, statements, votes)
        if self._known_camps is None:  # first map since startup: ids from the DB
            self._known_camps = await asyncio.to_thread(camp_ids.load_previous)
        result = camp_ids.stabilize(result, self._known_camps)
        # after stabilize (names of surviving camps kept) and before save (AI names persist)
        result = await self.namer.name_new(result)
        if result.camps:
            self._known_camps = result.camps
            await asyncio.to_thread(camp_ids.save, result.camps)
        common = await asyncio.to_thread(bridges, votes, result.camps)
        self.result, self.bridges = with_texts(result, statements), common
        self.map_ready.set()
        await self.broadcast(MapUpdated(data=self.result))
        await self.broadcast(BridgesUpdated(data=self.bridges))

    async def tick(self) -> None:
        """For tests and scripts: finish every waiting intake now, then rebuild the map."""
        await asyncio.gather(*await self.start_intakes(ignore_backoff=True))
        await self.recompute()

    async def _intake_loop(self) -> None:
        while True:
            try:
                await self.start_intakes()
            # a DB hiccup must not stop intake for the rest of the demo
            except Exception:
                log.exception("starting intake jobs failed")
            await _wait(self._intake_wake, RETRY_EVERY_S)

    async def _map_loop(self) -> None:
        while True:
            try:
                await self.recompute()
            # one bad clustering run must not kill live updates for the demo
            except Exception:
                log.exception("map update failed")
            await self._map_wake.wait()
            self._map_wake.clear()

    async def run(self) -> None:
        self._loop = asyncio.get_running_loop()
        try:
            await asyncio.gather(self._intake_loop(), self._map_loop())
        finally:
            for job in list(self._jobs):
                job.cancel()


live = Live()
