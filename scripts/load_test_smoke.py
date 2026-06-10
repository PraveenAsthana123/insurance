#!/usr/bin/env python3
"""Load test smoke · Iter 55 · async concurrent + p50/p95/p99 + cost.

Writes report to jobs/reports/load-testing/load-YYYYMMDD_HHMM.md
which the Top-1% scorecard (Iter 54) reads.

Cron: weekly Sunday 03:00 UTC · INSUR-LOAD-TEST
Manual: ./scripts/insur load-test
"""
import asyncio
import json
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")

REPORTS = REPO / "jobs/reports/load-testing"
REPORTS.mkdir(parents=True, exist_ok=True)


async def run_one(client, target_url: str, idx: int) -> dict:
    """Single request · returns latency + status."""
    t0 = time.perf_counter()
    try:
        r = await client.get(target_url, timeout=10)
        latency_ms = (time.perf_counter() - t0) * 1000
        return {"idx": idx, "status": r.status_code, "latency_ms": latency_ms,
                "ok": r.status_code < 400}
    except Exception as e:
        return {"idx": idx, "status": 0, "latency_ms": (time.perf_counter() - t0) * 1000,
                "ok": False, "error": type(e).__name__}


async def phase(name: str, target_url: str, n_concurrent: int, duration_s: float) -> dict:
    """Run a phase · concurrent loop for duration_s seconds."""
    import httpx
    print(f"  ▶ {name:<10} · concurrency={n_concurrent} · duration={duration_s}s")
    results = []
    t_end = time.perf_counter() + duration_s
    async with httpx.AsyncClient() as client:
        idx = 0
        while time.perf_counter() < t_end:
            tasks = [run_one(client, target_url, idx + i) for i in range(n_concurrent)]
            batch = await asyncio.gather(*tasks)
            results.extend(batch)
            idx += n_concurrent
    latencies = [r["latency_ms"] for r in results if r["ok"]]
    n_ok = sum(1 for r in results if r["ok"])
    n_err = len(results) - n_ok
    if latencies:
        p50 = statistics.median(latencies)
        p95 = sorted(latencies)[int(0.95 * len(latencies))] if len(latencies) > 20 else max(latencies)
        p99 = sorted(latencies)[int(0.99 * len(latencies))] if len(latencies) > 100 else max(latencies)
    else:
        p50 = p95 = p99 = 0
    return {
        "name": name, "target": target_url, "n_concurrent": n_concurrent,
        "duration_s": duration_s, "n_total": len(results),
        "n_ok": n_ok, "n_err": n_err, "rps": round(len(results) / duration_s, 1),
        "p50_ms": round(p50, 1), "p95_ms": round(p95, 1), "p99_ms": round(p99, 1),
        "error_rate_pct": round(100 * n_err / len(results), 2) if results else 0,
    }


async def main_async():
    ts = datetime.now(timezone.utc)
    base = os.environ.get("INSUR_TARGET_URL", "http://localhost:8001")
    target = f"{base}/healthz/live"
    print(f"Load test smoke · {ts:%Y-%m-%d %H:%M:%S} UTC · target={target}")

    # 5-phase per §47.10
    phases = []
    phases.append(await phase("smoke",   target, 1,  3))   # warm
    phases.append(await phase("load",    target, 10, 5))
    phases.append(await phase("stress",  target, 30, 5))
    phases.append(await phase("spike",   target, 50, 3))
    phases.append(await phase("soak",    target, 5,  10))  # short soak

    md = [
        f"# Load test smoke · {ts:%Y-%m-%d %H:%M:%S} UTC",
        "",
        f"- Target: `{target}`",
        f"- Phases: 5 (smoke · load · stress · spike · soak)",
        "",
        "## Per-phase results",
        "| Phase | Concurrency | Duration | Total | OK | Err | RPS | p50 | p95 | p99 | Error% |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for p in phases:
        md.append(
            f"| {p['name']} | {p['n_concurrent']} | {p['duration_s']}s | "
            f"{p['n_total']} | {p['n_ok']} | {p['n_err']} | {p['rps']} | "
            f"{p['p50_ms']}ms | {p['p95_ms']}ms | {p['p99_ms']}ms | {p['error_rate_pct']}% |"
        )
    md.append("")

    # Gate per §47.10 · pass if all 5 phases p95 < 500ms and error < 1%
    all_pass = all(p["p95_ms"] < 500 and p["error_rate_pct"] < 1 for p in phases)
    md.append(f"## Gate · {'✅ PASS' if all_pass else '⚠ FAIL'}")
    md.append("- p95 < 500ms on ALL phases · error_rate < 1%")
    md.append("")

    md_path = REPORTS / f"load-{ts:%Y%m%d_%H%M}.md"
    json_path = REPORTS / f"load-{ts:%Y%m%d_%H%M}.json"
    md_path.write_text("\n".join(md))
    json_path.write_text(json.dumps({
        "ts": ts.isoformat(), "target": target, "phases": phases, "passed": all_pass,
    }, indent=2))

    print()
    for p in phases:
        flag = "✅" if p["p95_ms"] < 500 and p["error_rate_pct"] < 1 else "⚠"
        print(f"  {flag} {p['name']:<8} · p95={p['p95_ms']:>6}ms · "
              f"rps={p['rps']:>6} · err={p['error_rate_pct']}%")
    print(f"\n  Report → {md_path.relative_to(REPO)}")
    print(f"  Gate: {'✅ PASS' if all_pass else '⚠ FAIL'}")
    return 0 if all_pass else 1


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())
