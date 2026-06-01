# Fraud / Special Investigations Unit (SIU) — manager Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Fraud / Special Investigations Unit (SIU) manager digest
- **Purpose**: Dept KPIs, ROI, approval queue, team performance
- **Cadence**: Weekly business review
- **Format**: PDF + email
- **Recipients**: manager mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Fraud detection rate; fraud savings; SIU referral conversion; investigation cycle time) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: manager + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: manager
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/holy/reports/fraud-siu/manager
POST /api/v1/holy/reports/fraud-siu/manager/{report_id}/run
```
