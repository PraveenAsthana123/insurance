# Pipeline Checklist · receipt-fraud-detection

> §90 G12 + G15 + G16 + G17.

## Storage layers (G12)

| Stage | Storage | Table |
|---|---|---|
| Raw | Postgres | `receipt_fraud_detection_raw` |
| Cleaned | Postgres | `receipt_fraud_detection_clean` |
| Features | Feast / Postgres | `receipt_fraud_detection_features` |
| Predictions | Postgres | `receipt_fraud_detection_predictions` |
| Embeddings | Vector DB | source = predictions |
| Audit | Postgres | `audit_rows` (§38.3) |
| Models | MLflow | registry |
| Explanations | S3/MinIO | `/explanations/receipt-fraud-detection/` |

## 13 mandatory pipelines (G15)

| # | Pipeline | Trigger | SLA |
|---|---|---|---|
| 1 | Ingestion | webhook / cron / stream | < 1 min |
| 2 | Cleaning | post-ingestion | < 5 min |
| 3 | Feature engineering | post-cleaning | < 5 min |
| 4 | Training | weekly OR drift | < 4 hr |
| 5 | Evaluation | post-training | < 30 min |
| 6 | Deployment | post-eval | < 15 min |
| 7 | Inference sync | per request | < 500 ms |
| 8 | Inference batch | scheduled | < 30 min / 1M |
| 9 | Inference stream | event | < 1 sec |
| 10 | Audit ingest | post-inference | < 5 sec |
| 11 | Vector ingest | post-audit | < 15 min |
| 12 | Drift check | hourly | < 5 min |
| 13 | Retrain trigger | drift OR scheduled | < 15 min |

## 3 inference modes (G16 · all 3 MANDATORY)

| Mode | When | Stack |
|---|---|---|
| Sync | UI-driven · per request | FastAPI + Triton/vLLM/MLflow |
| Batch | nightly / bulk | Celery + worker pool |
| Stream | Kafka / Pub-Sub | Faust / Flink / Spark streaming |

## Workflow tool (G17 · choose ≥1)

- [ ] Temporal (durable long-running)
- [ ] LangGraph (LLM agent DAGs)
- [ ] n8n (no-code SaaS integrations)
- [ ] Airflow (ETL · batch)
- [ ] Argo Workflows (k8s-native)
- [ ] Celery + Beat (Python tasks)
- [ ] Step Functions (AWS-native)
- [ ] Prefect (Python-first)

## Per-prediction artifact contract

Per §87 + §90 · every prediction writes:
1. Input → `receipt_fraud_detection_raw` (redacted)
2. Process trace → OTel span tree
3. Output → `receipt_fraud_detection_predictions`
4. Log → ELK / Loki
5. Trace → Jaeger / Tempo
6. Prompt (if LLM) → `data/prompts.db` (§21)
7. Embedding → Vector DB via cron
8. Explanation → S3/MinIO
9. Audit row → `audit_rows` (16-field §57.6.1)
10. Model card check → MLflow

## Definition of done

- [ ] All 8 storage layers populated for first sample
- [ ] All 13 pipelines + 3 inference modes operational
- [ ] Workflow tool chosen + deployed
- [ ] Vector DB has ≥ 1 row per prediction within 15 min
- [ ] Audit row has all 16 §57.6.1 fields
- [ ] Drift cron producing JSON output
