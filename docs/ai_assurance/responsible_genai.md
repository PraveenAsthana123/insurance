# Responsible Generative AI (Framework 109)

> **Core question:** Is generation safe, grounded, non-harmful, IP-respecting, and properly disclosed?
>
> **Owner:** RAI Office / Content Safety · **Family:** `ai_assurance` · **DB ID:** 109

## Why this framework

Generative AI inherits all the assurance burdens of classical ML +
adds five new ones: hallucination, prompt injection, copyright /
training-data provenance, mandatory disclosure (EU AI Act Art. 50),
and synthetic-content watermarking. This framework consolidates the
GenAI-specific surface that frameworks 102 + 103 reference but do
not fully own.

## Modules (18+)

Live source is `analysis_module WHERE phase_id=109`. Typical modules:
faithfulness (Ragas), context precision + recall, answer relevance,
citation accuracy = 100%, hallucination rate, prompt-injection
resilience (Garak), training-data provenance, copyright / IP scan,
PII redaction in prompts + outputs, watermark / disclosure
(synthetic-content labels), deepfake detection, jailbreak resilience,
HITL escalation, RAG-corpus freshness, refusal-rate calibration,
multi-language safety parity.

## Required outputs (per release)

- Ragas eval suite green (all 4 metrics above threshold)
- Garak red-team report
- Citation-mapping drill log (every cited chunk exists in retrieval set)
- EU AI Act Art. 50 disclosure in UI verified
- Watermarking spec applied to media generators

## Composes with

- §48 (Explainability — citation trail IS the explanation for RAG)
- §48.5 (the four-part RAG contract — retrieval trail / prompt / citation / guardrail)
- §59.4 (ORF metrics)
- §64.42 (testing matrix — RAGAS + DeepEval + Promptfoo + Garak + Lakera)
- §68.6 (guardrails surface)
- §68.11 (safety eval surface)
- §68.12 (multi-model compare — for selecting safest model per task)
