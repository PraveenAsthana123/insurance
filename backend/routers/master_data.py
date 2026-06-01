"""HOLY master-data router — per-dept SAP-style master + reference data.

Surfaces the entity catalog documented in
    global-ai-org/departments/<dept>/business-layer/HOLY_MASTER_DATA.md
as a queryable schema endpoint. Persistence of the actual rows belongs to
the ERP/CRM/PIM source-of-truth systems; this endpoint is the *contract*
(what entities exist, what fields they carry, who owns them) plus a
deliberate stub for sample data.

Composes with global §38 (audit on mutation) + §41.3 (tenant isolation
header) + §47.6 (SOC2 CC6.2 access control) + §57.6 (canonical envelope)
+ §59 DDD (entities ARE the aggregates) + §64 per-dept artifact.

Endpoints (read-only in MVP — write paths gated per §40 decision system):
    GET /api/v1/holy/master-data/{dept}              — catalog
    GET /api/v1/holy/master-data/{dept}/{entity}     — sample rows
    GET /api/v1/holy/master-data/{dept}/org-structure — org tree slice
"""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access

router = APIRouter(prefix="/api/v1/holy/master-data", tags=["holy", "master-data"])

# 19 HOLY departments — single source of truth for cross-dept validation.
HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Per global §57.6 — every entity row carries this envelope.
CANONICAL_ENVELOPE = ["id", "tenant_id", "created_at", "updated_at",
                      "created_by", "version", "is_active"]

# Master entity catalog — what fields are exposed by default (no PII).
# PII (customer name/email/phone, employee SSN, vendor bank account) is
# redacted at this surface unless ?include_pii=1 with audit-row.
ENTITY_CATALOG: dict[str, dict[str, Any]] = {
    "customer": {
        "owner": "shared",
        "fields_public": CANONICAL_ENVELOPE + ["customer_group", "country", "currency", "credit_limit_tier"],
        "fields_pii": ["customer_name", "primary_email", "primary_phone", "billing_address"],
    },
    "customer_hierarchy": {
        "owner": "sales",
        "fields_public": CANONICAL_ENVELOPE + ["parent_customer_id", "child_customer_id", "hierarchy_type"],
        "fields_pii": [],
    },
    "vendor": {
        "owner": "procurement",
        "fields_public": CANONICAL_ENVELOPE + ["vendor_group", "country", "currency", "payment_terms_code", "scorecard_tier"],
        "fields_pii": ["vendor_name", "primary_email", "bank_account_iban"],
    },
    "employee": {
        "owner": "hr",
        "fields_public": CANONICAL_ENVELOPE + ["position_id", "cost_center_id", "department_id", "manager_employee_id"],
        "fields_pii": ["full_name", "email", "phone", "ssn_hash"],
    },
    "product": {
        "owner": "product-rd",
        "fields_public": CANONICAL_ENVELOPE + ["sku", "product_family", "product_line", "uom", "tax_classification"],
        "fields_pii": [],
    },
    "product_hierarchy": {
        "owner": "product-rd",
        "fields_public": CANONICAL_ENVELOPE + ["parent_product_id", "child_product_id", "material_group"],
        "fields_pii": [],
    },
    "price_list": {
        "owner": "sales",
        "fields_public": CANONICAL_ENVELOPE + ["price_list_id", "valid_from", "valid_to", "currency", "condition_type"],
        "fields_pii": [],
    },
    "discount_condition": {
        "owner": "sales-finance",
        "fields_public": CANONICAL_ENVELOPE + ["discount_id", "condition_type", "valid_from", "valid_to", "percent_or_amount"],
        "fields_pii": [],
    },
    "organization": {
        "owner": "executive-leadership",
        "fields_public": CANONICAL_ENVELOPE + ["org_id", "parent_org_id", "org_type", "country"],
        "fields_pii": [],
    },
    "sales_area": {
        "owner": "sales",
        "fields_public": CANONICAL_ENVELOPE + ["sales_org_id", "distribution_channel_id", "division_id"],
        "fields_pii": [],
    },
    "sales_org": {
        "owner": "sales",
        "fields_public": CANONICAL_ENVELOPE + ["sales_org_id", "company_code_id", "region"],
        "fields_pii": [],
    },
    "sales_office": {
        "owner": "sales",
        "fields_public": CANONICAL_ENVELOPE + ["sales_office_id", "sales_org_id", "city", "country"],
        "fields_pii": [],
    },
    "company_code": {
        "owner": "finance",
        "fields_public": CANONICAL_ENVELOPE + ["company_code_id", "country", "currency", "chart_of_accounts"],
        "fields_pii": [],
    },
    "cost_center": {
        "owner": "finance-hr",
        "fields_public": CANONICAL_ENVELOPE + ["cost_center_id", "company_code_id", "responsible_employee_id"],
        "fields_pii": [],
    },
    "department": {
        "owner": "hr",
        "fields_public": CANONICAL_ENVELOPE + ["dept_id", "parent_dept_id", "cost_center_id", "head_employee_id"],
        "fields_pii": [],
    },
}


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


