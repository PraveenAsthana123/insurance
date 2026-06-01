#!/usr/bin/env bash
# rename_project.sh — rebrand the project from one config file.
#
# Reads CURRENT identity from project.config (the source of truth) +
# the TARGET identity from CLI args or interactive prompt, then
# applies the rename across every internal file name + identifier.
#
# Usage:
#   scripts/rename_project.sh                                   # interactive
#   scripts/rename_project.sh apply                             # use current project.config as target
#   scripts/rename_project.sh <slug> <name> <website>           # set + apply
#   scripts/rename_project.sh --dry-run <slug> <name> <website> # preview only
#   scripts/rename_project.sh --status                          # show current vs target diff
#
# Examples:
#   scripts/rename_project.sh insur "Insurance Analytics Platform" "Insurance Analytics"
#   scripts/rename_project.sh --dry-run insur "Insurance" "Insurance"
#
# What gets renamed (the discoverability list):
#
#   PROJECT_SLUG (lowercase identifier — used in code/configs/file names)
#     ▸ Docker container names: ${SLUG}_postgres, ${SLUG}_redis, ${SLUG}_ollama, ${SLUG}_mlflow
#     ▸ PostgreSQL DB name: ${SLUG}_analytics
#     ▸ PostgreSQL user: ${SLUG}_user
#     ▸ Docker image tags + service names in docker-compose.yml
#     ▸ package.json "name" fields (frontend + root)
#     ▸ Health endpoint service string (backend/routers/health.py)
#     ▸ Screenshot files at repo root: ${SLUG}-*.png
#     ▸ Archon workflow names: ${SLUG}-project-doctor-fix, ${SLUG}-api-change-governance
#     ▸ Internal path references in docs
#
#   PROJECT_NAME (full human-readable name)
#     ▸ README h1 + project intros
#     ▸ Doc titles in docs/*.md
#     ▸ HTML <title> tags
#
#   PROJECT_WEBSITE_NAME (short display name)
#     ▸ Sidebar logo text
#     ▸ Email subject prefixes
#     ▸ Header references
#
# After running, the script:
#   1. Writes new values to project.config (authoritative).
#   2. Tracks last-applied state in .project-state (gitignored).
#   3. Reports diff + next steps.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

CONFIG_FILE="project.config"
STATE_FILE=".project-state"

# ---- argparse ----
DRY_RUN=false
SHOW_STATUS=false
USE_CONFIG_AS_TARGET=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true; shift ;;
        --status)
            SHOW_STATUS=true; shift ;;
        apply)
            USE_CONFIG_AS_TARGET=true; shift ;;
        *)
            break ;;
    esac
done

