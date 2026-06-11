#!/usr/bin/env python3
"""Backend launcher · Iter 102.1 · uses uvicorn.Server directly (no string import)."""
import sys
import os
import asyncio

sys.path.insert(0, "/mnt/deepa/insur_project/backend")
sys.path.insert(0, "/mnt/deepa/insur_project")

os.environ.setdefault("TZ", "America/Edmonton")
os.environ.setdefault("BEV_POSTGRES_HOST", "localhost")
os.environ.setdefault("BEV_POSTGRES_PORT", "5434")
os.environ.setdefault("BEV_POSTGRES_USER", "insur_user")
os.environ.setdefault("BEV_POSTGRES_PASSWORD", "insur_secret_password")
os.environ.setdefault("BEV_POSTGRES_DB", "insur_analytics")
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import uvicorn
from main import create_app

if __name__ == "__main__":
    app = create_app()
    print(f"[launcher] app created · {len(app.routes)} routes · starting server on :8001",
          flush=True)
    config = uvicorn.Config(app, host="0.0.0.0", port=8001, log_level="info")
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
