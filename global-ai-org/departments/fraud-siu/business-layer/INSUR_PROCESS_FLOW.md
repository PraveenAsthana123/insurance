# Process Flow Diagrams — Fraud / Special Investigations Unit (SIU)

Per operator 2026-06-01.
Mermaid flowcharts per L2 process. Each L2 → ordered L3 sub-process chain.

## L1 → L2 Process Hierarchy

```mermaid
flowchart TB
    P0[Fraud Detection] --> S0[Multi-Layer Screening]
    P1[Triage] --> S1[Case Prioritization]
    P2[Investigation] --> S2[Active Case Work]
    P3[Decision] --> S3[Case Disposition]
    P4[Action] --> S4[Outcome]
    P5[Reporting] --> S5[Regulatory & Industry]
    P6[Prevention] --> S6[Forward-looking Controls]
    S0 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
```

### Fraud Detection → Multi-Layer Screening

```mermaid
flowchart LR
    A[Rule-based Screening]
    B[ML Fraud Scoring]
    C[Network / Graph Analysis]
    D[Behavioral Anomaly]
    E[External Watchlist Match]
    A --> B
    B --> C
    C --> D
    D --> E
```

### Triage → Case Prioritization

```mermaid
flowchart LR
    A[Priority Scoring]
    B[Case Routing]
    C[Investigator Assignment]
    A --> B
    B --> C
```

### Investigation → Active Case Work

```mermaid
flowchart LR
    A[Document Examination]
    B[Interview]
    C[Surveillance]
    D[Medical Record Review]
    E[Vendor / Provider Audit]
    F[Social Media OSINT]
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

### Decision → Case Disposition

```mermaid
flowchart LR
    A[Confirm Fraud]
    B[Confirm Legitimate]
    C[Inconclusive / Refer Out]
    A --> B
    B --> C
```

### Action → Outcome

```mermaid
flowchart LR
    A[Claim Denial]
    B[Recovery / Subrogation]
    C[Law Enforcement Referral]
    D[Provider De-network]
    A --> B
    B --> C
    C --> D
```

### Reporting → Regulatory & Industry

```mermaid
flowchart LR
    A[NICB Reporting]
    B[State DOI Reporting]
    C[Internal Reporting]
    D[Industry Anti-Fraud Consortium]
    A --> B
    B --> C
    C --> D
```

### Prevention → Forward-looking Controls

```mermaid
flowchart LR
    A[Application Risk Scoring]
    B[Provider Audit]
    C[Customer Behavioral Monitoring]
    A --> B
    B --> C
```


## End-to-End Happy Path

```mermaid
sequenceDiagram
    participant Customer
    participant API as API Gateway
    participant Council as Council of Agents
    participant Planner as Planner Agent
    participant Tool as Domain Agents
    participant Audit as Decision Audit

    Customer->>API: Initiate fraud / special investigations unit (siu) request
    API->>Council: Goal interpretation
    Council->>Planner: Decompose to task DAG
    Planner->>Tool: Execute (1..N tasks)
    Tool->>Audit: Per-layer audit row
    Tool->>API: Final response
    API->>Customer: Result + citations
```
