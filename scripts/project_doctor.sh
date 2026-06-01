#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

FIX=0
FULL=0

for arg in "$@"; do
  case "$arg" in
    --fix)
      FIX=1
      ;;
    --full)
      FULL=1
      ;;
    -h|--help)
      cat <<'HELP'
Usage: ./scripts/project_doctor.sh [--fix] [--full]

Runs the project command-line health checks from one place.

Options:
  --fix   Install missing frontend/backend dependencies before checking.
  --full  Include slower checks such as Playwright e2e tests.
  --help  Show this help.

Default mode does not install anything. It reports what is missing and runs
checks that can run with the dependencies already present.
HELP
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Run ./scripts/project_doctor.sh --help"
      exit 2
      ;;
  esac
done

failures=0
warnings=0

section() {
  printf '\n== %s ==\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf 'WARN: %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf 'FAIL: %s\n' "$1"
}

run_check() {
  local label="$1"
  shift
  printf '\n-- %s\n' "$label"
  if "$@"; then
    printf 'OK: %s\n' "$label"
  else
    fail "$label"
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

section "Repository"
cd "$ROOT_DIR" || exit 1
printf 'Root: %s\n' "$ROOT_DIR"

if command_exists git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  untracked_count="$(git status --short --untracked-files=normal | wc -l | tr -d ' ')"
  printf 'Git changed/untracked entries: %s\n' "$untracked_count"
else
  warn "Not inside a git repository, or git is unavailable."
fi

for path in \
  "$FRONTEND_DIR/dist" \
  "$FRONTEND_DIR/node_modules" \
  "$FRONTEND_DIR/.git" \
  "$ROOT_DIR/.pytest_cache" \
  "$BACKEND_DIR/.pytest_cache"
do
  if [ -e "$path" ]; then
    warn "Generated/local artifact exists: ${path#$ROOT_DIR/}"
  fi
done

if find "$BACKEND_DIR" -type d -name '__pycache__' -print -quit | grep -q .; then
  warn "Python __pycache__ directories exist under backend/."
fi

section "Frontend"
if ! command_exists npm; then
  fail "npm is not installed."
else
  cd "$FRONTEND_DIR" || exit 1

  if [ ! -d node_modules ] || [ ! -d node_modules/react-markdown ]; then
    if [ "$FIX" -eq 1 ]; then
      run_check "npm install" npm install
    else
      warn "Frontend dependencies are incomplete. Run: ./scripts/project_doctor.sh --fix"
    fi
  fi

  if [ -d node_modules ]; then
    run_check "frontend build" npm run build
  else
    fail "frontend build skipped because node_modules is missing."
  fi

  if [ -f .eslintrc ] || [ -f .eslintrc.js ] || [ -f .eslintrc.cjs ] || [ -f .eslintrc.json ] || [ -f eslint.config.js ] || [ -f eslint.config.mjs ]; then
    run_check "frontend lint" npm run lint
  else
    warn "ESLint config is missing, so npm run lint will fail until config is added."
  fi

  if [ "$FULL" -eq 1 ]; then
    run_check "frontend e2e" npm run test:e2e
  fi
fi

section "Backend"
cd "$ROOT_DIR" || exit 1

if [ -n "${PYTHON:-}" ]; then
  PYTHON_BIN="$PYTHON"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
elif command_exists python3.11; then
  PYTHON_BIN="python3.11"
else
  PYTHON_BIN="python3"
fi
if ! command_exists "$PYTHON_BIN"; then
  fail "$PYTHON_BIN is not installed."
else
  if ! "$PYTHON_BIN" -c 'import redis' >/dev/null 2>&1; then
    if [ "$FIX" -eq 1 ]; then
      run_check "backend dependency install" "$PYTHON_BIN" -m pip install -r "$BACKEND_DIR/requirements.txt"
    else
      warn "Python redis package is missing in this environment. Run: ./scripts/project_doctor.sh --fix"
    fi
  fi

  if "$PYTHON_BIN" -c 'import pytest' >/dev/null 2>&1; then
    run_check "backend tests" env PYTHONPATH=backend "$PYTHON_BIN" -m pytest backend/tests -q -m not\ eval
  else
    if [ "$FIX" -eq 1 ]; then
      run_check "backend dependency install" "$PYTHON_BIN" -m pip install -r "$BACKEND_DIR/requirements.txt"
      run_check "backend tests" env PYTHONPATH=backend "$PYTHON_BIN" -m pytest backend/tests -q -m not\ eval
    else
      warn "pytest is missing in this environment. Run: ./scripts/project_doctor.sh --fix"
    fi
  fi
fi

section "Docs And Config"
if [ ! -d "$ROOT_DIR/.github/workflows" ]; then
  warn "README mentions GitHub Actions, but .github/workflows is missing."
fi

if [ ! -f "$ROOT_DIR/requirements.txt" ] && grep -Fq '../requirements.txt' "$ROOT_DIR/README.md"; then
  warn "README references ../requirements.txt, but backend/requirements.txt is the actual backend requirements file."
fi

if ! grep -q '"validate"' "$FRONTEND_DIR/package.json" && grep -q 'npm run validate' "$ROOT_DIR/README.md"; then
  warn "README mentions npm run validate, but frontend/package.json has no validate script."
fi

section "Summary"
printf 'Warnings: %s\n' "$warnings"
printf 'Failures: %s\n' "$failures"

if [ "$failures" -gt 0 ]; then
  exit 1
fi

exit 0
