# Process Flow Diagrams — Underwriting

Per operator 2026-06-01.
Mermaid flowcharts per L2 process. Each L2 → ordered L3 sub-process chain.

## L1 → L2 Process Hierarchy

```mermaid
flowchart TB
    P0[Lead Intake] --> S0[Application Submission]
    P1[Pre-Screening] --> S1[Eligibility & Appetite]
    P2[Data Collection] --> S2[External Data Pulls]
    P3[Risk Assessment] --> S3[Multi-Source Risk Scoring]
    P4[Underwriting Review] --> S4[Decision Engine]
    P5[Pricing] --> S5[Premium Calculation]
    P6[Decision] --> S6[Decision Issuance]
    P7[Policy Issuance] --> S7[Binding & Delivery]
    P8[Portfolio Monitoring] --> S8[In-force Surveillance]
    S0 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> S7
    S7 --> S8
```

### Lead Intake → Application Submission

```mermaid
flowchart LR
    A[Web Application]
    B[Broker Portal]
    C[Direct Sales Channel]
    D[Reverse Auction Aggregator]
    A --> B
    B --> C
    C --> D
```

### Pre-Screening → Eligibility & Appetite

```mermaid
flowchart LR
    A[Eligibility Check]
    B[Appetite Match]
    C[Decline-and-redirect]
    D[Quick-quote Path]
    A --> B
    B --> C
    C --> D
```

### Data Collection → External Data Pulls

```mermaid
flowchart LR
    A[KYC / Identity Verification]
    B[Credit Bureau Pull]
    C[Medical Records (HIPAA-compliant)]
    D[Motor Vehicle Records (MVR)]
    E[CLUE Loss History]
    F[Telematics Onboarding]
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

### Risk Assessment → Multi-Source Risk Scoring

```mermaid
flowchart LR
    A[Demographic Risk Scoring]
    B[Behavioral Risk Scoring]
    C[Catastrophe Exposure (Geo)]
    D[Credit-based Insurance Score]
    E[Predictive Lapse Risk]
    A --> B
    B --> C
    C --> D
    D --> E
```

### Underwriting Review → Decision Engine

```mermaid
flowchart LR
    A[Auto Underwriting (STP)]
    B[Manual Underwriting Review]
    C[Senior UW Referral]
    D[Reinsurance Referral (treaty / facultative)]
    A --> B
    B --> C
    C --> D
```

### Pricing → Premium Calculation

```mermaid
flowchart LR
    A[Base Premium Calculation]
    B[Dynamic Adjustment (telematics, behavior)]
    C[Discount Application]
    D[Surcharge Application]
    E[Rate-filing Compliance Check]
    A --> B
    B --> C
    C --> D
    D --> E
```

### Decision → Decision Issuance

```mermaid
flowchart LR
    A[Approve]
    B[Reject (with reason codes)]
    C[Refer (with conditions)]
    D[Counter-offer]
    A --> B
    B --> C
    C --> D
```

### Policy Issuance → Binding & Delivery

```mermaid
flowchart LR
    A[Policy Document Generation]
    B[ID Card Issuance]
    C[Welcome Kit Generation]
    D[Policy Delivery (e-delivery / mail)]
    A --> B
    B --> C
    C --> D
```

### Portfolio Monitoring → In-force Surveillance

```mermaid
flowchart LR
    A[Risk Re-scoring]
    B[Loss-experience Monitoring]
    C[Renewal Risk Review]
    D[Mid-term Endorsement Review]
    A --> B
    B --> C
    C --> D
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

    Customer->>API: Initiate underwriting request
    API->>Council: Goal interpretation
    Council->>Planner: Decompose to task DAG
    Planner->>Tool: Execute (1..N tasks)
    Tool->>Audit: Per-layer audit row
    Tool->>API: Final response
    API->>Customer: Result + citations
```
