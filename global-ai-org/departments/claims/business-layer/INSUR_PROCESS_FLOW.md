# Process Flow Diagrams — Claims

Per operator 2026-06-01.
Mermaid flowcharts per L2 process. Each L2 → ordered L3 sub-process chain.

## L1 → L2 Process Hierarchy

```mermaid
flowchart TB
    P0[FNOL] --> S0[Claim Intake]
    P1[Claim Setup] --> S1[Registration]
    P2[Document Management] --> S2[Collection & Extraction]
    P3[Validation] --> S3[Completeness & Coverage]
    P4[Fraud Management] --> S4[Screening]
    P5[Coverage] --> S5[Verification]
    P6[Assessment] --> S6[Damage / Loss Assessment]
    P7[Investigation] --> S7[Case Analysis]
    P8[Settlement] --> S8[Reserve & Decision]
    P9[Approval] --> S9[Approval Workflow]
    P10[Payment] --> S10[Disbursement]
    P11[Closure] --> S11[Closeout & Audit]
    S0 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> S7
    S7 --> S8
    S8 --> S9
    S9 --> S10
    S10 --> S11
```

### FNOL → Claim Intake

```mermaid
flowchart LR
    A[Web Claim Submission]
    B[Mobile Claim Submission]
    C[Call Center Intake]
    D[Broker / Agent Submission]
    E[Email / Document Upload]
    A --> B
    B --> C
    C --> D
    D --> E
```

### Claim Setup → Registration

```mermaid
flowchart LR
    A[Claim Number Generation]
    B[Policy Linking]
    C[Customer Verification]
    D[Loss Date / Location Capture]
    A --> B
    B --> C
    C --> D
```

### Document Management → Collection & Extraction

```mermaid
flowchart LR
    A[Document Upload]
    B[OCR Extraction]
    C[Document Classification]
    D[Metadata Tagging]
    A --> B
    B --> C
    C --> D
```

### Validation → Completeness & Coverage

```mermaid
flowchart LR
    A[Missing Data Check]
    B[Duplicate Claim Check]
    C[Coverage Validation]
    D[Policy-in-force Verification]
    A --> B
    B --> C
    C --> D
```

### Fraud Management → Screening

```mermaid
flowchart LR
    A[Fraud Score Calculation]
    B[Pattern Analysis]
    C[Network / Graph Analysis]
    D[External Watchlist Match]
    A --> B
    B --> C
    C --> D
```

### Coverage → Verification

```mermaid
flowchart LR
    A[Coverage Check]
    B[Policy Limits Check]
    C[Deductible Application]
    D[Exclusion Review]
    A --> B
    B --> C
    C --> D
```

### Assessment → Damage / Loss Assessment

```mermaid
flowchart LR
    A[Image / Video Analysis (CV)]
    B[Adjuster Field Review]
    C[Repair Estimate]
    D[Medical Bill Review]
    A --> B
    B --> C
    C --> D
```

### Investigation → Case Analysis

```mermaid
flowchart LR
    A[Field Investigation]
    B[External Verification (Police / Medical)]
    C[Witness Interview]
    D[Subrogation Review]
    A --> B
    B --> C
    C --> D
```

### Settlement → Reserve & Decision

```mermaid
flowchart LR
    A[Reserve Calculation]
    B[Settlement Recommendation]
    C[Negotiation]
    D[Approval Routing]
    A --> B
    B --> C
    C --> D
```

### Approval → Approval Workflow

```mermaid
flowchart LR
    A[Auto Approval (STP)]
    B[Manual Approval]
    C[Manager Escalation]
    D[Committee Review]
    A --> B
    B --> C
    C --> D
```

### Payment → Disbursement

```mermaid
flowchart LR
    A[EFT Payment]
    B[Check Issuance]
    C[Vendor Direct Pay]
    D[Recovery / Salvage]
    A --> B
    B --> C
    C --> D
```

### Closure → Closeout & Audit

```mermaid
flowchart LR
    A[File Archive]
    B[Audit Logging]
    C[Customer Notification]
    D[Subrogation Recovery]
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

    Customer->>API: Initiate claims request
    API->>Council: Goal interpretation
    Council->>Planner: Decompose to task DAG
    Planner->>Tool: Execute (1..N tasks)
    Tool->>Audit: Per-layer audit row
    Tool->>API: Final response
    API->>Customer: Result + citations
```
