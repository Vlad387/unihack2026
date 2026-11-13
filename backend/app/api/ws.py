from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.live import live

router = APIRouter()


@router.websocket("/ws")
async def updates(ws: WebSocket) -> None:
    """Server -> client only: JSON {"type": ..., "data": ...} events from schemas.py."""
    await live.connect(ws)
    try:
        while True:
            # keep the socket open; clients don't need to send anything
            await ws.receive_text()
    except WebSocketDisconnect:
        live.disconnect(ws)
