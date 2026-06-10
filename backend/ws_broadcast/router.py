"""/ws/activity · Iter 34 · C9 simplified · server-side broadcast WebSocket.

Operator clients connect to /ws/activity · server pushes JSON events.
Per §57.7: stays connected · sends keepalive · doesn't pretend to receive.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ws-broadcast"])

# Track connected clients
_CLIENTS: set[WebSocket] = set()


async def broadcast(message: dict) -> int:
    """Send to all connected clients · return count delivered."""
    payload = json.dumps(message)
    delivered = 0
    dead: list[WebSocket] = []
    for ws in _CLIENTS:
        try:
            await ws.send_text(payload)
            delivered += 1
        except Exception:
            dead.append(ws)
    for d in dead:
        _CLIENTS.discard(d)
    return delivered


@router.websocket("/ws/activity")
async def activity_channel(ws: WebSocket):
    """Long-lived push channel for activity events.

    Server emits:
      {"type": "keepalive", "ts": ...}  every 20s
      {"type": "event", "payload": ...}  when /alerts/activity POSTed
    """
    await ws.accept()
    _CLIENTS.add(ws)
    try:
        await ws.send_text(json.dumps({
            "type": "hello",
            "ts": datetime.now(timezone.utc).isoformat(),
            "connected_clients": len(_CLIENTS),
        }))
        # Keepalive loop · keeps the connection healthy through proxies
        while True:
            await asyncio.sleep(20)
            try:
                await ws.send_text(json.dumps({
                    "type": "keepalive",
                    "ts": datetime.now(timezone.utc).isoformat(),
                }))
            except Exception:
                break
    except WebSocketDisconnect:
        logger.debug("client disconnected")
    finally:
        _CLIENTS.discard(ws)


@router.get("/ws/clients")
def list_clients():
    """Operational view · how many WS clients connected."""
    return {"connected": len(_CLIENTS), "spec": "C9 simplified · /ws/activity"}
