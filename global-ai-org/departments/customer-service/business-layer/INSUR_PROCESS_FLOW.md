# Process Flow Diagrams — Customer Service / Contact Center

Per operator 2026-06-01.
Mermaid flowcharts per L2 process. Each L2 → ordered L3 sub-process chain.

## L1 → L2 Process Hierarchy

```mermaid
flowchart TB
    P0[Customer Contact] --> S0[Inbound Channels]
    P1[Authentication] --> S1[Identity & Security]
    P2[Inquiry Management] --> S2[Intent Routing]
    P3[Case Management] --> S3[Ticket Lifecycle]
    P4[Resolution] --> S4[Resolution Path]
    P5[Escalation] --> S5[Tiered Escalation]
    P6[Feedback] --> S6[Voice of Customer]
    P7[Retention] --> S7[Save Path]
    S0 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> S7
```

### Customer Contact → Inbound Channels

```mermaid
flowchart LR
    A[Phone (IVR + agent)]
    B[Email]
    C[Chat (web + mobile)]
    D[Mobile app]
    E[Social media]
    F[WhatsApp]
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

### Authentication → Identity & Security

```mermaid
flowchart LR
    A[Voice biometrics]
    B[Knowledge-based authentication]
    C[OTP / 2FA]
    D[Account number + DOB]
    A --> B
    B --> C
    C --> D
```

### Inquiry Management → Intent Routing

```mermaid
flowchart LR
    A[Policy Inquiry]
    B[Claims Inquiry]
    C[Billing Inquiry]
    D[Coverage Inquiry]
    E[Endorsement / Change Request]
    A --> B
    B --> C
    C --> D
    D --> E
```

### Case Management → Ticket Lifecycle

```mermaid
flowchart LR
    A[Ticket Creation]
    B[Ticket Assignment]
    C[Routing to Specialist]
    D[SLA Tracking]
    A --> B
    B --> C
    C --> D
```

### Resolution → Resolution Path

```mermaid
flowchart LR
    A[Self-Service (KB / chatbot)]
    B[Agent Resolution]
    C[Escalation]
    A --> B
    B --> C
```

### Escalation → Tiered Escalation

```mermaid
flowchart LR
    A[Supervisor Escalation]
    B[Claims / UW Escalation]
    C[Executive Escalation]
    D[Legal / Compliance Escalation]
    A --> B
    B --> C
    C --> D
```

### Feedback → Voice of Customer

```mermaid
flowchart LR
    A[Survey (CSAT)]
    B[Net Promoter Score]
    C[Complaint Capture]
    D[Compliment Capture]
    A --> B
    B --> C
    C --> D
```

### Retention → Save Path

```mermaid
flowchart LR
    A[Renewal Reminder]
    B[Save Offer]
    C[Loyalty Program Surface]
    D[Cross-sell Suggestion]
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

    Customer->>API: Initiate customer service / contact center request
    API->>Council: Goal interpretation
    Council->>Planner: Decompose to task DAG
    Planner->>Tool: Execute (1..N tasks)
    Tool->>Audit: Per-layer audit row
    Tool->>API: Final response
    API->>Customer: Result + citations
```
