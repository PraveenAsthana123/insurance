#!/usr/bin/env bash
# download_rossmann.sh — fetch the Rossmann Store Sales dataset.
# Uses Kaggle CLI if credentials are present; otherwise prints instructions.
set -euo pipefail

DEST="${1:-data/kaggle/rossmann}"
mkdir -p "$DEST"

if [[ -f "$DEST/train.csv" && -f "$DEST/store.csv" ]]; then
  echo "[download_rossmann] files already present in $DEST — skipping"
  exit 0
fi

if ! command -v kaggle >/dev/null 2>&1; then
  echo "[download_rossmann] kaggle CLI not installed. Install with: pip install kaggle"
  echo "Then set KAGGLE_USERNAME and KAGGLE_KEY in your env or ~/.kaggle/kaggle.json"
  exit 1
fi

if [[ -z "${KAGGLE_USERNAME:-}" || -z "${KAGGLE_KEY:-}" ]]; then
  if [[ ! -f "${HOME}/.kaggle/kaggle.json" ]]; then
    echo "[download_rossmann] no Kaggle credentials found"
    echo "Set KAGGLE_USERNAME and KAGGLE_KEY env vars, or place kaggle.json in ~/.kaggle/"
    exit 1
  fi
fi

echo "[download_rossmann] trying Kaggle competition (requires rule-acceptance)..."
if kaggle competitions download -c rossmann-store-sales -p "$DEST" 2>/dev/null; then
  echo "[download_rossmann] competition download OK"
else
  echo "[download_rossmann] competition download failed (likely rules not accepted —"
  echo "  see https://www.kaggle.com/competitions/rossmann-store-sales/rules )"
  echo "[download_rossmann] falling back to public dataset mirror: shahpranshu27/rossman-store-sales"
  rm -f "$DEST"/*.zip 2>/dev/null || true
  kaggle datasets download -d shahpranshu27/rossman-store-sales -p "$DEST" --unzip
  # The dataset extracts to a nested directory — flatten it.
  if [[ -d "$DEST/rossmann-store-sales" ]]; then
    mv "$DEST/rossmann-store-sales/"*.csv "$DEST/" 2>/dev/null || true
    rmdir "$DEST/rossmann-store-sales" 2>/dev/null || true
  fi
fi

# Unzip any remaining archives.
cd "$DEST"
if ls *.zip >/dev/null 2>&1; then
  for z in *.zip; do
    unzip -o "$z"
    rm "$z"
  done
fi

echo "[download_rossmann] done. Files in $DEST:"
ls -lh "$DEST"
