#!/usr/bin/env bash
# run_local_backend.sh — start uvicorn locally with proper env + path.
# Bypasses the Docker buildkit deadlock · uses cuda venv per §61.
# Postgres on host 5434 (compose port-shifted because host 5432 is owned by system pg).
# Some routers do `from backend.core...` imports, so we run from project root
# with backend on PYTHONPATH (not via --app-dir).

set -euo pipefail
cd "$(dirname "$0")/.."

export BEV_POSTGRES_HOST=localhost
export BEV_POSTGRES_PORT=5434
export BEV_POSTGRES_USER=insur_user
export BEV_POSTGRES_PASSWORD=insur_secret_password
export BEV_POSTGRES_DB=insur_analytics
export BEV_REDIS_HOST=localhost
export BEV_REDIS_PORT=6379
export INSUR_SKIP_MIGRATIONS=1

# Project root on PYTHONPATH so `from backend.core...` works.
export PYTHONPATH="$(pwd):$(pwd)/backend"

PT=/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python
exec "$PT" -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --log-level info
