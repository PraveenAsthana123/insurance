# §140 · engineering × autoreview · Use Case Spec

## Purpose
PRIMARY fit · Ops technique applied to engineering domain.

## Library
§122 brutal scorer

## Reference Model
Self-eval loop

## Data Needs
model outputs

## Example use case
Engineering use case applying autoreview to model outputs.

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
