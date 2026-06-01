# Tier: boundary

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`boundary-agent` — Hypothesis property tests; on PR

## Test file pattern

`test_boundary.py` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `boundary`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "boundary", "dept": "<dept>", "path": "tests/<dept>/boundary/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`boundary-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
