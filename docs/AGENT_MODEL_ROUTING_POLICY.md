# Agent Model Routing Policy

This policy makes OpenClaw + Ollama the default local execution path for agent automation.

## Default Route

For local automation, code review, planning, scheduling, and 100-agent execution:

```text
operator text / task / cron
  -> BMAD or automation planner when needed
  -> OpenClaw task API
  -> Redis queue
  -> agents or council_agents
  -> Ollama model profile
  -> supervisor monitoring
```

## Profiles

Profiles live in:

```text
config/agent_model_profiles.json
```

Inspect profiles:

```bash
scripts/agent_model_profiles.py list
```

Start the fast 100-agent profile:

```bash
scripts/agent_model_profiles.py start fast
```

Start coding profile:

```bash
scripts/agent_model_profiles.py start coding
```

Start review profile:

```bash
scripts/agent_model_profiles.py start review
```

## Current Local Models

The local Ollama server already has useful coding models:

- `kivi:local`: fastest local default for broad 100-agent throughput.
- `deepseek-coder:6.7b-instruct`: best local coding profile for implementation suggestions.
- `codegemma:7b-instruct`: good author model for code explanations and plans.
- `starcoder2:7b`: good reviewer/comparison model.
- `codellama:7b-instruct`: useful fallback coding model.
- `qwen2.5:latest`: balanced reasoning/chair model.

## Recommendation

Use `kivi:local` when speed matters and many agents are running.

Use `coding` profile when task quality matters more than throughput.

Use `review` profile when agents are reviewing diffs, tests, and risks.

## Safety

OpenClaw/Ollama automation remains local. It does not bypass approval policy for production changes, secrets, destructive commands, external writes, GitHub pushes, or real browser/CUA side effects.
