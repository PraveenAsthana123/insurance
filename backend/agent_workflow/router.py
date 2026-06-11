"""/api/v1/agent-workflow/* · catalog of all agent workflows/loops in the platform."""
from fastapi import APIRouter
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/agent-workflow", tags=["agent-workflow"])

WORKFLOWS = [
    {"id": "goal_loop",      "name": "Goal-Loop Driven Program",
     "type": "4-phase agent loop", "iter": 93, "policy": "§115",
     "endpoint": "POST /api/v1/goal-loop/start",
     "phases": ["plan", "execute", "reflect", "complete-or-continue"],
     "max_iterations": 10, "guardrails": "injection check + max-iter cap"},
    {"id": "autonomous_loop", "name": "8-Self-* Autonomous Loop",
     "type": "blueprint deploy loop", "iter": 77, "policy": "§103.8",
     "endpoint": "POST /api/v1/autonomous-loop/run",
     "phases": ["self-monitoring", "self-building", "self-governing",
                "self-deploying", "self-testing", "self-healing",
                "self-optimizing", "self-improving"],
     "max_iterations": 8, "guardrails": "high-risk halts at step 3"},
    {"id": "production_pipeline", "name": "22-Stage Production Pipeline",
     "type": "linear stage pipeline", "iter": 56, "policy": "§103 + §76",
     "endpoint": "POST /api/v1/production-pipeline/run",
     "phases": ["stage_planner", "stage_router", "stage_rag_layer",
                "stage_tool_picker", "stage_action", "stage_guardrails",
                "...", "stage_reflection", "stage_verifier", "stage_hitl"],
     "stages": 22, "guardrails": "RAGAS + DeepEval at stage 17"},
    {"id": "council_of_agents", "name": "3-Stage Council",
     "type": "deliberation pattern", "iter": 50, "policy": "§103 + §97",
     "endpoint": "POST /api/v1/council/deliberate",
     "phases": ["author proposes", "reviewer critiques", "chair decides"],
     "max_iterations": 1, "guardrails": "all 3 must agree or chair tie-break"},
    {"id": "auto_next_loop", "name": "§105 Picker Loop",
     "type": "cron-driven gap-closer", "iter": 85, "policy": "§105 + §106 + §109",
     "endpoint": "scripts/auto_next_dispatcher.sh (cron)",
     "phases": ["scan advisor", "pick top-1", "act atomically", "audit + chain"],
     "max_iterations": 10, "guardrails": "safe allowlist · gated denylist · 24h cooldown"},
    {"id": "drill_pattern", "name": "Drill (§43 per-feature)",
     "type": "regression test loop", "iter": 47, "policy": "§43",
     "endpoint": "POST /api/v1/test-catalog/run-drill",
     "phases": ["positive assertions", "negative assertions", "lock invariant"],
     "max_iterations": 1, "guardrails": "≥1 negative per drill mandatory"},
]


@router.get("/")
def list_workflows():
    return {**stamp(), "workflows": WORKFLOWS, "count": len(WORKFLOWS),
            "spec": "§115 + §103 + §97 + §105 + §43 patterns surfaced"}


@router.get("/health")
def health():
    return {**stamp(), "module": "agent-workflow-catalog",
            "patterns_count": len(WORKFLOWS)}
