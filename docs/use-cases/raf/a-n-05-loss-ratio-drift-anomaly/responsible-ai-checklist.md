# Responsible AI Checklist · loss-ratio-drift-anomaly

> §90 G10-G11.

## G10 · ResAI 5 pillars (§76)

### 1. Privacy
- [ ] DLP scan
- [ ] PII redaction
- [ ] CMEK at rest
- [ ] No PII in vector DB
- [ ] Retention class
- [ ] Right-to-be-forgotten

### 2. Transparency
- [ ] Data sources documented
- [ ] Model card (§48.3 EU AI Act Art. 86)
- [ ] User-facing disclosure (§76.10 Art. 50)
- [ ] Limitations
- [ ] Last review date

### 3. Robustness
- [ ] Adversarial audit (G9)
- [ ] OOD detection
- [ ] Fallback path
- [ ] Latency p99 (§47.10)
- [ ] Drift monitor (§82.7)

### 4. Safety
- [ ] Kill switch
- [ ] HITL escalation
- [ ] Safety classifier (§76.7 hallucination defense)
- [ ] Incident playbook (§57.5)
- [ ] On-call rotation

### 5. Accountability
- [ ] Named owner (RACI)
- [ ] §38.3 audit per prediction
- [ ] Dispute mechanism
- [ ] Override log
- [ ] Council review (§38 + §88)

## G11 · ExpAI (§48 + §82.20)

- [ ] SHAP global · `plots/shap_global.png`
- [ ] SHAP local · per regulated decision (§48.7) · `data/shap_local/`
- [ ] LIME local (alternative)
- [ ] Integrated Gradients (deep model)
- [ ] Grad-CAM (CV model)
- [ ] Attention maps (transformer w/ §48.2 caveat)
- [ ] Counterfactual · MANDATORY for regulated · `data/cf/`
- [ ] Anchors (Ribeiro)
- [ ] Surrogate decision tree
- [ ] Citation tracing (for RAG) · `data/citations/`
