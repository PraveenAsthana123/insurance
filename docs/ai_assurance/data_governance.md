# Data Governance — "No User Data to the Model" + Notifications + Accountability

> **Cross-cutting doc.** Applies across frameworks 101–111. Codifies
> the *enforceable* (not just policy-text) controls for keeping
> sensitive user data out of model inputs, surfacing per-operation
> notifications to the user, and making every operation
> non-repudiable.
>
> Maps to: §38.3 (decision audit envelope), §47.6 (SOC2 CC6.2), §48
> (explainability), §57.6 (canonical logging fields), §68.6
> (guardrails), §68.7 (PII inventory), §68.8–11 (eval triplet).

## 1) "User data must not go to the model" — enforceable controls

Policy text is necessary but insufficient. These controls turn the
policy into something an SOC2 auditor can verify.

### A. Data-path hard controls (pre-send)

| Control | Mechanism | Verification |
|---|---|---|
| **Data classification gate** | Outbound LLM gateway checks every payload against `data_class` allowlist | Drill: inject seeded PII → expect block |
| **Redaction + minimization** | Presidio / regex / DLP layer strips names, emails, phone, addresses, IDs, credentials, API keys, tokens, health identifiers | Hash payload before/after; redaction-ratio metric |
| **Allowlist-only prompt fields** | Prompt schema enforces approved fields only (e.g., `issue_type`, `error_code`, `device_model`) — NOT raw text dumps | Pydantic / Zod validation at gateway |
| **Free-text quarantine** | If user submits free text, it is summarized + classified locally before LLM call | Local summarizer model logs preserved |

### B. Model usage mode

| Setting | Enforced via |
|---|---|
| **No-training / no-retention mode** | Vendor contract clause + technical setting (e.g., OpenAI `store=false`, Anthropic no-data-training default) |
| **Zero-logging for prompts** | Disable provider prompt logging where supported; for our own infra, encrypted logs with strict retention |
| **Customer-managed encryption keys (CMEK)** | Stored artefacts (cache, embeddings, audit) use CMEK |
| **Vendor attestation** | Annual provider SOC2 / ISO 27001 report on file |

### C. "Bring the model to the data" patterns (preferred for sensitive flows)

| Pattern | When to use |
|---|---|
| **On-prem / private model** | High-sensitivity flows (PHI, legal, financial advice) → run in secure VPC, no egress |
| **RAG with strict retrieval filtering** | Only non-sensitive chunks retrievable; sensitive chunks tagged + excluded by retriever |
| **Local summarization** | Summarize locally → send only the summary to the model |
| **Edge inference** | Run smaller model on device / edge for ambient signals |

### D. Audit evidence (prove it works)

Per request, the outbound gateway MUST log:

```json
{
  "request_id": "req-...",
  "tenant_id": "...",
  "actor": "user-...",
  "policy_version": "v3.2.1",
  "data_classes_detected": ["pii_name", "pii_email"],
  "redactions_applied": ["pii_name->[NAME]", "pii_email->[EMAIL]"],
  "fields_allowed": ["issue_type", "error_code"],
  "fields_rejected": [],
  "decision": "allow",
  "model_endpoint": "anthropic://claude-opus-4-7",
  "destination_region": "us-east-1",
  "no_train_mode": true,
  "ts": "2026-06-01T..."
}
```

Plus **quarterly DLP test reports** — seed known PII strings into
the gateway and verify 100% block rate. Failure = release blocker.

## 2) Per-Operation User Notifications

### A. What counts as an "AI operation" (notify-worthy)

- Data collection / upload
- Data retrieval (RAG fetch)
- Model inference request
- Tool / action execution (email, file write, API call)
- Sharing / exporting results
- Storing outputs (cache, history, analytics)

### B. Required notification content per operation

| Field | Plain-language example |
|---|---|
| **What happened** | "Asked the model to summarize your support ticket" |
| **What data was used** | "Issue category + error code (no personal info)" |
| **Where it went** | "Anthropic Claude — US East — no-training mode" |
| **Why** | "To suggest a knowledge-base article" |
| **Who triggered it** | "You, at 2:13 PM" |
| **Result** | "Success — KB article ABC-123 returned" |
| **Reference ID** | "req-7f3e2a..." |
| **Controls** | Approve / Deny / Undo / Delete / Report issue |

