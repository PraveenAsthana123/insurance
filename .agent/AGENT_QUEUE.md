# AGENT_QUEUE.md — pending tasks for the agent fleet

Format: `[STATUS] task_id — purpose — model — added_at — owner`

STATUS ∈ {QUEUED, IN_PROGRESS, WAITING_APPROVAL, VALIDATING, FIXING_ERROR, BLOCKED, FAILED, COMPLETED, ROLLED_BACK, ESCALATED}

## Active queue

(none — append tasks below)

## Recently completed (last 24h)

- [COMPLETED] T-fixall-001 — coding — qwen2.5-coder:7b — 2026-06-01T04:17Z — operator
  Fix-all: 14/14 green
- [COMPLETED] T-pytest-fix — debugging — qwen2.5-coder:14b — 2026-06-01T05:10Z — operator
  pytest 0 → 304 tests collected
- [COMPLETED] T-opa-rego  — debugging — qwen2.5-coder:14b — 2026-06-01T05:13Z — operator
  OPA approval 5/8 → 8/8
- [COMPLETED] T-sql-extract — coding — qwen2.5-coder:7b — 2026-06-01T05:16Z — operator
  6 SQL violations → 0
- [COMPLETED] T-bot-daemon — monitoring — qwen2.5-coder:3b — 2026-06-01T05:20Z — operator
  insur_bot serve :8001 live

## Queue submission format

```jsonl
{"task_id":"T-XXX","prompt":"...","purpose":"coding|debugging|...","model":"<override>","priority":"P0|P1|P2|P3"}
```

Append to `.agent/parallel_queue.jsonl` then run:
```
python ~/.claude/scripts/agent-parallel-kivi.py queue --workers 4
```
