# Agent Tool Selection Matrix

This matrix defines how to evaluate external agent, orchestration, coding, and media tools before introducing them into the HOLY platform. It is a governance artifact, not an approval to install any tool by default.

## Tool Comparison

| Tool | Primary Focus | Best For | Weakness | HOLY Fit |
|---|---|---|---|---|
| Hermes Agent | Self-learning autonomous AI agent | Persistent AI teammate | Younger ecosystem | Candidate for long-running assistant memory and autonomous backlog support, only behind governance and audit controls. |
| OpenClaw | Multi-channel orchestration gateway | Automation + integrations | Complex setup/security overhead | Local OpenClaw-compatible bridge is working for Redis/council task routing. External gateway/SDK remains a future integration requiring strong auth, secrets, and tenant controls. |
| Kilo Code | AI coding workflow/runtime ecosystem | Dev productivity and orchestration | Narrower ecosystem maturity | Candidate for developer workflow acceleration, test generation, refactor orchestration, and controlled coding harnesses. |
| Descript | AI media/audio/video editing | Podcasts, video, content creation | Not a true autonomous agent platform | Candidate for demo/media generation only; should not be used for backend orchestration or production decisions. |
| Archon | AI coding workflow harness | Repeatable issue, implementation, validation, and PR workflows | Adds developer-tool dependency and must not bypass governance | Installed as a developer harness with repo-local BEV workflows; not a production runtime component. |
| GitHub Copilot CLI/SDK | AI coding assistant and extension/agent tooling | Terminal coding assistance, repo-aware edits, custom Copilot extensions when justified | Requires GitHub auth/license and must not run with broad permissions by default | CLI installed locally for developer use; SDK is candidate only, not production wired. |
| Dark Factory Operating Model | AI-assisted delivery operating model | Coordinating Idea -> BMAD Analyst/PRD -> BMAD Architect/System Design -> BMAD Scrum/Stories -> Archon -> coding agent -> Playwright -> DeepEval target -> Temporal target -> deployment -> OTel target | Governance complexity; fails if treated as autonomous production runtime | Documented operating model only; `docs/DARK_FACTORY_OPERATING_MODEL.md` is the control map. OpenHands, DeepEval, Temporal, and full OTel are target/operator-gated unless separately wired and validated. |
| DSPy | Prompt optimization for LMs | Auto-compile Signature-typed prompt chains; RAG eval-set optimization | New API surface vs hand-tuned prompts; debugging optimized chains is harder | Stage-1: installed; wire into `services/agent_platform_service.py` council prompts when operator picks the first DSPy signature to optimize. |
| Haystack | Production RAG framework (deepset) | Document retrieval + LLM orchestration via Pipeline DAGs | Heavy dep tree (torch/transformers — already in venv); steeper learning curve than LlamaIndex | Stage-1: installed; wire as alternative `rag_lifecycle.py` impl; empirical eval vs LlamaIndex before default-flip. |
| Pydantic AI | Pydantic-typed agent framework (Pydantic team) | Strongly-typed tool-calling + validation + retries | Newer ecosystem; provider-API-specific code paths | Stage-2 pilot wired for opt-in typed council runs at `POST /api/v1/agent-platform/typed-council/run`; default council path remains OpenClaw/Redis. |
| OpenHands | Autonomous coding agent (formerly OpenDevin) | Multi-step file edit + shell exec + browse | HIGH blast radius; sandbox required; not production runtime | Stage-3: documented as developer dev harness; never wired into backend runtime. |
| AgentOps | Agent observability + cost tracking SDK | Per-session traces; cost per (tenant, agent) | SaaS dashboard requires `AGENTOPS_API_KEY`; opt-in only | Stage-1: installed; wire into CUA execute path with feature flag; mutually exclusive with LangSmith per session. |
| Arize Phoenix | Self-hosted LLM trace viewer | Local trace UI (no SaaS); RAG eval | Local web server on port 6006; not a SaaS observability platform | Stage-1: installed; ingest `cua_runs.jsonl` for trace + eval; runs as standalone tool, no backend coupling. |
| LangSmith | LangChain trace + eval (SaaS) | LangChain ecosystem trace + dataset | SaaS-only; trace events leave the env when `LANGSMITH_API_KEY` is set | Stage-1: installed; opt-in via env var; Phoenix is the self-host alternative. |
| BMad-Method | AI-driven development methodology | PRD, story, acceptance criteria, review checklists, and recurring AI task structure | Methodology/scaffold, not a backend runtime or deploy authority | Installed locally under `_bmad/` with Claude skill scaffolding; developer planning layer only. |
| CrewAI | Role-based multi-agent framework | Role + goal composition into crews | Overlaps with in-repo §64.43 #4 Hierarchical pattern; ~70% surface duplication | Stage-2: installed; empirical parity eval vs in-repo stack before default-flip. |
| AutoGen (Microsoft) | Multi-agent conversation framework | Conversation patterns for research-grade agents | Two packages (`pyautogen` v0.2 vs `autogen-agentchat` v0.4); overlap with §64.43 #2 Council | Stage-2: `pyautogen` installed; document the v0.4 split SDK; pilot vs in-repo council. |
| OpenAI Swarm | Educational multi-agent framework | Learning multi-agent patterns | Experimental upstream; OpenAI explicitly labels as educational | **Skip** per §56.3 rejection (experimental + redundant with CrewAI/AutoGen). |
| Dagster | Data orchestrator (asset-graph) | Strong typing on ML artifacts + pipelines | Heavier than Celery beat for simple cron jobs; webserver port 3000 collides with frontend | Stage-2: installed; empirical parity eval vs Celery beat (§64.30) before adoption. |
| Prefect | Workflow orchestrator (Python-native) | Dynamic DAGs + decorator API | Overlaps with Dagster on the same slot — pick one | Stage-2: installed; pilot vs Dagster on one HOLY pipeline before default-flip. |
| Kestra (Python SDK) | Declarative workflow engine; server is Java/Kotlin | Visual UI for non-developer operators | Server is JVM-heavy; SDK alone doesn't execute | Stage-2: SDK installed; server adoption deferred until non-dev operator population justifies the JVM stack. |
| Windmill (wmill SDK) | OSS dev platform — scripts + workflows + apps | Low-code admin tools for ops | AGPL implications for self-hosting with modifications | Stage-2: SDK installed; legal review required before AGPL server adoption. |
| Portkey | LLM gateway (SaaS) | Load balancing, fallbacks, caching, observability | SaaS — all LLM traffic routed via Portkey when wired | Stage-1: installed; wire only with `PORTKEY_API_KEY`; mutually exclusive with LiteLLM per call. |
| LiteLLM | Universal LLM API gateway | 100+ providers via OpenAI-shaped API; self-host proxy available | Heavy overlap with Portkey | Stage-1: installed; pilot vs Portkey; default to LiteLLM for self-host posture. |
| OpenLit | OSS LLM observability + auto OTel | OpenTelemetry-native auto-instrumentation | Requires OTel collector endpoint | Stage-1: installed; wire when OTel collector is set up. Composes with Phoenix as the trace viewer. |
| Langfuse | OSS LLM observability — self-host | Trace + eval + dataset + prompt management | Requires Langfuse server (Docker) or SaaS | Stage-1: installed; **preferred over LangSmith** for self-host posture (no SaaS dep). |
| Helicone | LLM observability + caching gateway | OpenAI-base_url override pattern (no SDK) | Competes with Portkey for the gateway slot | Document only — no Python install; wired via `OPENAI_BASE_URL` env override + `Helicone-Auth` header. |
| OpenAI Whisper | Speech-to-text (STT) | Offline mic transcription via `scripts/voice_in.py` | Tiny model mishears uncommon words; larger models slower | Stage-1: installed; push-to-talk voice INPUT path. Drill: `tests/drills/drill_voice_pipeline.py`. |
| Piper TTS | Local text-to-speech | Self-hosted natural-voice output via `scripts/voice_out.py` | Voice-model download ~63MB; quality lower than commercial TTS | Stage-1: installed; voice OUTPUT path. en_US-lessac-medium cached at `~/.cache/piper-models/`. |
| BMad-Method (npm) | Universal AI agent framework methodology | Node.js + markdown methodology pattern | Node/npm path is secondary to the local `_bmad/` install | Superseded by working local BMAD 6.8.0 install; keep npm use optional and revalidate before relying on it. |
| Temporal | Durable workflow engine | Long-running approval workflows, retries, pause/resume, compensation | Operational dependency; requires server/workers and workflow versioning discipline | Target production approval/workflow engine; not wired. Current substitute is Archon approval gates plus approval broker. |
| LangGraph Studio | Agent graph workflow UI | Visualizing and debugging LangGraph execution graphs | Requires LangGraph adoption first | Target graph workflow observability; not wired. |
| Argo Workflows | Kubernetes-native workflow engine | DAG orchestration for container jobs | Requires Kubernetes and cluster RBAC | Target for K8s batch/workflow execution; not useful for current Docker Compose-only stack. |
| n8n | Low-code automation workflows | Connector automation, webhooks, low-code orchestration | Secrets, egress, and tenant isolation risk | Candidate only; must pass tool adoption and security review before any connector use. |
| Harness | CI/CD workflow monitoring | Deployment pipelines, approvals, execution visibility | External platform dependency and deployment permission risk | Target CI/CD/deployment control; not wired into runtime. |
| Humanloop | Prompt and agent evaluation | Human feedback workflows and eval management | SaaS/data retention review required | Candidate only; compare against Langfuse/Braintrust before adoption. |
| Laminar | AI tracing | Distributed AI traces and workflow visibility | New observability surface to operate | Candidate only; compare against OTel/OpenLIT/Langfuse. |
| Braintrust | AI eval and monitoring | Experiment tracking, datasets, evals | SaaS/data retention review required unless self-host path is selected | Candidate only; compare against DeepEval/Ragas/Langfuse. |
| WhyLabs | ML/LLM observability | Drift, anomaly detection, data quality monitoring | Separate monitoring stack and data export review | Candidate for model/data monitoring; not wired. |

