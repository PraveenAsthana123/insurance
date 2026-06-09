"""Backend ML runtime · honest stubs per §57.7.

Provides minimal endpoints surfacing whatever model/SHAP/eval data IS
available (MLflow if installed · empty otherwise). Each endpoint returns
honest empty-state on missing dependency · never fabricates demo data.

Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md P0.3 + P0.4 + P0.5
backend-wire closure.
"""
