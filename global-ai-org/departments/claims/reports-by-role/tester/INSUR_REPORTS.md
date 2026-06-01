# Claims — tester Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Claims tester digest
- **Purpose**: Test coverage, defect density, regression heatmap
- **Cadence**: Pre-release test report
- **Format**: PDF + email
- **Recipients**: tester mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Claims cycle time (FNOL → settlement); STP rate; loss-adjustment expense) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: tester + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: tester
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/holy/reports/claims/tester
POST /api/v1/holy/reports/claims/tester/{report_id}/run
```
