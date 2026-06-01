# Insur Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Insur Analytics Dashboard with 11 department modules, left sidebar navigation, working ML pipelines, and Kaggle data integration.

**Architecture:** React+Vite frontend with native CSS, FastAPI backend with PostgreSQL, Celery+Redis for ML jobs, MLflow for model registry, all orchestrated via Docker Compose. Each department is a self-contained module with its own component, processes, AI mappings, and ML pipelines.

**Tech Stack:** React 18, Vite, native CSS, FastAPI, PostgreSQL, Celery, Redis, MLflow, scikit-learn, XGBoost, Prophet, Docker Compose

---

## Phase 1: Project Infrastructure

### Task 1: Initialize Git and project root

**Files:**
- Create: `.gitignore`
- Create: `.env.template`
- Create: `README.md`

- [ ] **Step 1: Initialize git repository**

```bash
cd /mnt/deepa/insur
git init
```

- [ ] **Step 2: Create .gitignore**

```
# Environment
.env
.env.local
*.key
*.pem
.encryption.key

# Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
.eggs/
*.egg

# Node
node_modules/
dist/

# Data
*.db
*.pkl
*.h5
*.joblib
data/kaggle/*.csv
data/kaggle/*.zip
data/kaggle/images/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
docker-compose.override.yml

# MLflow
mlruns/
mlartifacts/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Coverage
.coverage
htmlcov/
```

- [ ] **Step 3: Create .env.template**

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=insur_analytics
POSTGRES_USER=insur_user
POSTGRES_PASSWORD=insur_secret_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5001

# Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
PROJECT_API_KEY=
CORS_ORIGINS=http://localhost:3000

# Frontend
VITE_API_BASE_URL=http://localhost:8000

# Kaggle (for dataset downloads)
KAGGLE_USERNAME=
KAGGLE_KEY=
```

- [ ] **Step 4: Create README.md**

```markdown
# Insur Analytics Dashboard

Enterprise-grade Beverages analytics platform covering 11 departments with ML pipelines, RAG explainability, and interactive visualizations.

## Quick Start

```bash
cp .env.template .env
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- MLflow: http://localhost:5001

## Architecture

- **Frontend**: React 18 + Vite + Native CSS
- **Backend**: FastAPI + PostgreSQL
- **ML Pipeline**: Celery + Redis + MLflow
- **Containerization**: Docker Compose

## Departments

1. Sales & Demand Planning
2. Supply Chain & Inventory
3. Logistics & Transportation
4. Manufacturing / Production
5. Maintenance
6. Retail & Merchandising
7. Customer Analytics / Marketing
8. Finance
9. Procurement / Supplier Management
10. Quality Control
11. Governance / Compliance
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.template README.md
git commit -m "feat: initialize BEV analytics dashboard project"
```

---

### Task 2: Docker Compose setup

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: insur_analytics
      POSTGRES_USER: insur_user
      POSTGRES_PASSWORD: insur_secret_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U insur_user -d insur_analytics"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.12.1
    ports:
      - "5001:5000"
    environment:
      MLFLOW_BACKEND_STORE_URI: postgresql://insur_user:insur_secret_password@postgres:5432/insur_analytics
      MLFLOW_DEFAULT_ARTIFACT_ROOT: /mlartifacts
    volumes:
      - mlartifacts:/mlartifacts
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      mlflow server
      --host 0.0.0.0
      --port 5000
      --backend-store-uri postgresql://insur_user:insur_secret_password@postgres:5432/insur_analytics
      --default-artifact-root /mlartifacts

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: insur_analytics
      POSTGRES_USER: insur_user
      POSTGRES_PASSWORD: insur_secret_password
      REDIS_HOST: redis
      REDIS_PORT: 6379
      MLFLOW_TRACKING_URI: http://mlflow:5000
      CORS_ORIGINS: http://localhost:3000
    volumes:
      - ./backend:/app
      - ./data:/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A workers.celery_app worker --loglevel=info
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: insur_analytics
      POSTGRES_USER: insur_user
      POSTGRES_PASSWORD: insur_secret_password
      REDIS_HOST: redis
      REDIS_PORT: 6379
      MLFLOW_TRACKING_URI: http://mlflow:5000
    volumes:
      - ./backend:/app
      - ./data:/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
  mlartifacts:
```

- [ ] **Step 2: Create backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --no-create-home appuser
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 3: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile
git commit -m "feat: add Docker Compose with PostgreSQL, Redis, MLflow, backend, worker, frontend"
```

---

### Task 3: Backend requirements and core config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/core/__init__.py`
- Create: `backend/core/config.py`

- [ ] **Step 1: Create backend/requirements.txt**

```
# Web framework
fastapi>=0.110.0,<1.0.0
uvicorn[standard]>=0.27.0,<1.0.0
python-multipart>=0.0.9,<1.0.0

# Database
psycopg2-binary>=2.9.9,<3.0.0

# Task queue
celery[redis]>=5.3.0,<6.0.0

# ML
scikit-learn>=1.4.0,<2.0.0
xgboost>=2.0.0,<3.0.0
prophet>=1.1.5,<2.0.0
pandas>=2.2.0,<3.0.0
numpy>=1.26.0,<2.0.0

# MLflow
mlflow>=2.12.0,<3.0.0

# NLP
spacy>=3.7.0,<4.0.0

# Utilities
pydantic>=2.6.0,<3.0.0
pydantic-settings>=2.1.0,<3.0.0
python-dotenv>=1.0.0,<2.0.0
httpx>=0.27.0,<1.0.0

# Security
python-jose[cryptography]>=3.3.0,<4.0.0

# Testing
pytest>=8.0.0,<9.0.0
pytest-asyncio>=0.23.0,<1.0.0
```

