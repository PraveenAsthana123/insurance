# Layered Architecture Map

## 1. User Layer

Examples:

- Browser React app
- API clients
- curl/Postman
- load balancer
- future API gateway

Responsibility:

- initiate requests
- pass auth/session headers
- display status/freshness/errors
- never enforce final authorization truth

## 2. Application Layer

Files:

- `backend/main.py`
- `backend/routers/*.py`
- `frontend/src/App.jsx`
- `frontend/src/components/Layout.jsx`

Responsibility:

- route registration
- HTTP request/response binding
- middleware registration
- frontend route shell

## 3. Model/Foundation Layer

Files:

- `backend/schemas/*.py`
- `backend/ml/features/*.py`
- `backend/ml/reference/*.py`

Responsibility:

- request/response contracts
- domain/model data shapes
- pure transformation helpers
- ML/domain reference logic

## 4. Service Layer

Files:

- `backend/services/*.py`

Responsibility:

- one business use case per method
- validate business preconditions
- call repository/domain helper by ID
- log/trace important operations
- return schema/domain output

Rule: no raw SQL in service methods.

## 5. Infrastructure Layer

Files:

- `backend/repositories/*.py`
- `backend/database.py`
- `backend/migrations/*.sql`
- Docker Compose services

Responsibility:

- database connections
- SQL queries
- migrations
- Redis/Postgres/Adminer runtime
- file-system backed data

## 6. Orchestration And Framework Layer

Files:

- `backend/workers/*.py`
- `agents/*.py`
- `scripts/*.py`

Responsibility:

- async jobs
- worker orchestration
- seeders
- pipelines
- council-of-agents flows

## 7. Trust, Observability, Governance Layer

Files:

- `backend/core/middleware.py`
- `backend/core/rbac_middleware.py`
- `backend/core/structured_logger.py`
- `backend/core/error_handlers.py`
- `docs/BACKEND_GLOBAL_POLICY.md`
- `docs/UI_GLOBAL_POLICY.md`

Responsibility:

- correlation IDs
- RBAC/JWT target policy
- structured logging
- security headers
- rate limiting
- audit/eval/governance rules
