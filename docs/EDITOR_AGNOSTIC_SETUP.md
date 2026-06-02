# Editor-Agnostic Advanced Dev Environment

Per operator 2026-06-01: "other editor codex also should be able to use"
and "have advance level voice over command setup, bmad setup, openclaw setup,
paperclip setup".

This stack is **editor-agnostic**. The same backend services + scripts
work from Claude Code, OpenAI Codex (Cursor-style), Aider, plain shell,
or VS Code.

## Single status command

```bash
bash scripts/setup_advanced_dev_environment.sh --status
```

Returns colored output showing what's present + what's missing across:
- BMAD (planning + PRD + architecture)
- OpenClaw (execution orchestration)
- Paperclip (artifact / context-pack adapter)
- Voice command (mic → Whisper → clipboard)
- Advanced models (Kivi + qwen2.5-coder + Whisper distil-large-v3)

## Boot in 4 steps (any editor)

```bash
# 1. Base stack
docker compose up -d

# 2. Pull advanced models (Whisper + Ollama coders)
bash scripts/setup_advanced_models.sh

# 3. Advanced agentic stack (OPA + OTel + Temporal)
bash scripts/setup_advanced_agentic_stack_v2.sh

# 4. Speak a command (mic → STT → clipboard)
bash scripts/voice_command.sh
```

## Per-editor wiring

### Claude Code
- Uses Bash tool to invoke any of the above scripts
- Voice: run `voice_command.sh` from a terminal alongside CC; paste from clipboard
- OPA approval: `from core.opa_client import check_approval`
- Composes with global §72 templates already

### OpenAI Codex CLI
- Same shell scripts work as-is (no editor-specific deps)
- Voice: same `voice_command.sh` → clipboard → paste into Codex prompt
- BMAD skills addressable via slash commands or shell wrappers
- Paperclip artifacts queryable via `curl http://localhost:8000/api/v1/paperclip/clips`

### Cursor
- Same shell scripts; invoke from Cursor's terminal
- Voice: bind `voice_command.sh` to a Cursor keybinding for push-to-talk
- BMAD: invoke skills via `.cursor/rules` or shell

### Aider / shell / vim
- Pure HTTP API surface; nothing editor-specific
- Voice: standalone CLI; pipe transcript into editor via stdin / clipboard

## API surface (editor-agnostic)

| Capability | Endpoint | Auth |
|---|---|---|
| OpenClaw task submit | `POST /api/v1/openclaw/tasks` | `X-Tenant-ID` |
| OpenClaw status | `GET /api/v1/openclaw/status` | open |
| Paperclip store | `POST /api/v1/paperclip/clips` | `X-Tenant-ID` + `Idempotency-Key` |
| Paperclip retrieve | `GET /api/v1/paperclip/clips/{id}` | `X-Tenant-ID` |
| Paperclip context-pack | `POST /api/v1/paperclip/context-packs` | `X-Tenant-ID` |
| Insurance dept spec | `GET /api/v1/insurance/depts/{dept}/spec` | open |
| Pipeline runner | `POST /api/v1/insurance/depts/{dept}/pipelines/{id}/run` | open |
| OPA decision | `POST http://localhost:8181/v1/data/insur/approval` | none (local) |

## Voice command — detailed

```bash
# Push-to-talk: 10s record → STT → clipboard
bash scripts/voice_command.sh

# Shorter window
bash scripts/voice_command.sh --duration 5

# Heavier model (more accurate, slower)
bash scripts/voice_command.sh --model large-v3

# Self-driving: also dispatch transcript to automation
bash scripts/voice_command.sh --dispatch --department engineering --mode council
```

After running, the transcript is:
1. In your clipboard (paste into any editor with Ctrl+V / Cmd+V)
2. Echoed to stdout (capture in shell pipeline)
3. Logged to `jobs/logs/voice_command_<ts>.log` (if --dispatch)

## Voice + advanced agentic stack (the loop)

```
Voice in (mic) ────→ voice_command.sh
                       ↓ (Whisper distil-large-v3)
                       transcript
                       ↓ (--dispatch)
                       automation_job_runner.py
                       ↓ (Ollama plan: kivi:local OR qwen2.5-coder:7b)
                       intent + actions
                       ↓ (HTTP)
                       OpenClaw /tasks
                       ↓ (queue)
                       100-agent fleet
                       ↓ (decision)
                       OPA approval gate
                       ↓ (allow / deny / require_human)
                       Action execution
                       ↓ (audit + trace)
                       Decision audit row (§38.3)
                       + OTel spans → Jaeger + Phoenix
                       ↓ (TTS optional)
                       voice_out.sh → speaker
```

## Cron coexistence

| Block | Owner | Schedule |
|---|---|---|
| INSUR-AUDIT | Claude (this session) | twice daily + 13 weekly per-dataset |
| INSUR-AUTOMATION-JOBS | Codex (parallel session) | per automation_job_runner config |
| CODEX-SAFE-APPROVAL | Codex (parallel session) | every 5 min archon scan |

All three coexist cleanly. `crontab -l | grep INSUR` shows the union.

## Composes with global policies

- §42 operational autonomy (DANGER_MODE bounded; gated ops still gated)
- §64.40 10-layer agentic stack (voice → planner → policy → CUA)
- §64.43 #1 hub-and-spoke (100-agent fleet handles tasks)
- §64.43 #2 council pattern (council_agents service)
- §72 production-readiness scaffolding (modules 11-14 used here)
- ADR-002 (Ollama default), ADR-008 (Keycloak SSO), ADR-009 (OTel)
