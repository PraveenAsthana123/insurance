# Sales RBAC — Demo-Mode Enforcement Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Browser)
    participant TB as Topbar RoleSelector
    participant LS as localStorage
    participant AF as apiFetch wrapper
    participant BE as FastAPI
    participant CID as CorrelationIdMW
    participant RBAC as RBACMiddleware
    participant EP as Endpoint

    U->>TB: select "team-member"
    TB->>LS: insur.role = "team-member"
    TB->>TB: dispatch insur:role-change event
    U->>U: navigate to /sales/manager → Simulation tab
    U->>U: UI hides Run button for non-manager<br/>(defense-in-depth)

    Note over U: User bypasses UI via fetch() directly
    U->>AF: POST /api/v1/sales/simulate
    AF->>LS: read insur.role = "team-member"
    AF->>BE: attach X-Demo-Role: team-member
    BE->>CID: correlation_id set
    CID->>RBAC: call_next
    RBAC->>RBAC: match matrix (POST /api/v1/sales/simulate)<br/>allowed roles = {manager}<br/>header role = team-member
    RBAC-->>BE: 403 JSON {detail, error_code: FORBIDDEN, correlation_id}
    BE-->>U: 403
    U->>U: apiFetch throws Error(status=403)<br/>SimulationTab surfaces message
```

**Matrix (Sales only):**

| Endpoint | Manager | Team Member | Compliance | Reporting & Monitoring |
|---|:-:|:-:|:-:|:-:|
| GET /stores | ✅ | ✅ | ✅ | ✅ |
| POST /forecast | ✅ | ✅ | ✅ | ✅ |
| POST /simulate | ✅ | ❌ | ❌ | ❌ |
| POST /ai/explain | ✅ | ✅ | ✅ | ✅ |

Default role when `X-Demo-Role` absent: **manager** (so existing unauthenticated flows pass).
