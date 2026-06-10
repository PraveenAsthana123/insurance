# Deep Error Analysis Report

Date: 2026-06-08
Repository: `/mnt/deepa/insur_project`

## Executive Summary

The default project health gate passed, but it is not a full production-facing validation in the current environment. `./scripts/project_doctor.sh` reported 0 failures, with frontend build/lint passing and backend tests passing, but 69 backend tests were skipped because Postgres was unavailable. Docker Compose currently has Redis, Ollama, and agent containers running, but not Postgres, backend, frontend, worker, or MLflow.

Highest-risk findings:

1. API governance drift: `scripts/generate_openapi_snapshot.py --check` fails without explicit `PYTHONPATH`, and with the correct path it reports `docs/openapi.json` drift.
2. `docs/API_CATALOG.json` is missing 12 live FastAPI operations.
3. Docker/frontend/backend port wiring is inconsistent: compose maps backend as `8001:8000`, but frontend config points to `http://localhost:8000`.
4. `localhost:8000` currently responds as `bev-analytics`, not the compose-mapped Insur backend; `localhost:8001` is down.
5. Database-backed data/API/model coverage is skipped because Postgres is not running.
6. RAG model configuration is hardcoded to `http://localhost:11434` and `qwen2.5:latest`, ignoring project settings/env wiring.
7. Generic `MLService.predict()` remains placeholder inference and does not load MLflow artifacts.

## Validation Evidence

### Project Doctor

Command:

```bash
./scripts/project_doctor.sh
```

Result:

- Frontend build: passed.
- Frontend lint: passed.
- Backend tests: `67 passed, 69 skipped, 1 deselected`.
- Summary: `Warnings: 4`, `Failures: 0`.

Doctor warnings:

- `frontend/dist` exists.
- `frontend/node_modules` exists.
- `.pytest_cache` exists.
- backend `__pycache__` directories exist.

### Python Syntax

Command:

```bash
python3 -m compileall -q backend scripts agents infra tests
```

Result: passed with no compile errors.

### Docker Runtime State

Command:

```bash
docker compose ps
```

Running:

- `insur_redis`
- `insur_ollama`
- `agents`
- `council_agents`

Not running in compose:

- `postgres`
- `backend`
- `frontend`
- `worker`
- `mlflow`

### HTTP Probes

- `http://localhost:8000/api/v1/health`: returns 200 with `{"status":"healthy","service":"bev-analytics"}`.
- `http://localhost:8001/api/v1/health`: connection refused.
- `http://localhost:3000`: returns a Vite app.
- `http://localhost:5173`: connection refused.

This indicates port 8000 is occupied by another/legacy service and the Insur compose backend is not available on its configured host port 8001.

## Data Layer

### Passing Checks

The core JSON data/config files parse successfully:

- `data/insurance/manifest.json`
- `data/insurance/_manifest.json`
- `config/insurance.catalog.json`
- `config/ai_capabilities.json`
- `config/brand.config.json`
- `docs/API_CATALOG.json`
- `docs/openapi.json`

Manifest integrity:

- `data/insurance/manifest.json`: 312 entries, 0 missing referenced paths.
- `config/insurance.catalog.json`: 312 data paths, 0 missing referenced paths.

### Risks

Postgres-backed data tests were skipped. This affects sales, supply chain, customer, churn, ingestion, RBAC, and repository tests. The skip is controlled by `backend/conftest.py`; it marks database-backed modules skipped when Postgres is unreachable.

Config inconsistency:

- Runtime default DB name is `insur_analytics` in `backend/core/config.py`.
- Test probe fallback uses `INSUR_DB_NAME` default `insur_db` in `backend/conftest.py`.

This can make DB reachability checks misleading unless `INSUR_DB_NAME` is set.

## Model Layer

### Forecasting

`backend/services/forecast_service.py` uses Prophet and has focused unit tests that passed. Database-backed forecast API tests were skipped because Postgres is down.

Known model limitation:

- Promo and holiday regressors are explicitly deferred in `backend/services/forecast_service.py`.

### RAG

`backend/services/rag_service.py` implements BM25 + Ollama embeddings/generation. Unit tests passed, but the service hardcodes:

- `OLLAMA_BASE = "http://localhost:11434"`
- `MODEL = "qwen2.5:latest"`

This bypasses `BEV_OLLAMA_HOST` from `backend/core/config.py` and compose's `BEV_OLLAMA_HOST=http://ollama:11434`, so RAG can fail inside Docker even when the environment is correctly configured.

### Generic Model API

`backend/services/ml_service.py` still has placeholder inference:

- `predict()` checks model readiness.
- `_run_inference()` returns metadata about input keys and model name.
- It does not load MLflow artifacts.

This is acceptable for a stub, but not production inference.

## Frontend Layer

### Passing Checks

`npm run build` and `npm run lint` passed under `frontend/`.

Build warning:

- Large chunks after minification, especially Plotly, main index, ECharts, PDF export, and Recharts.
- This is a performance risk, not a build failure.

### Runtime Wiring Risks

There are two API clients:

