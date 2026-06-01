# HOLY Beverage — Finance — Contact Management (customer + vendor + internal)

> Per global CLAUDE.md §64.25 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Manager** + **Data Owner** + **Admin role** (RBAC enforcement).

## Three registries

### Customer contacts

| Field | Type | PII? | Encryption | Consent |
|---|---|---|---|---|
| id | uuid | no | n/a | n/a |
| name | text | yes | at-rest | required |
| email | text | yes | at-rest | required |
| phone | text | yes | at-rest | required |
| segment | enum | no | n/a | n/a |
| NPS | int | no | n/a | n/a |
| last_interaction | timestamp | no | n/a | n/a |
| open_tickets | int | no | n/a | n/a |

### Vendor contacts

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| email | text | encrypted |
| phone | text | encrypted |
| category | enum | (tech / supplies / services / consulting) |
| contract_status | enum | active / negotiating / expired |
| SLA | text | per-vendor SLA terms |
| scorecard | json | quarterly score breakdown |

### Internal contacts (cross-dept owners + escalation)

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| role | text | per `../roles/` |
| dept | text | per global-ai-org |
| email | text | |
| escalation_tier | enum | L1 / L2 / L3 |

## Bulk operations

- Import: CSV upload with schema validation + dedup
- Export: CSV / Excel per role permissions (manager full / team-member their-territory only)
- Sync: scheduled inbound from finance's CRM / ERP / HRIS

## Privacy + compliance

- PII redaction in logs (per global §38 + §47.6)
- Encryption at rest (Fernet per global §4.2)
- Consent flag per customer contact (GDPR Art. 7)
- Right-to-be-forgotten endpoint: DELETE soft-delete + hard-delete after 90 days
- Retention: 7 years for transactional context, 90 days for marketing-only

## API contract

| Endpoint | Purpose | RBAC |
|---|---|---|
| GET /api/v1/holy/contacts/finance/customers | list | manager / data-owner |
| GET /api/v1/holy/contacts/finance/vendors | list | manager / procurement |
| GET /api/v1/holy/contacts/finance/internal | list | any dept role |
| POST /api/v1/holy/contacts/finance/customers | create | admin / manager |
| PUT /api/v1/holy/contacts/finance/customers/{id} | update | admin / data-owner |
| DELETE /api/v1/holy/contacts/finance/customers/{id} | soft-delete | admin |

## Composes with

- `HOLY_CONTACT_CENTER.md` — channel routing uses these contacts
- `HOLY_INCIDENT_MGMT.md` — escalation uses internal registry
- Global §64.4 — Contact Center Automation
- Global §47.6 — SOC2 CC6.2 (RBAC)
