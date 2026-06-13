#!/bin/bash
# Rotates data/work_tracker/history.jsonl · keeps last 24h of events,
# archives older events to data/work_tracker/archive/history-YYYYMMDD.jsonl.gz
#
# Composes with:
#   §38.3 audit-row preservation (events kept in archive · not deleted)
#   §51 forensic substrate (timestamps + path-verification before mutation)
#   §57.7 honest scaffold (no fabrication · best-effort with stderr)
#   §70 cron-scheduled audit pattern (daily 02:00 install)
#
# Composes with the GitHub 50 MB warning surfaced 2026-06-12 22:38 MDT
# when commit 87d11649 was pushed: history.jsonl had grown to 50.04 MB.

set -u
ROOT="${1:-$(pwd)}"
cd "$ROOT" 2>/dev/null || { echo "ERROR: cannot cd to $ROOT"; exit 2; }

TS_UTC=$(TZ=UTC date -u +"%Y-%m-%dT%H:%M:%SZ")
TS_LOCAL=$(TZ=America/Edmonton date +"%Y-%m-%d %H:%M:%S %Z")
HOST=$(hostname -s 2>/dev/null || echo "unknown-host")

FILE="data/work_tracker/history.jsonl"
ARCHIVE_DIR="data/work_tracker/archive"
TODAY=$(TZ=UTC date -u +"%Y%m%d")
ARCHIVE="${ARCHIVE_DIR}/history-${TODAY}.jsonl"

echo "════════════════════════════════════════════════════════════"
echo "history.jsonl rotation"
echo "  ts_utc:   $TS_UTC"
echo "  ts_local: $TS_LOCAL"
echo "  host:     $HOST"
echo "  root:     $ROOT"
echo "════════════════════════════════════════════════════════════"

if [ ! -f "$FILE" ]; then
  echo "SKIP · $FILE does not exist (exit 0)"
  exit 0
fi

mkdir -p "$ARCHIVE_DIR"

# Compute cutoff: 24 hours ago (UTC)
CUTOFF=$(TZ=UTC date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
if [ -z "$CUTOFF" ]; then
  # macOS / BSD date fallback
  CUTOFF=$(TZ=UTC date -u -v -24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
fi
echo "  cutoff: $CUTOFF (keep events newer than this)"

# Split into two temp files based on ts field
TMP_KEEP=$(mktemp)
TMP_ARCH=$(mktemp)

/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python <<PY
import json, sys
cutoff = "$CUTOFF"
keep_path = "$TMP_KEEP"
arch_path = "$TMP_ARCH"
src = "$FILE"

n_keep = 0
n_arch = 0
n_malformed = 0
with open(src, "r", encoding="utf-8") as fsrc, \
     open(keep_path, "w", encoding="utf-8") as fk, \
     open(arch_path, "w", encoding="utf-8") as fa:
    for line in fsrc:
        line = line.rstrip("\n")
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            n_malformed += 1
            # Malformed: keep in current file (operator can investigate)
            fk.write(line + "\n")
            n_keep += 1
            continue
        ts = d.get("ts", "")
        if ts and ts < cutoff:
            fa.write(line + "\n")
            n_arch += 1
        else:
            fk.write(line + "\n")
            n_keep += 1

print(f"  keep:      {n_keep} lines (< 24h old)")
print(f"  archive:   {n_arch} lines (>= 24h old)")
print(f"  malformed: {n_malformed} lines (kept in current file)")
PY

# If nothing to archive, exit (no-op)
if [ ! -s "$TMP_ARCH" ]; then
  rm -f "$TMP_KEEP" "$TMP_ARCH"
  echo "  no events older than 24h · no rotation needed"
  exit 0
fi

# Append archive content (if file exists, append; gzipped)
if [ -f "${ARCHIVE}.gz" ]; then
  # Append to existing day's archive
  gunzip -c "${ARCHIVE}.gz" > "${ARCHIVE}.merge"
  cat "$TMP_ARCH" >> "${ARCHIVE}.merge"
  gzip -f "${ARCHIVE}.merge"
  mv "${ARCHIVE}.merge.gz" "${ARCHIVE}.gz"
else
  cp "$TMP_ARCH" "$ARCHIVE"
  gzip -f "$ARCHIVE"
fi

# Replace original with keep-only set (atomic-ish)
mv "$TMP_KEEP" "$FILE"
rm -f "$TMP_ARCH"

NEW_SIZE=$(stat -c %s "$FILE" 2>/dev/null || stat -f %z "$FILE")
ARCH_SIZE=$(stat -c %s "${ARCHIVE}.gz" 2>/dev/null || stat -f %z "${ARCHIVE}.gz")

echo
echo "✓ rotation complete"
echo "  current $FILE: $((NEW_SIZE / 1024)) KB"
echo "  archive ${ARCHIVE}.gz: $((ARCH_SIZE / 1024)) KB"
exit 0