- `frontend/src/services/apiFetch.js` defaults `VITE_API_BASE_URL` to empty string and attaches `X-Demo-Role`.
- `frontend/src/services/api.js` defaults `VITE_API_BASE_URL` to `http://localhost:8000` and does not attach `X-Demo-Role`.

This splits behavior between role-aware relative API calls and legacy absolute calls.

Compose mismatch:

- `docker-compose.yml` maps backend as `8001:8000`.
- `docker-compose.yml` sets frontend `VITE_API_BASE_URL: http://localhost:8000`.

Given current probes, `localhost:8000` is not the Insur compose backend. Frontend calls can hit the wrong backend.

Several frontend screens explicitly show pending/unwired API surfaces, including:

- `/api/v1/bot/query`
- `/api/v1/incidents`
- `/api/v1/chat/*`
- `/api/v1/mcp/tools`
- `/api/v1/sales/revenue-tree`
- `/api/v1/forecasts`, `/api/v1/accuracy`, `/api/v1/scenarios`

Some are labelled pending, but they still represent product-surface gaps.

## Backend Layer

### Passing Checks

- Python compilation passed.
- Non-DB backend tests passed.
- FastAPI app can be imported when `PYTHONPATH` includes both repo root and backend.

### Runtime Risks

`backend/main.py` runs migrations and seeds during application lifespan startup. With Postgres down, backend startup will fail. The default doctor avoids this by running tests that skip DB-dependent modules, so it does not prove app startup against the real compose stack.

Security posture is still demo-oriented in places:

- `project_api_key` defaults to empty, meaning admin auth is disabled in dev.
- RBAC uses `X-Demo-Role`, which is appropriate for demo gating but not production identity.

## API Layer

### OpenAPI Snapshot Check

Documented command:

```bash
python3 scripts/generate_openapi_snapshot.py --check
```

Result:

```text
FAIL: backend import error: No module named 'backend'
```

With explicit import path:

```bash
env PYTHONPATH=/mnt/deepa/insur_project:/mnt/deepa/insur_project/backend python3 scripts/generate_openapi_snapshot.py --check
```

Result:

```text
DIFF: spec diverges from committed snapshot
  committed: 350906 bytes
  current:   350722 bytes
  rerun without --check to update
```

The live operation count still matches the committed snapshot:

- Live OpenAPI operations: 177.
- Snapshot operations: 177.
- Route additions/removals: 0.

So the OpenAPI drift is schema/content-level, not method/path count-level.

### API Catalog Drift

`docs/API_CATALOG.json` has 165 method/path entries. The live app exposes 177 method/path operations. Missing from `docs/API_CATALOG.json`:

- `GET /api/v1/admin/departments`
- `GET /api/v1/admin/tenant-departments`
- `GET /api/v1/admin/tenants`
- `GET /api/v1/catalogs/dt-checklists`
- `GET /api/v1/catalogs/modules`
- `GET /api/v1/catalogs/phases`
- `GET /api/v1/catalogs/raw`
- `GET /api/v1/holy/components/_health`
- `GET /api/v1/insur/evals/model-compare/_history`
- `GET /api/v1/insur/evals/model-compare/{comparison_id}`
- `POST /api/v1/holy/components/{op}`
- `POST /api/v1/insur/evals/model-compare`

This violates the governance rule that backend/API changes update `docs/API_ENDPOINT_CATALOG.md` and `docs/API_CATALOG.json`.

## Priority Fix Plan

### P0

1. Fix OpenAPI generator import path so `python3 scripts/generate_openapi_snapshot.py --check` works without manual `PYTHONPATH`.
2. Regenerate or reconcile `docs/openapi.json`.
3. Add the 12 missing operations to `docs/API_CATALOG.json` and update `docs/API_ENDPOINT_CATALOG.md`.
4. Resolve compose/frontend/backend port mismatch. Either map backend to `8000:8000`, or set frontend API base to the actual Insur backend URL.
5. Start Postgres and rerun `./scripts/project_doctor.sh` so DB-backed tests execute instead of skipping.

### P1

1. Change RAG service to read `BEV_OLLAMA_HOST`/settings instead of hardcoded `localhost`.
2. Align `backend/conftest.py` DB default from `insur_db` to `insur_analytics`.
3. Consolidate frontend API clients so all live calls use shared role/tracing/error handling.
4. Decide which pending frontend API surfaces are roadmap-only and clearly mark them as non-live.

### P2

1. Replace generic `MLService._run_inference()` placeholder with MLflow model loading or rename the API behavior as a stub/demo endpoint.
2. Add chunk splitting/code-splitting for Plotly, ECharts, PDF export, and large route bundles.
3. Remove generated local artifacts from the working tree where appropriate: `frontend/dist`, `.pytest_cache`, and backend `__pycache__`.

## Overall Verdict

The repository is not in a clean production-verifiable state today. The source builds and many unit tests pass, but the active runtime environment is partial, API governance docs are stale, database-backed test coverage is skipped, and frontend/backend port wiring can send the UI to the wrong backend. The most urgent work is governance/API drift plus runtime wiring; the data catalog itself is internally consistent.
