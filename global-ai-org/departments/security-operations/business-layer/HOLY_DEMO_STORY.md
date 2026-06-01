# HOLY Beverage — Security Operations — Demo User Story

> Per global CLAUDE.md §44 (autonomous-loop discipline) + operator request 2026-05-22:
> every department MUST have a demo user story explaining how to demo + explain it.

## 1. Persona

**Elena, CISO**

Their day-job: own this department's KPIs at HOLY Beverage. Reports to the
C-suite. Burned by Excel, lagging dashboards, and reactive firefighting.

## 2. Scenario

The persona needs to: **cut MTTD from 8h to 30min, lift threat-coverage to 95%, cut SOC analyst burnout 50%**

Main KPI being moved: **MTTD, MTTR, threat-coverage %, analyst-tickets/day, false-positive rate**

## 3. Walkthrough (what they see + do)

1. Persona lands on `/holy/security-operations` (the HOLY navigation page for this dept).
2. Left sidebar lists every process and sub-process for this dept, with
   audience chips (B2B / B2C / B2E).
3. Persona picks one sub-process — the right panel shows tabs:
   *Overview / Data / Input Data Type / AI Model / Output / KPI*.
4. Persona scrolls to the **Pipeline Output** section, which renders the
   latest ML/RAG run's metrics, benchmark vs baseline, hyperparameters,
   confusion matrix / ROC / SHAP / feature importance, and (for RAG) the
   chunking strategy + retrieval precision + sample answers.
5. Persona clicks **Ask the AI Council** — types a strategic question
   ("should we reallocate budget from channel X to channel Y next month?").
6. UI POSTs to `/api/v1/holy/council/ask`, polls
   `/api/v1/holy/council/result/<task_id>` every 2s.
7. After ~30-90s the 3-stage council audit appears:
   author (gemma3:4b) → reviewer (gemma3:4b) → chair (gemma3:1b).
8. Persona reads the chair's synthesized answer + the author/reviewer
   working — gets a defensible recommendation with audit trail.

## 4. The Pitch (how to explain this in 30 seconds)

> "Today Elena spends 80% of their week on manual data
> wrangling and reactive firefighting. HOLY's AI platform turns that on its
> head: every process is instrumented, every decision has a model + audit
> trail, every recommendation comes with confidence, evidence, and a
> counterfactual. We don't replace Elena — we replace
> the spreadsheet that sits between them and the answer."

## 5. The Demo Script (literal click-by-click)

| Step | Action | Expected screen | Talking point |
|---|---|---|---|
| 1 | Open `/holy/security-operations` | Left sidebar with N processes | "Every process this dept owns, surfaced as navigable artifacts" |
| 2 | Click any sub-process | Right panel with 6 tabs + audience chips | "Each one tagged by audience so you can demo B2B-only or B2E-only flows" |
| 3 | Click *Data* tab | Description of input dataset | "Real public-data analogue — Kaggle/HuggingFace dataset, ≤100 MB" |
| 4 | Scroll to Pipeline Output | Metrics + benchmark + 8-10 PNG plots | "Baseline-beat-by ≥ 10% F1 enforced by drill" |
| 5 | Hover SHAP plot | Top feature drivers | "Explainable per global §48 — every prediction has counterfactual" |
| 6 | Click *AI Model* tab | Hyperparam config + loss function + training config | "Optuna-tuned, MLflow-logged, reproducible from manifest.json" |
| 7 | Click "Ask Council" | Modal, type question, submit | "3-stage author/reviewer/chair pattern, ~60s end-to-end" |
| 8 | Wait + read result | Author draft + reviewer critique + chair synthesis | "Audit trail = defensible for SOC2 + ISO 42001 + EU AI Act Art. 86" |

## 6. Success Criteria

- ✅ Pipeline Output panel renders in < 2s (manifest already on disk)
- ✅ Every metric has a baseline + a candidate + a delta
- ✅ Every PNG plot has a non-zero size + valid PNG header (drill-locked)
- ✅ Council returns within 90s for prompts < 100 tokens
- ✅ AI-Strategy role can navigate from this page to
  `business-layer/HOLY_ASIS_ASSESSMENT.md` to see AS-IS process pain points
- ✅ Every claim made in the demo can be backed by a drill output
  (see `tests/drills/drill_full_lifecycle.py`)

## 7. Common Gotchas During Demo

- 🟡 Council takes > 90s if Ollama is cold-loading the model — pre-warm with
  `ollama run gemma3:4b "hi"` before demo.
- 🟡 If Pipeline Output shows "no runs yet", run the Celery beat once:
  `celery -A workers.celery_app call holy.run_structured_lifecycle`.
- 🟡 If SHAP plot is missing, the model isn't tree-based (NN/linear models
  need DeepExplainer / LinearExplainer — see TODO in lifecycle).
- 🔴 Never demo on production data — always the public-dataset analogue.

## 8. Related Artifacts

- `HOLY_DEPT_SPEC.md` — full process/sub-process/dataset/AI-model spec
- `HOLY_ASIS_ASSESSMENT.md` — current-state pain points + 7-axis impact
- `../HOLY_TECH_STACK.md` — full tech stack for this dept
- `../docs/hld/HOLY_HLD.md` — high-level design
- `../docs/lld/HOLY_LLD.md` — low-level design
- `../docs/sad/HOLY_SAD.md` — solution architecture document
- `../docs/c4-model/HOLY_C4.md` — C4 levels L1-L4
- `../HOLY_NAV.json` — UI navigation manifest

---

**Cross-reference**: This story powers the demo at `/holy/security-operations` in the
HOLY frontend. The literal click-by-click in §5 is also the drill
`tests/drills/drill_dept_demo_security_operations.py` (planned).
