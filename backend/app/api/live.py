"""The live worker: intake -> clustering -> WebSocket broadcast.

ONE worker does all slow work in order, so an older result can never overwrite a newer
one (no races between background jobs). Endpoints only write to the DB and call notify().
"""

import asyncio
import logging

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
# failed intakes (e.g. Gemini down) are retried this often even if nothing else happens
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
                .limit(INTAKE_PARALLEL)
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
        except (
            Exception
        ) as e:  # Gemini down or bad output: keep the answer, retry later
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


class Live:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        # asyncio.Event binds to one event loop: recreate it for each app startup
        self._wake = asyncio.Event()
        self.clients: set[WebSocket] = set()
        self.result = ClusterResult(camps=[], points=[])
        self.bridges: list[Statement] = []

    def notify(self) -> None:
        self._wake.set()

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

    async def run_intake(self) -> int:
        ids = await asyncio.to_thread(pending_response_ids)
        done = await asyncio.gather(
            *(asyncio.to_thread(process_response, i) for i in ids)
        )
        if len(ids) == INTAKE_PARALLEL:
            self.notify()  # more may be waiting
        return sum(done)

    async def recompute(self) -> None:
        statements, votes = await asyncio.to_thread(load_inputs)
        result = await asyncio.to_thread(cluster, statements, votes)
        common = await asyncio.to_thread(bridges, votes, result.camps)
        self.result, self.bridges = with_texts(result, statements), common
        await self.broadcast(MapUpdated(data=self.result))
        await self.broadcast(BridgesUpdated(data=self.bridges))

    async def tick(self) -> None:
        await self.run_intake()
        await self.recompute()

    async def run(self) -> None:
        await self.recompute()
        while True:
            try:
                await asyncio.wait_for(self._wake.wait(), RETRY_EVERY_S)
                woke = True
            except TimeoutError:
                woke = False
            self._wake.clear()
            try:
                processed = await self.run_intake()
                if woke or processed:
                    await self.recompute()
            except Exception:  # one bad tick must not kill live updates for the demo
                log.exception("live worker tick failed")


live = Live()
