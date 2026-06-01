# Digital Marketing — Information Security (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

data + AI security posture for this dept

## What this role owns

threat model, prompt-injection defense, PII protection, audit logs

## How this role uses HOLY's Digital Marketing platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/digital-marketing` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

NLP, Recommendation AI, GenAI, Reinforcement Learning

## Tech stack this role touches

- Python + scikit-learn
- OpenAI / Anthropic / Ollama for GenAI
- Snowflake + dbt
- Segment + Amplitude (clickstream)
- Looker / Tableau

## Role-specific dashboards + reports

- `../dashboards-by-role/information-security/` — role-scoped dashboards (when authored)
- `../reports-by-role/information-security/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
