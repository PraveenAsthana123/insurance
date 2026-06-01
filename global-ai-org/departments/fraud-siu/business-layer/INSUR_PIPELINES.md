# Pipeline Manifest — Fraud / Special Investigations Unit (SIU)

Per global §64.20 — every dept must deploy ≥ 1 pipeline per applicable lifecycle type.

This dept wires the following existing reference pipelines at `backend/ml/reference/`:

| # | Pipeline | Reference impl | Input dataset | Purpose |
| --- | --- | --- | --- | --- |
| 1 | Tabular fraud — credit-card benchmark | `backend/ml/reference/fraud_lifecycle.py` | `data/insurance/fraud-siu/creditcard_fraud/creditcard.csv` | Imbalanced binary classification |
| 2 | Tabular fraud — vehicle claim | `backend/ml/reference/fraud_lifecycle.py` | `data/insurance/fraud-siu/vehicle_claim_fraud/fraud_oracle.csv` | Vehicle fraud detection |
| 3 | Anomaly — behavioral | `backend/ml/reference/anomaly_lifecycle.py` | `data/insurance/fraud-siu/auto_insurance_fraud/insurance_claims.csv` | Behavioral anomalies |
| 4 | RAG — fraud playbooks + NICB bulletins | `backend/ml/reference/rag_lifecycle.py` | fraud playbook corpus | Fraud Investigator Copilot |
| 5 | Agent orchestration — investigation | `backend/ml/reference/agent_orchestration.py` | case workflow | Multi-agent investigation |

## Eval harness

Per global §59.4 — every AI feature MUST track:

| Metric | Threshold | Tool |
|---|---|---|
| Faithfulness | ≥ 0.85 | Ragas (installed) |
| Context precision | ≥ 0.75 | Ragas |
| Answer relevance | ≥ 0.80 | Ragas |
| Citation accuracy | 100% | Custom (§48.5) |
| Hallucination | < 2% | DeepEval (installed) |

## Tech stack used

| Concern | Tool | Status |
|---|---|---|
| Chunking + embedding | sentence-transformers + custom strategies | available in `rag_lifecycle.py` |
| Vector DB | ChromaDB | installed |
| Vector-less / keyword | TF-IDF + BM25-like rerank | in `rag_lifecycle.py` |
| Elasticsearch | — | NOT installed; defer or add adapter per §56 |
| RAG eval | Ragas | installed |
| LLM eval | DeepEval | installed |
| Workflow engine | temporal-io (python SDK) | installed |
| Tracing | OpenTelemetry | installed |
| LLM runtime | Ollama (gemma3:1b default) | available |
| Orchestration | LangGraph + native agent_orchestration.py | langchain installed |

## Run

```bash
# Run all pipelines for this dept (per global §43 drill + §38 audit)
python backend/ml/insurance/run_dept_pipelines.py --dept fraud-siu

# Run one pipeline
python backend/ml/insurance/run_dept_pipelines.py --dept fraud-siu --pipeline 1
```

## Output

Per global §64.7 — every run writes:

```
data/eval/fraud-siu/<pipeline-name>/<run_id>/
├── manifest.json
├── plots/
│   ├── before_distribution.png    after_distribution.png
│   ├── before_correlation.png     after_correlation.png
│   ├── before_missing.png         after_missing.png
│   └── ...
├── scores.json
├── eval.json (Ragas + DeepEval where applicable)
└── trace.json (OpenTelemetry spans)
```

Drill `tests/drills/drill_insurance_dept_artifacts.py` enforces presence of pipeline manifest.

## Composes with

- §38.3 (audit) — every pipeline run writes audit row keyed by `run_id`
- §43 (drill) — every pipeline has a paired drill in `tests/drills/`
- §47 (architecture) — pipelines run as Celery workers; results indexed for dashboard tiles
- §48 (explainability) — every model output carries SHAP / counterfactual / citations
- §57.6 (canonical fields) — request_id + tenant_id + actor on every log line
- §59.4 (ORF) — every AI pipeline gated on Ragas thresholds before merge
- §64.20 (10 lifecycle types) — this manifest implements the contract
- §64.36 (6-flavor scorecard) — surfaces per sub-process in role dashboards
