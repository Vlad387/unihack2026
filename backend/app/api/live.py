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
from app.api.models import ResponseRow, StatementRow, VoteRow
from app.clustering import bridges, cluster
from app.schemas import (
    BridgesUpdated,
    ClusterResult,
    ConsultationEvent,
    MapUpdated,
    Statement,
    Vote,
)

log = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
# a failed intake (e.g. Gemini down) waits this long before its next attempt
RETRY_EVERY_S = 15.0
INTAKE_PARALLEL = 8


def pending_response_ids() -> list[str]:
    with db.SessionLocal() as s:
        return list(
            s.scalars(
                select(ResponseRow.id)
                .where(ResponseRow.status.in_(["pending", "failed"]))
                .where(ResponseRow.attempts < MAX_ATTEMPTS)
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


def load_inputs() -> tuple[list[Statement], list[Vote]]:
    """Approved statements + votes on them. The composite key already keeps one vote
    per (participant, statement), so the 'latest vote wins' rule holds here."""
    with db.SessionLocal() as s:
        rows = s.scalars(
            select(StatementRow)
            .where(StatementRow.flag.is_(None))
            .order_by(StatementRow.created_at)
        ).all()
        approved = {r.id for r in rows}
        votes = [
            Vote.model_validate(
                {
                    "participant_id": v.participant_id,
                    "statement_id": v.statement_id,
                    "value": v.value,
                }
            )
            for v in s.scalars(select(VoteRow))
            if v.statement_id in approved
        ]
        return [r.to_schema() for r in rows], votes


def with_texts(result: ClusterResult, statements: list[Statement]) -> ClusterResult:
    said: dict[str, list[str]] = {}
    for st in statements:
        if st.author_id:
            said.setdefault(st.author_id, []).append(st.text)
    points = [
        p.model_copy(update={"text": " ".join(said[p.participant_id])})
        if p.participant_id in said
        else p
        for p in result.points
    ]
    return result.model_copy(update={"points": points})


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
        self._jobs: set[asyncio.Task[None]] = set()
        self.clients: set[WebSocket] = set()
        self.result = ClusterResult(camps=[], points=[])
        self.bridges: list[Statement] = []

    def notify(self) -> None:
        """Data changed (vote, finished intake): rebuild the map soon."""
        self._map_wake.set()

    def new_response(self) -> None:
        self._intake_wake.set()

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
                self.notify()
            else:
                self._retry_after[response_id] = time.monotonic() + RETRY_EVERY_S
                # wake the intake loop exactly when the retry is due, not on its next lap
                asyncio.get_running_loop().call_later(
                    RETRY_EVERY_S, self._intake_wake.set
                )
        finally:
            self._in_flight.discard(response_id)

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
        common = await asyncio.to_thread(bridges, votes, result.camps)
        self.result, self.bridges = with_texts(result, statements), common
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
        try:
            await asyncio.gather(self._intake_loop(), self._map_loop())
        finally:
            for job in list(self._jobs):
                job.cancel()


live = Live()