def _validate_entity(entity: str) -> None:
    if entity not in ENTITY_CATALOG:
        raise HTTPException(
            404, f"Unknown entity '{entity}' — must be one of {sorted(ENTITY_CATALOG.keys())}",
        )


# --- _global before /{dept} to dodge the FastAPI greedy-match trap (see
#     monitoring.py for the same pattern + drill step 4 lock).
@router.get("/_global")
def global_catalog(http_request: Request) -> dict[str, Any]:
    """Cross-dept catalog summary — what every dept publishes."""
    log_holy_access(http_request, "master_data", "global_catalog")
    return {
        "n_depts": len(HOLY_DEPTS),
        "depts": HOLY_DEPTS,
        "n_entities": len(ENTITY_CATALOG),
        "entities": sorted(ENTITY_CATALOG.keys()),
        "canonical_envelope": CANONICAL_ENVELOPE,
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_catalog(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept master-data catalog — entity list + ownership + field schema."""
    _validate_dept(dept)
    log_holy_access(http_request, "master_data", "dept_catalog", dept=dept)
    return {
        "dept": dept,
        "n_entities": len(ENTITY_CATALOG),
        "entities": {
            name: {
                "owner": meta["owner"],
                "fields_public": meta["fields_public"],
                "n_pii_fields_redacted": len(meta["fields_pii"]),
            }
            for name, meta in ENTITY_CATALOG.items()
        },
        "scanned_at": time.time(),
    }


@router.get("/{dept}/{entity}")
def entity_sample(
    http_request: Request,
    dept: str,
    entity: str,
    limit: int = Query(20, ge=1, le=100),
    include_pii: int = Query(0, ge=0, le=1),
) -> dict[str, Any]:
    """Entity schema + (stub) sample rows.

    PII fields are redacted unless include_pii=1 AND the caller passes the
    §47.6 SOC2 CC6.2 access check (TODO when auth middleware lands).
    The MVP returns the schema + empty rows list; downstream integrations
    fill the actual data per §65.1 #7.
    """
    _validate_dept(dept)
    _validate_entity(entity)
    log_holy_access(http_request, "master_data", "entity_sample",
                    dept=dept, extra={"entity": entity, "include_pii": int(include_pii)})
    meta = ENTITY_CATALOG[entity]
    response_fields = list(meta["fields_public"])
    if include_pii:
        # Per §38.3 — must lay an audit row here in production. MVP: marker only.
        response_fields = response_fields + list(meta["fields_pii"])

    return {
        "dept": dept,
        "entity": entity,
        "owner": meta["owner"],
        "fields": response_fields,
        "n_pii_fields_redacted": 0 if include_pii else len(meta["fields_pii"]),
        "limit": limit,
        "rows": [],  # populated by source-of-truth ERP/CRM/PIM in real deploys
        "stub_notice": "MVP returns schema + empty rows. Wire to ERP/CRM/PIM per §65.1 #7.",
    }
