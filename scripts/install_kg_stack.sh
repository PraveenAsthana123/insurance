#!/usr/bin/env bash
# §127 · Iter 109 · install KG stack (the 26 SCAFFOLD tools from §123/§124).
#
# Modular installer · operator runs MANUALLY. Each tier is independent.
#
# Usage:
#   ./scripts/install_kg_stack.sh --pip-libs           # missing pip libs (~200MB)
#   ./scripts/install_kg_stack.sh --docker-core        # Fuseki + GraphDB + Memgraph + Tika (~3GB)
#   ./scripts/install_kg_stack.sh --docker-enterprise  # Stardog + RDF4J + Blazegraph + Virtuoso + Keycloak (~8GB)
#   ./scripts/install_kg_stack.sh --docker-compose-up  # start docker-compose.kg.yml
#   ./scripts/install_kg_stack.sh --models             # Ollama embedding models (~5GB)
#   ./scripts/install_kg_stack.sh --all                # everything · ~20GB
#   ./scripts/install_kg_stack.sh --status             # show what's installed
#   ./scripts/install_kg_stack.sh --dry-run            # show what would happen
#
# Each install reports verification: pip import test · docker ps · ollama tag

set -e
export TZ='America/Edmonton'

REPO="/mnt/deepa/insur_project"
PT="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
PIP="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/pip"
COMPOSE_FILE="$REPO/docker-compose.kg.yml"

GREEN='\033[32m'; YLW='\033[33m'; RED='\033[31m'; CYN='\033[36m'; B='\033[1m'; D='\033[2m'; R='\033[0m'

stamp() { echo -e "${D}[$(date +'%Y-%m-%d %H:%M:%S %Z')]${R} $1"; }

# ════════════════ INSTALL FUNCTIONS ════════════════
install_pip_libs() {
  stamp "${B}Installing missing PIP libs${R}"
  # Per §125 audit · these were NOT installed yet
  $PIP install --quiet --no-input \
    arize-phoenix \
    apache-airflow \
    paddleocr paddlepaddle \
    tika \
    2>&1 | tail -3 || true

  # Verify
  for lib in "phoenix" "airflow" "paddleocr" "tika"; do
    if $PT -c "import $lib" 2>/dev/null; then
      VER=$($PT -c "import $lib; print(getattr($lib,'__version__','?'))" 2>/dev/null | head -1)
      echo -e "  ${GREEN}✓${R} $lib v$VER"
    elif $PT -c "import arize.$lib" 2>/dev/null; then
      echo -e "  ${GREEN}✓${R} arize.$lib"
    else
      echo -e "  ${RED}✗${R} $lib · install failed · check pip log"
    fi
  done
}

install_docker_core() {
  stamp "${B}Pulling docker CORE: Fuseki + GraphDB + Memgraph + Tika${R}"
  echo "  This downloads ~3GB · stays in /var/lib/docker"
  for img in \
    "stain/jena-fuseki:latest-fuseki-4" \
    "ontotext/graphdb:10.6.4" \
    "memgraph/memgraph-platform:latest" \
    "apache/tika:latest-full"; do
    stamp "  pulling $img ..."
    docker pull "$img" 2>&1 | tail -3 || echo -e "    ${RED}✗${R} pull failed"
    docker images "${img%%:*}" --format "    {{.Repository}}:{{.Tag}} {{.Size}}" | head -1
  done
}

install_docker_enterprise() {
  stamp "${B}Pulling docker ENTERPRISE: Stardog + RDF4J + Blazegraph + Virtuoso + Keycloak${R}"
  echo "  This downloads ~8GB"
  for img in \
    "stardog/stardog:latest" \
    "eclipse/rdf4j-workbench:latest" \
    "openlink/virtuoso-opensource-7:latest" \
    "quay.io/keycloak/keycloak:latest"; do
    stamp "  pulling $img ..."
    docker pull "$img" 2>&1 | tail -3 || echo -e "    ${RED}✗${R} pull failed (may need login)"
  done
}

