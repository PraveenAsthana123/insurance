# AI Digital Transformation Strategy (4P) — Fraud / Special Investigations Unit (SIU)

Owner: AI-Strategy role.
Per global §64.4 — the 4P dimensions: People / Process / Profit / Technology.

## P1. People
- Train 60 investigators on Fraud Copilot.
- Hire 6 graph / network data scientists.
- Hire 3 OSINT specialists with AI-tool fluency.
- Establish Fraud AI Council per §64.43 #2.
- Re-skill 25% of L1 reviewers into model-validation roles.

## P2. Process
- Real-time fraud scoring on every claim (sub-2-sec).
- Continuous network re-scoring (vs investigator-initiated).
- Automated OSINT pre-loaded for every flagged case.
- Provider audits triggered by anomaly, not annual schedule.

## P3. Profit
- Fraud leakage: $15M → $5M = $10M annual savings.
- Provider-fraud recovery: +$8M annually.
- Recovery rate improvement: 40% → 75% = $4M additional recovery.
- Reduced LAE on fraud cases: $2M annually.
- ROI horizon: payback 8 months; 36-month NPV $90M.

## P4. Technology
- Adopt graph DB (Neo4j) for relationship analysis.
- Adopt ML fraud-scoring ensemble (XGBoost + Isolation Forest + autoencoder).
- RAG corpus: fraud playbooks + historical cases + NICB bulletins + state DOI guidance.
- Stack: FastAPI + Neo4j + PostgreSQL + Redis + Kafka + Ollama + Pinecone.
- Build core models; buy NICB data feed + OSINT SaaS.
- Sunset SAS rule engine: Year 2.

## Cross-cutting

| Dimension | AS-IS evidence | TO-BE target | Success metric |
|---|---|---|---|
| People | Manual workforce | AI-assisted workforce | Productivity per FTE |
| Process | Sequential | Event-driven + STP | STP rate, cycle time |
| Profit | High LAE + leakage | Reduced LAE + recovered leakage | LAE %, leakage $ |
| Technology | Monolithic legacy | Event-driven + AI native | Time to deploy a new rule / model |
