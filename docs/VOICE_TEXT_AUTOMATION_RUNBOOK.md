# Voice/Text Automation With Ollama And OpenClaw

This runbook explains how to automate operator text, voice transcripts, scheduled jobs, cron, planning, and execution through local Ollama and the OpenClaw-compatible API.

## Meaning Of Voice/Text

The current repo path treats voice as already-transcribed text. It does not record microphone audio or run speech-to-text. Paste the transcript or save it in a text file, then run the automation command.

## Command Surface

Main runner:

```bash
scripts/automation_job_runner.py
```

Status check:

```bash
scripts/automation_job_runner.py status
```

Generate a plan with Ollama:

```bash
scripts/automation_job_runner.py plan   --text "Review sales forecast quality and create next actions"
```

Plan and execute once through OpenClaw:

```bash
scripts/automation_job_runner.py run-once   --department sales   --mode council   --text "Review sales forecast quality and create next actions"
```

Execute directly through OpenClaw without Ollama planning:

```bash
scripts/automation_job_runner.py execute   --department claims   --mode simple   --text "Summarize today's claim triage risks"
```

## Schedule With Redis Agent Scheduler

Add an interval schedule into the local Redis-backed agent scheduler:

```bash
scripts/automation_job_runner.py schedule-interval   --name sales-voice-review   --every 1800   --department sales   --mode council   --text "Every 30 minutes, review sales anomalies and propose actions"
```

Run due schedules once:

```bash
./scripts/agent_fleet.sh schedule-once
```

Run scheduler loop:

```bash
./scripts/agent_fleet.sh schedule-run
```

List schedules:

```bash
./scripts/agent_fleet.sh schedule-list
```

## Schedule With Cron

Install a managed cron entry that plans with Ollama and submits to OpenClaw:

```bash
scripts/automation_job_runner.py install-cron   --name sales-voice-review   --cron "*/30 * * * *"   --department sales   --mode council   --text "Review sales anomalies and create next actions"
```

Cron logs go to:

```text
jobs/logs/automation_<name>.log
```

Plans are saved under:

```text
jobs/automation/plan-*.md
```

## API Execution

OpenClaw direct API:

```bash
curl -X POST http://localhost:8000/api/v1/openclaw/tasks   -H 'Content-Type: application/json'   -H 'X-Demo-Role: manager'   -H 'X-Tenant-ID: automation'   -d '{"mode":"council","department":"sales","prompt":"Review sales risk","source":"voice-text-automation"}'
```

Ollama direct API:

```bash
curl -X POST http://localhost:11434/api/generate   -H 'Content-Type: application/json'   -d '{"model":"kivi:local","stream":false,"prompt":"Create an execution plan for sales anomaly review"}'
```

## Advanced Stack Startup

Before scheduling jobs, start/check the advanced local stack:

```bash
scripts/setup_advanced_agentic_stack.sh setup
scripts/install_codex_approval_advanced.sh status
```

## Automation Flow

1. Voice transcript or typed text enters `scripts/automation_job_runner.py`.
2. Ollama converts text into a practical execution plan.
3. The runner saves the plan in `jobs/automation/`.
4. The runner submits the plan to OpenClaw via `/api/v1/openclaw/tasks`.
5. Agent/council workers process Redis queues.
6. Scheduler or cron repeats the job on the chosen cadence.
7. Supervisor and OpenClaw status endpoints provide monitoring.

## Boundaries

This automation does not bypass hard safety gates. It does not handle microphone recording, external SaaS writes, production deploys, secrets, destructive commands, GitHub pushes, or real browser/CUA side effects.