write_docker_compose() {
  stamp "${B}Writing $COMPOSE_FILE${R}"
  cat > "$COMPOSE_FILE" <<'YAML'
# §127 KG stack docker-compose · Iter 109
# Start: docker compose -f docker-compose.kg.yml up -d
# Stop:  docker compose -f docker-compose.kg.yml down

services:
  fuseki:
    image: stain/jena-fuseki:latest-fuseki-4
    container_name: insur-fuseki
    ports: ["3030:3030"]
    environment:
      - ADMIN_PASSWORD=admin123
    volumes:
      - fuseki-data:/fuseki
    restart: unless-stopped

  graphdb:
    image: ontotext/graphdb:10.6.4
    container_name: insur-graphdb
    ports: ["7200:7200"]
    volumes:
      - graphdb-data:/opt/graphdb/home
    restart: unless-stopped

  memgraph:
    image: memgraph/memgraph-platform:latest
    container_name: insur-memgraph
    ports:
      - "7687:7687"   # bolt
      - "7444:7444"   # ws
      - "3000:3000"   # lab UI
    volumes:
      - memgraph-data:/var/lib/memgraph
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
    volumes:
      - qdrant-data:/qdrant/storage
    restart: unless-stopped

  # Enterprise tier
  stardog:
    image: stardog/stardog:latest
    container_name: insur-stardog
    ports: ["5820:5820"]
    profiles: ["enterprise"]
    environment:
      - STARDOG_PASSWORD=admin123
    volumes:
      - stardog-data:/var/opt/stardog

  rdf4j:
    image: eclipse/rdf4j-workbench:latest
    container_name: insur-rdf4j
    ports: ["8080:8080"]
    profiles: ["enterprise"]
    volumes:
      - rdf4j-data:/var/rdf4j

  virtuoso:
    image: openlink/virtuoso-opensource-7:latest
    container_name: insur-virtuoso
    ports:
      - "8890:8890"
      - "1111:1111"
    profiles: ["enterprise"]
    environment:
      - DBA_PASSWORD=admin123

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: insur-keycloak
    ports: ["8180:8080"]
    profiles: ["enterprise"]
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin123
    command: start-dev

volumes:
  fuseki-data:
  graphdb-data:
  memgraph-data:
  qdrant-data:
  stardog-data:
  rdf4j-data:
YAML
  echo -e "  ${GREEN}✓${R} $COMPOSE_FILE written"
}

compose_up_core() {
  stamp "${B}Starting docker-compose CORE services${R}"
  write_docker_compose
  cd "$REPO"
  docker compose -f "$COMPOSE_FILE" up -d fuseki graphdb memgraph tika qdrant 2>&1 | tail -10
  sleep 6
  echo ""
  stamp "Service URLs after startup:"
  echo "    Fuseki         http://localhost:3030  (admin/admin123)"
  echo "    GraphDB        http://localhost:7200"
  echo "    Memgraph Lab   http://localhost:3000"
  echo "    Tika           http://localhost:9998/tika"
  echo "    Qdrant         http://localhost:6333/dashboard"
  echo ""
  stamp "Env vars to add (~/.bashrc):"
  echo "    export FUSEKI_URL=http://localhost:3030"
  echo "    export GRAPHDB_URL=http://localhost:7200"
  echo "    export MEMGRAPH_URL=bolt://localhost:7687"
  echo "    export TIKA_URL=http://localhost:9998"
  echo "    export QDRANT_URL=http://localhost:6333"
}

install_ollama_models() {
  stamp "${B}Pulling Ollama embedding models${R}"
  for m in "bge-m3" "bge-large" "mxbai-embed-large"; do
    stamp "  pulling $m ..."
    if curl -s http://localhost:11434/api/tags | grep -q "\"name\":\"$m"; then
      echo -e "    ${GREEN}✓${R} $m already pulled"
    else
      curl -s -X POST http://localhost:11434/api/pull \
        -d "{\"name\":\"$m\"}" 2>&1 | tail -3 || echo -e "    ${RED}✗${R} pull failed"
    fi
  done
}

