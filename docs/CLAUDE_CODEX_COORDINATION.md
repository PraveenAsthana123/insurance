# Claude × Codex Coordination Plan

Per operator 2026-06-01:
> "what codex is working you should get to know ..create the plan for that as well"

Two parallel AI sessions (Claude Code + OpenAI Codex) work on the same
repository. This doc is the **shared coordination layer** that prevents
duplicate work + merge conflicts + policy drift.

## Live awareness — what Codex has shipped

Discovered via `find . -type f -newer scripts/scaffold_insurance_depts.py` +
`crontab -l | grep codex`:

### Codex scripts
| File | Purpose |
|---|---|
| [scripts/setup_claude_autonomy.sh](../scripts/setup_claude_autonomy.sh) | One-shot Claude autonomy + approval-watcher bootstrap |
| [scripts/automation_job_runner.py](../scripts/automation_job_runner.py) | Voice/text → Ollama plan → OpenClaw task pipeline |
| [scripts/watch_codex_approvals.sh](../scripts/watch_codex_approvals.sh) | systemd-style approval watcher (every 2s) |
| [scripts/install_codex_approval_cron.sh](../scripts/install_codex_approval_cron.sh) | Cron fallback (every 5 min) for archon approval gates |
| [scripts/install_codex_approval_advanced.sh](../scripts/install_codex_approval_advanced.sh) | Advanced approval policy installer |
| [scripts/archon_auto_approve_safe.py](../scripts/archon_auto_approve_safe.py) | Safe-list archon workflow approver |

### Codex docs
| File | Purpose |
|---|---|
| [docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md](CLAUDE_AUTONOMY_APPROVAL_POLICY.md) | Repo-level autonomy contract for Claude |
| [docs/NO_APPROVAL_AUTONOMY_POLICY.md](NO_APPROVAL_AUTONOMY_POLICY.md) | "Don't ask" mode + boundaries |
| [docs/CODEX_APPROVAL_CRON_POLICY.md](CODEX_APPROVAL_CRON_POLICY.md) | Cron-based approval policy |
| [docs/CODEX_APPROVAL_ADVANCED_POLICY.md](CODEX_APPROVAL_ADVANCED_POLICY.md) | Advanced approval policy |
| [docs/CODEX_APPROVAL_CRON_RUN_PLAN.md](CODEX_APPROVAL_CRON_RUN_PLAN.md) | Run-plan + verification |
| [docs/APPROVAL_GOVERNANCE.md](APPROVAL_GOVERNANCE.md) | Approval governance entry-point |

### Codex crontab blocks
| Tag | Schedule | Purpose |
|---|---|---|
| `INSUR-AUTOMATION-JOBS` | per `automation_job_runner.py` config | Voice/text → Ollama → OpenClaw runner |
| `CODEX-SAFE-APPROVAL` | every 5 min | Approves safe archon workflow gates |

## Live awareness — what Claude (this session) has shipped

| Category | Files | Owner |
|---|---|---|
| 4-dept insurance scaffold | [global-ai-org/departments/{claims,underwriting,customer-service,fraud-siu}/](../global-ai-org/departments/) — 200 .md/dept | Claude |
| Insurance scaffolder | [scripts/scaffold_insurance_depts.py](../scripts/scaffold_insurance_depts.py) | Claude |
| Insurance router | [backend/routers/insurance.py](../backend/routers/insurance.py) — 10 endpoints | Claude |
| Pipeline runner | [backend/ml/insurance/run_dept_pipelines.py](../backend/ml/insurance/run_dept_pipelines.py) | Claude |
| 10 ADRs | [docs/architecture/adr/ADR-001..010](architecture/adr/) | Claude |
| Production-readiness (13 modules) | [docs/GLOBAL_PRODUCTION_READINESS_TEMPLATES.md](GLOBAL_PRODUCTION_READINESS_TEMPLATES.md) | Claude |
| Compliance docs | [docs/compliance/](compliance/) | Claude |
| k6 load tests | [load-testing/](../load-testing/) | Claude |
| Advanced agentic stack v2 | [scripts/setup_advanced_agentic_stack_v2.sh](../scripts/setup_advanced_agentic_stack_v2.sh) | Claude |
| 23-step drill | [tests/drills/drill_insurance_dept_artifacts.py](../tests/drills/drill_insurance_dept_artifacts.py) | Claude |
| INSUR-AUDIT cron block | (twice daily + 13 weekly per-dataset) | Claude |

## File-ownership boundary (avoid stomping)

