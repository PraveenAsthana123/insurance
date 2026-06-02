# MODEL_ROUTING.md — tier → model mapping

Per operator 2026-06-01 spec. Composes with ~/.claude/scripts/agent-model-router.sh.

## Tier table

| Tier | Model | Size | RAM | Use case |
|---|---|---|---|---|
| small    | qwen2.5-coder:3b              | 1.9 GB | low    | quick fixes, summaries, tests, docs |
| medium   | qwen2.5-coder:7b (latest)     | 4.7 GB | mid    | daily coding, review (default) |
| large    | qwen2.5-coder:14b             | 9.0 GB | high   | refactor, debug, planning |
| xlarge   | qwen3-coder:30b               | 18 GB  | x-high | agentic / architecture |
| compact  | coder-compact:latest          | 4.7 GB | mid    | tight system prompt, num_ctx=8192 |
| reason   | deepseek-coder-v2:latest      | 8.9 GB | high   | reasoning-heavy code |
| reason-l | deepseek-coder:6.7b-instruct  | 3.8 GB | mid    | legacy fallback |
| nemo     | nemotron-mini:latest          | 2.7 GB | low    | NVIDIA mini |
| groq     | llama3-groq-tool-use:latest   | 4.7 GB | mid    | tool-use specialist |
| fast     | kivi:local                    | 815 MB | minimal| fastest local (parallel fan-out) |

## Auto-routing by purpose

| Purpose | Tier | Model |
|---|---|---|
| planning      | large  | qwen2.5-coder:14b |
| coding        | medium | qwen2.5-coder:7b |
| debugging     | large  | qwen2.5-coder:14b |
| testing       | small  | qwen2.5-coder:3b |
| review        | medium | qwen2.5-coder:7b |
| documentation | small  | qwen2.5-coder:3b |
| summarization | small  | qwen2.5-coder:3b |
| monitoring    | small  | qwen2.5-coder:3b |

## Plan → Implement → Review workflow (token-saving)

> Operator spec: 60-90% token reduction vs always-large

```
1. xlarge / large model   → plan + store in MEMORY.md
2. medium / kivi parallel → implement (small per-file diffs)
3. small model            → run tests, log validation
4. large model            → final review of the bundled diff
```

Reference: `~/.claude/scripts/agent-workflow-pir.sh`

## Architecture-decision matrix

| Question | Use |
|---|---|
| "How should I structure this feature?" | xlarge or large (planning) |
| "Fix this 5-line bug" | small (low cost) |
| "Refactor user_repo.py" | large (debugging) |
| "Summarize this commit" | small or kivi |
| "Audit 50 files for SQL-in-router" | parallel kivi fan-out |
| "Review the final diff for security" | large (one shot) |

## When to NOT use Ollama locally

| Scenario | Why escape Ollama |
|---|---|
| > 100k tokens of context | use Claude or GPT-4 (paid SaaS) |
| Need vision (image input) | use llava or paid SaaS |
| Need real-time streaming UI | use direct API, not router |
| Production user-facing latency < 200ms | Pre-warm or use kivi |
