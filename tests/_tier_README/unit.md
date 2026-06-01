# Tier: unit

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`pytest-agent` — Fast deterministic tests on every commit

## Test file pattern

`test_unit.py` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `unit`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "unit", "dept": "<dept>", "path": "tests/<dept>/unit/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`pytest-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
