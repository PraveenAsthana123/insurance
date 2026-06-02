#!/usr/bin/env python3
"""Create or verify the local Kivi Ollama model alias.

This works against a host or remote Ollama HTTP endpoint. It avoids requiring the
Ollama CLI and is useful for other projects that only know OLLAMA_HOST.
"""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

DEFAULT_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_BASE = os.environ.get("BASE_MODEL", "gemma3:1b")
DEFAULT_KIVI = os.environ.get("KIVI_MODEL", "kivi:local")
SYSTEM_PROMPT = (
    "You are Kivi, a concise enterprise operations agent for INSUR Beverage. "
    "Answer with practical, auditable, production-safe guidance. If a task "
    "requires external system changes, describe the action and required approval "
    "instead of claiming it was performed."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Setup local Kivi model alias in Ollama.")
    parser.add_argument("--ollama-host", default=DEFAULT_HOST)
    parser.add_argument("--base-model", default=DEFAULT_BASE)
    parser.add_argument("--kivi-model", default=DEFAULT_KIVI)
    parser.add_argument("--check-only", action="store_true")
    return parser.parse_args()


def request_json(url: str, payload: dict | None = None, timeout: float = 120.0) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def models(host: str) -> set[str]:
    payload = request_json(f"{host.rstrip('/')}/api/tags", timeout=5.0)
    return {str(row.get("name")) for row in payload.get("models", []) if row.get("name")}


def main() -> int:
    args = parse_args()
    host = args.ollama_host.rstrip("/")
    existing = models(host)
    if args.kivi_model in existing:
        print(f"present: {args.kivi_model}")
        return 0
    if args.check_only:
        print(f"missing: {args.kivi_model}")
        return 1
    if args.base_model not in existing:
        print(f"missing base model: {args.base_model}. Pull it first with: ollama pull {args.base_model}")
        return 2
    payload = {
        "model": args.kivi_model,
        "from": args.base_model,
        "system": SYSTEM_PROMPT,
        "parameters": {"temperature": 0.2, "num_ctx": 4096, "num_predict": 256},
        "stream": False,
    }
    try:
        result = request_json(f"{host}/api/create", payload=payload)
    except urllib.error.HTTPError as exc:
        print(exc.read().decode("utf-8"))
        return 3
    print(json.dumps(result, sort_keys=True))
    print(f"created: {args.kivi_model} from {args.base_model}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
