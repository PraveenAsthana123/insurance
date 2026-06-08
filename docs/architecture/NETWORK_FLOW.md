# Network Flow · insur_project · Deployment Topology

> Container topology · port map · service-to-service · external integrations · data-flow boundaries. Updated 2026-06-08.

## Container topology

```mermaid
graph TB
    subgraph "Linux host (192.168.1.88)"
        subgraph "Docker network: insur_default · 192.168.48.0/24"
            FE[insur_frontend<br/>Vite :3000<br/>NOT in compose right now]
            BE[insur_backend<br/>FastAPI :8000<br/>NOT running right now]
            PG[(insur_postgres<br/>:5432<br/>NOT running right now)]
            RD[(insur_redis<br/>:6379<br/>RUNNING 192.168.48.4)]
            MLF[insur_mlflow<br/>:5000<br/>RUNNING]
            OL[insur_ollama<br/>:11434<br/>RUNNING qwen2.5]
            AG[agents<br/>fleet]
            CC[council_agents<br/>3-model council]
        end
        ViteDev[Vite dev server<br/>:3210 on host<br/>RUNNING manually]
    end

    User[LAN user]
    Kaggle[Kaggle CLI<br/>/.local/bin]

    User -->|HTTP :3210| ViteDev
    ViteDev -->|middleware /insurance-blueprint| ViteDev
    User -.->|HTTP :3000 if compose up| FE
    FE -.->|REST :8001| BE
    BE -.->|TCP 5432| PG
    BE -->|TCP 6379| RD
    BE -->|HTTP 11434| OL
    BE -->|HTTP 5001| MLF
    AG -->|BRPOP :6379| RD
    CC -->|BRPOP :6379| RD
    Kaggle -.->|cron daily| BE
```

## Port map (host:container)

| Service | Host port | Container port | Status |
|---|---|---|---|
| Frontend Vite (manual) | 3210 | 3000 | **RUNNING** |
| Frontend compose | 3000 | 3000 | Not in compose right now |
| Backend (compose-mapped) | **8001** | 8000 | Image built · not running |
| Backend (squatted by legacy) | 8000 | — | **bev-analytics responds here** |
| Postgres | 5432 | 5432 | Not running |
| Redis | 6379 | 6379 | Running (Docker IP 192.168.48.4) |
| Ollama | 11434 | 11434 | Running |
| MLflow | 5001 | 5000 | Running · 4 experiments · 21 runs |

## Service-to-service connections

| From | To | Protocol | Auth | Notes |
|---|---|---|---|---|
| Frontend | Backend | HTTP/REST | Bearer JWT (planned) | Compose maps to 8001 |
| Backend | Postgres | TCP/SQL | User+pwd env | `BEV_POSTGRES_HOST=postgres` |
| Backend | Redis | TCP | None (private net) | `REDIS_URL=redis://insur_redis:6379/0` |
| Backend | Ollama | HTTP | None | Hardcoded `http://localhost:11434` (bug per DEEP_ERROR_REPORT) |
| Backend | MLflow | HTTP | None | Tracking URI |
| Worker | Postgres | TCP/SQL | Same as backend | Celery |
| Worker | Redis | TCP | Same | Broker + result backend |
| Agents | Redis | TCP | Same | BRPOP for tasks |
| Vite (dev) | Disk | local FS | None | Serves `/insurance-blueprint` from `data/insurance/blueprint.json` |

## External integrations

| External | Purpose | Auth | Data sensitivity |
|---|---|---|---|
| Kaggle | Dataset refresh | `~/.kaggle/kaggle.json` (chmod 600) | Public datasets only |
| 3rd-party AI | Optional · not wired | OAuth2 future | Per §76 no-PHI to external |

## Data-flow boundaries

```mermaid
graph LR
    User[Operator] -->|PII potential| FE[Frontend]
    FE -->|TLS in prod| BE[Backend]
    BE -->|encrypted at rest| PG[(Postgres)]
    BE -.->|redacted before send| OL[Ollama]
    BE -->|audit per call| AuditLog[(Audit Log)]
    BE -->|aggregate only| MLF[(MLflow)]

    style PG fill:#fee,stroke:#c00
    style AuditLog fill:#fee,stroke:#c00
```

## Failure / DR

| Service | RPO | RTO | Notes |
|---|---|---|---|
| Postgres | 1h | 30 min | pg_dump + S3 (planned · not wired) |
| Redis | 1s | < 5 min | AOF persistence |
| Backend | stateless | < 2 min | horizontal scale via compose `--scale` |
| Frontend | static | < 1 min | CDN-cacheable |
| Worker | idempotent | < 5 min | Celery retries |

## Composes with

§47 (architecture · network = C4 deployment) · §76 (privacy · data-flow boundaries) · §86 (this standard)
