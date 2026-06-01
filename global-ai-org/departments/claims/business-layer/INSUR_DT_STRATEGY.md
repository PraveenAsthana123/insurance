# AI Digital Transformation Strategy (4P) — Claims

Owner: AI-Strategy role.
Per global §64.4 — the 4P dimensions: People / Process / Profit / Technology.

## P1. People
- Train 250 adjusters on Adjuster Copilot (3-week certification).
- Add 5 prompt engineers + 3 AI/ML engineers to claims tech team.
- Re-org: shift 40% of L1 adjusters into exception-handling roles as STP rises.
- Establish AI Council per §64.43 #2 (claims-domain SMEs + tech + compliance).

## P2. Process
- STP redesign — auto-approve claims under $5K with confidence ≥ 0.85.
- Human-in-loop gates for high-severity claims (>$50K) per §40.
- Eliminate paper trails — all docs into RAG-indexed DMS per §48.5.
- CAT surge playbook — auto-spin-up of 100 cloud adjuster agents per §64.43 #1.

## P3. Profit
- Reduce LAE (loss-adjustment expense) by 30% — $45M annual savings.
- Fraud leakage recovery: $15M → $5M (66% reduction via §64.36 fraud flavor).
- STP cycle improvement → faster cash conversion = $8M working capital release.
- Reserve accuracy → reduce IBNR strain by $20M; release capital for growth.
- ROI horizon: payback 14 months; 36-month NPV $180M risk-adjusted.

## P4. Technology
- Migrate from Guidewire ClaimCenter monolith to event-driven decomposition (3-yr horizon).
- Adopt CV pipeline (per §64.20) for damage assessment — vendor: AI inspection SaaS or in-house TF model.
- RAG corpus = policy documents + claims history + medical literature + repair estimates.
- Stack: FastAPI + PostgreSQL + Redis + Kafka + Ollama (RAG) + Pinecone (vector).
- Build-vs-buy: build core decision layer; buy CV + voice transcription SaaS.
- Tech debt: legacy mainframe interface costs $4M/yr — sunset in Year 2.

## Cross-cutting

| Dimension | AS-IS evidence | TO-BE target | Success metric |
|---|---|---|---|
| People | Manual workforce | AI-assisted workforce | Productivity per FTE |
| Process | Sequential | Event-driven + STP | STP rate, cycle time |
| Profit | High LAE + leakage | Reduced LAE + recovered leakage | LAE %, leakage $ |
| Technology | Monolithic legacy | Event-driven + AI native | Time to deploy a new rule / model |
