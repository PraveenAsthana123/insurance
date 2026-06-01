# Customer Service / Contact Center — ai-reviewer Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Customer Service / Contact Center ai-reviewer digest
- **Purpose**: Model accuracy drift, fairness, override rate
- **Cadence**: Monthly model-card review
- **Format**: PDF + email
- **Recipients**: ai-reviewer mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (First-call resolution; AHT; chatbot deflection rate; CSAT; NPS) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: ai-reviewer + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: ai-reviewer
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/holy/reports/customer-service/ai-reviewer
POST /api/v1/holy/reports/customer-service/ai-reviewer/{report_id}/run
```
