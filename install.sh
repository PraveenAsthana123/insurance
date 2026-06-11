#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# /mnt/deepa/insur_project/install.sh
#
# SINGLE script · one command installs EVERYTHING for the insur platform.
#
# Owner agent: sys_install_manager_agent
# Policy:      §127 (manual install) + §129 (one agent per script)
# Iter:        111
#
# Usage:
#   ./install.sh             # install EVERYTHING (~16GB · ~30min)
#   ./install.sh --status    # show what's installed
#   ./install.sh --help      # show all options
# ═══════════════════════════════════════════════════════════════════════

set -e
export TZ='America/Edmonton'

REPO="/mnt/deepa/insur_project"
PT="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
PIP="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/pip"

GREEN='\033[32m'; YLW='\033[33m'; RED='\033[31m'; CYN='\033[36m'
B='\033[1m'; D='\033[2m'; R='\033[0m'

stamp() { echo -e "${D}[$(date +'%Y-%m-%d %H:%M:%S %Z')]${R} $1"; }
banner() { echo -e "\n${B}${CYN}━━━ $1 ━━━${R}\n"; }

# ════════════════════════════════════════════════════════════════════════
# STAGE 1 · PIP libs (Phoenix · Airflow · PaddleOCR · Tika · video pipe)
# ════════════════════════════════════════════════════════════════════════
install_pip() {
  banner "STAGE 1 · PIP libs (~1.5GB · ~3min)"
  stamp "Installing all missing pip packages"
  $PIP install --quiet --no-input \
    arize-phoenix apache-airflow paddleocr paddlepaddle \
    faster-whisper opencv-python ffmpeg-python scenedetect moviepy \
    gliner youtube-transcript-api yt-dlp pytube \
    google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2 \
    2>&1 | tail -3 || true

  for lib in arize.phoenix airflow paddleocr faster_whisper cv2 ffmpeg \
              scenedetect moviepy gliner yt_dlp; do
    if $PT -c "import $lib" 2>/dev/null; then
      echo -e "  ${GREEN}✓${R} $lib"
    else
      echo -e "  ${RED}✗${R} $lib"
    fi
  done
}

# ════════════════════════════════════════════════════════════════════════
# STAGE 2 · DOCKER core (Fuseki + GraphDB + Memgraph + Tika + Qdrant)
# ════════════════════════════════════════════════════════════════════════
install_docker_core() {
  banner "STAGE 2 · Docker core (~3GB · ~8min)"
  for img in \
    "stain/jena-fuseki:latest-fuseki-4" \
    "ontotext/graphdb:10.6.4" \
    "memgraph/memgraph-platform:latest" \
    "apache/tika:latest-full" \
    "qdrant/qdrant:latest"; do
    stamp "Pulling $img"
    docker pull "$img" 2>&1 | tail -2 || echo -e "  ${RED}✗${R} pull failed"
  done
}

# ════════════════════════════════════════════════════════════════════════
# STAGE 3 · DOCKER COMPOSE up
# ════════════════════════════════════════════════════════════════════════
write_compose_and_start() {
  banner "STAGE 3 · docker-compose.kg.yml · start services"

  cat > "$REPO/docker-compose.kg.yml" <<'YAML'
services:
  fuseki:
    image: stain/jena-fuseki:latest-fuseki-4
    container_name: insur-fuseki
    ports: ["3030:3030"]
    environment:
      - ADMIN_PASSWORD=admin123
    volumes: [fuseki-data:/fuseki]
    restart: unless-stopped

  graphdb:
    image: ontotext/graphdb:10.6.4
    container_name: insur-graphdb
    ports: ["7200:7200"]
    volumes: [graphdb-data:/opt/graphdb/home]
    restart: unless-stopped

  memgraph:
    image: memgraph/memgraph-platform:latest
    container_name: insur-memgraph
    ports:
      - "7687:7687"
      - "7444:7444"
      - "3001:3000"
    volumes: [memgraph-data:/var/lib/memgraph]
    restart: unless-stopped

  tika:
    image: apache/tika:latest-full
    container_name: insur-tika
    ports: ["9998:9998"]
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    container_name: insur-qdrant
    ports: ["6333:6333"]
    volumes: [qdrant-data:/qdrant/storage]
    restart: unless-stopped

volumes:
  fuseki-data:
  graphdb-data:
  memgraph-data:
  qdrant-data:
YAML

  stamp "docker-compose.kg.yml written"
  cd "$REPO"
  docker compose -f docker-compose.kg.yml up -d 2>&1 | tail -10 || \
    echo -e "  ${RED}✗${R} compose up failed (docker daemon?)"
  sleep 6

  echo ""
  echo -e "  ${GREEN}✓${R} Service URLs:"
  echo "    Fuseki      http://localhost:3030  (admin/admin123)"
  echo "    GraphDB     http://localhost:7200"
  echo "    Memgraph    http://localhost:3001"
  echo "    Tika        http://localhost:9998/tika"
  echo "    Qdrant      http://localhost:6333/dashboard"
}

# ════════════════════════════════════════════════════════════════════════
# STAGE 4 · OLLAMA embedding + vision models
# ════════════════════════════════════════════════════════════════════════
install_ollama() {
  banner "STAGE 4 · Ollama models (~10GB · ~15min)"
  for m in "bge-m3" "bge-large" "mxbai-embed-large" "qwen2.5vl" "llava"; do
    stamp "Pulling $m"
    if curl -s http://localhost:11434/api/tags | grep -q "\"name\":\"$m"; then
      echo -e "  ${GREEN}✓${R} $m already pulled"
    else
      curl -s -X POST http://localhost:11434/api/pull -d "{\"name\":\"$m\"}" \
        2>&1 | tail -2 || echo -e "  ${RED}✗${R} pull failed"
    fi
  done
}

