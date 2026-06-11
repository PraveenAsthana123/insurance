#!/usr/bin/env bash
# Iter 102 · proper backend start with explicit env + cd
set -e
export TZ='America/Edmonton'
export BEV_POSTGRES_HOST=localhost
export BEV_POSTGRES_PORT=5434
export BEV_POSTGRES_USER=insur_user
export BEV_POSTGRES_PASSWORD=insur_secret_password
export BEV_POSTGRES_DB=insur_analytics
export INSUR_SKIP_MIGRATIONS=1
export INSUR_DISABLE_PRESIDIO=1
export TF_CPP_MIN_LOG_LEVEL=3
export PYTHONPATH=/mnt/deepa/insur_project/backend:/mnt/deepa/insur_project

cd /mnt/deepa/insur_project
exec /media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python \
  -m uvicorn backend.main:create_app --factory --host 0.0.0.0 --port 8001