# ---- read CURRENT values from .project-state (last applied) ----
# .project-state is the authoritative record of what the codebase
# was rebranded TO last. project.config is what it should be NEXT.
if [[ -f "$STATE_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$STATE_FILE"
    CURRENT_SLUG="${PROJECT_SLUG:-insur}"
    CURRENT_NAME="${PROJECT_NAME:-}"
    CURRENT_WEBSITE="${PROJECT_WEBSITE_NAME:-}"
else
    # First run — assume codebase is still in "insur" / "BEV Analytics" state.
    CURRENT_SLUG="insur"
    CURRENT_NAME="BEV Analytics Dashboard"
    CURRENT_WEBSITE="BEV Analytics"
fi

# ---- determine TARGET values ----
if [[ "$SHOW_STATUS" == "true" ]]; then
    echo "=== Current applied state (from $STATE_FILE) ==="
    echo "  PROJECT_SLUG:         $CURRENT_SLUG"
    echo "  PROJECT_NAME:         $CURRENT_NAME"
    echo "  PROJECT_WEBSITE_NAME: $CURRENT_WEBSITE"
    if [[ -f "$CONFIG_FILE" ]]; then
        echo
        echo "=== Target state (from $CONFIG_FILE — will be applied by 'apply') ==="
        grep -E '^PROJECT_(SLUG|NAME|WEBSITE_NAME)=' "$CONFIG_FILE" | sed 's/^/  /'
    fi
    exit 0
fi

if [[ "$USE_CONFIG_AS_TARGET" == "true" ]]; then
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "ERROR: $CONFIG_FILE not found" >&2
        exit 2
    fi
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
    NEW_SLUG="$PROJECT_SLUG"
    NEW_NAME="$PROJECT_NAME"
    NEW_WEBSITE="$PROJECT_WEBSITE_NAME"
elif [[ $# -ge 3 ]]; then
    NEW_SLUG="$1"
    NEW_NAME="$2"
    NEW_WEBSITE="$3"
elif [[ $# -eq 0 ]]; then
    # Interactive prompts
    echo "=== Interactive rebrand ==="
    echo "Current:"
    echo "  slug:          $CURRENT_SLUG"
    echo "  name:          $CURRENT_NAME"
    echo "  website name:  $CURRENT_WEBSITE"
    echo
    read -r -p "New PROJECT_SLUG (lowercase letters/digits/_): " NEW_SLUG
    read -r -p "New PROJECT_NAME (human readable): " NEW_NAME
    read -r -p "New PROJECT_WEBSITE_NAME (short display): " NEW_WEBSITE
else
    echo "Usage: $0 [--dry-run] [--status] [apply] | [<slug> <name> <website>]" >&2
    exit 2
fi

# ---- validate slug ----
if ! [[ "$NEW_SLUG" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "ERROR: slug must be lowercase letters/digits/underscores, start with letter" >&2
    echo "Got: '$NEW_SLUG'" >&2
    exit 2
fi

# ---- summary ----
echo "=== Rebrand plan ==="
echo "  slug:    $CURRENT_SLUG  →  $NEW_SLUG"
echo "  name:    $CURRENT_NAME  →  $NEW_NAME"
echo "  website: $CURRENT_WEBSITE  →  $NEW_WEBSITE"
echo "  dry-run: $DRY_RUN"
echo

if [[ "$CURRENT_SLUG" == "$NEW_SLUG"
       && "$CURRENT_NAME" == "$NEW_NAME"
       && "$CURRENT_WEBSITE" == "$NEW_WEBSITE" ]]; then
    echo "INFO: nothing to change — current state already matches target"
    exit 0
fi

# ---- common find arguments ----
FIND_EXCLUDES=(
    -not -path './node_modules/*'
    -not -path './frontend/node_modules/*'
    -not -path './.venv/*'
    -not -path './venv/*'
    -not -path './.git/*'
    -not -path './__pycache__/*'
    -not -path '*/__pycache__/*'
    -not -path './.pytest_cache/*'
    -not -path './.ruff_cache/*'
    -not -path './.mypy_cache/*'
    -not -path "./$STATE_FILE"   # don't rewrite the state file mid-run
)

# ---- helpers ----

# replace_in_files <old> <new> <file_pattern> <description>
replace_in_files() {
    local old="$1" new="$2" pattern="$3" description="$4"
    [[ -z "$old" || "$old" == "$new" ]] && return
    echo "▸ $description"
    local files
    files=$(find . "${FIND_EXCLUDES[@]}" \
        \( -name "$pattern" \) -type f 2>/dev/null \
        | xargs -r grep -l "$old" 2>/dev/null || true)
    if [[ -z "$files" ]]; then
        echo "  (no matches for '$old')"
        return
    fi
    local n
    n=$(echo "$files" | wc -l)
    echo "  $n file(s) contain '$old'"
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "$files" | head -5 | sed 's/^/    preview: /'
        if [[ $n -gt 5 ]]; then echo "    … and $((n-5)) more"; fi
    else
        # Use perl rather than sed for safe handling of slashes / special chars.
        echo "$files" | xargs -r perl -i -pe "s/\Q${old}\E/${new}/g"
    fi
}

# rename screenshot/asset files at root with slug prefix
rename_files_with_slug_prefix() {
    local old="$1" new="$2"
    [[ -z "$old" || "$old" == "$new" ]] && return
    echo "▸ Renaming files with prefix '${old}-' → '${new}-'"
    local n_renamed=0
    for f in "${old}-"*.png "${old}-"*.jpg "${old}-"*.jpeg "${old}-"*.svg "${old}-"*.gif; do
        [[ -e "$f" ]] || continue
        local new_name="${new}-${f#${old}-}"
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "    $f → $new_name"
        else
            mv "$f" "$new_name"
        fi
        n_renamed=$((n_renamed + 1))
    done
    echo "  $n_renamed file(s) renamed"
}

# write the new state to .project-state (the authoritative record)
persist_state() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "▸ Would write new state to $STATE_FILE"
        return
    fi
    cat > "$STATE_FILE" <<EOF
# .project-state — record of the most recently APPLIED rename.
# Authoritative; do NOT edit by hand. Edit project.config + run
# scripts/rename_project.sh apply instead.
PROJECT_SLUG=${NEW_SLUG}
PROJECT_NAME=${NEW_NAME}
PROJECT_WEBSITE_NAME=${NEW_WEBSITE}
EOF
    echo "▸ Wrote new state to $STATE_FILE"
}

# also update the canonical config file so the next run sees the new values
persist_config() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "▸ Would update $CONFIG_FILE with new values"
        return
    fi
    if [[ -f "$CONFIG_FILE" ]]; then
        perl -i -pe "s/^PROJECT_SLUG=.*/PROJECT_SLUG=${NEW_SLUG}/" "$CONFIG_FILE"
        perl -i -pe "s/^PROJECT_NAME=.*/PROJECT_NAME=${NEW_NAME}/" "$CONFIG_FILE"
        perl -i -pe "s/^PROJECT_WEBSITE_NAME=.*/PROJECT_WEBSITE_NAME=${NEW_WEBSITE}/" "$CONFIG_FILE"
        echo "▸ Updated $CONFIG_FILE"
    fi
}

# ---- apply the renames in order from MOST SPECIFIC to LEAST SPECIFIC ----
# Slug appears as a substring of name/website strings sometimes, so we
# replace the LONGEST strings first (name then website then slug).

echo "--- Replacing PROJECT_NAME ---"
replace_in_files "$CURRENT_NAME" "$NEW_NAME" "*.md"     "PROJECT_NAME in markdown"
replace_in_files "$CURRENT_NAME" "$NEW_NAME" "*.json"   "PROJECT_NAME in JSON"
replace_in_files "$CURRENT_NAME" "$NEW_NAME" "*.html"   "PROJECT_NAME in HTML"
replace_in_files "$CURRENT_NAME" "$NEW_NAME" "*.yml"    "PROJECT_NAME in YAML"
replace_in_files "$CURRENT_NAME" "$NEW_NAME" "*.py"     "PROJECT_NAME in Python"
echo

echo "--- Replacing PROJECT_WEBSITE_NAME ---"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.md"   "PROJECT_WEBSITE_NAME in markdown"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.json" "PROJECT_WEBSITE_NAME in JSON"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.html" "PROJECT_WEBSITE_NAME in HTML"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.js"   "PROJECT_WEBSITE_NAME in JS"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.jsx"  "PROJECT_WEBSITE_NAME in JSX"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.ts"   "PROJECT_WEBSITE_NAME in TS"
replace_in_files "$CURRENT_WEBSITE" "$NEW_WEBSITE" "*.tsx"  "PROJECT_WEBSITE_NAME in TSX"
echo

echo "--- Replacing PROJECT_SLUG (lowercase identifier) ---"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.yml"     "PROJECT_SLUG in YAML"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.yaml"    "PROJECT_SLUG in YAML"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.json"    "PROJECT_SLUG in JSON"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.md"      "PROJECT_SLUG in markdown"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.py"      "PROJECT_SLUG in Python"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.sh"      "PROJECT_SLUG in shell"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.js"      "PROJECT_SLUG in JS"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.jsx"     "PROJECT_SLUG in JSX"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.ts"      "PROJECT_SLUG in TS"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "*.tsx"     "PROJECT_SLUG in TSX"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" ".env*"     "PROJECT_SLUG in .env*"
replace_in_files "$CURRENT_SLUG" "$NEW_SLUG" "Dockerfile*" "PROJECT_SLUG in Dockerfile"
echo

# ---- rename files with slug prefix ----
rename_files_with_slug_prefix "$CURRENT_SLUG" "$NEW_SLUG"
echo

# ---- persist new state + config ----
persist_state
persist_config

echo
echo "=== Done ==="
if [[ "$DRY_RUN" == "true" ]]; then
    echo "Dry-run — no files modified. Re-run without --dry-run to apply."
else
    echo "Next steps:"
    echo "  1. Inspect changes:        find . -newer $STATE_FILE -type f -not -path './node_modules/*' | head"
    echo "  2. Rebuild Docker images:  docker compose build"
    echo "  3. Reinstall frontend:     cd frontend && rm -rf node_modules && npm install"
    echo "  4. (if git-initialized):   git add -A && git commit -m 'chore: rename $CURRENT_SLUG → $NEW_SLUG'"
fi
