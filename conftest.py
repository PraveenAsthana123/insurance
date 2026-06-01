"""Root conftest.py — adjusts sys.path for pytest.

The backend uses two import styles:
  - backend/main.py uses bare imports (from core.config ...) which expect
    backend/ on sys.path (runtime: `uvicorn main:app` from inside backend/).
  - All new code (services/, routers/, tests) uses qualified imports
    (from backend.services.forecast_service ...) which expect repo root
    on sys.path.

Pytest only sees the repo root. So any test that imports `backend.main`
(which then triggers its bare imports) would fail with ModuleNotFoundError.

This conftest adds backend/ to the front of sys.path before any test
collection, so both import styles resolve.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
