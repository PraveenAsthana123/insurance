# Tier: integration

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`integration-agent` — Cross-service flows; needs real DB + cache; runs on PR

## Test file pattern

`test_integration.py` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `integration`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "integration", "dept": "<dept>", "path": "tests/<dept>/integration/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`integration-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