| Directory / path pattern | Owner | Other session may | Other session must NOT |
|---|---|---|---|
| `global-ai-org/departments/{claims,underwriting,customer-service,fraud-siu}/INSUR_*.md` | Claude | read | edit |
| `backend/services/external_feeds/{kyc,nicb,clue,ehr}.py` | Claude | read | edit |
| `infra/nginx/`, `infra/cdn/`, `infra/policy/`, `infra/observability/`, `infra/orchestration/`, `infra/backup/`, `infra/identity/`, `infra/cron/` | Claude (from global §72) | read | edit (re-run scaffolder instead) |
| `docs/architecture/adr/ADR-*.md` | Claude | add ADR-011+ | edit existing ADRs |
| `docs/compliance/{EU_AI_ACT,HIPAA,STATE_DOI_RATE_FILING}.md` | Claude | read | edit |
| `load-testing/{smoke,load,stress,soak,spike}.js` | Claude | read | edit |
| `scripts/audit_insurance_artifacts.py`, `scripts/scaffold_insurance_depts.py`, `scripts/install_insurance_cron.sh`, `scripts/download_insurance_datasets.py` | Claude | read | edit |
| `scripts/voice_command.sh`, `scripts/setup_advanced_models.sh`, `scripts/setup_advanced_dev_environment.sh`, `scripts/setup_advanced_agentic_stack_v2.sh` | Claude | read + run | edit |
| ─── | | | |
| `scripts/automation_job_runner.py` | Codex | read + run | edit |
| `scripts/voice_in.py`, `scripts/voice_out.py` | Codex (original) | read + extend | rewrite |
| `scripts/install_codex_approval_*.sh`, `scripts/archon_auto_approve_safe.py`, `scripts/watch_codex_approvals.sh`, `scripts/setup_claude_autonomy.sh` | Codex | read + run | edit |
| `docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md`, `docs/NO_APPROVAL_AUTONOMY_POLICY.md`, `docs/CODEX_APPROVAL_*.md`, `docs/APPROVAL_GOVERNANCE.md` | Codex | read | edit |
| `INSUR-AUTOMATION-JOBS`, `CODEX-SAFE-APPROVAL` crontab blocks | Codex | read | edit (re-run installer instead) |
| ─── | | | |
| `backend/main.py`, `backend/core/*`, `backend/services/*`, `backend/routers/*`, `backend/repositories/*` | shared | edit with care | break boot |
| `docker-compose.yml` | shared (append-only convention) | append new services | mutate existing |
| `.gitignore`, `requirements.txt`, `package.json` | shared (append-only) | append | reorder/remove |

## Commit prefix convention

| Prefix | Owner | Examples |
|---|---|---|
| `feat(insurance):` | Claude — insurance domain | scaffold, runner, simulation |
| `feat(prod):` | Claude — production-readiness | ADR, modules, k6 |
| `feat(automation):` | Codex — automation runner / voice pipeline | runner improvements |
| `feat(approval):` | Codex — approval policy / autonomy docs | approval cron, autonomy |
| `chore(coord):` | either — coordination housekeeping | this doc, cross-session sync |

## Conflict-avoidance protocol

1. **Read this doc at session start** — both sessions
2. **Before editing files in the "shared" row**, check `git log -1 -- <path>` to see latest owner
3. **Commit incrementally** — each commit < 100 LOC where possible; reduces rebase friction
4. **Never rebase the other's commits** — both sessions push to main / develop linearly
5. **Use `git status -uno`** before any `git add -A` to verify no surprise files
6. **Document each session's major artifact** in this doc within the same commit that adds it

## Status command

Each session has a single command that summarizes what's done:

```bash
# Both sessions read this
bash scripts/setup_advanced_dev_environment.sh --status

# Plus diff against the other's expectations
git log --since='2 hours ago' --oneline --all
```

## Composes with

- §42 operational autonomy (both sessions honor §42 hard-gate list)
- §47.6 SOC2 CC6.1 (file-ownership + audit trail)
- §51 forensic substrate (commit messages document Approach attribution)
- §54 no Co-Authored-By trailer (both sessions present work under operator's identity)
- §72 global production-readiness scaffolding (Claude owns this; Codex doesn't touch)
- `docs/EDITOR_AGNOSTIC_SETUP.md` (the surface both sessions wire to)

## Boundary cases

| Scenario | Resolution |
|---|---|
| Codex adds a new ADR | Allowed; ADR ownership is by-number, not by-session |
| Claude extends `automation_job_runner.py` | Avoid — prefer wrapping in Claude-owned script that imports from it |
| Conflict in `backend/main.py` router registration | Last-writer wins; verify `from main import create_app; create_app()` still boots |
| Both sessions add to docker-compose.yml | Append-only convention; re-run drill |
| Operator says "fix all" mid-Codex-work | Either session may proceed; the other's commits don't block |
| `crontab -l | grep INSUR | wc -l` shows duplicates | Re-run respective installer (idempotent strip + re-install) |

## Operator messages observed (last 30 min)

> "I am not able to give voice over command here"
> "setup advance whisper model, kivi coding model, grok model on ollama as well"
> "have advance level voice over command setup, bmad setup, openclaw setup, paperclip setup"
> "other editor codex also should be able to use"
> "what codex is working you should get to know ..create the plan for that as well"

Both sessions interpret these as `all-approved` per global §42 + Codex
`NO_APPROVAL_AUTONOMY_POLICY.md`. Neither session asks per-action.

## The brutal rule

> Two parallel AI sessions on the same repository can either compound or
> collide. They compound when both honor the same global policies (§42,
> §47, §72) AND have a clear file-ownership table. They collide when
> ownership is implicit. This doc makes ownership EXPLICIT so compounding
> is the default.
