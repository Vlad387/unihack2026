import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app import db
from app.api import clusters, proposals, responses, statements, votes, ws
from app.api.live import live

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db.init_db()
    live.reset()
    worker = asyncio.create_task(live.run())
    yield
    worker.cancel()


app = FastAPI(title="CityMind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # open locally; on the server set CORS_ORIGINS=https://<your-site>.vercel.app
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (responses, statements, votes, clusters, proposals, ws):
    app.include_router(router.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> JSONResponse:
    try:
        ok = db.db_ok()
    except OperationalError:
        log.exception("database unreachable")
        ok = False
    return JSONResponse({"db": "ok" if ok else "down"}, status_code=200 if ok else 503)
