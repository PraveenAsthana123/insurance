# HOLY_CONTACTS.md · Dept 15 · Enterprise Risk Management

> Generated scaffold per §64.25 · Customer + Vendor + Internal contact mgmt.

## Customer contacts
Fields: id · name · email · phone · segment · NPS · last-interaction · open-tickets

| Action | Endpoint |
|---|---|
| Create | TODO |
| Read | TODO |
| Update | TODO |
| Delete (GDPR) | TODO |

## Vendor contacts
Fields: id · name · email · phone · category · contract-status · SLA · scorecard

## Internal contacts
Cross-dept owners · escalation chain.

## Bulk import / export
CSV · format documented · audit row per import (§38.3).

## Privacy
- PII redaction in logs (per §76)
- Encryption at rest
- Consent flag per contact (per §76.10 Art. 50)
- Right-to-be-forgotten propagation (per §76)

Composes with §38.3 · §41.3 (multi-tenant MANDATORY for contact mgmt) · §47.6 (SOC2 CC6.2) · §64.25 · §76 (RAI MANDATORY · PII as biometric).