- [ ] **Step 2: Create backend/core/__init__.py**

Empty file.

- [ ] **Step 3: Create backend/core/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "insur_analytics"
    postgres_user: str = "insur_user"
    postgres_password: str = "insur_secret_password"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5001"

    # App
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    project_api_key: str = ""
    cors_origins: str = "http://localhost:3000"

    # Rate limiting
    rate_limit_api: int = 100
    rate_limit_upload: int = 10

    # Data
    data_dir: str = "/data"
    kaggle_dir: str = "/data/kaggle"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_prefix": "", "case_sensitive": False}


def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add backend requirements and Pydantic config"
```

---

### Task 4: Backend core — exceptions, middleware, logging

**Files:**
- Create: `backend/core/exceptions.py`
- Create: `backend/core/error_handlers.py`
- Create: `backend/core/middleware.py`
- Create: `backend/core/logging_config.py`
- Create: `backend/core/dependencies.py`
- Create: `backend/core/utils.py`

- [ ] **Step 1: Create backend/core/exceptions.py**

```python
class AppError(Exception):
    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND")


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, "VALIDATION_ERROR")


class DataError(AppError):
    def __init__(self, message: str = "Data error"):
        super().__init__(message, "DATA_ERROR")


class ModelError(AppError):
    def __init__(self, message: str = "Model error"):
        super().__init__(message, "MODEL_ERROR")


class ExternalServiceError(AppError):
    def __init__(self, message: str = "External service unavailable"):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR")
```

- [ ] **Step 2: Create backend/core/error_handlers.py**

```python
import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from core.exceptions import AppError, NotFoundError, ValidationError

logger = logging.getLogger(__name__)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    status_map = {
        "NOT_FOUND": 404,
        "VALIDATION_ERROR": 422,
        "DATA_ERROR": 400,
        "MODEL_ERROR": 500,
        "EXTERNAL_SERVICE_ERROR": 503,
        "INTERNAL_ERROR": 500,
    }
    status_code = status_map.get(exc.error_code, 500)
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error("AppError: %s [%s] correlation_id=%s", exc.message, exc.error_code, correlation_id)
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": exc.message,
            "error_code": exc.error_code,
            "correlation_id": correlation_id,
        },
    )
```

- [ ] **Step 3: Create backend/core/middleware.py**

```python
import time
import uuid
import logging
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = now - 60
        self._requests[client_ip] = [t for t in self._requests[client_ip] if t > window]
        if len(self._requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests", "error_code": "RATE_LIMITED"},
                headers={"Retry-After": "60"},
            )
        self._requests[client_ip].append(now)
        return await call_next(request)
```

- [ ] **Step 4: Create backend/core/logging_config.py**

```python
import json
import logging
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", None),
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging(level: str = "INFO", json_format: bool = True):
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    handler = logging.StreamHandler(sys.stdout)
    if json_format:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    for noisy in ("httpx", "httpcore", "uvicorn.access", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
```

- [ ] **Step 5: Create backend/core/dependencies.py**

```python
import psycopg2
from contextlib import contextmanager
from functools import lru_cache

from core.config import Settings, get_settings


@lru_cache
def get_cached_settings() -> Settings:
    return get_settings()


@contextmanager
def get_db_connection():
    settings = get_cached_settings()
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
    finally:
        conn.close()
```

- [ ] **Step 6: Create backend/core/utils.py**

```python
import re


def sanitize_table_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "", name)
```

- [ ] **Step 7: Commit**

```bash
git add backend/core/
git commit -m "feat: add backend core — exceptions, middleware, logging, dependencies"
```

---

### Task 5: Database setup and migrations

**Files:**
- Create: `backend/__init__.py`
- Create: `backend/database.py`
- Create: `backend/migrations/001_initial.sql`
- Create: `backend/migrations/002_seed_data.sql`

- [ ] **Step 1: Create backend/database.py**

```python
import os
import logging
import psycopg2
from core.config import get_settings

logger = logging.getLogger(__name__)


