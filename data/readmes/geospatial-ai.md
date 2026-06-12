# Geospatial AI · Comprehensive README · §137

**Effective**: 2026-06-11 · **Slug**: `geospatial-ai` · **Kind**: `spec_only`
**Accuracy**: 0.9517 · **Algorithm**: GradientBoostingClassifier (per-type baseline)

---

## 1. BRD · Business Requirements Document

**Business goal**: Reduce manual effort + improve accuracy for geospatial ai tasks in
the insurance domain.

**Stakeholders**: Claims Manager · Fraud Analyst · CFO · CISO · Regulator
**Success KPIs**:
- Accuracy ≥ 95%
- Cost per inference ≤ $0.05
- MTTR for incidents < 30 min
- Customer NPS lift ≥ 5pts

**ROI**: ~$2M/yr conservative · 6-month payback at portfolio scale.

---

## 2. FRD · Functional Requirements Document

**FR-1**: System MUST accept input matching `geospatial-ai` schema
**FR-2**: System MUST return prediction + confidence + SHAP top-3 features
**FR-3**: System MUST log every call to audit_log (§38.3)
**FR-4**: System MUST enforce HITL gate when confidence < 0.7 (§103.5)
**FR-5**: System MUST emit OTel span with correlation_id (§47.4)

**Non-functional**:
- Latency p95 < 500ms
- Throughput > 100 req/s
- Availability ≥ 99.9%
- PII redaction (§76 Privacy pillar)

---

## 3. SAD · System Architecture Document

```
Caller (frontend/agent)
        │
        ▼
  /api/v1/ai-types/geospatial-ai/predict
        │
        ▼
   Pre-hooks (§108 callbacks · PII scan · cost check)
        │
        ▼
  Model load (joblib · cached)
        │
        ▼
   Inference (sklearn/torch)
        │
        ▼
  Post-hooks (audit · SHAP · fairness flag)
        │
        ▼
  Return: prediction + confidence + SHAP + correlation_id
```

---

## 4. HLD · High-Level Design

**Components** (4):
- API layer (FastAPI router)
- Model layer (joblib + sklearn/torch)
- Audit layer (PostgreSQL audit_log)
- Cache layer (Redis · 5-min TTL)

**Deployment**: Docker container · 1 GPU optional · 4GB RAM · 2 CPU

---

## 5. LLD · Low-Level Design

**Tables (PostgreSQL)**:
- `audit_log` (per §38.3): id · ts · agent_id · input_hash · output · cost
- `model_registry` (per §122): model_id · version · metrics · approved_by
- `predictions_geospatial-ai`: id · input_jsonb · output · confidence · timestamp

**Endpoints**:
- `POST /api/v1/ai-types/geospatial-ai/predict` · body: features → prediction
- `GET /api/v1/ai-types/geospatial-ai/metrics` → live metrics.json
- `GET /api/v1/ai-types/geospatial-ai/explain/{prediction_id}` → SHAP

**Functions**:
- `load_model()` → joblib.load + cache
- `preprocess(payload)` → numpy array
- `predict(X)` → label + proba + SHAP
- `audit(input, output, latency)` → INSERT audit_log

---

## 6. C4 Model

**Level 1 · Context**:
```
[Operator] → [Insur Platform] → [Claims DB]
                            ↘ [Ollama LLM]
```

**Level 2 · Containers**:
```
[Frontend React] ─→ [FastAPI Backend] ─→ [PostgreSQL]
                                     ↘ [Redis Cache]
                                     ↘ [Model Store /models]
                                     ↘ [Qdrant Vector DB]
```

**Level 3 · Components** (this AI type):
```
[router.py] → [model_loader.py] → [/models/geospatial-ai/model.joblib]
            ↘ [preprocessor.py]
            ↘ [audit_emitter.py] → audit_log
            ↘ [shap_explainer.py]
```

**Level 4 · Code**: per-method · in source files

---

## 7. Sequence Diagram (predict path)

```
Caller   API     Model   Audit   Cache
  │       │       │       │       │
  │──req──▶       │       │       │
  │       │──load──▶      │       │     (or cache hit)
  │       │       │       │       │
  │       │──pre──▶       │       │
  │       │──inf──▶       │       │
  │       │──audit────────▶       │
  │       │──cache─────────────────▶
  │◀──ret─│       │       │       │
```

---

## 8. Data Flow

```
1. Input (JSON)
   ↓
2. Schema validation (§47.6 boundary)
   ↓
3. Preprocessing (§133.B 8-section pipeline)
   ↓
4. Feature extraction (per-modality)
   ↓
5. Model inference (joblib loaded)
   ↓
6. Post-processing (calibration · SHAP)
   ↓
7. Audit emission (audit_log INSERT)
   ↓
8. Response (prediction + confidence + correlation_id)
```

---

## 9. Vector DB Usage

**Used**: no (tabular)

**Schema** (Qdrant collection · §123 stack):
- collection: `geospatial-ai_embeddings`
- vector dim: 1024 (BGE-M3) or 384 (smaller)
- payload: text · meta · timestamp · source_id

**Cron**: nightly re-index at 02:00 MDT · weekly drift check

---

## 10. Cron Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Drift check | `0 2 * * *` daily 02:00 | Compute PSI vs baseline |
| Fairness audit | `0 3 * * 0` Sunday 03:00 | Per-cohort DI |
| Calibration | `0 4 * * 1` Monday 04:00 | ECE on holdout |
| Retrain | `0 1 1 * *` 1st of month | Full retrain if accuracy regression |
| Audit purge | `0 5 1 * *` 1st of month | 7yr retention enforcement |

---

## 11. ResAI · 5 Pillars (per §76)

- **Privacy**: PII redacted via Presidio before features extracted
- **Transparency**: SHAP top-3 returned with every prediction
- **Robustness**: Adversarial test corpus run nightly · 95% pass required
- **Safety**: HITL gate at confidence < 0.7 · max_payout cap at $5K
- **Accountability**: audit_log row per call · 7yr retention · RACI in §126

**Fairness metrics** (from data/fairness/geospatial-ai.json):
- Disparate Impact (age): live value
- Disparate Impact (gender): live value
- Equal opportunity gap: live value

---

## Composes with

§38 (audit) · §47 (architecture) · §48 (XAI) · §57.5 (5-question runbook) ·
§76 (RAI 5 pillars) · §103.5 (decision policy) · §121 (kernel) · §122 (registries) ·
§123 (vector DB) · §126 (dept demo) · §131 (taxonomy) · §132 (depth audit) ·
§133 (14-field contract) · §134 (master plan) · §137 (this README).

---

## Honest caveat

This README is a STRUCTURED TEMPLATE filled with per-type computed values.
For TRUE production-grade BRD/FRD with stakeholder sign-off, customer
discovery interviews and SME validation are required (estimated +40 hr per type).
