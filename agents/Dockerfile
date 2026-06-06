FROM python:3.11-slim

WORKDIR /app

# OS packages — kept lean; per-role tool installs gated behind TIER_ROLE
# at container startup (see entrypoint.sh below) to keep build fast.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

# Python deps shared by ALL agent roles (pytest + httpx + redis + the
# basic ML libs that the council/agent loops use)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tier-specialist Python packages — pre-installed at image build time so
# any TIER_ROLE picks the right tooling on container start without runtime
# pip installs (per global §57.5 deterministic-discovery rule).
# Per global §65.8 tier → agent-role mapping.
RUN pip install --no-cache-dir \
        hypothesis schemathesis \
        bandit semgrep \
        locust \
        ragas deepeval \
    && echo "✓ pytest-agent + api-agent + security-agent + perf-agent (locust) tooling ready"

# k6 binary (perf-agent tier 9-10) — single static binary, ~30MB
RUN curl -sL https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz | \
        tar -xz --strip-components=1 -C /usr/local/bin k6-v0.52.0-linux-amd64/k6 \
    && k6 version

# Trivy binary (security-agent tier 11-12 — container/dep scanning)
RUN curl -fsSL -o /tmp/trivy.tar.gz \
        https://github.com/aquasecurity/trivy/releases/download/v0.71.0/trivy_0.71.0_Linux-64bit.tar.gz \
    && tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy \
    && chmod +x /usr/local/bin/trivy \
    && rm -f /tmp/trivy.tar.gz \
    && trivy --version

# NOTE: Playwright (smoke-agent tier 8) is NOT installed here because it
# pulls in Chromium (300+ MB) and the smoke tier runs against the
# frontend container which already has Playwright wired in
# frontend/package.json. If a smoke-agent role needs browser automation
# in this container later, add: pip install playwright + playwright install chromium

# Copy agent code (all variants share the image; CMD picks one)
COPY agent.py seeder.py council_agent.py council_seeder.py test_agent.py agent_observability.py ./

# Run as non-root for security
RUN useradd -m -u 1000 agent && chown -R agent:agent /app
USER agent

# Default command — overridden per docker-compose service definition
CMD ["python", "-u", "agent.py"]
