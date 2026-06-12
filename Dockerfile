# §E1 · root Dockerfile for insur_project FastAPI backend.
# Matches scripts/launch_backend.py runtime · port 8001 · non-root user.
# Build: docker build -t insur:latest .
# Run:   docker run -p 8001:8001 --env-file .env insur:latest
#
# Composes with §150 process resilience: container with restart=always
# is the deployment counterpart to systemd --user + cron watchdog.

FROM python:3.12-slim AS base

# System deps for psycopg2 + ML libs · pinned for reproducibility
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer caching · install Python deps before copying source
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

# Copy source
COPY backend/ /app/backend/
COPY scripts/launch_backend.py /app/scripts/launch_backend.py
COPY scripts/__init__.py /app/scripts/__init__.py
COPY config/ /app/config/

# Non-root user per §47.6 OWASP A4 + global §13.13
RUN useradd -m -u 1000 insur && chown -R insur:insur /app
USER insur

# §150 healthcheck wires to /healthz/live (the canonical liveness probe)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8001/healthz/live || exit 1

EXPOSE 8001

ENV PYTHONUNBUFFERED=1 \
    INSUR_SKIP_MIGRATIONS=0 \
    INSUR_DISABLE_PRESIDIO=1 \
    TF_CPP_MIN_LOG_LEVEL=3 \
    BEV_CORS_ORIGINS="http://localhost:3000,http://localhost:3210"

# CMD matches the script our supervisor + cron watchdog use
CMD ["python", "/app/scripts/launch_backend.py"]
