# Claims — information-security Reports

Per global §64.37 — role-scoped reports (≥ 3 standard per role).

## Standard reports

### R1 — Claims information-security digest
- **Purpose**: Pen-test results, compliance gates, CVE backlog
- **Cadence**: Monthly InfoSec report
- **Format**: PDF + email
- **Recipients**: information-security mailing list
- **Retention**: 90 days hot, 7y cold (regulated)

### R2 — KPI trend report
- **Purpose**: track main KPI (Claims cycle time (FNOL → settlement); STP rate; loss-adjustment expense) over time
- **Cadence**: weekly
- **Format**: PDF + CSV
- **Recipients**: information-security + dept lead
- **Retention**: 1 year

### R3 — Exception report
- **Purpose**: surface decisions that fell to human (HITL) per §40
- **Cadence**: daily
- **Format**: dashboard tile + CSV export
- **Recipients**: information-security
- **Retention**: 90 days

## Distribution
Per global §47.6 — secure email (S/MIME), portal, SFTP for batch.

## Audit
Per global §38.3 — every report-generation event writes an audit row keyed by `report_id + request_id + actor`.

## API
```
GET  /api/v1/holy/reports/claims/information-security
POST /api/v1/holy/reports/claims/information-security/{report_id}/run
```
