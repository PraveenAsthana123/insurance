# memory.md — durable cross-task facts

PROJECT FACTS:
- Repo type      : FastAPI backend + frontend + per-dept artifacts (§63 scaffold)
- Insurance depts: claims, underwriting, customer-service, fraud-siu (4 active)
- Bot URL        : http://localhost:8001
- LLM model      : qwen2.5:latest (also kivi:local, qwen2.5-coder, deepseek-coder-v2, nemotron-mini, llama3-groq-tool-use)
- Embed model    : nomic-embed-text:latest (768-dim)
- Vector store   : ChromaDB persistent client
- Vector-less    : rank_bm25 BM25Okapi
- Graph store    : networkx MultiDiGraph (JSON node-link serialization)

CRON BLOCKS (38 entries):
- INSUR-AUDIT       (14 entries — daily 09/21 audit + dataset refresh)
- INSUR-PENDING-TASKS (11 entries — boot/push/drill/openapi/etc.)
- INSUR-RAG-OPS     (8 entries — chunking/embedding/token/cache/guardrail/deepeval/ragas)
- INSUR-FIX-ALL     (3 entries — nightly 03:00, weekly Sun 04:00, q15m)
- INSUR-AUTOMATION-JOBS (1 entry — 08:17 council via kivi:local)
- CODEX-SAFE-APPROVAL (1 entry — codex auto-approval daemon)

GOTCHAS (recurring):
- `set -euo pipefail` + `((var++))` exits when var=0 → use `var=$((var+1))`
- Pickle blocked by security hook → use JSON or node-link for graph
- innerHTML blocked → use textContent + createElement
- ragas wheel pins removed langchain vertexai → shim at langchain_community/chat_models/vertexai.py
- pytest collision on dup module names → --import-mode=importlib in pytest.ini
- logfire incompatible with opentelemetry-sdk → pip uninstall logfire

POLICY ANCHORS (global §):
- §3   layer rule (no SQL in routers, no HTTPException in services)
- §38.3 decision audit row
- §42  gated ops (force-push/destroy/publish/external-message)
- §43  drill ≥3 negative assertions
- §51  forensic substrate
- §54  no Co-Authored-By trailer
- §57.6 canonical fields (request_id, tenant_id, actor, tool, latency_ms, outcome)
- §62  Done/Pending checklist format
- §73-§77 autonomous task handling, 7-stage cycle, top-1% wrapper, 3-layer notify, top-1% stack

## PLAN T-20260602T053741Z — 2026-06-02T05:37:41Z

Task: Add a /api/v1/health-deep endpoint that checks ollama + postgres + redis status

Plan model: qwen2.5-coder:3b

1. **Create a new file for the health check endpoint**:
   - Navigate to `/mnt/deepa/insur_project/api/v1`.
   - Create a new file named `health-deep.py`.

2. **Define the health check function**:
   - Open `health-deep.py` and add the following code:

     ```python
     from fastapi import FastAPI
     from sqlalchemy.orm import Session

     app = FastAPI()

     def check_status(session: Session):
         # Check Ollama status (example: ping)
         ollama_status = "UP"  # Placeholder, replace with actual check logic

         # Check PostgreSQL status (example: connection test)
         postgres_status = "UP"  # Placeholder, replace with actual check logic

         # Check Redis status (example: ping)
         redis_status = "UP"  # Placeholder, replace with actual check logic

         return {
             "ollama": ollama_status,
             "postgres": postgres_status,
             "redis": redis_status
         }

     @app.get("/api/v1/health-deep")
     def get_health(session: Session):
         return check_status(session)
     ```

3. **Update `__init__.py` in the `/api/v1` directory**:
   - Open `__init__.py` and add the following line to include the new endpoint:

     ```python
     from .health_deep import app
     ```

4. **Configure FastAPI application**:
   - Navigate to `/mnt/deepa/insur_project/api`.
   - Update `app.py` to include the new router:

     ```python
     from fastapi import FastAPI

     from .v1 import app as v1_app

     app = FastAPI()

     app.include_router(v1_app)
     ```

5. **Add a test for the health check endpoint**:
   - Navigate to `/mnt/deepa/insur_project/tests`.
   - Create a new file named `test_health_deep.py` and add the following code:

     ```python
     from fastapi.testclient import TestClient

     def test_get_health():
         client = TestClient(app)
         response = client.get("/api/v1/health-deep")
         assert response.status_code == 200
         assert response.json() == {
             "ollama": "UP",
             "postgres": "UP",
             "redis": "UP"
         }
     ```

6. **Update `setup.py` to include the new test**:
   - Open `setup.py` and add the following line to include the new test:

     ```python
     tests_require=[
         'pytest',
         'fastapi[test]',
         'sqlalchemy[testing]'
     ],
     ```

7. **Run the tests**:
   - Navigate to `/mnt/deepa/insur_project`.
   - Run the following command to execute the tests:

     ```bash
     pytest
     ```

8. **Deploy the changes**:
   - Commit and push your changes to the repository.
   - Deploy the updated application to your production environment.

9. **Document the new endpoint**:
   - Update `.agent/MEMORY.md` with a description of the `/api/v1/health-deep` endpoint, including its purpose, parameters, and expected response.

10. **Update `.agent/DECISIONS.md`**:
    - Add a note to the `Decisions` section regarding the addition of the new health check endpoint.

This plan outlines the steps required to implement the `/api/v1/health-deep` endpoint in your project, including creating files, updating configuration, adding tests, and documenting the changes.

