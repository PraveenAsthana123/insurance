# Underwriting — database-architect Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Underwriting database-architect digest
- **Purpose**: Query latency, slow-query list, schema drift
- **Cadence**: Weekly DB health
- **Format**: PDF + email
- **Recipients**: database-architect mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Underwriting cycle time; STP rate; loss ratio; combined ratio) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: database-architect + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: database-architect
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/underwriting/database-architect
POST /api/v1/insur/reports/underwriting/database-architect/{report_id}/run
```
