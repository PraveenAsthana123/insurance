# Underwriting — team-member Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Underwriting team-member digest
- **Purpose**: Personal queue, my tickets/cases, my SLA
- **Cadence**: Daily my-work brief
- **Format**: PDF + email
- **Recipients**: team-member mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Underwriting cycle time; STP rate; loss ratio; combined ratio) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: team-member + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: team-member
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/underwriting/team-member
POST /api/v1/insur/reports/underwriting/team-member/{report_id}/run
```
