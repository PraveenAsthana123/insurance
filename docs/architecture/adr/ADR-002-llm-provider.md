# ADR-002: Ollama on-prem as default LLM; managed providers as opt-in

- **Status**: Accepted
- **Date**: 2026-06-01
- **Deciders**: Operator + AI Platform
- **Tags**: ai, llm, vendor

## Context

Project's domain (insurance) involves regulated data (HIPAA PHI, GLBA financial,
state PII). Sending data to external LLM providers (OpenAI, Anthropic, Google)
requires BAAs + EU AI Act Art. 28 deployer obligations + state DOI disclosure.

Options:
1. Ollama on-prem (open-source models locally)
2. OpenAI / Anthropic via API
3. AWS Bedrock / GCP Vertex (managed but cloud-native)
4. Hybrid (cheap on-prem; route sensitive to vetted vendors)

## Decision

**Ollama (gemma3:1b default) is the production LLM.**
Managed providers can be enabled via env-var per-call routing, gated on
data-classification flag.

## Rationale

- Avoids cross-border + PHI/PII transfer concerns
- No BAA required (data never leaves our infra)
- Cost: $0 per token vs $30/M tokens at OpenAI scale
- Latency: 200-500ms local vs 1-3s API + network
- Reference impl already wired: `backend/ml/reference/rag_lifecycle.py`

## Consequences

### Positive
- Compliance simpler (no third-party data processor)
- Predictable cost (compute we own)
- Faster typical case

### Negative
- Lower quality on hard tasks vs GPT-4 / Claude Sonnet
- GPU operational burden (we run Ollama)
- Model upgrades slower (we test before deploy)

### Risks accepted
- Some agentic tasks may fail at gemma3:1b; route those to Claude via env-var flag

## Alternatives considered

- **OpenAI default**: Best quality but PHI cannot leave EU/US per data residency, no BAA viable for free tier
- **AWS Bedrock**: Vendor lock + still external to us
- **vLLM**: Higher throughput than Ollama; consider when sustained > 10 req/s

## Migration trigger

Move from Ollama to vLLM (still on-prem) when:
- Sustained > 10 req/s causes p95 latency degradation
- Need larger context windows (vLLM supports more model variants)

## References

- Global §38 governance (LLM trace + audit row)
- Global §48 explainability (citation trail per RAG answer)
- `backend/ml/reference/rag_lifecycle.py` (production Ollama integration)
- ADR-003 (vector DB) — composes with this for RAG stack
