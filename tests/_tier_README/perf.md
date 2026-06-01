# Tier: perf

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`perf-agent` — k6 load + perf; nightly + pre-release

## Test file pattern

`load_test.js` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `perf`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "perf", "dept": "<dept>", "path": "tests/<dept>/perf/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`perf-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
