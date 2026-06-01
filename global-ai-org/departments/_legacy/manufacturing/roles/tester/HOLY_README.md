# Manufacturing — Tester (HOLY)

**Source:** operator brief 2026-05-21.

## Role focus in this department

validating workflows, AI quality, regression

## What this role owns

test plans, pass/fail counts, AI hallucination + defect tracking

## How this role uses HOLY's Manufacturing platform

- **Navigates** via `HOLY_NAV.json` (left-sidebar process picker; see `/holy/manufacturing` in frontend)
- **Reads specs** under `business-layer/HOLY_SPEC.md` (+ deep specs where present)
- **Consults architecture** in `docs/hld/HOLY_HLD.md` + `docs/lld/HOLY_LLD.md`
- **References tech stack** in `../HOLY_TECH_STACK.md`

## Primary AI categories this role engages with

Predictive ML, Computer Vision, IoT AI, Edge AI, Optimization AI

## Tech stack this role touches

- Python + TensorFlow / PyTorch (CV)
- OpenCV + YOLO for inspection
- OPC-UA / MQTT for PLC integration
- NVIDIA Jetson for edge

## Role-specific dashboards + reports

- `../dashboards-by-role/tester/` — role-scoped dashboards (when authored)
- `../reports-by-role/tester/` — role-scoped reports (when authored)

## Composes with

- Department spec: `../../business-layer/HOLY_SPEC.md`
- Dept HLD/LLD/SAD: `../../docs/hld/HOLY_HLD.md`, `../../docs/lld/HOLY_LLD.md`, `../../docs/sad/HOLY_SAD.md`
- Per-role policies: `../../configuration/` (when authored)
- Per-process tabs: `../../HOLY_NAV.json` (Overview / Data / Input Data Type / AI Model / Output / KPI)
