# Flow Diagram · insur_project · Manual vs Automatic

> Per §64.27. For each major business process: manual AS-IS swimlane + automatic TO-BE flow + comparison table. Updated 2026-06-08.

## Process 1: Claims intake & adjudication

### Manual flow (AS-IS)

```mermaid
graph LR
    A([Claimant submits claim]) --> B[Adjuster reads form]
    B --> C{Required docs?}
    C -->|No| D[Email/phone for docs]
    D --> B
    C -->|Yes| E[Manual fraud-check checklist]
    E --> F[Manual policy lookup]
    F --> G[Adjuster decides]
    G --> H{Approve?}
    H -->|Yes| I[Manual payment process]
    H -->|No| J[Mail rejection letter]
    I --> K([Done 5-12 business days])
    J --> K

    style K fill:#fee
```

### Automatic flow (TO-BE)

```mermaid
graph LR
    A([Claimant uploads via portal]) --> B[Frontend validates · OCR]
    B --> C[Backend ingests]
    C --> D[ML fraud model: full_lifecycle]
    D --> E{Fraud score}
    E -->|< 0.3 Low risk| F[Auto-approve]
    E -->|0.3-0.7 Mid| G[HITL with AI assist]
    E -->|> 0.7 SIU| H[Route to SIU dept]
    F --> I[Payment automated]
    G --> J[Adjuster reviews w/ SHAP]
    J --> I
    H --> K[Special Investigation]
    I --> L([Done < 5 minutes])
    K --> M([Done 1-2 days])

    style L fill:#efe
    style M fill:#ffe
```

### Comparison

| Metric | Manual | Automatic | Improvement |
|---|---|---|---|
| Time per claim | 5-12 days | < 5 min (low risk) | 1500x |
| Fraud detect rate | ~30% caught | ~85% caught | 2.8x |
| Cost per claim | $40-80 | $0.50-2 | 50x |
| Human touch | 2-4 | 0-1 (low risk) | 4x reduction |
| Adjuster throughput | 8-12/day | 50-80/day | 6x |

## Process 2: Underwriting

### Manual flow (AS-IS)

```mermaid
graph LR
    A([Application received]) --> B[Underwriter reads]
    B --> C[Pull credit · medical records]
    C --> D[Manual risk worksheet]
    D --> E[Quote letter]
    E --> F{Customer accepts?}
    F -->|Yes| G[Policy issued manually]
    F -->|No| H[File closed]

    style G fill:#fee
```

### Automatic flow (TO-BE)

```mermaid
graph LR
    A([Online application]) --> B[Frontend collects]
    B --> C[ML underwriting model]
    C --> D{Risk tier}
    D -->|A/B preferred| E[Instant quote]
    D -->|C/D standard| F[Quote + HITL review]
    D -->|E rated/decline| G[Underwriter manual]
    E --> H{Customer accepts?}
    F --> H
    G --> H
    H -->|Yes| I[Auto-issue policy]
    H -->|No| J[Lead nurture]

    style I fill:#efe
```

### Comparison

| Metric | Manual | Automatic | Improvement |
|---|---|---|---|
| Time to quote | 2-5 days | < 60 sec (A/B) | 5000x |
| Quote accuracy | ~75% | ~92% | 1.2x |
| Cost per application | $50-150 | $1-3 | 50x |
| Conversion rate | 18-25% | 35-45% | 2x |
| Underwriter touch | 100% | 15-25% | 5x reduction |

## Process 3: Customer service / FNOL

### Manual flow (AS-IS)

```mermaid
graph LR
    A([Customer calls 1-800]) --> B[Hold 8-25 min]
    B --> C[Agent answers]
    C --> D[Agent asks 12 questions]
    D --> E[Agent types into 3 systems]
    E --> F[Transfer to specialist?]
    F -->|Yes| G[Hold again 5-15 min]
    F -->|No| H[Resolution attempt]
    G --> H
    H --> I([Avg call: 22 min])

    style I fill:#fee
```

### Automatic flow (TO-BE)

```mermaid
graph LR
    A([Customer initiates chat]) --> B[NLP intent classifier]
    B --> C{Self-serve possible?}
    C -->|Yes| D[Bot resolves]
    C -->|No| E[Smart-route to specialist]
    E --> F[Agent with 360 view + AI assist]
    F --> G[Auto-typed call summary]
    G --> H[Resolution]
    D --> I([< 2 min])
    H --> J([Avg call: 8 min])

    style I fill:#efe
    style J fill:#ffe
```

### Comparison

| Metric | Manual | Automatic | Improvement |
|---|---|---|---|
| Avg handle time | 22 min | 8 min (or 2 min self-serve) | 3-11x |
| First-call resolution | 60% | 85% | 1.4x |
| Cost per contact | $8-15 | $0.50-3 | 5-30x |
| CSAT | 3.2/5 | 4.4/5 | 1.4x |
| Self-serve rate | 5% | 45% | 9x |

## Composes with

§64.27 (manual/automatic flow standard) · §74 (Phase 4 use-case) · §80 (agentic if SIU uses agents) · §86 (this standard)
