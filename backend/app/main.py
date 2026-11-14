import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app import db
from app.api import (
    chat,
    clusters,
    proposals,
    reports,
    responses,
    statements,
    votes,
    ws,
)
from app.api.live import live
from app.api.ratelimit import client_ip, enforce

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db.init_db()
    live.reset()
    worker = asyncio.create_task(live.run())
    yield
    worker.cancel()


app = FastAPI(title="CityMind API", lifespan=lifespan)


# Runs before FastAPI parses the multipart body, so oversized or rate-limited uploads
# are refused without reading them. Added before CORS so CORS wraps its 413/429 replies.
@app.middleware("http")
async def guard_answers(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/responses":
        size = request.headers.get("content-length", "")
        if size.isdigit() and int(size) > responses.MAX_REQUEST_BYTES:
            return JSONResponse({"detail": "request too large"}, status_code=413)
        try:
            enforce((responses.PER_IP, client_ip(request)), (responses.GLOBAL, "all"))
        except HTTPException as e:
            return JSONResponse({"detail": e.detail}, status_code=e.status_code)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    # open locally; on the server set CORS_ORIGINS=https://<your-site>.vercel.app
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (responses, statements, votes, clusters, proposals, chat, reports, ws):
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
