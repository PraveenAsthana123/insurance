# §140 · supply-chain × cv-detection · Use Case Spec

## Purpose
Cross-cutting fit · CV technique applied to supply-chain domain.

## Library
ultralytics

## Reference Model
YOLOv8n

## Data Needs
images + bboxes

## Example use case
Supply Chain use case applying cv-detection to images + bboxes.

## Honest impl_level (per §57.7)
- `spec_only` if no data available
- `scaffold` if Stage-1 adapter wired (env-gated)
- `tiny_demo` if one-shot trained on synthetic or sample real
- `real_trained` if trained on real production data
- `production` if + audit row + monitoring + rollback

Current cell impl_level: see manifest.json

## Composes with
§38 audit · §43 drill · §47 arch · §51 substrate · §57.7 honest ·
§63 dept canonical · §122 brutal · §131 AI catalog · §138 artifacts ·
§139 Odysseus reference · §140 (this matrix)
