#!/usr/bin/env bash
# Wrapper that forces BMad to run under Node 22 (nvm-managed) regardless of
# the system Node version. Avoids the EBADENGINE crash on Node 18.
#
# Usage:
#   scripts/bmad.sh status
#   scripts/bmad.sh install --modules bmm --tools claude-code --yes
#   scripts/bmad.sh --version
#
# Discovers the highest installed nvm Node ≥ 20. If no such Node is present,
# fails with a clear error rather than silently falling back to system Node.

set -euo pipefail

NVM_ROOT="${NVM_DIR:-$HOME/.nvm}/versions/node"
NODE_BIN=""

if [[ -d "$NVM_ROOT" ]]; then
    # Pick the highest v20+ Node available
    NODE_BIN=$(ls -1 "$NVM_ROOT" 2>/dev/null \
        | awk -F'.' '/^v(2[0-9]|[3-9][0-9])\./ {print}' \
        | sort -V | tail -1)
    if [[ -n "$NODE_BIN" ]]; then
        NODE_BIN="$NVM_ROOT/$NODE_BIN/bin"
    fi
fi

if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN/node" ]]; then
    cat >&2 <<'EOF'
ERROR: No nvm-managed Node ≥ 20 found.

BMad requires Node 20+ (system Node may be older). Install via:
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install 22
EOF
    exit 2
fi

# Force PATH so npx finds the right Node + uses the right npm cache layer.
export PATH="$NODE_BIN:$PATH"
exec npx --yes bmad-method "$@"
