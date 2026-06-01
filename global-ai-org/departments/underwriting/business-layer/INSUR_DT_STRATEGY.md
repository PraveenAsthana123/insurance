# AI Digital Transformation Strategy (4P) — Underwriting

Owner: AI-Strategy role.
Per global §64.4 — the 4P dimensions: People / Process / Profit / Technology.

## P1. People
- Train 180 underwriters on UW Copilot (4-week immersion).
- Hire 8 data scientists for risk-model development + monitoring.
- Establish UW AI Council per §64.43 #2.
- Re-skill 30% of UW staff into model-validation + product roles.

## P2. Process
- STP target: 70% on personal lines; 35% on small commercial.
- Real-time external data orchestration (parallel pulls, sub-5-sec).
- Continuous portfolio re-scoring (weekly vs quarterly).
- Dynamic pricing — risk-adjusted premium update on every quote.

## P3. Profit
- Loss ratio improvement: 67% → 58% = $90M annual underwriting profit.
- Combined ratio: 102% → 94%.
- Adverse selection reduction: $8M/yr recovered via dynamic pricing.
- Quote-to-bind conversion: +25% via faster TAT.
- ROI horizon: payback 11 months; 36-month NPV $220M.

## P4. Technology
- Migrate from Duck Creek monolith to event-driven UW platform.
- Adopt risk-scoring ensemble (XGBoost + GBM + neural) per §64.20.
- RAG corpus: medical records + rate filings + underwriting manual + claim history.
- Stack: FastAPI + PostgreSQL + Redis + Kafka + Pinecone + Ollama.
- Build core risk models; buy KYC + bureau-pull SaaS.
- Sunset Excel-rate-table dependency: Year 1.

## Cross-cutting

| Dimension | AS-IS evidence | TO-BE target | Success metric |
|---|---|---|---|
| People | Manual workforce | AI-assisted workforce | Productivity per FTE |
| Process | Sequential | Event-driven + STP | STP rate, cycle time |
| Profit | High LAE + leakage | Reduced LAE + recovered leakage | LAE %, leakage $ |
| Technology | Monolithic legacy | Event-driven + AI native | Time to deploy a new rule / model |
