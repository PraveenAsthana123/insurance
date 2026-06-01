#!/usr/bin/env bash
# download_supply_chain.sh — fetch the Supply Chain Analysis dataset.
set -euo pipefail

DEST="${1:-data/kaggle/supply-chain}"
mkdir -p "$DEST"

if [[ -f "$DEST/supply_chain_data.csv" ]]; then
  echo "[download_supply_chain] file already present in $DEST — skipping"
  exit 0
fi

if ! command -v kaggle >/dev/null 2>&1; then
  echo "[download_supply_chain] kaggle CLI not installed."
  echo "Kaggle creds are available globally per ~/.claude/policies/data-access-kaggle.md"
  exit 1
fi

echo "[download_supply_chain] downloading harshsingh2209/supply-chain-analysis"
kaggle datasets download -d harshsingh2209/supply-chain-analysis -p "$DEST" --unzip

# Dataset may extract to a nested folder — flatten if so.
if [[ -d "$DEST/supply-chain-analysis" ]]; then
  mv "$DEST/supply-chain-analysis/"*.csv "$DEST/" 2>/dev/null || true
  rmdir "$DEST/supply-chain-analysis" 2>/dev/null || true
fi

echo "[download_supply_chain] done. Files in $DEST:"
ls -lh "$DEST"
