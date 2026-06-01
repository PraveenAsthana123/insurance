# Hallucination Control Framework

> **Cross-cutting doc.** Multi-layer hallucination validation:
> Prevent → Detect → Verify → Block → Monitor.
>
> Owned by RAI Office + ML Engineering. Maps primarily to frameworks
> **109** (Responsible GenAI) and **102** (Trustworthy AI); reads from
> **107** (Monitoring/Drift) and **110** (Debug AI).
>
> Composes with §48.5 (RAG four-part contract), §59.4 (ORF / Ragas
> metrics), §68.11 (safety eval surface).

## 1️⃣ Operational definition

A **hallucination** occurs when the system:

- Generates factually incorrect information
- Produces unsupported claims not grounded in data
- Fabricates sources, citations, events, or entities
- Outputs overconfident answers with low evidence

This definition is **encoded in validation rules**, not just documented.

## 2️⃣ Layered validation

### Layer 1 — Input-level (prevent before generation)

| Technique | Verification | Quality Check | Framework |
|---|---|---|---|
| Query-intent classification | Ambiguous vs factual detection | Ambiguity score threshold | NIST AI RMF |
| Scope enforcement | Out-of-scope query rejection | Policy match rate | ISO 42001 |
| Context-completeness check | Missing inputs flagged | Context sufficiency score | RAI by design |
| Retrieval-only mode trigger | Force grounded answers | Retrieval dependency flag | RAG governance |

**Fail action:** ask clarifying question / refuse to answer.

### Layer 2 — Knowledge grounding (primary control)

| Technique | Verification | Quality Check | Framework |
|---|---|---|---|
| Retrieval-Augmented Generation (RAG) | Output must cite retrieved chunks | Citation coverage ≥ threshold | NIST |
| Source allowlisting | Only trusted sources allowed | Source trust score | ISO 23894 |
| Evidence-token alignment | Output tokens mapped to evidence | Grounding ratio | RAG QA |
| No-retrieval = no-answer | Block free-form speculation | Enforcement logs | Safety by design |

**Fail action:** "Insufficient evidence" response.

## 3️⃣ Model-time checks

### A. Confidence + uncertainty validation

| Technique | Verification | Quality Metric |
|---|---|---|
| Confidence calibration | Predicted vs actual accuracy | ECE / Brier score |
| Entropy monitoring | High entropy → low confidence | Entropy threshold |
| Self-consistency checks | Multiple generations compared | Agreement score |

**Fail action:** downgrade confidence / route to human review.

### B. Internal consistency checks

| Technique | Verification | Quality Metric |
|---|---|---|
| Logical contradiction detection | Statement-to-statement check | Contradiction rate |
| Temporal consistency | Date + sequence validation | Time-validity score |
| Entity consistency | Same entity, same attributes | Entity mismatch rate |

## 4️⃣ Post-generation verification (critical layer)

### A. Automated fact verification

| Technique | Verification | Quality Check | Framework |
|---|---|---|---|
| Claim extraction | Atomic factual claims identified | Claim count | QA validation |
| Fact-checking | Claims validated against sources | Fact match score | FactCC |
| Citation verification | Source actually supports claim | Citation precision | ISO 42001 |
| Reference existence check | Fake citations blocked | Reference validity rate | Governance |

### B. Text quality + faithfulness metrics

| Metric | What it detects | Tool |
|---|---|---|
| Faithfulness score | Claim ↔ source alignment | Ragas |
| Factual consistency | Contradictory facts | DeepEval |
| Answer relevance | Off-topic hallucinations | Ragas |
| Overgeneration index | Unnecessary speculation | Custom + LLM-as-judge |

## 5️⃣ Runtime quality gates (Go / No-Go)

| Gate | Rule | Action |
|---|---|---|
| **Grounding gate** | Evidence coverage < threshold | Block |
| **Confidence gate** | Low confidence + high-impact decision | Human-in-loop |
| **Safety gate** | Risky domain detected (medical, legal, financial) | Restricted response |
| **Policy gate** | Speculation detected | Refuse / clarify |

## 6️⃣ Continuous monitoring

| Monitoring Check | Evidence |
|---|---|
| Hallucination rate over time | KPI dashboard tile (§68.4) |
| User correction frequency | Feedback logs |
| Rejected-answer ratio | Policy logs |
| Drift in grounding score | Drift report (§107) |

## 7️⃣ Responsible-by-Design controls for hallucination

### Design-time

- Hallucination explicitly listed as **top system risk** in risk register
- Acceptance criteria include faithfulness thresholds (per §59.4 ORF gates)
- **RAG-first architecture** for factual domains

### Build-time

- CI/CD hallucination tests (per validation playbook)
- Synthetic hallucination stress cases
- Model cards include **hallucination risk profile** (per §48.3)

### Run-time

- Real-time hallucination detection
- User-visible **uncertainty indicators**
- Clear **"I don't know"** responses allowed (no penalty for refusal)

## 8️⃣ Accountability + audit evidence

Every response stores (extends §38.3 envelope):

```json
{
  "request_id": "req-...",
  "query_intent_class": "factual_lookup",
  "retrieved_evidence_ids": ["chunk-...", "chunk-..."],
  "grounding_score": 0.91,
  "confidence_score": 0.84,
  "policy_decisions": ["grounding_pass", "confidence_pass", "safety_pass"],
  "final_action": "answer_returned",
  "ragas": {
    "faithfulness": 0.93,
    "context_precision": 0.81,
    "answer_relevance": 0.87,
    "citation_accuracy": 1.0
  }
}
```

Stored in **immutable audit logs** (per §105 Auditable).

## 9️⃣ Reusable audit-ready statement

> Hallucination risk is controlled through multi-layer validation
> including input scoping, evidence grounding, confidence calibration,
> automated fact verification, and continuous monitoring. Outputs that
> fail grounding or confidence thresholds are blocked, downgraded, or
> routed to human review, with full audit traceability.

## 🔟 Executive summary

> **Prevent → Detect → Verify → Block → Monitor.**

## Composes with

- **§38.3** — every hallucination decision is an audit row
- **§43** — `tests/drills/drill_rag_faithfulness.py` + `drill_citation_existence.py` lock the invariants
- **§47.10** — soak + spike testing reveal hallucination rate under load
- **§48.5** — the canonical RAG four-part contract (retrieval / prompt / citation / guardrail)
- **§57.5** — 5-question runbook: "WHY did it hallucinate?" answered by the per-request audit row
- **§59.4** — Ragas thresholds (faithfulness ≥ 0.85, context-precision ≥ 0.75, answer-relevance ≥ 0.80, citation accuracy = 100%) are CI gates
- **§64.21** — XAI / Responsible AI per-model surface
- **§64.36** — Output-Relevancy flavor in the per-sub-process scorecard
- **§64.42** — Ragas + DeepEval + Promptfoo + Garak listed
- **§68.6** — guardrails surface displays runtime gates that fired
- **§68.11** — safety eval surface is the read-side
- Framework **109** Responsible GenAI (primary owner) + **102** Trustworthy AI (calibration, citation) + **107** Monitoring (drift) + **110** Debug AI (per-request replay)
