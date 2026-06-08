# Test class: perf (load + stress + soak + spike + smoke · k6-based)

> Per §87.6 test class #9-10 (perf / load testing). Per §47.10 5-phase pipeline.

## Where the scripts live

Actual k6 scripts at repo root: [`load-testing/`](../../load-testing/) — see
[`load-testing/README.md`](../../load-testing/README.md).

| Phase | File | Run command |
|---|---|---|
| Smoke | `load-testing/smoke.js` | `BASE_URL=http://localhost:8001 k6 run load-testing/smoke.js` |
| Load | `load-testing/load.js` | same · 500 VU · 10 min |
| Stress | `load-testing/stress.js` | same · 0→2000 VU · 30 min |
| Soak | `load-testing/soak.js` | same · target VU · 24h |
| Spike | `load-testing/spike.js` | same · 0→peak in 60s |

## CUA testing (Computer-Using Agent · per §64.40)

Drills at `tests/drills/drill_cua_*.py` exercise the orchestrator contract
(idempotency · audit · scope). Run via pytest:
`pytest tests/drills/drill_cua_idempotency.py`.

Real browser-driving requires installing Stagehand / Browser-Use / Claude
Computer Use SDK (none installed by default).

## Pass criteria per §47.10

| Phase | Pass |
|---|---|
| Smoke | 0 errors · sanity |
| Load | p95 < SLA · err < 1% |
| Stress | Find breakpoint VU |
| Soak | No memory growth > 10% |
| Spike | Recovery < 60s |
