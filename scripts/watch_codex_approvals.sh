#!/usr/bin/env bash
# Run the safe local Archon approval helper continuously for the current shell.
# Stop with Ctrl-C. This is useful while an Archon workflow is progressing
# through multiple safe approval gates.

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/home/praveen/venv-ardupilot/bin/python3}"
INTERVAL="${CODEX_APPROVAL_WATCH_INTERVAL:-2}"
cd "${REPO}"
exec "${PYTHON}" scripts/archon_auto_approve_safe.py --watch --approve --interval "${INTERVAL}"
