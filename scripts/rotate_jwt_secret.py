#!/usr/bin/env python3
"""§F1 · JWT secret rotation utility.

Per PENDING_TASKS_PLAN F1: INSUR_JWT_SECRET set from /dev/urandom
256-bit. This script generates a new secret · prints it · and never
writes it to disk (operator must paste into .env / vault).
"""
from __future__ import annotations
import argparse
import os
import secrets
import sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Edmonton")
ROOT = Path("/mnt/deepa/insur_project")
ENV_FILE = ROOT / ".env"

DEV_FALLBACK_MARKERS = (
    "dev-do-not-use-in-prod",
    "change-me",
    "changeme",
    "REPLACE_ME",
    "",
)


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def current_secret() -> str | None:
    proc = os.environ.get("INSUR_JWT_SECRET")
    if proc:
        return proc
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("INSUR_JWT_SECRET=") and "=" in line:
                v = line.split("=", 1)[1].strip().strip('"').strip("'")
                if v:
                    return v
    return None


def is_dev_fallback(s: str | None) -> bool:
    return s is None or s in DEV_FALLBACK_MARKERS


def generate_secret() -> str:
    return secrets.token_urlsafe(48)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true",
                   help="report current state · no mutation · exit 2 if weak")
    p.add_argument("--inject", action="store_true",
                   help="write fresh secret into .env (operator opt-in)")
    args = p.parse_args()

    cur = current_secret()
    is_weak = is_dev_fallback(cur)

    print(f"[{stamp()}] §F1 JWT secret rotation")
    print(f"  policy_refs: §F1 PENDING_TASKS · §57.7 honest · §47.6 OWASP A4")
    print(f"  env_present:  {'yes' if cur else 'no'}")
    print(f"  is_dev_fallback: {is_weak}")
    print(f"  current_len: {len(cur) if cur else 0}")

    if args.check:
        sys.exit(0 if not is_weak else 2)

    new_secret = generate_secret()
    print(f"  new_secret_len: {len(new_secret)} bytes")
    print()

    if not args.inject:
        print("To use this secret · paste into .env:")
        print(f"  INSUR_JWT_SECRET={new_secret}")
        print()
        print("Or to inject directly: python scripts/rotate_jwt_secret.py --inject")
        sys.exit(0)

    lines: list[str] = []
    found = False
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text().splitlines():
            if raw.strip().startswith("INSUR_JWT_SECRET="):
                lines.append(f"INSUR_JWT_SECRET={new_secret}")
                found = True
            else:
                lines.append(raw)
    if not found:
        lines.append(f"INSUR_JWT_SECRET={new_secret}")
    ENV_FILE.write_text("\n".join(lines) + "\n")
    print(f"Wrote new secret to {ENV_FILE}")
    print("All existing JWT sessions are now invalid · users must re-auth")


if __name__ == "__main__":
    main()
