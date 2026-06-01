"""EHR adapter — Electronic Health Record (HIPAA-secured).

Per §56 Stage-1: feature-flag opt-in. Real production wiring would integrate
with Epic / Cerner / Allscripts via SMART on FHIR.

ENV:
  INSUR_EHR_ENABLED      — "true" to enable
  INSUR_EHR_FHIR_BASE    — FHIR API base URL
  INSUR_EHR_CLIENT_ID    — SMART OAuth client id
  INSUR_EHR_CLIENT_SECRET — SMART OAuth secret
  INSUR_EHR_TIMEOUT      — seconds (default 60 — EHR can be slow)

CRITICAL: HIPAA + state-PHI rules apply. EVERY query MUST write an audit
row per §38.3 with `category=PHI_ACCESS`. Caller is responsible.
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return os.getenv("INSUR_EHR_ENABLED", "false").lower() == "true"


def fetch(patient_id: str, resource_types: list[str] | None = None,
          consent_id: str | None = None) -> dict[str, Any]:
    """Pull EHR FHIR resources.

    patient_id: SMART on FHIR patient id
    resource_types: ["Condition","Observation","Medication","Procedure",...]
                    Default: minimal underwriting-relevant set
    consent_id: explicit consent record id (REQUIRED in production)

    Returns:
      - ehr_query_id     — unique tracking id
      - patient_id       — echoed
      - resources        — list of FHIR resources (or empty if synthetic)
      - phi_categories   — list of PHI category labels accessed
      - synthetic        — True if feature flag off
      - audit_row_pending — True (caller MUST write §38.3 audit row with PHI tag)
      - hipaa_notice     — REQUIRED reminder string
    """
    ehr_query_id = str(uuid.uuid4())
    started_at = time.time()

    if not is_enabled():
        return {
            "ehr_query_id": ehr_query_id,
            "patient_id": patient_id,
            "resources": [],
            "phi_categories": [],
            "synthetic": True,
            "audit_row_pending": True,
            "hipaa_notice": "PHI placeholder — no real EHR call made (feature flag OFF)",
            "latency_ms": int((time.time() - started_at) * 1000),
        }

    if not consent_id:
        raise RuntimeError(
            "EHR query without consent_id is a HIPAA violation. "
            "Pass consent_id from the consent record table."
        )

    base = os.getenv("INSUR_EHR_FHIR_BASE", "https://fhir.example-hospital.com")
    client_id = os.getenv("INSUR_EHR_CLIENT_ID", "")
    client_secret = os.getenv("INSUR_EHR_CLIENT_SECRET", "")
    timeout = int(os.getenv("INSUR_EHR_TIMEOUT", "60"))

    if not (client_id and client_secret):
        raise RuntimeError("INSUR_EHR_CLIENT_ID + INSUR_EHR_CLIENT_SECRET required")

    resource_types = resource_types or [
        "Condition", "Observation", "MedicationStatement",
        "Procedure", "AllergyIntolerance",
    ]

    import httpx  # lazy

    try:
        with httpx.Client(timeout=timeout) as client:
            # SMART backend service auth — JWT assertion in real impl;
            # client_credentials shown here for simplicity
            tok = client.post(
                f"{base}/oauth/token",
                data={"grant_type": "client_credentials",
                      "client_id": client_id, "client_secret": client_secret,
                      "scope": "system/*.read"},
            )
            tok.raise_for_status()
            token = tok.json()["access_token"]

            resources: list[dict] = []
            for rt in resource_types:
                r = client.get(
                    f"{base}/{rt}",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"patient": patient_id, "_count": 50},
                )
                if r.status_code == 200:
                    bundle = r.json()
                    resources.extend(bundle.get("entry", []))
    except httpx.HTTPError as e:
        logger.exception("EHR query failed")
        return {
            "ehr_query_id": ehr_query_id,
            "patient_id": patient_id,
            "resources": [],
            "phi_categories": [],
            "error": str(e)[:200],
            "synthetic": False,
            "audit_row_pending": True,
            "hipaa_notice": "EHR call failed — caller MUST still write audit row",
            "latency_ms": int((time.time() - started_at) * 1000),
        }

    return {
        "ehr_query_id": ehr_query_id,
        "patient_id": patient_id,
        "resources": resources,
        "phi_categories": resource_types,
        "consent_id": consent_id,
        "synthetic": False,
        "audit_row_pending": True,
        "hipaa_notice": "PHI accessed — caller MUST write §38.3 audit row with category=PHI_ACCESS",
        "latency_ms": int((time.time() - started_at) * 1000),
    }
