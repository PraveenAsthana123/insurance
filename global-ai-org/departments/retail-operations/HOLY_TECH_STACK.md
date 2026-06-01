# HOLY Beverage — Retail Operations Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Computer Vision, Spatial AI, Forecasting AI, Causal ML

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | PyTorch (CV) |
| OpenCV | YOLO |
| PostGIS for geo | PostGIS for geo |
| Snowflake for POS | Snowflake for POS |

## Data stores

| Store | Purpose |
|---|---|
| S3 | shelf images |
| PostGIS | store geo |
| Snowflake | POS aggregations |
| Redis | real-time shelf state |

## Key models

- Shelf availability detector (YOLO)
- Planogram-compliance classifier
- Promotion uplift (causal forest)
- Store-level demand (Prophet per store)

## Infrastructure

- Edge cameras + AWS Snowball for image ingest
- Kubernetes for CV inference
- Looker for retail dashboards

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).