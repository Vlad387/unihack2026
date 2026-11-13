import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.db import db_ok, init_db

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="CityMind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # shortcut: open CORS for the hackathon; restrict to the frontend domain after deploy
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> JSONResponse:
    try:
        ok = db_ok()
    except OperationalError:
        log.exception("database unreachable")
        ok = False
    return JSONResponse({"db": "ok" if ok else "down"}, status_code=200 if ok else 503)
