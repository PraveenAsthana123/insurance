# ai-agents/ · consolidated AI agent stack

Per operator 2026-06-08: "all must be deep folder". 11 tools × `deep/` subdir
each. All §90 + §91 work consolidated here for easy backport · clear ownership ·
single entry point.

## Layout

```
ai-agents/
├── README.md                          ← this index
├── _shared/                           ← cross-cutting
│   ├── policies/                      ← §90 + §91 + integration docs
│   ├── catalogs/                      ← use-case · hybrid · RAF · tool matrices
│   ├── datasets/                      ← Kaggle download script
│   ├── scripts/                       ← generators · audit · setup
│   └── use-cases/                     ← symlink to /docs/use-cases (123 stubs)
│
├── webllm/      deep/ · in-browser LLM via WebGPU                    (§91 stack)
├── cdp/         deep/ · Chrome DevTools Protocol                     (§91 stack)
├── rag/         deep/ · Chroma multi-tenant retrieval                (§91 stack)
├── langgraph/   deep/ · stateful agent DAG                           (§91 stack)
│
├── browser-use/ deep/ · Playwright wrapper · LLM browser automation  (alt to CDP)
├── skyvern/     deep/ · production RPA · vision-first                (alt to CDP)
├── ui-tars/     deep/ · vision-language model 7B                     (vision)
├── openadapt/   deep/ · process recorder                             (training data)
├── omniparser/  deep/ · screenshot → DOM                             (vision)
├── openhands/   deep/ · autonomous coding agent                      (code tasks)
└── agentops/    deep/ · observability/trace/cost SDK                 (cross-cut)
```

## Per-tool deep/ structure (uniform)

Every tool has the same skeleton:

```
<tool>/deep/
├── backend/      ← Python integration code
├── frontend/     ← React hooks · components
├── docs/         ← architecture · setup · troubleshooting
├── scripts/      ← install.sh + utilities
├── examples/     ← sample usage
└── tests/        ← unit + integration
```

## One-cmd install

```bash
./_shared/scripts/setup_ai_agent_stack.sh --help        # show options
./_shared/scripts/setup_ai_agent_stack.sh --core        # §91 essentials
./_shared/scripts/setup_ai_agent_stack.sh --all         # everything
./_shared/scripts/setup_ai_agent_stack.sh --tool agentops --tool browser-use
```

Or per-tool: `./<tool>/deep/scripts/install.sh`

## Master catalogs (in _shared/catalogs/)

| File | Content |
|---|---|
| [AI_USE_CASES.md](_shared/policies/AI_USE_CASES.md) | 80 canonical use cases across blocks A–N |
| [HYBRID_PER_DEPT.md](_shared/catalogs/HYBRID_PER_DEPT.md) | 94 hybrid cells · 21 depts × 5 types |
| [RAF_SCENARIOS.md](_shared/catalogs/RAF_SCENARIOS.md) | 75 Recommender/Anomaly/Fraud × Numerical/Text/Image |
| [TOOL_SETUP.md](_shared/catalogs/TOOL_SETUP.md) | 7-tool setup with code snippets |
| [CAPABILITY_MATRIX.md](_shared/catalogs/CAPABILITY_MATRIX.md) | 21 depts × 31 AI categories |
| [WEBLLM_CDP_RAG_LANGGRAPH.md](_shared/policies/WEBLLM_CDP_RAG_LANGGRAPH.md) | §91 integration architecture |

## Composes with

§64.40 (10-layer agentic stack) · §64.43 (pattern selection) · §64.44 (tool status) · §90 (mandatory AI use cases) · §91 (WebLLM+CDP+RAG+LangGraph default).

## Backport to other projects

```bash
# From insur_project root:
rsync -a --exclude=node_modules ai-agents/ /path/to/other-project/ai-agents/
```

Per share-folder mirror pattern (§63.7 + §58.7).
