# HIPAA — Compliance Mapping for insur_project

Per operator 2026-06-01 production-readiness. Applies to **health-insurance
underwriting + claims** flows where PHI is processed.

## Scope

HIPAA applies when:
- [Underwriting](../../global-ai-org/departments/underwriting/) pulls medical records (EHR adapter at [backend/services/external_feeds/ehr.py](../../backend/services/external_feeds/ehr.py))
- [Claims](../../global-ai-org/departments/claims/) processes medical bills / health claims
- Any dataset contains identifiable health information (medical_cost.csv is **aggregated** — not strictly PHI in current state)

Carrier acts as a **Covered Entity** under HIPAA when offering health insurance.

## HIPAA Privacy Rule — required controls

| § | Requirement | Status |
|---|---|---|
| 164.502 | Minimum necessary use + disclosure | ⚠ EHR adapter accepts resource_types filter; no enforcement on backend side |
| 164.508 | Authorization for non-treatment disclosure | ❌ Consent management not built |
| 164.514 | De-identification standard | ⚠ PII redaction default per §47.6, but PHI fields not enumerated |
| 164.520 | Notice of Privacy Practices | ❌ Not in UI |
| 164.522 | Right to request restriction | ❌ Not built |
| 164.524 | Right to access PHI | ❌ Not built (could surface via `/api/v1/explain` + customer portal) |
| 164.526 | Right to amend PHI | ❌ Not built |
| 164.528 | Accounting of disclosures | ⚠ Decision audit row captures; needs PHI-specific report |

## HIPAA Security Rule — required controls

### Administrative safeguards (§164.308)

- [ ] Security management process documented
- [ ] Workforce security training program
- [ ] Information access management (role-based)
- [x] RBAC enforced per §47.6 SOC2 CC6.2
- [ ] Security incident procedures
- [ ] Contingency plan (DR per global §41.2)
- [ ] Periodic risk assessment

### Physical safeguards (§164.310)

- [ ] Facility access controls (cloud datacenter SOC2 certificates needed)
- [ ] Workstation use + security
- [ ] Device + media controls

### Technical safeguards (§164.312)

| Control | Status |
|---|---|
| Access control (§164.312(a)) | ⚠ API key auth present; needs identity provider integration |
| Audit controls (§164.312(b)) | ✅ Per §38.3 decision audit row |
| Integrity (§164.312(c)) | ✅ HMAC / TLS in transit |
| Person + entity authentication (§164.312(d)) | ⚠ No SSO/SAML yet |
| Transmission security (§164.312(e)) | ✅ HTTPS-only enforced at nginx LB |

## Encryption requirements

| Data state | Algorithm | Status |
|---|---|---|
| At rest (DB) | AES-256 (pgcrypto) | ⚠ Not enforced for tenant data |
| At rest (object storage) | AES-256 (S3 SSE-KMS in prod) | ❌ Not yet |
| In transit | TLS 1.3 | ✅ Enforced by nginx + Cloudflare |
| In LLM prompts | N/A but PHI MUST be tokenized before LLM call | ❌ Tokenization layer not built |
| Backups | AES-256 + restricted KMS key access | ❌ Backup strategy not defined |

## Business Associate Agreements (BAAs)

Required from every vendor that processes PHI on our behalf:

| Vendor | BAA needed? | Status |
|---|---|---|
| AWS | Yes (if PHI on AWS) | ❌ Not signed |
| Cloudflare | Yes (if PHI through CDN) | ❌ Not signed |
| OpenAI / Anthropic | **Yes** (if PHI in prompts) | ❌ Use Ollama on-prem instead |
| Pinecone (if used) | Yes | n/a — using ChromaDB on-prem |
| LexisNexis (CLUE) | Yes | ❌ Sign during integration |
| Onfido / Jumio (KYC) | Yes if KYC touches PHI | ❌ Sign during integration |

## Breach notification (§164.404)

- Required within 60 days of discovery for breaches affecting > 500 individuals
- HHS Wall of Shame disclosure
- State AG notification (varies)

## PHI minimization in this project

Current PHI handling: **PHI-MINIMAL by design**.
- Medical-cost dataset is aggregated → not PHI
- EHR adapter is feature-flag OFF in dev
- No production PHI in repo or eval datasets

**Pre-deployment hardstops** (when enabling EHR adapter):
- [ ] BAA with every vendor in path
- [ ] Tokenization layer between system and LLM prompts
- [ ] Consent management table + workflow
- [ ] HIPAA-specific audit report (§164.528 accounting of disclosures)
- [ ] Annual SOC2 Type II audit
- [ ] Annual HIPAA risk assessment

## Composes with

- §38 AI production governance
- §47.6 SOC2 CC6.1 + CC6.2 (access + secrets)
- [backend/services/external_feeds/ehr.py](../../backend/services/external_feeds/ehr.py) — EHR adapter contract
- [EU_AI_ACT.md](EU_AI_ACT.md) — broader AI compliance overlay