show_status() {
  stamp "${B}INSTALL STATUS · live check${R}"
  echo ""
  echo "  ─── PIP libs ───"
  for lib in rdflib pyshacl owlrl SPARQLWrapper owlready2 simpy mesa neo4j \
             dbt gliner spacy unstructured docling dagster prefect \
             graphrag langgraph llama_index paddleocr phoenix airflow tika; do
    if $PT -c "import $lib" 2>/dev/null; then echo -e "    ${GREEN}✓${R} $lib"
    else echo -e "    ${RED}✗${R} $lib"; fi
  done

  echo ""
  echo "  ─── Docker services running ───"
  docker ps --format "    {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null | head -15

  echo ""
  echo "  ─── Ollama embedding models ───"
  curl -s http://localhost:11434/api/tags 2>/dev/null | \
    $PT -c "
import json, sys
d = json.load(sys.stdin)
emb = [m['name'] for m in d.get('models', [])
       if any(k in m['name'].lower() for k in ['bge','e5','m3','embed','nomic','mxbai'])]
for m in emb: print(f'    ✓ {m}')
" 2>/dev/null || echo "    (Ollama not reachable)"

  echo ""
  echo "  ─── Backend health ───"
  curl -s -o /dev/null -w "    Backend /api/v1/health · HTTP %{http_code}\n" \
    http://localhost:8001/api/v1/health
}

# ════════════════ MAIN ════════════════
case "${1:-}" in
  --pip-libs)
    install_pip_libs
    ;;
  --docker-core)
    install_docker_core
    write_docker_compose
    ;;
  --docker-enterprise)
    install_docker_enterprise
    write_docker_compose
    ;;
  --docker-compose-up)
    compose_up_core
    ;;
  --models)
    install_ollama_models
    ;;
  --all)
    install_pip_libs
    install_docker_core
    install_docker_enterprise
    install_ollama_models
    write_docker_compose
    show_status
    ;;
  --status)
    show_status
    ;;
  --dry-run)
    stamp "${B}DRY RUN · what would happen${R}"
    echo ""
    echo "  --pip-libs           · pip install: arize-phoenix · apache-airflow · paddleocr+paddle · tika  (~500MB)"
    echo "  --docker-core        · docker pull: stain/jena-fuseki · ontotext/graphdb · memgraph-platform · apache/tika · qdrant  (~3GB)"
    echo "  --docker-enterprise  · docker pull: stardog · rdf4j · virtuoso · keycloak  (~8GB)"
    echo "  --docker-compose-up  · docker compose up -d  (5 core services)"
    echo "  --models             · ollama pull: bge-m3 · bge-large · mxbai-embed-large  (~5GB)"
    echo "  --all                · everything (~16GB · ~30 min wall clock)"
    echo ""
    echo "  Then: export FUSEKI_URL=http://localhost:3030 (etc.) and restart backend"
    ;;
  --help|-h|"")
    cat <<USAGE

  $(basename $0) · §127 KG stack manual installer

  COMMANDS:
    --pip-libs           Install missing pip libs (Phoenix · Airflow · PaddleOCR · Tika · ~500MB)
    --docker-core        Pull docker core (Fuseki · GraphDB · Memgraph · Tika · Qdrant · ~3GB)
    --docker-enterprise  Pull docker enterprise (Stardog · RDF4J · Virtuoso · Keycloak · ~8GB)
    --docker-compose-up  Start docker-compose with core services
    --models             Pull Ollama embedding models (bge-m3/bge-large/mxbai · ~5GB)
    --all                Run everything (~16GB · 30 min)
    --status             Show current install state
    --dry-run            Preview without changes

  EXAMPLES:
    $(basename $0) --status                     # see what's installed
    $(basename $0) --dry-run                    # safe preview
    $(basename $0) --pip-libs                   # smallest install
    $(basename $0) --docker-core && $(basename $0) --docker-compose-up
    $(basename $0) --all                        # do everything (operator decides)

  AFTER INSTALL · set env vars + restart backend:
    export FUSEKI_URL=http://localhost:3030
    export GRAPHDB_URL=http://localhost:7200
    export MEMGRAPH_URL=bolt://localhost:7687
    export TIKA_URL=http://localhost:9998
    export QDRANT_URL=http://localhost:6333
    pkill -9 -f launch_backend
    nohup $PT $REPO/scripts/launch_backend.py >> $REPO/jobs/logs/backend.log 2>&1 &

USAGE
    ;;
  *)
    echo "Unknown command: $1 · run --help"
    exit 2
    ;;
esac
