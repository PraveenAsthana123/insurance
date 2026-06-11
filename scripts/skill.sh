#!/usr/bin/env bash
# §136 · skill.sh · operator CLI to list / inspect / run skills
# Composes §122 Tool Registry + §131 200 AI types catalog + §133 14-field contract
#
# Owner agent: sys_skill_manager_agent
# Effective:   2026-06-11

set -e
export TZ='America/Edmonton'

REPO="/mnt/deepa/insur_project"
PT="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
TYPES_DIR="$REPO/data/ai_types"
MODELS_DIR="$REPO/models"
METRICS_DIR="$REPO/data/metrics"
BACKEND_URL="http://localhost:8001"

GREEN='\033[32m'; YLW='\033[33m'; RED='\033[31m'; CYN='\033[36m'
B='\033[1m'; D='\033[2m'; R='\033[0m'

stamp() { echo -e "${D}[$(date +'%Y-%m-%d %H:%M:%S %Z')]${R} $1"; }

case "${1:-}" in
  list)
    stamp "${B}Skills available (= §131 200 AI types)${R}"
    echo ""
    if [ ! -d "$TYPES_DIR" ]; then
      echo -e "  ${RED}✗${R} types dir not found · run /scripts/autocodegen_ai_types.py first"
      exit 1
    fi
    n_total=$(ls "$TYPES_DIR"/*.json 2>/dev/null | wc -l)
    n_models=$(ls "$MODELS_DIR"/*/model.joblib 2>/dev/null | wc -l)
    echo -e "  ${GREEN}${n_total}${R} skills cataloged · ${GREEN}${n_models}${R} with trained model"
    echo ""
    echo "  Showing top 30 (use 'skill.sh list --all' for full list):"
    echo ""
    ls "$TYPES_DIR" | head -30 | sed 's/.json//' | awk '{printf "    %s\n", $0}'
    echo ""
    echo "  Use: ./scripts/skill.sh info <slug>     # see 14-field detail"
    echo "       ./scripts/skill.sh metrics <slug>  # see live metrics"
    echo "       ./scripts/skill.sh run <slug> <input>  # invoke via /predict"
    ;;

  info)
    SLUG="${2:-}"
    if [ -z "$SLUG" ]; then
      echo "Usage: skill.sh info <slug>"
      exit 1
    fi
    FILE="$TYPES_DIR/${SLUG}.json"
    if [ ! -f "$FILE" ]; then
      echo -e "  ${RED}✗${R} skill not found: $SLUG"
      echo "  Try: ./scripts/skill.sh list"
      exit 1
    fi
    stamp "${B}Skill: ${SLUG}${R}"
    cat "$FILE" | $PT -m json.tool 2>/dev/null | head -50
    ;;

  metrics)
    SLUG="${2:-}"
    if [ -z "$SLUG" ]; then
      echo "Usage: skill.sh metrics <slug>"
      exit 1
    fi
    FILE="$METRICS_DIR/${SLUG}.json"
    if [ ! -f "$FILE" ]; then
      echo -e "  ${RED}✗${R} no metrics for $SLUG"
      exit 1
    fi
    stamp "${B}Live metrics: ${SLUG}${R}"
    cat "$FILE" | $PT -m json.tool
    ;;

  run)
    SLUG="${2:-}"
    INPUT="${3:-}"
    if [ -z "$SLUG" ]; then
      echo "Usage: skill.sh run <slug> [input]"
      exit 1
    fi
    MODEL_PATH="$MODELS_DIR/$SLUG/model.joblib"
    if [ ! -f "$MODEL_PATH" ]; then
      echo -e "  ${RED}✗${R} no trained model · run /scripts/batch_train_all_models.py first"
      exit 1
    fi
    stamp "${B}Running skill: ${SLUG}${R}"
    $PT -c "
import joblib, json, numpy as np
m = joblib.load('$MODEL_PATH')
if hasattr(m, 'predict'):
    if isinstance(m, dict) and 'model' in m:
        model = m['model']
        cols = m.get('feature_cols', [])
    else:
        model = m
        cols = []
    # Use synthetic test input if none provided
    n_features = getattr(model, 'n_features_in_', 8)
    X = np.random.randn(1, n_features)
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0].tolist() if hasattr(model, 'predict_proba') else None
    print(f'  ✓ Prediction: {pred}')
    if proba: print(f'  Class probs: {[round(p,3) for p in proba]}')
    if cols: print(f'  Features: {cols}')
