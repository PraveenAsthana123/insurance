"""Shared helpers · Iter 89 · Stage-1 adapter common code."""
from __future__ import annotations

import getpass
import os
import platform
import time
from datetime import datetime, timezone

import psycopg2

from core.config import get_settings

ACTOR_USER = getpass.getuser()
ACTOR_HOST = platform.node().split(".")[0]


def stamp() -> dict:
    """§107 triple-stamp."""
    return {
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "ts_local": datetime.now().astimezone().isoformat(),
        "tz": time.strftime("%Z"),
        "actor_user": ACTOR_USER, "actor_host": ACTOR_HOST,
    }


def conn():
    return psycopg2.connect(get_settings().database_url)


def env_config(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def configured_when(key: str) -> bool:
    return bool(os.environ.get(key, ""))


def scaffold_note(env_key: str, vendor: str) -> str:
    return (f"{env_key} not set · running in scaffold mode "
            f"(no calls to {vendor} · §57.7 honest)")
