"""Pipeline runner · manual + automatic process modes.

Per operator brief 2026-06-09: every process must have BOTH:
  - Manual mode · user advances phase-by-phase · controls hyperparameters
  - Automatic mode · pipeline runs all phases · per-phase quality score

Backed by deterministic stub data per §57.7 (no fake training results).
When sklearn/MLflow eventually wired, the same endpoints produce real
results.
"""
