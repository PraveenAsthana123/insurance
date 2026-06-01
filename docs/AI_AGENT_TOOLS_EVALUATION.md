# AI / Agent Tools Evaluation

Per global CLAUDE.md §56 (Techstack Additions Policy) + §52 (Brutal Tool
Review). This document is the gate-1 evaluation for 11 tools the operator
requested for installation on 2026-05-26.

**Scope of this document**: install + verify importable + name the
integration point. Stage-1 adapter contracts (per §56.2) are deferred
until the operator picks which tool goes where; wiring into production
services prematurely violates §56.3 (no default-flip without empirical
parity).

## Summary

| # | Tool | PyPI pkg | Verdict | Integration target |
|---|---|---|---|---|
| 1 | DSPy | `dspy-ai` | adopt (stage-1) | Prompt optimization for RAG eval-set |
| 2 | Haystack | `haystack-ai` | adopt (stage-1) | RAG pipeline alternative to LlamaIndex |
| 3 | Pydantic AI | `pydantic-ai` | adopt (stage-1) | Typed agent for governance/RBAC code paths |
| 4 | OpenHands | `openhands-ai` / source | stage-3 (defer) | Autonomous coding agent — local dev only |
| 5 | AgentOps | `agentops` | adopt (stage-1) | Agent observability + cost tracking |
| 6 | Arize Phoenix | `arize-phoenix` | adopt (stage-1) | LLM tracing UI (self-host alternative to LangSmith) |
| 7 | LangSmith | `langsmith` | adopt (stage-1) | LangChain tracing (SaaS, requires API key) |
| 8 | BMad-Method | _N/A_ — npm/methodology | document only | Methodology reference; no Python install |
| 9 | CrewAI | `crewai` | stage-2 | Multi-agent role-based (alternative to in-repo §64.43 #4) |
| 10 | AutoGen | `pyautogen` / `autogen-agentchat` | stage-2 | Multi-agent conversation (Microsoft) |
| 11 | OpenAI Swarm | `git+https://github.com/openai/swarm.git` | skip (experimental) | Educational only; Microsoft AutoGen + CrewAI dominate |
| 12 | Dagster | `dagster` | stage-2 | Data orchestrator — alternative to in-repo Celery beat (§64.30) |
| 13 | Prefect | `prefect` | stage-2 | Workflow orchestrator — alternative to in-repo Celery beat |
| 14 | Kestra (Python SDK) | `kestra` | stage-2 | Workflow Python SDK; server is Java/Kotlin Docker image |
| 15 | Windmill (wmill SDK) | `wmill` | stage-2 | Open-source dev platform Python SDK; server is Rust Docker image |
| 16 | Portkey | `portkey-ai` | stage-1 | LLM gateway: load balancing, fallbacks, caching, observability |
| 17 | LiteLLM | `litellm` | stage-1 | Universal LLM API gateway — 100+ providers via OpenAI-shaped API |
| 18 | OpenLit | `openlit` | stage-1 | OSS LLM observability + auto OTel instrumentation |
| 19 | Langfuse | `langfuse` | stage-1 | OSS LLM observability — self-host alternative to LangSmith |
| 20 | Helicone | _N/A_ — gateway-only | document only | OpenAI base_url override pattern; no pip package required |

Adoption stages (per §56):
- **stage-1** = installed + lazy-import behind feature flag; original code path always wins
- **stage-2** = empirical parity eval pending before default-flip
- **stage-3** = installed but not wired (operator decision deferred)
- **skip** = §56.3 rejection criteria matched (bus-factor / experimental / redundant)

## Per-tool detail

### 1. DSPy (`dspy-ai`)

- **Purpose**: Programming framework for LMs. Compiles prompt templates +
  few-shot examples into optimized chains. Stanford NLP origin.
- **License**: MIT
- **Useful for HOLY**: prompt optimization for the RAG eval-set (§59.4 ORF
  metrics). Compose `Signature`-typed Pydantic chains.
- **Safety**: pure-Python; no external creds required for local use.
- **Integration target**: `backend/services/agent_platform_service.py`
  council/CUA prompt generation; replace ad-hoc f-string prompts with
  DSPy signatures.
- **Verdict**: stage-1 (install + import-test; wire when operator picks
  the first DSPy signature to optimize).

### 2. Haystack (`haystack-ai`)

- **Purpose**: Production RAG framework from deepset. Document retrieval,
  embedding, LLM orchestration. Pipeline-based API.
- **License**: Apache 2.0
- **Useful for HOLY**: alternative to LlamaIndex for `data/eval/<dept>/`
  RAG pipelines. Better production-grade pipeline DAGs.
- **Safety**: pulls torch + transformers (already in venv); no creds
  for local use.
- **Integration target**: `backend/ml/reference/rag_lifecycle.py` (per
  global CLAUDE.md §64.20). Side-by-side eval vs LlamaIndex before
  default-flip.
- **Verdict**: stage-1.

### 3. Pydantic AI (`pydantic-ai`)

- **Purpose**: Agent framework with Pydantic-typed inputs/outputs, from
  the Pydantic team. Tool-calling, validation, retries.
- **License**: MIT
- **Useful for HOLY**: typed agent for `/api/v1/agent-platform/governance/evaluate`
  + future tool-use paths. Composes cleanly with existing Pydantic
  schemas (we're on pydantic 2.13).
- **Safety**: optional creds per provider (OpenAI/Anthropic/Gemini);
  no required external service.
- **Integration target**: `backend/services/typed_council.py` plus
  `POST /api/v1/agent-platform/typed-council/run` for the opt-in
  council 3-stage author/reviewer/chair pilot. Each stage returns a
  Pydantic-shaped author, reviewer, or chair payload.
- **Current wiring**: stage-2 pilot. Default-off via
  `HOLY_TYPED_COUNCIL_ENABLED`; unavailable/disabled/error outcomes are
  returned without crashing the request. The OpenClaw/Redis council path
  remains the default async council path.
- **Verdict**: stage-2 pilot wired; no default-flip.

### 4. OpenHands (`openhands-ai`)

- **Purpose**: Open-source autonomous coding agent (formerly OpenDevin).
  Browses, edits files, runs commands inside sandboxed environments.
- **License**: MIT
- **Useful for HOLY**: developer tooling only — runs the coding-agent
  workflows (similar to Claude Code/Cursor/Copilot). NOT production
  runtime.
- **Safety**: HIGH blast radius — autonomous file edits + shell exec.
  Per §42 — local dev only; never wire into production code paths.
- **Integration target**: `.claude/agents/` or `docs/AGENT_TOOL_SELECTION_MATRIX.md`
  as alternative dev harness. No backend integration.
- **Verdict**: stage-3 (defer integration; document availability).

### 5. AgentOps (`agentops`)

- **Purpose**: Observability SDK for AI agents. Traces sessions, captures
  costs, errors, tool calls. SaaS + self-host options.
- **License**: MIT (SDK); SaaS for the dashboard.
- **Useful for HOLY**: complement to OpenTelemetry on agent paths. Cost
  tracking per (tenant, agent_run) — composes cleanly with the §64.43 #7
  federation work.
- **Safety**: requires `AGENTOPS_API_KEY` for the SaaS dashboard; sends
  trace events out of the env. Make opt-in only.
- **Integration target**: `backend/services/agent_platform_service.py`
  CUA execute path — wrap session in `agentops.start_session()`.
- **Verdict**: stage-1 (install; wire only when operator sets
  `AGENTOPS_API_KEY` env var).

### 6. Arize Phoenix (`arize-phoenix`)

- **Purpose**: Self-hosted LLM observability UI. Trace viewer, eval
  framework, dataset management. Open-source alternative to LangSmith.
- **License**: ELv2 / Apache 2.0
- **Useful for HOLY**: local trace viewer for the CUA + audit log. No
  SaaS dependency, runs on localhost.
- **Safety**: spawns a local web server on port 6006; safe for dev.
- **Integration target**: `data/agent-supervisor/cua_runs.jsonl` ingest
  → Phoenix dataset for eval. Wire as standalone CLI; no backend
  service coupling.
- **Verdict**: stage-1.

### 7. LangSmith (`langsmith`)

- **Purpose**: SaaS observability + eval platform for LangChain agents.
- **License**: MIT (SDK); SaaS for dashboard.
- **Useful for HOLY**: optional. Phoenix is the self-host alternative.
  Adopt if operator wants the LangChain ecosystem polish.
- **Safety**: sends trace events to langsmith.com when `LANGSMITH_API_KEY`
  is set. Opt-in only.
- **Integration target**: same wrap point as AgentOps; mutually exclusive
  per session (don't double-trace).
- **Verdict**: stage-1 (install; opt-in via env var).

### 8. BMad-Method

- **Purpose**: Methodology + agent framework for AI-driven development.
  Markdown-based; npm CLI for bootstrap.
- **License**: MIT
- **PyPI**: not applicable — this is a Node.js/CLI methodology project,
  not a Python package.
- **Useful for HOLY**: as documentation/methodology only. Reference
  pattern for how the operator might structure recurring AI tasks.
- **Safety**: N/A — no Python install side-effects.
- **Verdict**: document only — name + URL recorded in
  [docs/AGENT_TOOL_SELECTION_MATRIX.md](AGENT_TOOL_SELECTION_MATRIX.md);
  no install gate triggered.

### 9. CrewAI (`crewai`)

- **Purpose**: Role-based multi-agent framework. Define agents with
  goals + roles, compose into crews.
- **License**: MIT
- **Useful for HOLY**: alternative to in-repo §64.43 #4 hierarchical
  pattern. Operator already has a 10-layer agentic stack (§64.40); CrewAI
  duplicates ~70% of that surface.
- **Safety**: provider-dependent (OpenAI/Anthropic creds).
- **Integration target**: pilot for ONE dept's process per §64.43 selection
  rules; compare against in-repo stack before adopting.
- **Verdict**: stage-2 (install + empirical eval before default-flip).

### 10. AutoGen (pyautogen)

- **Purpose**: Multi-agent conversation framework. Two interpretations:
  - `pyautogen` (v0.2.x) — original AutoGen
  - `autogen-agentchat` (v0.4.x) — new split SDK from Microsoft
- **License**: MIT
- **Useful for HOLY**: same overlap concern as CrewAI — duplicates
  much of §64.43 #2 (Council). Operator may want for benchmarking.
- **Safety**: provider-dependent creds.
- **Integration target**: pilot vs in-repo council pattern.
- **Verdict**: stage-2. Document both packages; install `pyautogen` first
  (more PyPI install signal); evaluate split SDK later.

## Batch 2 — orchestrators + LLM gateways + observability (added 2026-05-26)

### 12. Dagster (`dagster`)

- **Purpose**: Data orchestrator with strong typing on assets + pipelines.
  Asset-graph centric (vs Airflow's DAG-centric).
- **License**: Apache 2.0
- **Useful for HOLY**: alternative to Celery beat for `data/eval/<dept>`
  ML pipelines (§64.20) + cron jobs (§64.30). Strong type checking on
  ML artifacts.
- **Safety**: spawns dagster-webserver on port 3000 (collides with frontend);
  use a different port for dev.
- **Integration target**: `backend/workers/` for asset materialization;
  alternative to `celery beat` schedule.
- **Verdict**: stage-2 (install + empirical parity eval vs Celery beat).

### 13. Prefect (`prefect`)

- **Purpose**: Workflow orchestrator with hybrid execution model.
  Pythonic decorators, dynamic DAGs at runtime.
- **License**: Apache 2.0
- **Useful for HOLY**: alternative to Celery beat for parametric flows
  (e.g., per-tenant retraining schedules).
- **Safety**: Prefect Cloud SaaS is optional; self-host server works.
- **Integration target**: same as Dagster; pick ONE to pilot, not both.
- **Verdict**: stage-2. Dagster vs Prefect: Dagster has stronger ML
  artifact typing; Prefect has simpler Python-decorator API. Pilot
  decision deferred to operator.

### 14. Kestra (Python SDK, `kestra`)

- **Purpose**: Declarative workflow engine. Server is Java/Kotlin
  (Docker image); Python SDK calls the server's HTTP API.
- **License**: Apache 2.0
- **Useful for HOLY**: language-agnostic workflows + good UI for
  non-developer operators. Heavier to deploy than Dagster/Prefect
  (JVM-based).
- **Safety**: requires running the Kestra server (Docker compose).
  Python SDK alone doesn't execute anything.
- **Integration target**: only if HOLY's operator population includes
  non-developers who want a visual workflow editor.
- **Verdict**: stage-2 (SDK installed; server adoption deferred).

### 15. Windmill (`wmill`)

- **Purpose**: Open-source dev platform — script + workflow + app
  builder. Server in Rust; Python/TS scripts as workflow steps.
- **License**: AGPL v3 (community) / commercial
- **Useful for HOLY**: low-code admin tools for compliance operators
  (build internal UIs without React work). Powerful for ops.
- **Safety**: AGPL implications — running Windmill server in HOLY's
  hosted infra requires offering Windmill modifications under AGPL.
  Self-host with no modifications is fine.
- **Integration target**: ops-only; never wire into customer-facing
  paths unless legal blesses AGPL.
- **Verdict**: stage-2 (SDK installed; license review before server
  adoption).

### 16. Portkey (`portkey-ai`)

- **Purpose**: LLM gateway as a service. Load-balances across providers,
  fallbacks, caches, observability dashboard.
- **License**: SDK MIT; service is SaaS.
- **Useful for HOLY**: insurance against single-provider outages;
  cost ceiling per (tenant, model). Composes with §64.43 #7 federation.
- **Safety**: SaaS — sends all LLM traffic through Portkey when wired.
  Requires `PORTKEY_API_KEY` env var.
- **Integration target**: `services/agent_platform_service.py` LLM call
  paths; mutually exclusive with LiteLLM gateway per call.
- **Verdict**: stage-1 (install; wire only when operator sets API key).

### 17. LiteLLM (`litellm`)

- **Purpose**: Universal Python SDK that calls 100+ LLM providers
  (OpenAI, Anthropic, Bedrock, Vertex, Ollama, etc.) via one
  OpenAI-shaped API. Self-host proxy server available.
- **License**: MIT
- **Useful for HOLY**: provider-agnostic LLM calls + spend tracking.
  Replaces ad-hoc `openai` SDK use across multiple services.
- **Safety**: pure-SDK use is local; proxy server is opt-in.
- **Integration target**: `services/agent_platform_service.py` LLM
  call paths. Heavy overlap with Portkey — pick ONE.
- **Verdict**: stage-1 (install; pilot vs Portkey before default).

### 18. OpenLit (`openlit`)

- **Purpose**: Open-source LLM observability. Auto-instruments OpenAI /
  Anthropic / Ollama / etc. calls via OpenTelemetry.
- **License**: Apache 2.0
- **Useful for HOLY**: complement to Arize Phoenix; OpenLit is
  instrumentation-side, Phoenix is the UI for the resulting traces.
- **Safety**: requires OTel collector endpoint (local or hosted).
- **Integration target**: `services/agent_platform_service.py`
  call-site instrumentation. Composes with existing CorrelationId
  middleware.
- **Verdict**: stage-1 (install; wire when OTel collector is set up).

### 19. Langfuse (`langfuse`)

- **Purpose**: Open-source LLM observability platform — traces, evals,
  datasets, prompt management. Self-host or SaaS.
- **License**: MIT (SDK + server)
- **Useful for HOLY**: self-host alternative to LangSmith; better
  long-term posture (no SaaS dependency, full data control).
- **Safety**: requires Langfuse server (Docker); SaaS option also
  exists with `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY`.
- **Integration target**: same wrap-point as LangSmith / AgentOps;
  pick ONE per session (don't triple-trace).
- **Verdict**: stage-1 (install; recommended over LangSmith for
  self-host posture).

### 20. Helicone

- **Purpose**: LLM observability + caching gateway. Integrates by
  pointing OpenAI/Anthropic clients at `https://oai.helicone.ai/v1`
  with a `Helicone-Auth` header — no Python SDK required.
- **License**: Apache 2.0 (gateway) + SaaS dashboard.
- **PyPI**: no Python package needed; integrate via existing OpenAI
  SDK with a base_url override.
- **Useful for HOLY**: alternative observability gateway pattern;
  competes with Portkey for the gateway slot.
- **§56.3 check**: not redundant (Helicone caches at the HTTP layer,
  Portkey at the SDK layer — different blast surfaces). Not skipped.
- **Verdict**: document only — no install gate triggered. Wired via
  env vars `OPENAI_BASE_URL=https://oai.helicone.ai/v1` and
  `OPENAI_DEFAULT_HEADERS={"Helicone-Auth": "Bearer ${HELICONE_API_KEY}"}`.

### 11. OpenAI Swarm

- **Purpose**: Lightweight educational multi-agent framework from OpenAI.
- **License**: MIT (per repo)
- **PyPI**: not published; install via `pip install git+https://github.com/openai/swarm.git`
- **Useful for HOLY**: limited. OpenAI explicitly labels Swarm as
  experimental/educational; production users moved to Microsoft AutoGen
  or CrewAI for similar capability.
- **Safety**: requires OpenAI API key for any real run.
- **§56.3 rejection check**: hits "experimental upstream" rejection
  criterion. Bus-factor low (educational repo, not actively developed).
- **Verdict**: **skip** per §56.3. Document the rationale + name CrewAI
  / AutoGen as the production alternatives.

## Composes with

- §42 Operational Autonomy — local install is pre-approved; SaaS keys
  (LangSmith/AgentOps SaaS) require explicit env-var opt-in.
- §52 Brutal Tool Review — each stage-2+ adopted tool gets a 40-row review.
- §56 Techstack Additions Policy — this doc IS gate-1; gate-4
  (`scripts/techstack_audit.py`) verifies install empirically;
  gate-5 (drill) locks the install contract.
- §57 AI Tool Coding Discipline — stages 1→2→3 mapped to discipline
  (deterministic install, lazy import, drill-locked).
- §64.20 Per-Dept ML/DL Lifecycle Types — Haystack + Phoenix wire into
  the RAG + eval pipelines named there.
- §64.43 Agentic Architecture Patterns — CrewAI + AutoGen overlap with
  patterns #2 Council and #4 Hierarchical already implemented.

## Voice batch — added 2026-05-26 (separate from agent ecosystem)

Per operator's "how do I make voice over command" follow-up. Voice
tools complement the agent ecosystem but compose differently — they
sit at the operator-interaction boundary, not in any agent code path.

### 21. OpenAI Whisper (voice INPUT)

- **Purpose**: Speech-to-text via OpenAI Whisper models
  (tiny/base/small/medium/large). Push-to-talk voice commands → text.
- **License**: MIT
- **PyPI**: `openai-whisper`
- **Useful for HOLY**: voice-driven operator workflows; transcribe meeting
  recordings; offline STT for incident reports.
- **Safety**: requires explicit mic-capture invocation (push-to-talk, not
  always-listening); models cached at `~/.cache/whisper/`; no SaaS.
- **Integration target**: `scripts/voice_in.py` (already wired).
- **Verdict**: stage-1 (installed; round-trip drill 8/8 PASS).

### 22. Piper TTS (voice OUTPUT)

- **Purpose**: Local text-to-speech with natural ONNX voices.
- **License**: MIT
- **PyPI**: `piper-tts`
- **Useful for HOLY**: read-aloud Claude responses; voice status reports;
  accessibility for operators.
- **Safety**: model auto-downloads on first use (~63MB per voice); no SaaS.
  Voice cloning would require explicit consent + watermarking per global §46.4.
- **Integration target**: `scripts/voice_out.py` (already wired).
- **Verdict**: stage-1 (installed; round-trip drill 8/8 PASS).

## BMad batch — added 2026-05-26

### 23. BMad-Method (installed in this clone)

- **Purpose**: Universal AI agent framework methodology. 44 skills
  (PRD authoring, story generation, code review, brainstorming, etc.)
  wired for Claude Code at `.claude/skills/bmad-*`.
- **License**: MIT
- **PyPI**: not applicable — Node.js CLI.
- **Useful for HOLY**: structured AI workflow methodology; complements
  the in-repo `.archon/workflows/` patterns.
- **Safety**: Node ≥ 20 required; `scripts/bmad.sh` shim picks nvm Node 22.
  Per-user config (`_bmad/config.user.toml`) gitignored.
- **Integration target**: `_bmad/` (methodology config) + `.claude/skills/bmad-*`
  (executable skills). Re-install via `scripts/bmad.sh install
  --modules bmm --tools claude-code --yes --directory .`.
- **Verdict**: stage-2 (installed; methodology usage patterns pending operator decision).

## Rejection criteria triggered

| Tool | Criterion (§56.3) | Verdict |
|---|---|---|
| OpenAI Swarm | "deprecated/experimental upstream" + "redundant with existing capability" | skip |
| BMad | "no Python install path" | document only |

## Next steps

1. **Gate-4 verification** — `scripts/techstack_audit.py` runs on each tool
2. **Gate-5 drill** — `tests/drills/drill_ai_agent_tools_installed.py`
3. **Operator decision** — pick the FIRST stage-2 tool to wire (Pydantic AI
   into council OR DSPy into RAG eval are the two highest-leverage entries)
4. **Stage-1 adapter** — feature-flag-opt-in import for the chosen tool
5. **Stage-3 promotion** — empirical eval (10+ real cycles) before default-flip
