# Fraud / Special Investigations Unit (SIU) — devops Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Fraud / Special Investigations Unit (SIU) devops digest
- **Purpose**: Deploy frequency, change-fail rate, MTTR, infra cost
- **Cadence**: DORA weekly + monthly cost
- **Format**: PDF + email
- **Recipients**: devops mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Fraud detection rate; fraud savings; SIU referral conversion; investigation cycle time) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: devops + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: devops
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/fraud-siu/devops
POST /api/v1/insur/reports/fraud-siu/devops/{report_id}/run
```
