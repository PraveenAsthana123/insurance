# Customer Service / Contact Center — ai-strategy Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Customer Service / Contact Center ai-strategy digest
- **Purpose**: Automation backlog rank, AS-IS impact, ROI realized vs planned
- **Cadence**: Quarterly DT strategy
- **Format**: PDF + email
- **Recipients**: ai-strategy mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (First-call resolution; AHT; chatbot deflection rate; CSAT; NPS) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: ai-strategy + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: ai-strategy
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/customer-service/ai-strategy
POST /api/v1/insur/reports/customer-service/ai-strategy/{report_id}/run
```
