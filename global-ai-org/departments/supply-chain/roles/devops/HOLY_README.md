# Supply Chain — Devops (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

deployment + rollback + uptime for this dept's services

## What this role owns

CI/CD, observability, environment configuration

## How this role uses HOLY's Supply Chain platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/supply-chain` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

Forecasting ML, Optimization AI, IoT AI, Anomaly Detection

## Tech stack this role touches

- Python + Prophet + XGBoost
- OR-tools for optimization
- Snowflake + dbt
- MLflow for model tracking

## Role-specific dashboards + reports

- `../dashboards-by-role/devops/` — role-scoped dashboards (when authored)
- `../reports-by-role/devops/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
