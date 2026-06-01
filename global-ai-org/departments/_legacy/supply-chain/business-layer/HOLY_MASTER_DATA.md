# HOLY Beverage — Supply Chain — Master Data

> Per operator 2026-05-24 — every dept publishes its master + reference
> data here. Focus: **vendor-master + product-master + warehouse + SKU-hierarchy**.
> Composes with global §38 audit + §41.3 tenant isolation + §47.6 SOC2
> CC6.2 + §59 DDD bounded-context aggregates + §64 per-dept artifact.

## 1. Master entities catalog

Every entity carries the §57.6 canonical envelope: `id`, `tenant_id`,
`created_at`, `updated_at`, `created_by`, `version`, `is_active`, plus
the §38 decision audit trail on mutations.

| Entity | Primary key | Owner | Source-of-truth system | Mutations land audit row? |
|---|---|---|---|---|
| **customer** | customer_id | this dept (or shared via [HOLY_CONTACTS.md](./HOLY_CONTACTS.md)) | CRM | yes |
| **customer_hierarchy** | parent_customer_id → child_customer_id | sales | CRM | yes |
| **vendor** | vendor_id | procurement (this dept reads) | ERP | yes |
| **employee** | employee_id | hr (this dept reads) | HRIS | yes |
| **product** | product_id | product-rd (this dept reads) | PIM | yes |
| **product_hierarchy** | parent_product_id → child_product_id | product-rd | PIM | yes |
| **price_list** | price_list_id + valid_from | sales | ERP | yes |
| **discount_condition** | discount_id + valid_from | sales/finance | ERP | yes |
| **organization** | org_id | executive-leadership | HRIS | yes |
| **sales_area** | sales_org_id + distribution_channel_id + division_id | sales | ERP | yes |
| **sales_org** | sales_org_id | sales | ERP | yes |
| **sales_office** | sales_office_id | sales | ERP | yes |
| **company_code** | company_code_id | finance | ERP | yes |
| **cost_center** | cost_center_id | finance/hr | ERP | yes |
| **department** | dept_id | hr | HRIS | yes |

## 2. Customer hierarchy

```
Account Group (e.g. "Wholesale")
├── Customer (e.g. "ABC Distributors Inc")
│   ├── Sales Area Assignment (sales_org + dist_channel + division)
│   ├── Ship-To Parties (1..n locations)
│   ├── Bill-To Parties (1..n)
│   ├── Payer (1..n)
│   └── Contact Persons (1..n)
└── Customer (e.g. "XYZ Retail")
```

Standard partner functions per SAP convention: SP (Sold-To), SH (Ship-To),
BP (Bill-To), PY (Payer), CP (Contact Person).

## 3. Product hierarchy

```
Material Group (e.g. "BEV-CARBONATED")
├── Product Family (e.g. "COLA")
│   ├── Product Line (e.g. "COLA-DIET")
│   │   └── SKU (e.g. "BEV-COLA-DIET-330ML-CAN-PACK24")
```

Standard 18-char SAP material hierarchy. Each SKU links to: BOM, routing,
plant assignments, price list, tax classification, sales-status flag.

## 4. Pricing master

| Condition type | Purpose | Maintained by |
|---|---|---|
| PR00 | Base list price | finance/sales |
| K004 | Material discount | sales |
| K005 | Customer-material discount | sales |
| K007 | Customer discount | sales |
| K020 | Pricing group discount | sales |
| MWST | Output tax | finance |
| KF00 | Freight | logistics |
| RA00 | Rebate (volume) | sales/finance |

Pricing procedure (per dept): sequence of condition types evaluated at
order entry. Drift in procedure = drift in revenue recognition; gated
per §38 (mutation requires AI Reviewer approval).

## 5. Organization structure

```
Client (HOLY)
└── Company Code (e.g. "HB01 — HOLY Beverage Inc")
    ├── Plant (e.g. "P001 — North Plant")
    │   ├── Storage Location (1..n)
    │   └── Work Center (1..n)
    ├── Sales Org (e.g. "S001 — North America Sales")
    │   ├── Distribution Channel (e.g. "10 — Direct")
    │   ├── Division (e.g. "BV — Beverages")
    │   └── Sales Office (1..n)
    │       └── Sales Group (1..n)
    ├── Purchasing Org (e.g. "P001 — Global Procurement")
    └── HR Personnel Area (e.g. "PA01 — North America")
        ├── Personnel Subarea (1..n)
        └── Department (1..n)
            └── Position (1..n)
                └── Employee (1..n)
```

