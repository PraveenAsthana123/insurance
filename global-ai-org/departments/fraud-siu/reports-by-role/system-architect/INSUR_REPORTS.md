# Fraud / Special Investigations Unit (SIU) — system-architect Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Fraud / Special Investigations Unit (SIU) system-architect digest
- **Purpose**: Service health, dependency graph, capacity vs forecast
- **Cadence**: Monthly architecture review
- **Format**: PDF + email
- **Recipients**: system-architect mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Fraud detection rate; fraud savings; SIU referral conversion; investigation cycle time) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: system-architect + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: system-architect
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/fraud-siu/system-architect
POST /api/v1/insur/reports/fraud-siu/system-architect/{report_id}/run
```
