# Tier: smoke

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`smoke-agent` — Playwright E2E; every deploy

## Test file pattern

`smoke_test.spec.js` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `smoke`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "smoke", "dept": "<dept>", "path": "tests/<dept>/smoke/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`smoke-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
