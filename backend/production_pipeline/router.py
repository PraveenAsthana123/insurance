"""/api/v1/production-pipeline/* · Iter 56 · 22-stage agentic flow."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from production_pipeline.stages import STAGES, run_pipeline, PipelineRun

router = APIRouter(prefix="/api/v1/production-pipeline", tags=["production-pipeline"])


class PipelineRequest(BaseModel):
    user_input: str
    severity: str = "info"     # info / warning / critical
    tenant_id: str = "default"


def _to_dict(run: PipelineRun) -> dict:
    return {
        "run_id": run.run_id,
        "user_input": run.user_input,
        "severity": run.severity,
        "tenant_id": run.tenant_id,
        "started_at": run.started_at.isoformat(),
        "total_duration_ms": run.total_duration_ms,
        "overall_status": run.overall_status,
        "overall_confidence": run.overall_confidence,
        "needs_kb": run.needs_kb,
        "final_response": run.final_response,
        "tokens_in": run.tokens_in,
        "tokens_out": run.tokens_out,
        "cost_usd": round(run.cost_usd, 6),
        "stages": [
            {
                "stage_no": s.stage_no, "agent_id": s.agent_id, "name": s.name,
                "status": s.status, "duration_ms": s.duration_ms,
                "scaffold": s.scaffold, "confidence": s.confidence,
                "output": s.output, "error": s.error,
            }
            for s in run.stages
        ],
    }


@router.get("/health")
def health():
    return {"status": "ok", "module": "production-pipeline",
            "spec": "Iter 56 · 22-stage agentic flow · Ollama-only",
            "n_stages": len(STAGES)}


@router.get("/stages")
def stages():
    """The canonical 22-stage catalog."""
    return {
        "stages": [
            {"stage_no": no, "agent_id": aid, "name": name, "purpose": purpose,
             "risk_level": risk}
            for (no, aid, name, purpose, risk) in STAGES
        ],
        "count": len(STAGES),
    }


@router.post("/run")
def run(body: PipelineRequest):
    """Execute the 22-stage flow · return per-stage results."""
    r = run_pipeline(body.user_input, body.severity, body.tenant_id)
    return _to_dict(r)