### C. UX patterns

| Pattern | Surface |
|---|---|
| **Run card** (per-operation receipt) | Inline below each AI action |
| **Timeline view** ("Activity") | `/holy/activity` per user |
| **Real-time banner** | "Using model now… data minimized" during inference |
| **Explicit consent step** | For sensitive operations (medical, financial, legal) |

## 3) Accountability — make it non-repudiable

### A. Accountability model (RACI × RBAC × signed events)

RBAC roles (canonical):

| Role | Scope |
|---|---|
| **End User** | Acts on their own data; can request export / deletion |
| **Admin** | Configures policy, model selection, allowlists |
| **Auditor** | Read-only access to audit logs + DLP reports |
| **System Agent** | Automated process; never anonymous — always tied to a service principal |

RACI per operation type:

| Operation | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Model inference | System service | User (or Admin if automated) | Security / Legal (policy) | User |
| Tool execution | Agent runtime | User | Security | User |
| Data export | User | User | — | Admin |
| Policy change | Admin | Compliance officer | Security / Legal | All users |

### B. Non-repudiation — immutable audit events

Every operation generates a row with:

```json
{
  "event_id": "evt-...",
  "ts": "2026-06-01T...",
  "user_id": "...",
  "operation_type": "model_inference",
  "data_categories_used": ["issue_type", "error_code"],
  "policy_version": "v3.2.1",
  "policy_decision": "allow",
  "model_id": "anthropic://claude-opus-4-7",
  "tool_id": null,
  "consent_status": "implicit",
  "outcome": "success",
  "error_code": null,
  "request_hash": "sha256:..."
}
```

Stored in **WORM / append-only** storage (Postgres with row-level
INSERT-only grant + nightly hash-chain validation).

### C. User-side accountability features

- "**I confirm this data is allowed**" checkbox for manual sends
- "**Report misuse**" button on every operation card → opens incident
- "**Export audit trail**" — PDF + CSV per user (GDPR + CCPA right of access)

## 4) Minimal policy text (paste-able into governance docs)

> **Policy — User Data → Model**
> The system must not transmit raw user identifiers, credentials, or
> sensitive personal/health data to any external model endpoint.
> Only minimized + redacted inputs may be sent, limited to approved
> allowlist fields. Any exception requires explicit user consent, is
> logged, and is reviewable.

> **Policy — Notifications**
> The system must provide a user-visible notification for each AI
> operation including data categories used, destination, purpose,
> and result.

> **Policy — Accountability**
> Every AI operation must be linked to an authenticated actor and
> produce an immutable audit event.

## 5) Engineering-ready implementation checklist

- [ ] DLP classifier + regex + secret scanner in outbound gateway
- [ ] Allowlist schema for prompt payloads (Pydantic / Zod)
- [ ] Consent UI for exceptions
- [ ] Operation event model + append-only audit store
- [ ] User-facing audit timeline + export
- [ ] Policy engine with versioning (OPA-style)
- [ ] Vendor contract / settings: no-training / no-retention
- [ ] Red-team tests: seed PII → ensure blocked (quarterly)
- [ ] WORM / hash-chain validation of audit log (nightly cron)
- [ ] Run cards + activity timeline in UI
- [ ] Consent capture for sensitive flows
- [ ] DLP report dashboard tile in §68 hub

## Composes with

- **§38.3** — the canonical decision audit envelope
- **§42** — pre-approved local ops; vendor contract changes are gated
- **§43** — DLP drill belongs in `tests/drills/drill_dlp_outbound.py`
- **§47.6** — SOC2 CC6.1 (access), CC6.2 (logical access), CC7.2 (anomaly), CC7.3 (IR)
- **§48** — explainability for "why this data was used"
- **§57.6** — canonical fields on every log line (request_id, tenant_id, actor)
- **§68.5** — transactions surface displays these audit rows
- **§68.6** — guardrails surface displays per-request decisions
- **§68.7** — PII inventory shows which classes are still reachable
- Frameworks: **101** (reliability of the gateway), **102** (user trust signals), **103** (safe-content gating), **104** (RACI), **105** (auditability), **109** (RAG retrieval filtering)
