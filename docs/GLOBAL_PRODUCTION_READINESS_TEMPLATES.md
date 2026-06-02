# Global Production-Readiness Templates — This Project is the Reference Impl

Per global §72 + operator 2026-06-01.

## What this project contributes globally

This project's `infra/`, `docs/compliance/`, `docs/architecture/adr/`,
`load-testing/`, `docs/CRON_JOBS_PLAN.md`, and `backend/services/external_feeds/`
were lifted (and parameterized) into the global production-readiness templates at:

```
~/.claude/templates/production-readiness/
├── nginx-lb/         (← infra/nginx/)
├── cdn/              (← infra/cdn/)
├── external-feeds/   (← backend/services/external_feeds/)
├── compliance/       (← docs/compliance/)
├── load-testing/     (← load-testing/)
├── adr-template/     (← docs/architecture/adr/)
├── cron-plan/        (← docs/CRON_JOBS_PLAN.md)
└── cron-installer/   (← abstracted from scripts/install_insurance_cron.sh)
```

## How a NEW project gets these

Single command, 30 seconds:

```bash
~/.claude/scripts/scaffold-production-readiness.sh --target /path/to/new/project
```

All 8 modules install at standardised paths with project-specific token
substitution. Per global §72.

## Cherry-pick one module

```bash
~/.claude/templates/production-readiness/nginx-lb/install.sh \
    --target /path/to/new/project
```

## Backport edits FROM this project TO global

When you edit one of the in-project files (e.g. `infra/nginx/nginx.conf`)
and the change is project-agnostic, mirror it back:

```bash
# Re-parameterize project tokens at copy time
sed \
    -e 's|insur\.example\.com|{{PROJECT_DOMAIN}}|g' \
    -e 's|insur_project|{{PROJECT_NAME}}|g' \
    -e 's|insur_nginx|{{PROJECT_SLUG}}_nginx|g' \
    -e 's|insur-tfstate|{{PROJECT_SLUG}}-tfstate|g' \
    -e 's|INSUR_KYC_|{{PROJECT_PREFIX_UC}}_KYC_|g' \
    -e 's|INSUR_NICB_|{{PROJECT_PREFIX_UC}}_NICB_|g' \
    -e 's|INSUR_CLUE_|{{PROJECT_PREFIX_UC}}_CLUE_|g' \
    -e 's|INSUR_EHR_|{{PROJECT_PREFIX_UC}}_EHR_|g' \
    -e 's|loadtest-tenant|{{LOADTEST_TENANT_ID}}|g' \
    infra/nginx/nginx.conf \
    > ~/.claude/templates/production-readiness/nginx-lb/nginx.conf
```

## The 13 modules at a glance

| # | Module | Target path | Files | When to install |
|---|---|---|---|---|
| 1 | nginx-lb | `infra/nginx/` | 1 | Always |
| 2 | cdn | `infra/cdn/` | 3 | Always (deploy later) |
| 3 | external-feeds | `backend/services/external_feeds/` | 5 | Skip if no KYC/health/credit-bureau |
| 4 | compliance | `docs/compliance/` | 3 | Skip if non-regulated domain |
| 5 | load-testing | `load-testing/` | 5 | Always |
| 6 | adr-template | `docs/architecture/adr/` | 1 | Always (addresses §47.3) |
| 7 | cron-plan | `docs/` | 1 | Always |
| 8 | cron-installer | `infra/cron/` | 1 | Skip if all scheduling lives in Airflow/Temporal/k8s |

## Verification after install (smoke)

```bash
ls infra/nginx/nginx.conf && \
ls infra/cdn/README.md && \
ls infra/cdn/cloudflare/zone-config.json && \
ls infra/cdn/cloudfront/main.tf && \
ls backend/services/external_feeds/{kyc,nicb,clue,ehr}.py && \
ls docs/compliance/{EU_AI_ACT,HIPAA,STATE_DOI_RATE_FILING}.md && \
ls load-testing/{smoke,load,stress,soak,spike}.js && \
ls docs/architecture/adr/ADR-001-deployment-target.md && \
ls docs/CRON_JOBS_PLAN.md && \
ls infra/cron/install_cron.sh && \
echo "production-readiness scaffold OK"
```

## See also

- Global §72 — full policy
- Global §63 — sibling global scaffold pattern (global-ai-org)
- Global §58.7 — mirror pattern (project ↔ ~/.claude/scripts/)
- This project's [drill_insurance_dept_artifacts.py step 17](../tests/drills/drill_insurance_dept_artifacts.py) — verifies 18 production files exist