## Adoption Rule

No tool may be adopted until these questions are answered:

```text
Tool name:
Business use case:
Data it can access:
Secrets it can access:
User roles allowed:
Deployment model:
Audit logging:
Failure mode:
Fallback plan:
Security review status:
Test harness:
Owner:
Exit strategy:
```

## Architecture Placement

| Tool Type | Allowed Layer | Not Allowed |
|---|---|---|
| Autonomous teammate | Orchestration/governance layer | Direct database writes without service/API boundary |
| Multi-channel gateway | Integration adapter layer | Bypassing auth, audit, or rate limits |
| Coding workflow runtime | Developer tooling/harness layer | Runtime production business decisions |
| Media/content editor | Content/demo tooling layer | Auth, database, model registry, or API orchestration |

## Security Requirements

Before any integration:

- least-privilege API token
- no raw production database credentials
- no unrestricted secret access
- audit log for every action
- scoped environment variables
- network egress review
- prompt/data retention review
- rollback/disable switch
- rate limiting
- human approval for destructive actions

## Evaluation Criteria

Score every candidate from 1 to 5:

| Criterion | Description |
|---|---|
| Business value | How directly it supports a real workflow |
| Security posture | Auth, secrets, tenant isolation, auditability |
| Integration complexity | Setup, maintenance, operational burden |
| Ecosystem maturity | Docs, community, releases, reliability |
| Observability | Logs, traces, metrics, replayability |
| Testability | Can it run in CI/harness with deterministic checks |
| Exit strategy | Can it be removed without large rewrite |

