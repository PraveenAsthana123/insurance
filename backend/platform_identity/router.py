"""GET /api/v1/platform-identity · §107 time + user + host stamp."""
from __future__ import annotations

import getpass
import platform
import time
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/platform-identity", tags=["platform-identity"])


@router.get("")
def stamp():
    """Returns the §107 triple-stamp · usable on every UI tile + API consumer."""
    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()
    return {
        "ts_utc": now_utc.isoformat(),
        "ts_local": now_local.isoformat(),
        "tz": time.strftime("%Z"),
        "tz_offset": time.strftime("%z"),
        "actor_user": getpass.getuser(),
        "actor_host": platform.node().split(".")[0],
        "actor_kind": "api-call",
        "platform_version": "insur-project / Iter 86 / §107",
        "spec": "§107 time + date + user stamp",
    }
