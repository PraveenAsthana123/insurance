"""/api/v1/changelog · Iter 34 · API change log."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/changelog", tags=["changelog"])


# Curated changelog · each iteration adds 1+ entries
_ENTRIES = [
    {"iter": 21, "date": "2026-06-09", "type": "added", "title": "/api/v1/alerts/* · counts + activity + bulk HITL"},
    {"iter": 21, "date": "2026-06-09", "type": "added", "title": "Cmd+K global search"},
    {"iter": 22, "date": "2026-06-09", "type": "added", "title": "Dark mode + Skeleton loaders + Playwright smoke"},
    {"iter": 23, "date": "2026-06-09", "type": "added", "title": "/alerts/stream SSE + Toast system + ErrorBoundary universal"},
    {"iter": 24, "date": "2026-06-09", "type": "added", "title": "Optimistic HITL + Favorites + TopProgressBar + fetchRetry"},
    {"iter": 25, "date": "2026-06-09", "type": "added", "title": "IdempotencyMiddleware + Vulnerability tracker + Grafana JSON"},
    {"iter": 26, "date": "2026-06-09", "type": "added", "title": "Pagination + PII redactor + k6 CI + RBAC role-dep"},
    {"iter": 27, "date": "2026-06-09", "type": "fixed", "title": "PII phone regex · 14 entity types"},
    {"iter": 27, "date": "2026-06-09", "type": "added", "title": "ETag/304 + mutmut + data quality runner"},
    {"iter": 28, "date": "2026-06-09", "type": "added", "title": "Feature flags + HMAC sign + Security scanner + vitest snapshots"},
    {"iter": 29, "date": "2026-06-10", "type": "added", "title": "Audit HMAC chain + Job queue + Service health + Backup drill + Webhooks"},
    {"iter": 30, "date": "2026-06-10", "type": "added", "title": "JWT session + API version + Audit search + Service registry + DrillDownBar"},
    {"iter": 31, "date": "2026-06-10", "type": "added", "title": "Prometheus /metrics + tenant scope + envelope crypto + CSP nonce + approvals"},
    {"iter": 32, "date": "2026-06-10", "type": "added", "title": "K8s probes + retention enforcer + CORS view + rate-limit view + notifications"},
    {"iter": 33, "date": "2026-06-10", "type": "added", "title": "Latency histograms + Migration tracker + Audit export + Heartbeat + Webhook nonce"},
    {"iter": 34, "date": "2026-06-10", "type": "added", "title": "WebSocket broadcast + tenant config + API changelog + per-process tags + OpenAPI export"},
]


@router.get("/health")
def health():
    return {"status": "ok", "module": "changelog", "n_entries": len(_ENTRIES)}


@router.get("")
def list_changelog(since: str | None = None, type: str | None = None, limit: int = 50):
    rows = _ENTRIES
    if since:
        rows = [r for r in rows if r["date"] >= since]
    if type:
        rows = [r for r in rows if r["type"] == type]
    rows = sorted(rows, key=lambda r: (r["iter"], r["date"]), reverse=True)
    return {"changelog": rows[:limit], "count": len(rows)}


@router.get("/summary")
def summary():
    by_type: dict[str, int] = {}
    iters = set()
    for r in _ENTRIES:
        by_type[r["type"]] = by_type.get(r["type"], 0) + 1
        iters.add(r["iter"])
    return {
        "total": len(_ENTRIES),
        "by_type": by_type,
        "n_iterations": len(iters),
        "iterations": sorted(iters),
    }
