#!/usr/bin/env bash
# Setup/verify Claude-friendly local autonomy for this repository.
# This does not bypass Claude Code platform prompts. It verifies repo policy,
# starts the safe Archon approval watcher, and checks the advanced agentic stack.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

echo "== Claude autonomy policy =="
test -f docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md
sed -n '1,40p' docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md

echo
"${ROOT}/scripts/install_codex_approval_advanced.sh" start

echo
"${ROOT}/scripts/install_codex_approval_advanced.sh" status

echo
"${ROOT}/scripts/setup_advanced_agentic_stack.sh" status
