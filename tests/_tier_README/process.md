# Tier: process

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`drill-agent` — End-to-end process drills per §43; on every commit

## Test file pattern

`test_process_drill.py` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `process`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "process", "dept": "<dept>", "path": "tests/<dept>/process/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`drill-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