# ════════════════════════════════════════════════════════════════════════
# STAGE 5 · ENV VARS to ~/.bashrc
# ════════════════════════════════════════════════════════════════════════
write_env() {
  banner "STAGE 5 · ENV vars (add to ~/.bashrc)"
  cat > "$REPO/.insur-env.sh" <<'EOF'
# Source: source /mnt/deepa/insur_project/.insur-env.sh
export FUSEKI_URL=http://localhost:3030
export GRAPHDB_URL=http://localhost:7200
export MEMGRAPH_URL=bolt://localhost:7687
export TIKA_URL=http://localhost:9998
export QDRANT_URL=http://localhost:6333
export OLLAMA_URL=http://localhost:11434
EOF
  echo -e "  ${GREEN}✓${R} Written: $REPO/.insur-env.sh"
  echo ""
  echo "  Run NOW (or add to ~/.bashrc):"
  echo "    source $REPO/.insur-env.sh"
}

# ════════════════════════════════════════════════════════════════════════
# STAGE 6 · RESTART backend
# ════════════════════════════════════════════════════════════════════════
restart_backend() {
  banner "STAGE 6 · Restart backend with new env"
  stamp "Killing old backend"
  pkill -9 -f "launch_backend" 2>/dev/null || true
  sleep 3

  stamp "Starting fresh"
  source "$REPO/.insur-env.sh" 2>/dev/null || true
  systemd-run --user --scope --unit=insur-backend-$(date +%s) \
    $PT $REPO/scripts/launch_backend.py >> $REPO/jobs/logs/backend.log 2>&1 &
  disown -a 2>/dev/null || true
  sleep 8

  if curl -s -f -o /dev/null http://localhost:8001/api/v1/health 2>/dev/null; then
    echo -e "  ${GREEN}✓${R} Backend alive · http://localhost:8001"
  else
    echo -e "  ${YLW}!${R} Backend not yet up · check log"
  fi
}

# ════════════════════════════════════════════════════════════════════════
# STATUS
# ════════════════════════════════════════════════════════════════════════
show_status() {
  banner "STATUS · live snapshot"
  echo "  ─── PIP libs ───"
  for lib in rdflib pyshacl owlrl SPARQLWrapper owlready2 simpy mesa \
             neo4j dbt gliner spacy unstructured docling dagster prefect \
             graphrag langgraph llama_index paddleocr arize.phoenix airflow \
             faster_whisper cv2 ffmpeg scenedetect moviepy yt_dlp \
             youtube_transcript_api; do
    if $PT -c "import $lib" 2>/dev/null; then echo -e "    ${GREEN}✓${R} $lib"
    else echo -e "    ${RED}✗${R} $lib"; fi
  done

  echo ""
  echo "  ─── Docker services ───"
  docker ps --format "    {{.Names}}  {{.Status}}" 2>/dev/null | grep -E "insur|graphdb|fuseki|memgraph|tika|qdrant|stardog|keycloak" | head -10

  echo ""
  echo "  ─── Ollama models ───"
  curl -s http://localhost:11434/api/tags 2>/dev/null | $PT -c "
import json, sys
d = json.load(sys.stdin)
for m in d.get('models', []): print(f'    ✓ {m[\"name\"]}')
" 2>/dev/null | head -15

  echo ""
  echo "  ─── Backend ───"
  curl -s -o /dev/null -w "    HTTP %{http_code} on http://localhost:8001/api/v1/health\n" \
    http://localhost:8001/api/v1/health
}

# ════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════
case "${1:-}" in
  --status)  show_status; exit 0 ;;
  --pip)     install_pip; exit 0 ;;
  --docker)  install_docker_core; write_compose_and_start; exit 0 ;;
  --ollama)  install_ollama; exit 0 ;;
  --env)     write_env; exit 0 ;;
  --restart) restart_backend; exit 0 ;;
  --help|-h)
    cat <<USAGE

  ${B}install.sh${R} · §127 + §129 single-script installer
  Owner: sys_install_manager_agent

  ${B}USAGE:${R}
    ./install.sh             Install EVERYTHING (~16GB · ~30min)
    ./install.sh --status    Show what's installed
    ./install.sh --pip       Stage 1 only: pip libs (~1.5GB · 3min)
    ./install.sh --docker    Stage 2+3: docker core + compose-up (~3GB · 8min)
    ./install.sh --ollama    Stage 4: Ollama models (~10GB · 15min)
    ./install.sh --env       Stage 5: write .insur-env.sh
    ./install.sh --restart   Stage 6: restart backend
    ./install.sh --help      This message

  ${B}AFTER INSTALL:${R}
    source /mnt/deepa/insur_project/.insur-env.sh

USAGE
    exit 0 ;;
  "")
    # NO ARGS = INSTALL EVERYTHING
    banner "${B}INSTALL EVERYTHING${R} · ~16GB · ~30 minutes"
    echo "  Operator agreed by running with no args. Stages will run sequentially."
    echo "  Ctrl-C to abort safely between stages."
    sleep 3
    install_pip
    install_docker_core
    write_compose_and_start
    install_ollama
    write_env
    restart_backend
    show_status
    echo ""
    banner "${GREEN}✓ INSTALL COMPLETE${R}"
    echo "  Next: source /mnt/deepa/insur_project/.insur-env.sh"
    ;;
  *)
    echo "Unknown: $1 · run --help"
    exit 2 ;;
esac
