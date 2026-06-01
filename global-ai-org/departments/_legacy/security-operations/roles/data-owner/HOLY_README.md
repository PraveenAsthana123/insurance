# Security Operations — Data Owner (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

data quality + stewardship + access governance

## What this role owns

data quality rules, sensitive-data classification, access requests

## How this role uses HOLY's Security Operations platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/security-operations` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

Cybersecurity AI, Behavioral AI, Correlation AI, Anomaly Detection, RAG

## Tech stack this role touches

- Splunk + CrowdStrike + Sentinel
- Python + sklearn + XGBoost
- OpenAI / local LLMs for triage
- Snowflake + dbt

## Role-specific dashboards + reports

- `../dashboards-by-role/data-owner/` — role-scoped dashboards (when authored)
- `../reports-by-role/data-owner/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
