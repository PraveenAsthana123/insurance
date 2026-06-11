"""/api/v1/platform-hub/* · §130 · single-page UI integrating ALL applications."""
from __future__ import annotations
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/platform-hub", tags=["platform-hub"])


# ════════════════ THE REGISTRY · everything in one place ════════════════
APPS = [
    # Core platform
    {"id": "api-docs",         "name": "API Docs (Swagger)",        "category": "Core",
     "url": "/docs", "icon": "📋", "policy": "Standard"},
    {"id": "platform-identity","name": "Platform Identity (§107)",  "category": "Core",
     "url": "/api/v1/platform-identity", "icon": "🔐", "policy": "§107"},
    {"id": "health",            "name": "Health Check",              "category": "Core",
     "url": "/api/v1/health", "icon": "💚", "policy": "Standard"},

    # Agent Kernel (§121-122)
    {"id": "kernel-overview",   "name": "Agent Kernel Overview",     "category": "Agent Kernel (§121)",
     "url": "/api/v1/agent-kernel/overview", "icon": "🧠", "policy": "§121"},
    {"id": "kernel-health",     "name": "Kernel Health",             "category": "Agent Kernel (§121)",
     "url": "/api/v1/agent-kernel/health", "icon": "🧠", "policy": "§121"},
    {"id": "workflow-engine",   "name": "Workflow Engine (§121)",    "category": "Agent Kernel (§121)",
     "url": "/api/v1/agent-kernel/workflow-engine/list", "icon": "🔄", "policy": "§121"},
    {"id": "cost-usage",        "name": "Cost & Budget Engine",      "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/cost/usage?tenant_id=default", "icon": "💰", "policy": "§122"},
    {"id": "hitl-queue",        "name": "HITL Approval Queue",       "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/hitl/queue", "icon": "✋", "policy": "§122"},
    {"id": "eval-sets",         "name": "Eval Engine",               "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/eval/sets", "icon": "📊", "policy": "§122"},
    {"id": "registry-prompts",  "name": "Prompt Registry",           "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/registry/prompts", "icon": "📝", "policy": "§122"},
    {"id": "registry-models",   "name": "Model Registry",            "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/registry/models", "icon": "🤖", "policy": "§122"},
    {"id": "registry-tools",    "name": "Tool Registry",             "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/registry/tools", "icon": "🔧", "policy": "§122"},
    {"id": "brutal-feedback",   "name": "Brutal Feedback (§122)",    "category": "Agent Kernel (§122)",
     "url": "/api/v1/agent-kernel/brutal-feedback/health", "icon": "🔥", "policy": "§122"},

    # LLM Gateway (§108-114)
    {"id": "llm-gateway",       "name": "LLM Gateway (9 caps)",      "category": "LLM Gateway (§108-114)",
     "url": "/api/v1/llm-gateway/health", "icon": "🤖", "policy": "§108"},
    {"id": "llm-ollama-plan",   "name": "Ollama 4-tier Plan",        "category": "LLM Gateway (§108-114)",
     "url": "/api/v1/llm-gateway/ollama/plan", "icon": "🦙", "policy": "§111"},
    {"id": "integrations-hub",  "name": "Integrations Hub (§114)",   "category": "LLM Gateway (§108-114)",
     "url": "/api/v1/integrations-hub", "icon": "🧰", "policy": "§114"},

    # Goal & Orchestra (§115-118)
    {"id": "goal-loop",         "name": "Goal Loop (§115)",          "category": "Autonomy (§115-118)",
     "url": "/api/v1/goal-loop/health", "icon": "🎯", "policy": "§115"},
    {"id": "orchestra",         "name": "5-Agent Orchestra (§117)",  "category": "Autonomy (§115-118)",
     "url": "/api/v1/orchestra/health", "icon": "🎼", "policy": "§117"},
    {"id": "orchestra-runs",    "name": "Orchestra Runs",            "category": "Autonomy (§115-118)",
     "url": "/api/v1/orchestra/runs/recent", "icon": "🎼", "policy": "§117"},
    {"id": "agent-workflow",    "name": "Agent Workflow Catalog",    "category": "Autonomy (§115-118)",
     "url": "/api/v1/agent-workflow/", "icon": "🔄", "policy": "§115"},

    # Advisor & Findings
    {"id": "advisor-summary",   "name": "Missing Items Advisor",     "category": "Advisor",
     "url": "/api/v1/missing-items-advisor/summary", "icon": "🔍", "policy": "§80"},

    # Maturity & Architecture (§101-103, §47)
    {"id": "maturity-level",    "name": "Maturity Level (§103)",     "category": "Architecture",
     "url": "/api/v1/maturity-model/level", "icon": "📈", "policy": "§103"},
    {"id": "enterprise-std",    "name": "Enterprise Standard (§101)","category": "Architecture",
     "url": "/api/v1/enterprise-standard/coverage", "icon": "🏛️", "policy": "§101"},
    {"id": "frontend-gov",      "name": "Frontend Governance (§102)","category": "Architecture",
     "url": "/api/v1/frontend-governance/coverage", "icon": "🎨", "policy": "§102"},

    # Semantic Graph (§123)
    {"id": "semgraph-catalog",  "name": "Semantic Graph Catalog",    "category": "Semantic Graph (§123)",
     "url": "/api/v1/semantic-graph/catalog", "icon": "🕸️", "policy": "§123"},
    {"id": "semgraph-health",   "name": "Semantic Graph Health",     "category": "Semantic Graph (§123)",
     "url": "/api/v1/semantic-graph/health", "icon": "🕸️", "policy": "§123"},

    # KG Stack (§124)
    {"id": "kg-overview",       "name": "KG Stack Overview (§124)",  "category": "Enterprise KG (§124)",
     "url": "/api/v1/kg-stack/overview", "icon": "📚", "policy": "§124"},
    {"id": "kg-architecture",   "name": "13-Layer Architecture",     "category": "Enterprise KG (§124)",
     "url": "/api/v1/kg-stack/architecture", "icon": "🏗️", "policy": "§124"},
    {"id": "kg-build-plan",     "name": "18-Phase Build Plan",       "category": "Enterprise KG (§124)",
     "url": "/api/v1/kg-stack/build-plan", "icon": "📅", "policy": "§124"},
    {"id": "kg-brutal",         "name": "15 Brutal Missing Items",   "category": "Enterprise KG (§124)",
     "url": "/api/v1/kg-stack/brutal-missing-items", "icon": "🔥", "policy": "§124"},
    {"id": "kg-kpis",           "name": "KG + GraphRAG KPIs",        "category": "Enterprise KG (§124)",
     "url": "/api/v1/kg-stack/kpis", "icon": "📊", "policy": "§124"},

    # Request Tracker (§125)
    {"id": "install-status",    "name": "Install Status (§125)",     "category": "Operations (§125)",
     "url": "/api/v1/request-tracker/install-status", "icon": "📦", "policy": "§125"},

    # Claims Dept Demo (§126)
    {"id": "claims-overview",   "name": "Claims Dept Overview",      "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/overview", "icon": "📋", "policy": "§126"},
    {"id": "claims-dashboard",  "name": "Claims Dashboard",          "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/dashboard", "icon": "📊", "policy": "§126"},
    {"id": "claims-value",      "name": "Claims Value Impact ($16M)","category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/value-impact", "icon": "💰", "policy": "§126"},
    {"id": "claims-user-story", "name": "Claims User Story",         "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/user-story", "icon": "👤", "policy": "§126"},
    {"id": "claims-demo-story", "name": "Claims Demo Story",         "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/demo-story", "icon": "🎬", "policy": "§126"},
    {"id": "claims-xai",        "name": "Claims XAI (CL-002)",       "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/xai/CL-002", "icon": "🔬", "policy": "§126"},
    {"id": "claims-rai",        "name": "Claims RAI (5 pillars)",    "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/rai", "icon": "⚖️", "policy": "§126"},
    {"id": "claims-as-is",      "name": "Claims AS-IS → TO-BE",      "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/as-is-to-be", "icon": "📊", "policy": "§126"},
    {"id": "claims-scenarios",  "name": "Claims 7 Demo Scenarios",   "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/demo-scenarios", "icon": "🎬", "policy": "§126"},
    {"id": "claims-agents",     "name": "Claims 7 Agents",           "category": "Claims Dept (§126)",
     "url": "/api/v1/dept/claims/agents", "icon": "🤖", "policy": "§126"},


    {"id": "taxonomy-overview",  "name": "AI Taxonomy Overview",      "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/overview", "icon": "📚", "policy": "§131"},
    {"id": "taxonomy-domains",   "name": "10 Mega-Domains",           "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domains", "icon": "🏛️", "policy": "§131"},
    {"id": "taxonomy-categories","name": "100 Categories",            "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/categories", "icon": "📋", "policy": "§131"},
    {"id": "taxonomy-types",     "name": "200 AI Types",              "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/types", "icon": "🤖", "policy": "§131"},
    {"id": "taxonomy-claims",    "name": "Claims = 110 capabilities", "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/claims-capabilities", "icon": "💡", "policy": "§131"},
    {"id": "taxonomy-maturity",  "name": "20-Level Maturity Model",   "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/maturity-model", "icon": "📈", "policy": "§131"},
    {"id": "taxonomy-domain-1",  "name": "Domain 1: Intelligence AI", "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/1", "icon": "🧠", "policy": "§131"},
    {"id": "taxonomy-domain-2",  "name": "Domain 2: Learning AI",     "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/2", "icon": "🎓", "policy": "§131"},
    {"id": "taxonomy-domain-3",  "name": "Domain 3: Reasoning AI",    "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/3", "icon": "💭", "policy": "§131"},
    {"id": "taxonomy-domain-4",  "name": "Domain 4: Planning AI",     "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/4", "icon": "📅", "policy": "§131"},
    {"id": "taxonomy-domain-5",  "name": "Domain 5: Memory AI",       "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/5", "icon": "🧠", "policy": "§131"},
    {"id": "taxonomy-domain-6",  "name": "Domain 6: Knowledge AI",    "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/domain/6", "icon": "📚", "policy": "§131"},
    {"id": "taxonomy-enterprise","name": "Enterprise · 13×80=1040",   "category": "AI Taxonomy (§131)",
     "url": "/api/v1/ai-taxonomy/full-enterprise-counts", "icon": "🏢", "policy": "§131"},

    # Video Intel (§128)
    {"id": "video-overview",    "name": "Video Intel Overview",      "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/overview", "icon": "🎥", "policy": "§128"},
    {"id": "video-pipeline",    "name": "14-Step Video Pipeline",    "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/pipeline", "icon": "🎞️", "policy": "§128"},
    {"id": "video-catalog",     "name": "54-Tool Video Catalog",     "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/catalog", "icon": "🛠️", "policy": "§128"},
    {"id": "video-brutal",      "name": "20 Brutal Forgotten Items", "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/brutal-forgotten", "icon": "🔥", "policy": "§128"},
    {"id": "video-audio",       "name": "Audio → Text Sub-pipeline", "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/audio-to-text", "icon": "🎙️", "policy": "§128"},
    {"id": "video-image",       "name": "Image → Text Sub-pipeline", "category": "Video Intel (§128)",
     "url": "/api/v1/video-intel/image-to-text", "icon": "🖼️", "policy": "§128"},
]


