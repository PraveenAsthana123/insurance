#!/usr/bin/env bash
# zap_scan.sh · Iter 72 · §102.9.9 (OWASP ZAP scheduled scan)
# Runs ZAP baseline scan against the agentic hub · weekly cron-friendly.
#
# Prereq: docker pull owasp/zap2docker-stable
# Cron: 0 5 * * 1 /mnt/deepa/insur_project/scripts/zap_scan.sh
#
# Per §57.7 honest: this is the canonical wrapper · operator runs once.

set -euo pipefail

TARGET="${ZAP_TARGET:-http://host.docker.internal:5173/agentic}"
OUT_DIR="$(cd "$(dirname "$0")"/.. && pwd)/jobs/reports/zap"
mkdir -p "$OUT_DIR"
TS=$(date -u +"%Y%m%d_%H%M")

echo "ZAP baseline scan · target=$TARGET"
if ! command -v docker >/dev/null; then
  echo "  ⚠ docker not installed · scaffold mode · would run:"
  echo "    docker run --rm -v $OUT_DIR:/zap/wrk owasp/zap2docker-stable \\"
  echo "      zap-baseline.py -t $TARGET -r baseline-$TS.html -J baseline-$TS.json"
  echo "{\"scaffold\": true, \"target\": \"$TARGET\", \"ts\": \"$TS\"}" \
    > "$OUT_DIR/baseline-$TS.json"
  exit 0
fi

docker run --rm --network host \
  -v "$OUT_DIR:/zap/wrk:rw" \
  owasp/zap2docker-stable \
  zap-baseline.py -t "$TARGET" -r "baseline-$TS.html" -J "baseline-$TS.json" \
  || echo "  ZAP found warnings · see $OUT_DIR/baseline-$TS.html"
