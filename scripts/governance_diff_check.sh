#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

note() {
  printf 'INFO: %s\n' "$1"
}

diff_mode=''
diff_ref=''
if [[ -n "${GITHUB_BASE_REF:-}" ]]; then
  git fetch --no-tags --depth=1 origin "${GITHUB_BASE_REF}" >/dev/null 2>&1 || true
  if git rev-parse --verify "origin/${GITHUB_BASE_REF}" >/dev/null 2>&1; then
    diff_mode='range'
    diff_ref="origin/${GITHUB_BASE_REF}...HEAD"
  fi
elif [[ -n "${BEFORE_SHA:-}" && "${BEFORE_SHA}" != '0000000000000000000000000000000000000000' ]]; then
  if git rev-parse --verify "${BEFORE_SHA}" >/dev/null 2>&1; then
    diff_mode='ref'
    diff_ref="${BEFORE_SHA}"
  fi
fi

if [[ -z "$diff_ref" ]]; then
  note 'No CI comparison range available; skipping governance diff check.'
  note 'For local checks, set BEFORE_SHA=<base-sha> or run in a pull_request workflow.'
  exit 0
fi

if [[ "$diff_mode" == 'range' ]]; then
  changed="$(git diff --name-only "$diff_ref")"
else
  changed="$(git diff --name-only "$diff_ref")"
fi

if [[ -z "$changed" ]]; then
  note "No changed files in $diff_ref."
  exit 0
fi

has_changed() {
  grep -Eq "$1" <<<"$changed"
}

require_changed() {
  local pattern="$1"
  local message="$2"
  if ! has_changed "$pattern"; then
    fail "$message"
  fi
}

if has_changed '^(backend/routers/|backend/schemas/)'; then
  require_changed '^docs/API_ENDPOINT_CATALOG\.md$' 'API router/schema changes require docs/API_ENDPOINT_CATALOG.md update.'
  require_changed '^docs/API_CATALOG\.json$' 'API router/schema changes require docs/API_CATALOG.json update.'
fi

if has_changed '^(backend/(core|services|repositories|workers|ml|migrations)/|backend/main\.py|backend/database\.py)'; then
  require_changed '^docs/BACKEND_FILE_INVENTORY\.(md|json)$' 'Backend implementation changes require backend file inventory docs update.'
fi

if has_changed '^frontend/src/'; then
  require_changed '^(docs/UI_GLOBAL_POLICY\.md|README\.md)$' 'Frontend behavior changes require UI policy or README update.'
fi

if has_changed '^(\.archon/|\.claude/|docs/AGENT_|docs/global-services/|backend/routers/(openclaw|paperclip|agent_platform)\.py|backend/services/(openclaw|paperclip|agent_platform).*)'; then
  require_changed '^(docs/AGENT_TOOL_SELECTION_MATRIX\.md|docs/AGENT_HARNESS_GUIDE\.md|docs/AGENTIC_BROWSER_WIRING_STATUS\.md|README\.md)$' 'Agent/tooling changes require agent/tool docs update.'
fi

note "Governance diff check passed for $diff_ref."