This dept (**supply-chain**) operates against the slice of the structure
relevant to its persona. Cross-dept lookups go through the MDM service,
not direct DB joins.

## 6. Per-dept consumed-vs-owned matrix

| Entity | This dept | Notes |
|---|---|---|
| customer | mixed | this dept may own customer-segments; CRM is source-of-truth |
| vendor | reads | procurement owns; this dept reads via API |
| employee | reads | hr owns; this dept reads org-chart slice |
| product | reads | product-rd owns; this dept reads SKU catalog |
| price_list | reads | sales owns; finance approves |
| discount | reads | sales+finance own |
| org_structure | reads | exec-leadership owns |
| dept-specific master | owns | see §1 above + focus line |

## 7. API contract

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/master-data/supply-chain` | Schema catalog + per-entity owner |
| `GET /api/v1/holy/master-data/supply-chain/customer?limit=20` | Customer master sample |
| `GET /api/v1/holy/master-data/supply-chain/vendor?limit=20` | Vendor master sample |
| `GET /api/v1/holy/master-data/supply-chain/product?limit=20` | Product master sample |
| `GET /api/v1/holy/master-data/supply-chain/org-structure` | Org tree slice for this dept |

All endpoints carry `X-Tenant-ID` per §41.3 multi-tenant isolation.
All write endpoints (POST/PATCH/DELETE) require §40 decision-system
confidence-gate clearance + §38.3 audit row.

## 8. Data quality gates (§64.42 row)

Every master entity MUST pass these Great-Expectations / Soda checks
at ingestion time (per global §65.1 #8 data quality):

| Check | Target |
|---|---|
| `customer_id` uniqueness within tenant | 100% |
| `vendor_id` referential integrity to vendor master | 100% |
| `product_id` referential integrity to product master | 100% |
| Org-structure no orphans (every node has valid parent or is root) | 100% |
| Price-list date overlap detection | 0 overlaps per (customer × material) |
| Discount condition validity windows non-overlapping | 0 violations |

Failures route to dept's incident queue per [HOLY_INCIDENT_MGMT.md](./HOLY_INCIDENT_MGMT.md).

## 9. Drill (release blocker)

`tests/drills/drill_master_data.py` — 10 steps with ≥ 3 negative:

1. (+) `/api/v1/holy/master-data/supply-chain` returns 200 + entity catalog
2. (+) Entity catalog contains all 15 core entities (§1 above)
3. (+) Per-dept focus surfaces in schema endpoint
4. (-) **NEGATIVE** unknown dept → 404, not 500, no info leak
5. (-) **NEGATIVE** unknown entity → 404 + allowed-values hint
6. (-) **NEGATIVE** no PII fields in default schema response (data-class
        contract: name/email/phone redacted at API surface unless
        explicit `?include_pii=1` with audit row)
7. (+) HOLY_MASTER_DATA.md exists for every dept
8. (+) Every entity catalog carries the §57.6 canonical envelope keys
9. (+) Cross-dept entity ownership matrix is internally consistent
10. (+) Pricing/discount validity-window contract documented

## 10. Compose-footer (§49)

- [`HOLY_CONTACTS.md`](./HOLY_CONTACTS.md) — sibling customer/vendor/internal contact list (operational view)
- [`HOLY_DATA_MGMT.md`](./HOLY_DATA_MGMT.md) — per-process input contracts that read this master data
- [`HOLY_PROCESS_MGMT.md`](./HOLY_PROCESS_MGMT.md) — processes consuming/producing master mutations
- [`HOLY_SECURITY.md`](./HOLY_SECURITY.md) — PII redaction + access-control surface
- [`HOLY_FLOW.md`](./HOLY_FLOW.md) — cross-dept master-data flows
- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — master-data freshness + quality gates
