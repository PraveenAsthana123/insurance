#!/bin/bash
# §137 — No black background in content/workspace areas (audit)
#
# Usage: ./audit_no_black_backgrounds.sh [<project-root>]
#   default project root = $(pwd)
#
# Exit:
#   0 = clean (no offending dark bg in content areas)
#   1 = release blocker (dark bg found in content/workspace)
#   2 = misconfigured (no frontend/src · skip · not a web project)
#
# Composes with §137 (global policy) + §70 (cron-scheduled audit) +
# §43 (drill discipline · negative assertion locked).
#
# Forensic substrate per §51 — every run prints date + location + cmd.

set -u
ROOT="${1:-$(pwd)}"
cd "$ROOT" 2>/dev/null || { echo "ERROR: cannot cd to $ROOT"; exit 2; }

TS_UTC=$(TZ=UTC date -u +"%Y-%m-%dT%H:%M:%SZ")
TS_LOCAL=$(TZ=America/Edmonton date +"%Y-%m-%d %H:%M:%S %Z")
HOST=$(hostname -s 2>/dev/null || echo "unknown-host")

echo "═══════════════════════════════════════════════════════════════════"
echo "§137 audit · no black background in content areas"
echo "  ts_utc:   $TS_UTC"
echo "  ts_local: $TS_LOCAL"
echo "  host:     $HOST"
echo "  root:     $ROOT"
echo "═══════════════════════════════════════════════════════════════════"

if [ ! -d "frontend/src" ]; then
  echo "SKIP · no frontend/src · not a web project (exit 2)"
  exit 2
fi

# Forbidden hex codes in content areas (§137.2)
FORBIDDEN='#(000000?|0f172a|111827|181818|1a1a2e|1e293b|1f2937|212121|222222)'

# Find candidate files (jsx/tsx/js/ts/css) under content dirs
mapfile -t FILES < <(find frontend/src/components frontend/src/pages \
  -type f \( -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" -o -name "*.css" \) \
  2>/dev/null)

VIOLATIONS=""

for FILE in "${FILES[@]}"; do
  # Quick skip: file-level chrome exclusion (§137.4)
  BASENAME=$(basename "$FILE")
  case "$BASENAME" in
    BankSidebar.jsx|BankHeader.jsx|*Sidebar.jsx|*Sidebar.tsx|*Topbar.jsx|*TopBar.jsx|*Header.jsx|*Nav.jsx|*Navigation.jsx|HolyNavPage.css)
      continue ;;
  esac

  # Walk the file line by line; for each match, check 5 lines above for <aside or sidebar marker
  awk -v forbidden="$FORBIDDEN" '
    BEGIN {
      # Track recent context for chrome detection
      for (i=0; i<5; i++) ctx[i] = ""
    }
    {
      ln = NR
      line = $0
      # Push current line into ring buffer BEFORE testing
      # Check for forbidden background pattern
      if (line ~ ("background(-color)?:[ \t]*[\047\"]?" forbidden)) {
        # Check the last 5 lines for chrome markers
        is_chrome = 0
        for (i = 0; i < 5; i++) {
          c = ctx[i]
          if (c ~ /<aside[ >]/ || c ~ /sidebar/ || c ~ /Sidebar/ || c ~ /topbar/ || c ~ /TopBar/ || c ~ /Topbar/ || c ~ /<header[ >]/ || c ~ /Header/ || c ~ /channel-list/ || c ~ /channelList/ || c ~ /nav-rail/ || c ~ /navRail/) {
            is_chrome = 1
            break
          }
        }
        if (!is_chrome) {
          print FILENAME ":" ln ":" line
        }
      }
      # Now push this line into the ring buffer (slot ln%5)
      ctx[ln % 5] = line
    }
  ' "$FILE" >> /tmp/sec137_violations.$$ 2>/dev/null
done

if [ -s /tmp/sec137_violations.$$ ]; then
  VIOLATIONS=$(cat /tmp/sec137_violations.$$)
  rm -f /tmp/sec137_violations.$$
else
  rm -f /tmp/sec137_violations.$$
  VIOLATIONS=""
fi

if [ -z "$VIOLATIONS" ]; then
  echo
  echo "✓ PASS · no dark backgrounds in content areas"
  echo
  echo "Permitted dark chrome (intentional): Sidebar / Header / TopBar / aside / nav-rail"
  exit 0
fi

echo
echo "✗ FAIL · §137 violation · dark background detected in content area"
echo
echo "Offending lines:"
echo "$VIOLATIONS" | head -30
echo
echo "Total violations: $(echo "$VIOLATIONS" | wc -l)"
echo
echo "Remediation (§137.9):"
echo "  Use light palette from §137.3:"
echo "    background: '#f8fafc'   (slate-50)"
echo "    background: '#f1f5f9'   (slate-100)"
echo "    background: '#ffffff'   (white)"
echo "  Pair with dark text from §137.3:"
echo "    color: '#1f2937'  or  '#475569'  or  '#0f172a'"
echo "  Add border for definition:"
echo "    border: '1px solid #e5e7eb'"
echo
echo "Reference impl: insur_project commit fe713e95"
echo "Policy file:    docs/NO_BLACK_BACKGROUND_GLOBAL_POLICY.md"
exit 1
