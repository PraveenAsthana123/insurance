#!/usr/bin/env python3
"""Small HTTP monitor for live agent supervisor data.

This is intentionally lightweight: it exposes the same Redis-backed report used
by scripts/agent_supervisor.py so the frontend /agent-supervisor page can show
live data even when the full FastAPI backend is not running on this checkout.
"""
from __future__ import annotations

import argparse
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import agent_supervisor  # noqa: E402


class Handler(BaseHTTPRequestHandler):
    server_version = "InsurAgentSupervisorHTTP/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("agent-supervisor-http: " + fmt % args + "\n")

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Demo-Role,X-Tenant-ID")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Demo-Role,X-Tenant-ID")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/health", "/api/health"}:
            self._send_json(200, {"status": "healthy", "service": "agent-supervisor-http"})
            return
        if parsed.path != "/api/v1/agent-supervisor/report":
            self._send_json(404, {"detail": "Not Found"})
            return

        params = parse_qs(parsed.query)
        try:
            sample = max(1, min(50, int(params.get("sample", ["8"])[0])))
        except ValueError:
            sample = 8
        redis_url = getattr(self.server, "redis_url", agent_supervisor.DEFAULT_REDIS_URL)
        try:
            client = agent_supervisor.redis_client(redis_url)
            report = agent_supervisor.build_report(client, sample)
            report["status"] = "ok"
            report["detail"] = "Live agent supervisor report generated from Redis."
        except Exception as exc:
            report = {
                "generated_at": agent_supervisor.utc_now(),
                "status": "unavailable",
                "detail": f"Redis unavailable: {type(exc).__name__}: {exc}",
                "queues": {name: {"pending": 0, "completed": 0} for name in agent_supervisor.QUEUE_PAIRS},
                "pending_total": 0,
                "heartbeats": {"live": 0, "by_kind": {}, "rows": []},
                "schedules": [],
                "process_test_catalog": agent_supervisor.process_catalog_summary(),
                "recent_results": {name: [] for name in agent_supervisor.QUEUE_PAIRS},
                "recent_failure_count": 0,
                "recommendations": ["Redis is unavailable. Start Redis and workers before expecting live task movement."],
            }
        self._send_json(200, report)


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve live agent supervisor report over HTTP.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--redis-url", default=agent_supervisor.DEFAULT_REDIS_URL)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.redis_url = args.redis_url  # type: ignore[attr-defined]
    print(f"agent supervisor HTTP listening on http://{args.host}:{args.port}")
    print(f"report: http://{args.host}:{args.port}/api/v1/agent-supervisor/report?sample=10")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