## Recommended Use In This Repo

### Hermes Agent

Use only for:

- long-running planning assistant
- backlog analysis
- documentation update suggestions
- agent memory experiments

Do not use for:

- direct DB changes
- direct production deployments
- unaudited autonomous code merge

### OpenClaw

Use only for:

- multi-channel workflow routing
- integration gateway experiments
- event-to-action automation with strict policies

Do not use for:

- replacing backend service layer
- bypassing FastAPI auth/RBAC
- unrestricted access to external SaaS accounts

### Kilo Code

Use only for:

- coding workflow orchestration
- test generation
- repo analysis
- controlled refactor harnesses

Do not use for:

- production runtime decision making
- direct deployment without CI gates

### Descript

Use only for:

- demo videos
- walkthrough narration
- product media
- internal training content

Do not use for:

- agent orchestration
- backend automation
- data processing pipelines

### Archon

Use only for:

- developer workflow orchestration
- project doctor failure repair loops
- API/backend governance workflows
- validation and documentation checklists

Do not use for:

- production runtime decisions
- bypassing FastAPI service boundaries
- direct deployment without project validation gates

### BMAD

Use only for:

- PRD and story drafting
- acceptance criteria and review checklist structure
- recurring AI task methodology
- planning handoff into Archon or normal PR work

