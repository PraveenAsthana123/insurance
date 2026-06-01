# HOLY Beverage — Manufacturing Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Predictive ML, Computer Vision, IoT AI, Edge AI, Optimization AI

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | TensorFlow / PyTorch (CV) |
| OpenCV | YOLO for inspection |
| OPC-UA / MQTT for PLC integration | OPC-UA / MQTT for PLC integration |
| NVIDIA Jetson for edge | NVIDIA Jetson for edge |

## Data stores

| Store | Purpose |
|---|---|
| TimescaleDB | sensor telemetry |
| S3 + Iceberg | image archives |
| PostgreSQL | batch records |
| InfluxDB | real-time metrics |

## Key models

- Predictive maintenance (LSTM)
- Defect detection (YOLO v8 / SAM)
- OCR label verification (Tesseract + EasyOCR)
- Energy optimization (LP / MILP)

## Infrastructure

- NVIDIA Triton for inference
- Kubernetes for batch jobs
- MQTT + Kafka for plant-floor streaming

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).