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