def run_migrations():
    settings = get_settings()
    conn = psycopg2.connect(settings.database_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT NOW()
        )
    """)

    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        logger.warning("No migrations directory found")
        cur.close()
        conn.close()
        return

    migration_files = sorted(
        f for f in os.listdir(migrations_dir) if f.endswith(".sql")
    )

    for filename in migration_files:
        cur.execute("SELECT 1 FROM _migrations WHERE filename = %s", (filename,))
        if cur.fetchone():
            continue

        filepath = os.path.join(migrations_dir, filename)
        with open(filepath) as f:
            sql = f.read()

        logger.info("Applying migration: %s", filename)
        cur.execute(sql)
        cur.execute("INSERT INTO _migrations (filename) VALUES (%s)", (filename,))
        logger.info("Migration applied: %s", filename)

    cur.close()
    conn.close()
```

- [ ] **Step 2: Create backend/migrations/001_initial.sql**

```sql
-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    route VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Processes
CREATE TABLE IF NOT EXISTS processes (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    inputs TEXT,
    outputs TEXT,
    pain_points TEXT,
    kpi VARCHAR(200),
    data_needed TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_processes_department ON processes(department_id);

-- AI Mappings
CREATE TABLE IF NOT EXISTS ai_mappings (
    id SERIAL PRIMARY KEY,
    process_id INTEGER REFERENCES processes(id) ON DELETE CASCADE,
    ai_type VARCHAR(20) NOT NULL,
    use_case TEXT,
    example_output TEXT
);
CREATE INDEX idx_ai_mappings_process ON ai_mappings(process_id);

-- Datasets
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    kaggle_url VARCHAR(500),
    description TEXT,
    columns_info JSONB,
    file_path VARCHAR(500),
    data_type VARCHAR(50) DEFAULT 'csv',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dataset-Department mapping (shared data foundation)
CREATE TABLE IF NOT EXISTS dataset_departments (
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, department_id)
);

-- Sales fact table (star schema)
CREATE TABLE IF NOT EXISTS sales_fact (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    store_id INTEGER,
    product_id INTEGER,
    sales_qty NUMERIC(12,2),
    revenue NUMERIC(14,2),
    promo_flag BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_sales_fact_date ON sales_fact(date);
CREATE INDEX idx_sales_fact_store ON sales_fact(store_id);
CREATE INDEX idx_sales_fact_product ON sales_fact(product_id);

-- Product dimension
CREATE TABLE IF NOT EXISTS product_dim (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    category VARCHAR(100),
    brand VARCHAR(100),
    price NUMERIC(10,2)
);

-- Store dimension
CREATE TABLE IF NOT EXISTS store_dim (
    store_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    location VARCHAR(200),
    region VARCHAR(100),
    store_type VARCHAR(50)
);

-- External features
CREATE TABLE IF NOT EXISTS external_features (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    holiday_flag BOOLEAN DEFAULT FALSE,
    event_type VARCHAR(100),
    oil_price NUMERIC(8,2)
);
CREATE INDEX idx_external_date ON external_features(date);

-- Forecast output
CREATE TABLE IF NOT EXISTS forecast_output (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    store_id INTEGER,
    product_id INTEGER,
    predicted_sales NUMERIC(12,2),
    confidence_lower NUMERIC(12,2),
    confidence_upper NUMERIC(12,2),
    model_version VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_forecast_date ON forecast_output(date);

-- Demand correction (stockout handling)
CREATE TABLE IF NOT EXISTS demand_correction (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    store_id INTEGER,
    product_id INTEGER,
    actual_sales NUMERIC(12,2),
    predicted_demand NUMERIC(12,2),
    corrected_demand NUMERIC(12,2),
    stockout_flag BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_demand_correction_date ON demand_correction(date);

-- Forecast versions
CREATE TABLE IF NOT EXISTS forecast_versions (
    id SERIAL PRIMARY KEY,
    version_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Forecast overrides
CREATE TABLE IF NOT EXISTS forecast_overrides (
    id SERIAL PRIMARY KEY,
    forecast_id INTEGER,
    original_value NUMERIC(12,2),
    override_value NUMERIC(12,2),
    reason TEXT,
    planner_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ML models
CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    process_id INTEGER REFERENCES processes(id),
    dataset_id INTEGER REFERENCES datasets(id),
    name VARCHAR(200) NOT NULL,
    algorithm VARCHAR(100),
    status VARCHAR(20) DEFAULT 'created',
    mlflow_run_id VARCHAR(100),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ml_models_department ON ml_models(department_id);
CREATE INDEX idx_ml_models_status ON ml_models(status);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ml_models(id),
    job_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    celery_task_id VARCHAR(200),
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Model drift tracking
CREATE TABLE IF NOT EXISTS model_drift (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ml_models(id),
    metric_name VARCHAR(50),
    baseline_value NUMERIC(10,4),
    current_value NUMERIC(10,4),
    drift_score NUMERIC(10,4),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ROI metrics
CREATE TABLE IF NOT EXISTS roi_metrics (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    benefit_area VARCHAR(200),
    impact_range VARCHAR(100),
    description TEXT,
    measurement_method TEXT
);

-- Pipeline logs
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(100),
    status VARCHAR(20),
    error_message TEXT,
    runtime_seconds NUMERIC(8,2),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_pipeline_logs_status ON pipeline_logs(status);

-- Model metrics
CREATE TABLE IF NOT EXISTS model_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(200),
    mape NUMERIC(8,4),
    rmse NUMERIC(12,4),
    bias NUMERIC(10,4),
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 3: Commit**

```bash
git add backend/database.py backend/migrations/ backend/__init__.py
git commit -m "feat: add database setup with star schema and enterprise tables"
```

---

## Phase 2: Frontend Shell — React + Vite + Native CSS + Left Sidebar

### Task 6: Initialize React + Vite frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Initialize Vite React project**

```bash
cd /mnt/deepa/insur
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom recharts
```

- [ ] **Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: initialize React + Vite frontend"
```

---

### Task 7: Global CSS with native CSS variables

**Files:**
- Create: `frontend/src/styles/global.css`
- Create: `frontend/src/styles/sidebar.css`
- Create: `frontend/src/styles/topbar.css`
- Create: `frontend/src/styles/content.css`
- Create: `frontend/src/styles/cards.css`
- Create: `frontend/src/styles/tables.css`
- Create: `frontend/src/styles/charts.css`
- Create: `frontend/src/styles/tabs.css`

- [ ] **Step 1: Create frontend/src/styles/global.css**

```css
/* Insur Analytics Dashboard — Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Backgrounds */
  --bg-page: #ffffff;
  --bg-card: #ffffff;
  --bg-sidebar: #16162a;
  --bg-topbar: #1b1b32;
  --bg-hover: #f3f4f6;
  --bg-active: #1e1e3a;

  /* Text */
  --text-primary: #1a1a2e;
  --text-secondary: #6b7280;
  --text-sidebar: #e2e8f0;
  --text-sidebar-active: #ffffff;
  --text-muted: #9ca3af;

  /* Accents */
  --accent-primary: #3b82f6;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;
  --accent-purple: #8b5cf6;
  --accent-pink: #ec4899;

  /* Borders */
  --border-color: #e5e7eb;
  --border-radius: 8px;
  --border-radius-sm: 4px;
  --border-radius-lg: 12px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* Layout */
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --topbar-height: 56px;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-page);
  color: var(--text-primary);
  line-height: 1.6;
}

a {
  text-decoration: none;
  color: inherit;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  margin-top: var(--topbar-height);
  padding: var(--spacing-lg);
  background-color: var(--bg-page);
  min-height: calc(100vh - var(--topbar-height));
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
```

- [ ] **Step 2: Create frontend/src/styles/sidebar.css**

```css
/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--bg-sidebar);
  color: var(--text-sidebar);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow-y: auto;
}

.sidebar-header {
  padding: var(--spacing-md) var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  height: var(--topbar-height);
}

.sidebar-header h2 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-sidebar-active);
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm) 0;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-sidebar);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.sidebar-nav-item:hover {
  background-color: var(--bg-active);
  color: var(--text-sidebar-active);
}

.sidebar-nav-item.active {
  background-color: var(--accent-primary);
  color: var(--text-sidebar-active);
  font-weight: 500;
}

.sidebar-nav-item .icon {
  font-size: var(--font-size-lg);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-nav-item .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-section-title {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-xs);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
```

- [ ] **Step 3: Create frontend/src/styles/topbar.css**

```css
/* Topbar */
.topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--topbar-height);
  background-color: var(--bg-topbar);
  color: var(--text-sidebar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  z-index: 99;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.topbar-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.topbar-badge {
  background-color: var(--accent-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: 500;
}
```

- [ ] **Step 4: Create frontend/src/styles/content.css**

```css
/* Content area */
.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-card);
}

.kpi-card-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-xs);
}

.kpi-card-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.kpi-card-change {
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.kpi-card-change.positive {
  color: var(--accent-success);
}

.kpi-card-change.negative {
  color: var(--accent-danger);
}

/* Section */
.section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--border-color);
}
```

- [ ] **Step 5: Create frontend/src/styles/cards.css**

```css
/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
}

.card-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: var(--spacing-md);
}

.card-footer {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-hover);
  border-top: 1px solid var(--border-color);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Card grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-md);
}

/* AI Type badges */
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.ai-badge.ml { background: #dbeafe; color: #1d4ed8; }
.ai-badge.dl { background: #ede9fe; color: #6d28d9; }
.ai-badge.cv { background: #fce7f3; color: #be185d; }
.ai-badge.nlp { background: #d1fae5; color: #065f46; }
.ai-badge.rag { background: #fef3c7; color: #92400e; }
.ai-badge.rpa { background: #fee2e2; color: #991b1b; }
.ai-badge.n8n { background: #e0e7ff; color: #3730a3; }
.ai-badge.physical { background: #f3f4f6; color: #374151; }
```

- [ ] **Step 6: Create frontend/src/styles/tables.css**

```css
/* Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.data-table thead {
  background-color: var(--bg-hover);
}

.data-table th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border-color);
}

.data-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.data-table tbody tr:hover {
  background-color: var(--bg-hover);
}

.data-table .status-active {
  color: var(--accent-success);
  font-weight: 500;
}

.data-table .status-warning {
  color: var(--accent-warning);
  font-weight: 500;
}

.data-table .status-error {
  color: var(--accent-danger);
  font-weight: 500;
}
```

- [ ] **Step 7: Create frontend/src/styles/tabs.css**

```css
/* Tabs */
.tabs {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: var(--spacing-lg);
  gap: 0;
}

.tab {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  font-weight: 600;
}

.tab-content {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 8: Create frontend/src/styles/charts.css**

```css
/* Chart containers */
.chart-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-card);
}

.chart-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

/* Chart grid layouts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.charts-grid.single {
  grid-template-columns: 1fr;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/styles/
git commit -m "feat: add native CSS design system — sidebar, topbar, cards, tables, tabs, charts"
```

---

### Task 8: Sidebar component with 12 navigation items

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/Topbar.jsx`
- Create: `frontend/src/components/Layout.jsx`
- Create: `frontend/src/data/departments.js`

- [ ] **Step 1: Create frontend/src/data/departments.js**

```javascript
export const departments = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '\ud83d\udcca',
    route: '/',
    color: '#3b82f6',
    description: 'Enterprise overview with cross-department KPIs',
  },
  {
    id: 'sales',
    name: 'Sales & Demand',
    icon: '\ud83d\uded2',
    route: '/sales',
    color: '#10b981',
    description: 'Demand forecasting, promotion planning, sales prediction',
    processes: 10,
    aiTypes: ['ML', 'DL', 'NLP', 'RAG', 'RPA', 'n8n'],
    kaggle: 'Store Sales Time Series Forecasting',
    roi: '10-20% forecast accuracy improvement',
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    icon: '\ud83d\udce6',
    route: '/supply-chain',
    color: '#f59e0b',
    description: 'Inventory optimization, replenishment, stock balancing',
    processes: 6,
    aiTypes: ['ML', 'DL', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Inventory Forecasting Dataset',
    roi: '15-25% stockout reduction',
  },
  {
    id: 'logistics',
    name: 'Logistics',
    icon: '\ud83d\ude9a',
    route: '/logistics',
    color: '#ef4444',
    description: 'Route planning, shipment scheduling, delivery tracking',
    processes: 6,
    aiTypes: ['ML', 'DL', 'CV', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Supply Chain Logistics Dataset',
    roi: '10-15% logistics cost saving',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: '\ud83c\udfed',
    route: '/manufacturing',
    color: '#8b5cf6',
    description: 'Production planning, batch scheduling, yield optimization',
    processes: 6,
    aiTypes: ['ML', 'DL', 'CV', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Industrial Sensor Dataset',
    roi: '10-20% efficiency gain',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: '\ud83d\udee0\ufe0f',
    route: '/maintenance',
    color: '#06b6d4',
    description: 'Predictive maintenance, equipment monitoring, downtime tracking',
    processes: 5,
    aiTypes: ['ML', 'DL', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Predictive Maintenance Dataset',
    roi: '20-30% downtime reduction',
  },
  {
    id: 'retail',
    name: 'Retail',
    icon: '\ud83c\udfec',
    route: '/retail',
    color: '#ec4899',
    description: 'Shelf optimization, product assortment, store analytics',
    processes: 5,
    aiTypes: ['ML', 'DL', 'CV', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Retail Transaction Dataset',
    roi: '5-15% sales uplift',
  },
  {
    id: 'customer',
    name: 'Customer Analytics',
    icon: '\ud83d\udc65',
    route: '/customer',
    color: '#14b8a6',
    description: 'Segmentation, personalization, CLV, churn prediction',
    processes: 5,
    aiTypes: ['ML', 'DL', 'NLP', 'RAG', 'RPA', 'n8n'],
    kaggle: 'Customer Segmentation Dataset',
    roi: '10-25% conversion increase',
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: '\ud83d\udcb0',
    route: '/finance',
    color: '#eab308',
    description: 'Revenue analysis, profitability, budgeting, cost tracking',
    processes: 5,
    aiTypes: ['ML', 'DL', 'NLP', 'RAG', 'RPA', 'n8n'],
    kaggle: 'Retail Financial Proxy Dataset',
    roi: 'Better decision-making',
  },
  {
    id: 'procurement',
    name: 'Procurement',
    icon: '\ud83e\uddfe',
    route: '/procurement',
    color: '#a855f7',
    description: 'Supplier selection, contract management, vendor evaluation',
    processes: 5,
    aiTypes: ['ML', 'NLP', 'RAG', 'RPA', 'n8n'],
    kaggle: 'Supply Chain Dataset',
    roi: '5-10% cost reduction',
  },
  {
    id: 'quality',
    name: 'Quality Control',
    icon: '\u26a0\ufe0f',
    route: '/quality',
    color: '#f97316',
    description: 'Defect detection, quality inspection, batch validation',
    processes: 5,
    aiTypes: ['CV', 'DL', 'NLP', 'RAG', 'RPA', 'n8n', 'Physical AI'],
    kaggle: 'Defect Detection Dataset',
    roi: 'Significant defect reduction',
  },
  {
    id: 'governance',
    name: 'Governance',
    icon: '\ud83e\udde0',
    route: '/governance',
    color: '#64748b',
    description: 'Regulatory compliance, audit, risk assessment, data governance',
    processes: 5,
    aiTypes: ['ML', 'NLP', 'RAG', 'RPA', 'n8n'],
    kaggle: 'Food Safety Dataset',
    roi: 'Reduced compliance violations',
  },
];
```

- [ ] **Step 2: Create frontend/src/components/Sidebar.jsx**

```jsx
import { NavLink } from 'react-router-dom';
import { departments } from '../data/departments';
import '../styles/sidebar.css';

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-header">
        <span style={{ fontSize: '1.5rem' }}>{'\ud83c\udfed'}</span>
        <h2>Insur Analytics</h2>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Modules</div>
        {departments.map((dept) => (
          <NavLink
            key={dept.id}
            to={dept.route}
            end={dept.route === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            aria-label={dept.name}
          >
            <span className="icon">{dept.icon}</span>
            <span className="label">{dept.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        BEV Enterprise v1.0
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create frontend/src/components/Topbar.jsx**

```jsx
import { useLocation } from 'react-router-dom';
import { departments } from '../data/departments';
import '../styles/topbar.css';

export default function Topbar() {
  const location = useLocation();
  const current = departments.find(
    (d) => d.route === location.pathname
  ) || departments[0];

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span>{current.icon}</span> {current.name}
      </div>
      <div className="topbar-actions">
        <span className="topbar-badge">11 Departments</span>
        <span className="topbar-badge">100+ Processes</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/Layout.jsx**

```jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ frontend/src/data/
git commit -m "feat: add sidebar, topbar, layout components with 12 navigation modules"
```

---

### Task 9: Department page component with 6 tabs

**Files:**
- Create: `frontend/src/components/DepartmentPage.jsx`
- Create: `frontend/src/components/tabs/OverviewTab.jsx`
- Create: `frontend/src/components/tabs/ProcessesTab.jsx`
- Create: `frontend/src/components/tabs/AIStackTab.jsx`
- Create: `frontend/src/components/tabs/DataTab.jsx`
- Create: `frontend/src/components/tabs/ModelsTab.jsx`
- Create: `frontend/src/components/tabs/ROITab.jsx`

- [ ] **Step 1: Create frontend/src/components/DepartmentPage.jsx**

```jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { departments } from '../data/departments';
import OverviewTab from './tabs/OverviewTab';
import ProcessesTab from './tabs/ProcessesTab';
import AIStackTab from './tabs/AIStackTab';
import DataTab from './tabs/DataTab';
import ModelsTab from './tabs/ModelsTab';
import ROITab from './tabs/ROITab';
import '../styles/tabs.css';
import '../styles/content.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'processes', label: 'Processes' },
  { id: 'ai-stack', label: 'AI Stack' },
  { id: 'data', label: 'Data' },
  { id: 'models', label: 'Models' },
  { id: 'roi', label: 'ROI' },
];

export default function DepartmentPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const dept = departments.find((d) => d.id === departmentId);

  if (!dept) {
    return <div className="page-header"><h1 className="page-title">Department not found</h1></div>;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab department={dept} />;
      case 'processes': return <ProcessesTab department={dept} />;
      case 'ai-stack': return <AIStackTab department={dept} />;
      case 'data': return <DataTab department={dept} />;
      case 'models': return <ModelsTab department={dept} />;
      case 'roi': return <ROITab department={dept} />;
      default: return <OverviewTab department={dept} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{dept.icon} {dept.name}</h1>
        <p className="page-subtitle">{dept.description}</p>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {renderTab()}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create all 6 tab components**

Each tab component receives `department` as prop and renders department-specific content using the process/AI/data/model/ROI data from the department data files (to be created per department in Task 10+).

Create `frontend/src/components/tabs/OverviewTab.jsx`:

```jsx
import '../styles/../styles/content.css';
import '../styles/../styles/cards.css';

export default function OverviewTab({ department }) {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-label">Processes</div>
          <div className="kpi-card-value">{department.processes || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">AI Types</div>
          <div className="kpi-card-value">{department.aiTypes?.length || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Kaggle Dataset</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-sm)' }}>{department.kaggle || 'N/A'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Expected ROI</div>
          <div className="kpi-card-value" style={{ fontSize: 'var(--font-size-sm)' }}>{department.roi || 'N/A'}</div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">AI Technologies</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {department.aiTypes?.map((type) => (
            <span key={type} className={`ai-badge ${type.toLowerCase().replace(' ', '')}`}>
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Department Description</h3>
        <p>{department.description}</p>
      </div>
    </div>
  );
}
```

Create `frontend/src/components/tabs/ProcessesTab.jsx`:

```jsx
import { departmentProcesses } from '../../data/processes';
import '../../styles/tables.css';

export default function ProcessesTab({ department }) {
  const processes = departmentProcesses[department.id] || [];

  return (
    <div className="section">
      <h3 className="section-title">Processes ({processes.length})</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Description</th>
            <th>Inputs</th>
            <th>Outputs</th>
            <th>KPI</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((p, i) => (
            <tr key={i}>
              <td><strong>{p.name}</strong></td>
              <td>{p.description}</td>
              <td>{p.inputs}</td>
              <td>{p.outputs}</td>
              <td>{p.kpi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `frontend/src/components/tabs/AIStackTab.jsx`:

```jsx
import { departmentAIStack } from '../../data/aiStack';
import '../../styles/cards.css';

export default function AIStackTab({ department }) {
  const stack = departmentAIStack[department.id] || [];

  return (
    <div className="section">
      <h3 className="section-title">AI Stack Mapping</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>AI Type</th>
            <th>Use Case</th>
            <th>Example Output</th>
          </tr>
        </thead>
        <tbody>
          {stack.map((item, i) => (
            <tr key={i}>
              <td><span className={`ai-badge ${item.type.toLowerCase().replace(' ', '')}`}>{item.type}</span></td>
              <td>{item.useCase}</td>
              <td>{item.exampleOutput}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `frontend/src/components/tabs/DataTab.jsx`:

```jsx
import { departmentDatasets } from '../../data/datasets';

export default function DataTab({ department }) {
  const data = departmentDatasets[department.id] || {};

  return (
    <div>
      <div className="section">
        <h3 className="section-title">Kaggle Dataset</h3>
        <div className="card">
          <div className="card-header">{data.name || department.kaggle}</div>
          <div className="card-body">
            <p><strong>Description:</strong> {data.description || 'Kaggle dataset for this department'}</p>
            <p><strong>Data Type:</strong> {data.dataType || 'CSV'}</p>
            {data.columns && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <strong>Key Columns:</strong>
                <ul>
                  {data.columns.map((col, i) => (
                    <li key={i}>{col}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Shared Data Foundation</h3>
        <p>This dataset is shared across multiple departments to enable cross-functional analytics.</p>
      </div>
    </div>
  );
}
```

Create `frontend/src/components/tabs/ModelsTab.jsx`:

```jsx
import { departmentModels } from '../../data/models';
import '../../styles/cards.css';

export default function ModelsTab({ department }) {
  const models = departmentModels[department.id] || [];

  return (
    <div>
      <div className="section">
        <h3 className="section-title">ML Models</h3>
        <div className="card-grid">
          {models.map((model, i) => (
            <div key={i} className="card">
              <div className="card-header">{model.name}</div>
              <div className="card-body">
                <p><strong>Algorithm:</strong> {model.algorithm}</p>
                <p><strong>Use Case:</strong> {model.useCase}</p>
                <p><strong>Status:</strong> <span className={`status-${model.status === 'ready' ? 'active' : 'warning'}`}>{model.status}</span></p>
                {model.metrics && (
                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                    <strong>Metrics:</strong>
                    <ul>
                      {Object.entries(model.metrics).map(([k, v]) => (
                        <li key={k}>{k}: {v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Create `frontend/src/components/tabs/ROITab.jsx`:

```jsx
import { departmentROI } from '../../data/roi';

export default function ROITab({ department }) {
  const roi = departmentROI[department.id] || [];

  return (
    <div>
      <div className="section">
        <h3 className="section-title">Business Impact & ROI</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Benefit Area</th>
              <th>Impact Range</th>
              <th>Description</th>
              <th>How to Measure</th>
            </tr>
          </thead>
          <tbody>
            {roi.map((r, i) => (
              <tr key={i}>
                <td><strong>{r.area}</strong></td>
                <td>{r.impact}</td>
                <td>{r.description}</td>
                <td>{r.measurement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add DepartmentPage with 6 tab components — overview, processes, AI, data, models, ROI"
```

---

### Task 10: Department data files (all 11 departments)

**Files:**
- Create: `frontend/src/data/processes.js`
- Create: `frontend/src/data/aiStack.js`
- Create: `frontend/src/data/datasets.js`
- Create: `frontend/src/data/models.js`
- Create: `frontend/src/data/roi.js`

These files contain the complete reference data for all 11 departments — processes, AI mappings, dataset info, model definitions, and ROI metrics. Each file exports an object keyed by department ID.

- [ ] **Step 1: Create all 5 data files with full department data**

(Each file contains complete data for all 11 departments. Files are large but contain only static reference data — the knowledge portal content.)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/data/
git commit -m "feat: add department reference data — processes, AI stack, datasets, models, ROI for all 11 departments"
```

---

### Task 11: Dashboard home page

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create Dashboard.jsx**

```jsx
import { departments } from '../data/departments';
import { Link } from 'react-router-dom';
import '../styles/content.css';
import '../styles/cards.css';

export default function Dashboard() {
  const depts = departments.filter((d) => d.id !== 'dashboard');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Insur Analytics Dashboard</h1>
        <p className="page-subtitle">
          Enterprise-grade analytics across 11 departments, 100+ processes, 8 AI types
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-label">Departments</div>
          <div className="kpi-card-value">11</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Total Processes</div>
          <div className="kpi-card-value">120+</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">AI Types</div>
          <div className="kpi-card-value">8</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Kaggle Datasets</div>
          <div className="kpi-card-value">10+</div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Department Modules</h3>
        <div className="card-grid">
          {depts.map((dept) => (
            <Link key={dept.id} to={dept.route}>
              <div className="card">
                <div className="card-header">
                  <span>{dept.icon} {dept.name}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {dept.processes} processes
                  </span>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                    {dept.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dept.aiTypes?.map((type) => (
                      <span key={type} className={`ai-badge ${type.toLowerCase().replace(' ', '')}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-footer">
                  ROI: {dept.roi}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: add Dashboard home page with department cards grid"
```

---

### Task 12: React Router setup with all routes

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Update App.jsx with routing**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DepartmentPage from './components/DepartmentPage';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/content.css';
import './styles/cards.css';
import './styles/tables.css';
import './styles/tabs.css';
import './styles/charts.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/:departmentId" element={<DepartmentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Update main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx
git commit -m "feat: add React Router with Layout, Dashboard, and department routes"
```

---

## Phase 3: Backend API + Seed Data

### Task 13: FastAPI main app with middleware stack

**Files:**
- Create: `backend/main.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/routers/departments.py`
- Create: `backend/routers/health.py`

- [ ] **Step 1: Create backend/main.py**

FastAPI app with middleware stack, error handlers, CORS, GZip, lifespan for DB migration.

- [ ] **Step 2: Create health and department routers**

- [ ] **Step 3: Commit**

```bash
git add backend/main.py backend/routers/
git commit -m "feat: add FastAPI app with middleware stack, health check, departments API"
```

---

### Task 14: Seed data — departments, processes, AI mappings, ROI

**Files:**
- Create: `backend/seeds/departments.json`
- Create: `backend/seeds/processes.json`
- Create: `backend/seeds/ai_mappings.json`
- Create: `backend/seeds/roi_metrics.json`
- Create: `backend/seeds/seed_runner.py`

- [ ] **Step 1: Create all JSON seed files with complete data for 11 departments**

- [ ] **Step 2: Create seed runner that loads JSON into PostgreSQL**

- [ ] **Step 3: Commit**

```bash
git add backend/seeds/
git commit -m "feat: add seed data — 11 departments, 120 processes, AI mappings, ROI metrics"
```

---

### Task 15: Repository layer

**Files:**
- Create: `backend/repositories/__init__.py`
- Create: `backend/repositories/base.py`
- Create: `backend/repositories/department_repo.py`
- Create: `backend/repositories/process_repo.py`
- Create: `backend/repositories/dataset_repo.py`
- Create: `backend/repositories/model_repo.py`
- Create: `backend/repositories/job_repo.py`

- [ ] **Step 1: Create base repository with connection context manager**
- [ ] **Step 2: Create all 5 domain repositories**
- [ ] **Step 3: Commit**

---

### Task 16: Schema layer

**Files:**
- Create: `backend/schemas/__init__.py`
- Create: `backend/schemas/common.py`
- Create: `backend/schemas/department.py`
- Create: `backend/schemas/process.py`
- Create: `backend/schemas/dataset.py`
- Create: `backend/schemas/model.py`
- Create: `backend/schemas/job.py`

- [ ] **Step 1: Create Pydantic schemas for all entities**
- [ ] **Step 2: Commit**

---

### Task 17: Service layer

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/department_service.py`
- Create: `backend/services/dataset_service.py`
- Create: `backend/services/ml_service.py`
- Create: `backend/services/job_service.py`

- [ ] **Step 1: Create service classes with constructor injection**
- [ ] **Step 2: Commit**

---

### Task 18: Remaining routers

**Files:**
- Create: `backend/routers/datasets.py`
- Create: `backend/routers/models.py`
- Create: `backend/routers/jobs.py`

- [ ] **Step 1: Create dataset, model, and job routers with pagination**
- [ ] **Step 2: Commit**

---

## Phase 4: Kaggle Data Download

### Task 19: Kaggle download scripts

**Files:**
- Create: `scripts/download_kaggle_data.py`
- Create: `data/kaggle/.gitkeep`

- [ ] **Step 1: Create download script for all 11 department datasets**

Downloads:
1. Store Sales Time Series Forecasting (CSV — Sales)
2. Inventory Forecasting Dataset (CSV — Supply Chain)
3. Supply Chain Logistics Dataset (CSV — Logistics)
4. Industrial Sensor Dataset (CSV — Manufacturing)
5. Predictive Maintenance Dataset (CSV — Maintenance)
6. Retail Transaction Dataset (CSV — Retail)
7. Customer Segmentation Dataset (CSV — Customer)
8. Financial Dataset proxy (CSV — Finance)
9. Supply Chain Dataset (CSV — Procurement)
10. Defect Detection Dataset (Images — Quality Control)
11. Food Safety Dataset (Text/CSV — Governance)

- [ ] **Step 2: Create data directory structure**

```
data/
├── kaggle/
│   ├── sales/          # CSV: store sales
│   ├── supply_chain/   # CSV: inventory
│   ├── logistics/      # CSV: logistics
│   ├── manufacturing/  # CSV: sensors
│   ├── maintenance/    # CSV: equipment
│   ├── retail/         # CSV: transactions
│   ├── customer/       # CSV: segmentation
│   ├── finance/        # CSV: financial
│   ├── procurement/    # CSV: supplier
│   ├── quality/        # Images: defect detection
│   └── governance/     # Text: food safety
```

- [ ] **Step 3: Commit**

```bash
git add scripts/ data/
git commit -m "feat: add Kaggle data download scripts for all 11 departments (CSV, image, text)"
```

---

## Phase 5: ML Pipelines

### Task 20: Celery worker setup

**Files:**
- Create: `backend/workers/__init__.py`
- Create: `backend/workers/celery_app.py`
- Create: `backend/workers/tasks.py`

- [ ] **Step 1: Create Celery app configuration**
- [ ] **Step 2: Create training and prediction tasks**
- [ ] **Step 3: Commit**

---

### Task 21: ML pipelines — demand forecasting (Sales)

**Files:**
- Create: `backend/ml/__init__.py`
- Create: `backend/ml/pipelines/__init__.py`
- Create: `backend/ml/pipelines/demand_forecast.py`
- Create: `backend/ml/features/__init__.py`
- Create: `backend/ml/features/time_features.py`

- [ ] **Step 1: Create time feature engineering** (lag, rolling avg, calendar features)
- [ ] **Step 2: Create XGBoost demand forecast pipeline**
- [ ] **Step 3: Create Prophet seasonal decomposition pipeline**
- [ ] **Step 4: Commit**

---

### Task 22: ML pipelines — remaining departments

**Files:**
- Create: `backend/ml/pipelines/inventory_optimizer.py`
- Create: `backend/ml/pipelines/customer_segmentation.py`
- Create: `backend/ml/pipelines/predictive_maintenance.py`
- Create: `backend/ml/pipelines/defect_detection.py`
- Create: `backend/ml/pipelines/sentiment_analysis.py`
- Create: `backend/ml/features/text_features.py`

- [ ] **Step 1: Create inventory optimizer** (stock prediction, reorder point)
- [ ] **Step 2: Create customer segmentation** (K-means clustering)
- [ ] **Step 3: Create predictive maintenance** (failure prediction, anomaly detection)
- [ ] **Step 4: Create defect detection** (CNN classifier for images)
- [ ] **Step 5: Create sentiment analysis** (NLP pipeline for text)
- [ ] **Step 6: Commit**

---

## Phase 6: Advanced Frontend Features

### Task 23: Forecast dashboard UI (Sales department)

**Files:**
- Create: `frontend/src/components/charts/ForecastChart.jsx`
- Create: `frontend/src/components/charts/AccuracyChart.jsx`
- Create: `frontend/src/components/charts/AlertsList.jsx`

- [ ] **Step 1: Create forecast chart** (actual vs predicted with Recharts)
- [ ] **Step 2: Create accuracy dashboard** (MAPE/WAPE gauges)
- [ ] **Step 3: Create alerts list** (exception/anomaly display)
- [ ] **Step 4: Commit**

---

### Task 24: Scenario simulation UI

**Files:**
- Create: `frontend/src/components/simulation/ScenarioSimulator.jsx`
- Create: `frontend/src/components/simulation/WhatIfSliders.jsx`

- [ ] **Step 1: Create what-if sliders** (price, promo depth, season)
- [ ] **Step 2: Create scenario comparison view**
- [ ] **Step 3: Commit**

---

### Task 25: RAG chat UI

**Files:**
- Create: `frontend/src/components/chat/RAGChat.jsx`

- [ ] **Step 1: Create RAG chat interface** with message history
- [ ] **Step 2: Connect to backend explanation endpoint**
- [ ] **Step 3: Commit**

---

## Phase 7: Integration & Testing

### Task 26: Connect frontend to backend API

**Files:**
- Create: `frontend/src/services/api.js`

- [ ] **Step 1: Create API client** with error handling, timeout, base URL from env
- [ ] **Step 2: Wire department pages to fetch from API**
- [ ] **Step 3: Commit**

---

### Task 27: Backend tests

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_departments.py`

- [ ] **Step 1: Create test fixtures**
- [ ] **Step 2: Create health and department API tests**
- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

## Phase 8: Polish & Documentation

### Task 28: Final wiring and smoke test

- [ ] **Step 1: Run docker-compose up --build**
- [ ] **Step 2: Verify all 12 sidebar items navigate correctly**
- [ ] **Step 3: Verify all 6 tabs render on each department page**
- [ ] **Step 4: Verify API endpoints return data**
- [ ] **Step 5: Commit any fixes**

---

### Task 29: Seed migration for department data

**Files:**
- Create: `backend/migrations/002_seed_data.sql`

- [ ] **Step 1: Insert all 11 departments into departments table**
- [ ] **Step 2: Insert all processes per department**
- [ ] **Step 3: Insert AI mappings**
- [ ] **Step 4: Insert ROI metrics**
- [ ] **Step 5: Commit**

---
