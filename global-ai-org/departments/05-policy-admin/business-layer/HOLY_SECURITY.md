# HOLY_SECURITY.md · Dept 5 · Policy Administration

> Generated scaffold per §64.32 · Security & Observability tab.

## Capture surfaces (10 mandatory per §64.32.1)

| Category | Mechanism | Backing tool |
|---|---|---|
| Application logs | every request/response/error with correlation_id + tenant_id + actor | ELK / Loki |
| Audit logs | every admin action · every AI decision (per §38.3) | Postgres audit table |
| Traces | distributed traces per request (OpenTelemetry) | Tempo / Jaeger |
| User operations | clickstream + form submits + admin actions | RUM + backend audit |
| Monitoring | latency p50/p95/p99 + error rate + throughput | Grafana + Prometheus |
| Scoring | risk score per request (rule + ML + LLM blend) | per §64.23 |
| Visualization | live security dashboard with drill-down | Grafana |
| DDoS check | sustained rate per IP + connection flood | rate limiter + chaos test |
| Sensitive data | PII / PHI / PCI scan + redaction + classification | regex + Presidio / DLP |
| All attack types | OWASP Top 10 + AI (prompt inj / model theft / poisoning) | ZAP + nuclei + custom AI |

## Required modeling layers (per §64.32.2)
- RAG · Q&A over runbooks + threat intel + past incidents
- Tabular ML · Risk scoring on structured signals
- DL · Behavioral anomaly
- CV · CCTV / document forgery / deepfake detection
- NLP · Phishing / threat-intel parsing
- Time-series · Trend on attack volume
- Recommendation · Suggest playbook actions to SOC analysts
- Anomaly · First-line detection
- Fraud · Transaction / account-takeover detection

## Test data generation (per §64.32.3)
Attack simulation panel · realistic adversarial test data per attack class.

| Attack | Generator |
|---|---|
| SQL injection | sqlmap + custom mutator |
| XSS | XSS-FUZZER + DOM payloads |
| Prompt injection | Garak + custom LLM-jailbreak |
| DDoS | wrk + locust |
| Phishing | LLM-generated phishing corpus |
| Deepfake | StyleGAN-NADA / Diff-Detect |

All payloads + results → `data/security-tests/policy-admin/<attack-type>/<run_id>/`

Composes with §38.3 · §42 (gated pen-testing) · §43 · §47.6 (4-lens) · §57.6.1 (canonical fields) · §64.21 (XAI on risk score) · §64.32 · §82.21 (Secure AI).
