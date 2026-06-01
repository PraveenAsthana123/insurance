# Customer Support — Admin (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

user/role/policy configuration + system health

## What this role owns

RBAC, feature flags, user lifecycle, system uptime

## How this role uses HOLY's Customer Support platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/customer-support` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

NLP, RAG, Conversational AI, Sentiment AI, Routing AI

## Tech stack this role touches

- Zendesk + Freshdesk
- Python + LangGraph
- OpenAI / Claude / local LLMs
- Snowflake (ticket warehouse)

## Role-specific dashboards + reports

- `../dashboards-by-role/admin/` — role-scoped dashboards (when authored)
- `../reports-by-role/admin/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