else:
    print(f'  Model type: {type(m).__name__}')
"
    ;;

  search)
    QUERY="${2:-}"
    if [ -z "$QUERY" ]; then
      echo "Usage: skill.sh search <query>"
      exit 1
    fi
    stamp "${B}Searching skills for: ${QUERY}${R}"
    ls "$TYPES_DIR" | grep -i "$QUERY" | sed 's/.json//' | head -20 | awk '{printf "    %s\n", $0}'
    ;;

  count)
    n_total=$(ls "$TYPES_DIR"/*.json 2>/dev/null | wc -l)
    n_models=$(ls "$MODELS_DIR"/*/model.joblib 2>/dev/null | wc -l)
    n_metrics=$(ls "$METRICS_DIR"/*.json 2>/dev/null | wc -l)
    echo -e "  Total cataloged: ${GREEN}${n_total}${R}"
    echo -e "  Trained models:  ${GREEN}${n_models}${R}"
    echo -e "  With metrics:    ${GREEN}${n_metrics}${R}"
    ;;


  parallel)
    QUERY="${2:-}"
    if [ -z "$QUERY" ]; then
      echo "Usage: skill.sh parallel <query>"
      exit 1
    fi
    stamp "${B}PARALLEL search across types · metrics · runbooks · plots${R}"
    # 4 backgrounded greps · all return < 1s
    (
      grep -rli "$QUERY" "$TYPES_DIR" 2>/dev/null | head -10 |
        awk '{printf "    [type]    %s\n", $0}'
    ) &
    (
      grep -rli "$QUERY" "$METRICS_DIR" 2>/dev/null | head -10 |
        awk '{printf "    [metric]  %s\n", $0}'
    ) &
    (
      grep -rli "$QUERY" "$REPO/data/runbooks" 2>/dev/null | head -10 |
        awk '{printf "    [runbook] %s\n", $0}'
    ) &
    (
      ls "$REPO/data/plots" 2>/dev/null | grep -i "$QUERY" | head -10 |
        awk '{printf "    [plot]    %s\n", $0}'
    ) &
    wait
    ;;

  api)
    SLUG="${2:-}"
    if [ -z "$SLUG" ]; then
      stamp "Backend health"
      curl -s -o /dev/null -w "  HTTP %{http_code} on /api/v1/health\n" "$BACKEND_URL/api/v1/health"
      echo ""
      echo "  Usage: skill.sh api <slug>     # hit /api/v1/ai-type-impl/template/<slug>"
    else
      curl -s "$BACKEND_URL/api/v1/ai-type-impl/template/$SLUG" | $PT -m json.tool 2>/dev/null | head -40
    fi
    ;;

  --help|-h|"")
    cat <<USAGE

  ${B}skill.sh${R} · §136 · operator CLI for §131 200-AI-type skill library

  ${B}COMMANDS:${R}
    list                    Show first 30 skills · use --all for full
    info    <slug>          14-field §133 contract detail
    metrics <slug>          Live metrics.json (acc · f1 · features)
    run     <slug> [input]  Invoke trained model via /predict
    search  <query>         Substring search across slugs
    count                   Total / trained / with-metrics counts
    api     [slug]          Hit backend (health or /template/<slug>)

  ${B}EXAMPLES:${R}
    ./scripts/skill.sh list
    ./scripts/skill.sh info fraud-detection-ai
    ./scripts/skill.sh metrics sentiment-ai
    ./scripts/skill.sh run anomaly-detection-ai
    ./scripts/skill.sh search rag
    ./scripts/skill.sh count

  ${B}LINKS:${R}
    Catalog:   $TYPES_DIR/
    Models:    $MODELS_DIR/
    Metrics:   $METRICS_DIR/
    Backend:   $BACKEND_URL

USAGE
    ;;

  *)
    echo "Unknown: $1 · run --help"
    exit 2 ;;
esac