Do not use for:

- production runtime orchestration
- bypassing repo architecture boundaries
- direct deploy, merge, database, or secret access

### Dark Factory Operating Model

Use only for:

- coordinating the full BMAD Dark Factory flow from idea, analyst PRD, architect system design, scrum stories, Archon workflow, coding agent, Playwright validation, opt-in DeepEval, target Temporal approval, deployment, and monitoring
- documenting which tool owns each step of an AI-assisted delivery flow
- keeping autonomous work inside approval, audit, validation, and docs gates
- distinguishing working-local substitutes from target-only tools such as OpenHands, DeepEval, Temporal, and full OpenTelemetry

Do not use for:

- autonomous production changes
- claiming candidate tools are production-wired without verified status
- replacing CODEOWNERS, CI, deployment environment approvals, or `project_doctor`

### GitHub Copilot CLI/SDK

Use only for:

- developer terminal assistance
- repo-aware implementation and review sessions
- generating or updating `.github/copilot-instructions.md` when intentionally requested
- future Copilot Extension/SDK experiments behind governance review

Do not use for:

- production runtime decisions
- direct database or deployment actions without explicit approval
- broad `--allow-all`/`--yolo` sessions on sensitive changes
- bypassing existing Codex/Archon/project doctor validation gates

## Governance Decision

Default decision for now:

- Hermes Agent: research / not integrated
- OpenClaw: local OpenClaw-compatible bridge integrated; external OpenClaw gateway/SDK not bundled
- Kilo Code: developer tooling candidate / not integrated
- Descript: media tooling only / not integrated
- Archon: developer workflow harness installed locally; repo-local BEV workflows configured; not production integrated
- GitHub Copilot CLI/SDK: CLI installed locally as developer tooling; SDK/extensions remain candidate only and are not production integrated
- BMAD: local methodology/scaffold installed; planning and review layer only
- Dark Factory Operating Model: documented control model only; not a runtime tool

Archon repo-local setup lives in `.archon/` and currently provides `insur-project-doctor-fix` and `insur-api-change-governance` workflows.

Any future production integration must update:

- `docs/AGENT_COUNCIL_ARCHITECTURE.md`
- `docs/AGENT_HARNESS_GUIDE.md`
- `docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md`
- `docs/BACKEND_UNIVERSAL_PROJECT_POLICY.md`
- `AGENTS.md`
- `README.md`


## Related Architecture Study

See `docs/AGENT_ARCHITECTURE_PATTERNS.md` for hub-and-spoke, council, swarm, hierarchical, blackboard, event-driven, federated, DAG, debate, reflection, society-of-mind, mixture-of-agents, recursive delegation, and digital-twin agent patterns.
