"""HITL (Human-in-the-Loop) queue · Tier 7 governance gate #3.

Lightweight queue for AI decisions requiring human approval per the
confidence-routing tiers (T7.9):
  - confidence < 70% · manual processing
  - confidence 70-85% · human approval
  - confidence 85-95% · agent review
  - confidence > 95% · auto execute

Per §38.3 (audit row schema · HITL decision = audit-row extension).
Per §57.7 honest: queue starts empty · explicit empty state · no
fabricated demo entries.
"""
