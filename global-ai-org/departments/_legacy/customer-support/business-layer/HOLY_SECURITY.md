# HOLY Beverage — Customer Support — Security & Observability Tab

> Per global CLAUDE.md §64.32 + §64.33 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Information Security role** + **Security role**.

## Capture surfaces (10 categories — per §64.32.1)

| Category | What | Tool / pipeline |
|---|---|---|
| Application logs | request/response/error with correlation_id | ElasticSearch / Loki |
| Audit logs | every admin action + AI decision | PostgreSQL audit table |
| Traces | distributed traces per request | Tempo / Jaeger |
| User operations | clickstream + form submits | RUM + backend audit |
| Monitoring | latency / error / throughput per endpoint | Grafana + Prometheus |
| Scoring | risk score per request | anomaly_lifecycle + fraud_lifecycle |
| Visualization | live security dashboard | RoleDashboard for information-security role |
| DDoS check | rate per IP + connection-flood | rate limiter + chaos test |
| Sensitive data | PII / PHI / PCI scan + redaction | Presidio / DLP regex |
| All attack types | OWASP Top 10 + AI-specific | ZAP + nuclei + custom AI tests |

## Modeling layers (9 mandatory — per §64.32.2)

| Layer | Used for | Reference |
|---|---|---|
| RAG | Q&A over runbooks + threat intel | rag_lifecycle.py |
| Tabular ML | Risk scoring | full_lifecycle.py |
| DL | Behavioral anomaly | dl_lifecycle.py |
| CV | Document forgery / deepfake | cv_lifecycle.py |
| NLP | Phishing / threat-intel parsing | nlp_lifecycle.py |
| Time-series | Attack-volume trend | timeseries_lifecycle.py |
| Recommendation | Playbook suggestion | recommendation_lifecycle.py |
| Anomaly | First-line detection | anomaly_lifecycle.py |
| Fraud | Transaction / ATO | fraud_lifecycle.py |

## Attack-simulation data generators (12 attack classes — per §64.32.3)

| Attack | Generator |
|---|---|
| SQL injection | sqlmap payload library |
| XSS | XSS-FUZZER + DOM-payload set |
| CSRF | Burp suite replay + custom tokens |
| Auth-bypass | jwt-fuzzer + path-traversal lib |
| Prompt injection | Garak + custom LLM-jailbreak |
| Model theft | high-frequency query + extraction probes |
| Data poisoning | label-flip + backdoor-trigger injectors |
| DDoS | wrk + locust realistic distribution |
| Phishing | LLM-generated phishing email corpus |
| Deepfake (image/video) | StyleGAN-NADA / Diff-Detect test sets |
| Synthetic identity | Faker + realistic-name generators |
| Brute-force | hydra + per-protocol wordlists |

All generated payloads land in `data/security-tests/customer-support/<attack-type>/<run_id>/`
with complete audit trail.

## Drills

Every attack generator has a paired drill:
- Positive: legitimate request must NOT reject
- Negative: payload MUST reject + correct error code returned

## Composes with

- Global §42 — pen + DDoS gated to authorized envs only
- Global §47.6 — OWASP + STRIDE + DevSecOps + SOC2
- Global §57.6 — canonical logging fields
- Global §64.21 — XAI per risk score
