# k6 Load Testing — 5-Phase Pipeline

Per global §47.10 — **smoke → load → stress → soak → spike**. None optional
before production.

## Files

| Phase | File | VU | Duration | Pass criteria |
|---|---|---|---|---|
| 1. Smoke | [smoke.js](smoke.js) | 1-10 | 1 min | 0 errors, sanity |
| 2. Load | [load.js](load.js) | 500 | 10 min | p95 < SLA, error < 1% |
| 3. Stress | [stress.js](stress.js) | 0 → 2000 | 30 min | Find breakpoint |
| 4. Soak | [soak.js](soak.js) | target | 24 h | No memory growth > 10% |
| 5. Spike | [spike.js](spike.js) | 0 → peak in 60s | 5 min | Recovery < 60s |

## Run

```bash
# Install k6
brew install k6   # macOS
sudo apt install k6   # Ubuntu

# Local target (insur_project on docker-compose)
BASE_URL=http://localhost:8000 k6 run load-testing/smoke.js

# Run all phases
for f in smoke load stress soak spike; do
  echo "=== $f ==="
  BASE_URL=http://localhost:8000 k6 run load-testing/$f.js
done

# Production target (use staging first; never load-test prod without authorization)
BASE_URL=https://staging.insur.example.com TENANT_ID=loadtest k6 run load-testing/load.js
```

## Targets

| Endpoint class | SLA |
|---|---|
| `GET /api/v1/insurance/depts` | p95 < 50ms |
| `GET /api/v1/insurance/depts/*/spec` | p95 < 100ms |
| `GET /api/v1/insurance/depts/*/dashboards/*` | p95 < 100ms |
| `POST /api/v1/insurance/depts/*/pipelines/*/run` | p95 < 30s (slow by design — ML inference) |
| `GET /api/v1/health` | p95 < 10ms |

## Outputs

- Console summary per run
- `load-testing/results/<phase>-<timestamp>.json` for trend tracking
- Per-phase grade card per §47.10

## Composes with

- §47.10 5-phase load testing — IS this
- §41 cost / capacity planning (consumed by capacity model in [INSUR_SYSTEM_DESIGN.md](../global-ai-org/departments/claims/business-layer/INSUR_SYSTEM_DESIGN.md))
- §53 maturity item 12 reliability
- §57 production discipline (5-question runbook gets latency answers from soak)