@router.get("/registry")
def registry():
    """JSON registry of every integrated app."""
    cats = {}
    for a in APPS:
        cats.setdefault(a["category"], []).append(a)
    return {**stamp(), "n_apps": len(APPS), "n_categories": len(cats),
            "by_category": cats, "spec": "§130 platform hub"}


@router.get("/ui", response_class=HTMLResponse)
def ui():
    """Single-page UI · ALL applications integrated · operator clicks any tile."""
    # Group by category
    cats = {}
    for a in APPS:
        cats.setdefault(a["category"], []).append(a)

    cat_html = []
    for cat, items in cats.items():
        tiles = []
        for a in items:
            tiles.append(f'''
        <a class="tile" href="{a["url"]}" target="_blank">
          <div class="icon">{a["icon"]}</div>
          <div class="name">{a["name"]}</div>
          <div class="policy">{a["policy"]}</div>
        </a>''')
        cat_html.append(f'''
      <section class="cat">
        <h2>{cat}</h2>
        <div class="tiles">{"".join(tiles)}</div>
      </section>''')

    s = stamp()
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>insur · Platform Hub (§130)</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0d1117; color: #c9d1d9;
    padding: 24px; min-height: 100vh;
  }}
  header {{
    margin-bottom: 24px; padding: 20px 24px;
    background: linear-gradient(135deg, #1f6feb 0%, #8957e5 100%);
    border-radius: 12px;
  }}
  header h1 {{ color: #fff; font-size: 28px; margin-bottom: 6px; }}
  header .meta {{ color: rgba(255,255,255,.85); font-size: 13px; }}
  .stats {{ display: flex; gap: 20px; margin-top: 12px; }}
  .stat {{ background: rgba(255,255,255,.15); padding: 8px 16px; border-radius: 6px; color: #fff; font-size: 13px; }}
  .cat {{ margin-bottom: 32px; }}
  .cat h2 {{
    font-size: 18px; color: #58a6ff; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid #30363d;
  }}
  .tiles {{
    display: grid; gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }}
  .tile {{
    background: #161b22; padding: 16px;
    border-radius: 8px; border: 1px solid #30363d;
    text-decoration: none; color: inherit;
    transition: all .15s; display: block;
  }}
  .tile:hover {{
    background: #1c2128; border-color: #58a6ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(88, 166, 255, .15);
  }}
  .icon {{ font-size: 28px; margin-bottom: 8px; }}
  .name {{ font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #e6edf3; }}
  .policy {{ font-size: 11px; color: #7d8590; font-family: monospace; }}
  footer {{
    margin-top: 40px; padding-top: 20px;
    border-top: 1px solid #30363d;
    color: #7d8590; font-size: 12px; text-align: center;
  }}
  .search {{ width: 100%; padding: 10px; background: #161b22; border: 1px solid #30363d;
    color: #c9d1d9; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }}
</style>
</head>
<body>
<header>
  <h1>🧰 insur · Platform Hub</h1>
  <div class="meta">§130 · ALL applications integrated · {s["ts_local"]} · actor: {s["actor_user"]}@{s["actor_host"]}</div>
  <div class="stats">
    <div class="stat">{len(APPS)} apps</div>
    <div class="stat">{len(cats)} categories</div>
    <div class="stat">~398 agents</div>
    <div class="stat">31 mandatory policies</div>
  </div>
</header>

<input class="search" id="q" placeholder="🔍 filter by name · policy · category..."
  oninput="document.querySelectorAll('.tile').forEach(t=>{{
    t.style.display = t.textContent.toLowerCase().includes(this.value.toLowerCase()) ? '' : 'none';
  }})">

{"".join(cat_html)}

<footer>
  Generated {s["ts_local"]} · §130 codified · click any tile to open the underlying API.<br>
  All tiles open in new tab. Backend = http://localhost:8001
</footer>
</body>
</html>'''
    return HTMLResponse(content=html)


@router.get("/health")
def health():
    cats = set(a["category"] for a in APPS)
    return {**stamp(), "n_apps": len(APPS),
            "n_categories": len(cats),
            "ui_url": "/api/v1/platform-hub/ui",
            "registry_url": "/api/v1/platform-hub/registry",
            "spec": "§130 single-page integration hub"}
