# Customer Experience — Tester (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

validating workflows, AI quality, regression

## What this role owns

test plans, pass/fail counts, AI hallucination + defect tracking

## How this role uses HOLY's Customer Experience platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/customer-experience` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

NLP, RAG, Sentiment AI, Conversational AI, Predictive ML

## Tech stack this role touches

- FastAPI + Python
- LangGraph for orchestration
- Whisper (STT) + ElevenLabs (TTS)
- OpenAI / Claude / local LLMs

## Role-specific dashboards + reports

- `../dashboards-by-role/tester/` — role-scoped dashboards (when authored)
- `../reports-by-role/tester/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
