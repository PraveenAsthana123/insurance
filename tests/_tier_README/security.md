# Tier: security

> Per global CLAUDE.md §64.30 + §64.42 + §65.1 #8.

## Assigned agent

`security-agent` — ZAP + Garak + Semgrep; pre-release (auth envs only per §42)

## Test file pattern

`test_security.py` per dept under this directory.

## Recommended OSS tool

See global §64.42 master testing matrix row for `security`.

## How agents pick up work

Operator (or scheduler) pushes to Redis `test_tasks`:

```json
{"tier": "security", "dept": "<dept>", "path": "tests/<dept>/security/"}
```

The `test_agent.py` worker (one of the 100-agent fleet, role-tagged
`security-agent`) BRPOPs the task, runs the test, pushes result to
`test_results`.
