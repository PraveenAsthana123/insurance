# Claims — test-architect Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Claims test-architect digest
- **Purpose**: Test pyramid health, flaky-test count, coverage per service
- **Cadence**: Quarterly test strategy
- **Format**: PDF + email
- **Recipients**: test-architect mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Claims cycle time (FNOL → settlement); STP rate; loss-adjustment expense) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: test-architect + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: test-architect
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/insur/reports/claims/test-architect
POST /api/v1/insur/reports/claims/test-architect/{report_id}/run
```
