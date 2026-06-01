"""HOLY endpoints — nav (live HOLY_NAV.json) + council (Redis queue/poll)."""
from __future__ import annotations

import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any

import redis

logger = logging.getLogger(__name__)
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/v1/holy", tags=["holy"])

# Locate global-ai-org/ — assume backend runs from /app inside the insur/ project,
# global-ai-org is a sibling at /app/../global-ai-org/ in the container.
# Outside docker: /mnt/deepa/insur/global-ai-org
_CANDIDATES = [
    Path("/global-ai-org"),  # docker volume mount (preferred)
    Path("/app/../global-ai-org"),
    Path("/mnt/deepa/insur/global-ai-org"),
    Path(__file__).resolve().parents[2] / "global-ai-org",
]
GLOBAL_AI_ORG = next((p for p in _CANDIDATES if p.exists()), _CANDIDATES[0])

# Redis (same as agents)
REDIS_URL = os.environ.get("BEV_REDIS_URL", "redis://redis:6379/0")
try:
    _r = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    _r.ping()
except Exception:
    _r = None  # surfaced as 503 when needed


@router.get("/nav/{dept}")
def get_nav(dept: str) -> dict:
    """Serve a dept's HOLY_NAV.json live from disk."""
    p = GLOBAL_AI_ORG / "departments" / dept / "HOLY_NAV.json"
    if not p.exists():
        raise HTTPException(404, f"HOLY_NAV.json not found for dept '{dept}' (looked at {p})")
    return json.loads(p.read_text())


@router.get("/depts")
def list_depts() -> dict:
    """List HOLY-enabled departments that have a HOLY_NAV.json file."""
    depts = []
    dept_root = GLOBAL_AI_ORG / "departments"
    if dept_root.exists():
        for d in sorted(dept_root.iterdir()):
            if (d / "HOLY_NAV.json").exists():
                depts.append(d.name)
    return {"departments": depts, "count": len(depts), "global_ai_org": str(GLOBAL_AI_ORG)}


@router.get("/spec/{dept}")
def get_spec(dept: str) -> dict:
    """Serve a dept's HOLY_SPEC.md content (raw text)."""
    p = GLOBAL_AI_ORG / "departments" / dept / "business-layer" / "HOLY_SPEC.md"
    if not p.exists():
        raise HTTPException(404, f"HOLY_SPEC.md not found for dept '{dept}'")
    return {"dept": dept, "markdown": p.read_text()}


# ============================================================
# Council integration: enqueue task + poll for result
# ============================================================

@router.post("/council/ask")
def council_ask(payload: dict) -> dict:
    """Enqueue a council task. Body: {prompt, department?}. Returns task_id."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    prompt = (payload or {}).get("prompt", "").strip()
    if not prompt:
        raise HTTPException(400, "prompt required")
    dept = (payload or {}).get("department", "")
    task_id = f"ui-{uuid.uuid4().hex[:8]}"
    task = {
        "id": task_id,
        "department": dept,
        "prompt": prompt,
        "seeded_at": time.time(),
        "source": "holy-nav-ui",
    }
    _r.lpush("council_tasks", json.dumps(task))
    return {"task_id": task_id, "queue_len": _r.llen("council_tasks")}


@router.get("/council/result/{task_id}")
def council_result(task_id: str) -> dict:
    """Poll for a council task's result. Returns 'pending' if not yet processed."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    # Scan council_done for matching task_id (small list, OK for POC)
    for raw in _r.lrange("council_done", 0, -1):
        try:
            d = json.loads(raw)
            if d.get("task_id") == task_id:
                return {"status": "done", "result": d}
        except Exception:
            continue
    return {"status": "pending", "task_id": task_id}


# ============================================================
# Eval — read manifests + plots produced by the reference pipelines
# ============================================================

# Lifecycle artifacts root: configurable so docker + host both work
_EVAL_ROOT_CANDIDATES = [
    Path("/data/eval"),                                          # docker volume mount
    Path("/mnt/deepa/insur/data/eval"),                           # host
    Path(__file__).resolve().parents[2] / "data" / "eval",      # parent of routers/
]
EVAL_ROOT = next((p for p in _EVAL_ROOT_CANDIDATES if p.exists()), _EVAL_ROOT_CANDIDATES[0])


def _safe_run_dir(dept: str, pipeline: str, run_id: str) -> Path:
    """Resolve + path-traversal guard. Every component must stay under EVAL_ROOT."""
    base = EVAL_ROOT.resolve()
    target = (base / dept / pipeline / run_id).resolve()
    if not str(target).startswith(str(base)):
        raise HTTPException(400, "invalid path component")
    return target


@router.get("/eval/{dept}/{pipeline}/runs")
def list_runs(dept: str, pipeline: str) -> dict:
    """List all completed runs for a pipeline (most recent first)."""
    pdir = EVAL_ROOT / dept / pipeline
    if not pdir.exists():
        return {"dept": dept, "pipeline": pipeline, "runs": []}
    runs = []
    for d in sorted(pdir.iterdir(), reverse=True):
        if d.is_dir() and (d / "manifest.json").exists():
            try:
                m = json.loads((d / "manifest.json").read_text())
                runs.append(
                    {
                        "run_id": d.name,
                        "duration_seconds": m.get("duration_seconds", 0),
                        "n_rows": m.get("n_rows", m.get("n_chunks", 0)),
                        "metrics_summary": list(m.get("metrics", {}).keys())[:6]
                        or list(m.get("eval", {}).keys())[:6],
                    }
                )
            except Exception:
                continue
    return {"dept": dept, "pipeline": pipeline, "runs": runs}


@router.get("/eval/{dept}/{pipeline}/runs/{run_id}/manifest")
def get_manifest(dept: str, pipeline: str, run_id: str) -> dict:
    """Return the full manifest for a specific run."""
    rdir = _safe_run_dir(dept, pipeline, run_id)
    mp = rdir / "manifest.json"
    if not mp.exists():
        raise HTTPException(404, f"manifest not found at {mp}")
    return json.loads(mp.read_text())


@router.get("/eval/{dept}/{pipeline}/runs/{run_id}/plots/{plot_name}")
def get_plot(dept: str, pipeline: str, run_id: str, plot_name: str) -> FileResponse:
    """Serve a PNG plot file. Path-traversal guarded."""
    if not plot_name.endswith(".png") or "/" in plot_name or ".." in plot_name:
        raise HTTPException(400, "invalid plot name")
    rdir = _safe_run_dir(dept, pipeline, run_id)
    pp = rdir / "plots" / plot_name
    if not pp.exists():
        raise HTTPException(404, f"plot not found: {plot_name}")
    return FileResponse(pp, media_type="image/png")


@router.get("/eval/{dept}/{pipeline}/runs/{run_id}/latest")
def get_latest(dept: str, pipeline: str, run_id: str = "latest") -> dict:
    """Convenience: return manifest of newest run (alias for /runs/<id>/manifest)."""
    pdir = EVAL_ROOT / dept / pipeline
    if not pdir.exists():
        raise HTTPException(404, "no runs for this pipeline")
    runs = sorted(
        [d for d in pdir.iterdir() if d.is_dir() and (d / "manifest.json").exists()],
        reverse=True,
    )
    if not runs:
        raise HTTPException(404, "no completed runs")
    target = runs[0] if run_id == "latest" else _safe_run_dir(dept, pipeline, run_id)
    return json.loads((target / "manifest.json").read_text())


# ============================================================
# Simulation — per-process Manual vs Auto runner per §64.34
# ============================================================

_SIM_ROOT_CANDIDATES = [
    Path("/data/eval/sim"),
    Path("/mnt/deepa/insur/data/eval/sim"),
    Path(__file__).resolve().parents[2] / "data" / "eval" / "sim",
]
SIM_ROOT = next((p for p in _SIM_ROOT_CANDIDATES if p.exists()), _SIM_ROOT_CANDIDATES[2])


def _safe_sim_dir(dept: str, process: str, sim_id: str) -> Path:
    base = SIM_ROOT.resolve()
    target = (base / dept / process / sim_id).resolve()
    if not str(target).startswith(str(base)):
        raise HTTPException(400, "invalid path component")
    return target


@router.get("/sim/reference-processes")
def list_reference_processes() -> dict:
    """List the (dept, process) pairs that have a defined simulation."""
    # Import lazily — module pulls in matplotlib, want fast startup
    try:
        from ml.reference.simulation_engine import REFERENCE_PROCESSES
        return {
            "reference_processes": [
                {"dept": d, "process": p, "n_steps": len(steps)}
                for (d, p), steps in REFERENCE_PROCESSES.items()
            ]
        }
    except Exception as exc:
        raise HTTPException(500, f"simulator unavailable: {exc}")


@router.post("/sim/{dept}/{process}/run")
def run_simulation(dept: str, process: str, payload: dict | None = None) -> dict:
    """Trigger a simulation in BOTH modes. Body: {n_inputs, seed}. Returns manifest."""
    try:
        from ml.reference.simulation_engine import (
            ProcessSimulator,
            REFERENCE_PROCESSES,
        )
    except Exception as exc:
        raise HTTPException(500, f"simulator unavailable: {exc}")

    key = (dept, process)
    if key not in REFERENCE_PROCESSES:
        raise HTTPException(
            404,
            f"no reference process for ({dept}, {process}); see /sim/reference-processes",
        )

    body = payload or {}
    n_inputs = int(body.get("n_inputs", 15))
    seed = int(body.get("seed", 42))

    import random as _random
    rng = _random.Random(seed)
    inputs = [
        {
            "lead_id": f"L{i:04d}",
            "company_size": rng.choice(["SMB", "MM", "ENT"]),
            "industry": rng.choice(["fintech", "saas", "retail", "manufacturing"]),
            "score_hint": rng.uniform(0, 1),
            "is_qualified_truth": rng.random() < 0.4,
        }
        for i in range(n_inputs)
    ]

    sim = ProcessSimulator(
        dept=dept,
        process=process,
        steps=REFERENCE_PROCESSES[key],
        inputs=inputs,
        artifacts_root=str(SIM_ROOT),
        seed=seed,
        ground_truth_key="is_qualified_truth",
    )
    manifest = sim.run()
    from dataclasses import asdict
    return asdict(manifest)


@router.get("/sim/{dept}/{process}/runs")
def list_sim_runs(dept: str, process: str) -> dict:
    """List past simulation runs for (dept, process), newest first."""
    pdir = SIM_ROOT / dept / process
    if not pdir.exists():
        return {"dept": dept, "process": process, "runs": []}
    runs = []
    for d in sorted(pdir.iterdir(), reverse=True):
        if d.is_dir() and (d / "manifest.json").exists():
            try:
                m = json.loads((d / "manifest.json").read_text())
                runs.append(
                    {
                        "sim_id": d.name,
                        "duration_wall": m.get("duration_seconds_wall", 0),
                        "n_inputs": m.get("n_inputs", 0),
                        "comparison": m.get("comparison", {}),
                    }
                )
            except Exception:
                continue
    return {"dept": dept, "process": process, "runs": runs}


@router.get("/sim/{dept}/{process}/runs/{sim_id}/manifest")
def get_sim_manifest(dept: str, process: str, sim_id: str) -> dict:
    rdir = _safe_sim_dir(dept, process, sim_id)
    mp = rdir / "manifest.json"
    if not mp.exists():
        raise HTTPException(404, "simulation manifest not found")
    return json.loads(mp.read_text())


# ============================================================
# Fleet monitor — 100-agent + 3-council live stats + fan-out trigger
# Per global CLAUDE.md §43 (hub-and-spoke) + §65.8 (fleet ops)
# ============================================================


@router.get("/fleet/stats")
def get_fleet_stats() -> dict:
    """Live snapshot of all agent fleets — queue depths + recent completions."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    try:
        out = {
            "simple_fleet": {
                "task_queue": "tasks",
                "done_queue": "done",
                "queued": _r.llen("tasks"),
                "completed_total": _r.llen("done"),
            },
            "council_fleet": {
                "task_queue": "council_tasks",
                "done_queue": "council_done",
                "queued": _r.llen("council_tasks"),
                "completed_total": _r.llen("council_done"),
            },
            "test_fleet": {
                "task_queue": "test_tasks",
                "done_queue": "test_results",
                "queued": _r.llen("test_tasks"),
                "completed_total": _r.llen("test_results"),
            },
            "report_audit": {
                "queue": "holy_report_audit",
                "size": _r.llen("holy_report_audit"),
            },
            "snapshot_time": time.time(),
        }
        return out
    except Exception as exc:
        raise HTTPException(500, f"fleet stats unavailable: {exc}")


@router.get("/fleet/recent-done")
def get_recent_done(fleet: str = "simple", limit: int = 20) -> dict:
    """Return the N most-recent completed items from the chosen done queue."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    queue_map = {
        "simple": "done",
        "council": "council_done",
        "test": "test_results",
    }
    queue = queue_map.get(fleet)
    if not queue:
        raise HTTPException(400, f"fleet must be one of {list(queue_map.keys())}")
    raw = _r.lrange(queue, 0, max(0, limit - 1))
    items = []
    for r in raw:
        try:
            items.append(json.loads(r))
        except Exception:
            items.append({"_raw": r[:200]})
    return {"fleet": fleet, "queue": queue, "n": len(items), "items": items}


@router.post("/fleet/fanout")
def fanout_tasks(payload: dict | None = None) -> dict:
    """Push N synthetic tasks into the `tasks` queue so the 100-agent fleet
    has visible work.

    Body: {n?, prompt_template?, dept?}
    Returns: {enqueued, task_ids, queue_depth_after}
    """
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    body = payload or {}
    n = int(body.get("n", 10))
    if n < 1 or n > 200:
        raise HTTPException(400, "n must be in [1, 200]")
    prompt_template = body.get("prompt_template", "Briefly suggest one improvement for {dept}.")
    dept = body.get("dept", "sales")

    task_ids = []
    for i in range(n):
        task_id = f"fanout-{uuid.uuid4().hex[:8]}-{i:03d}"
        envelope = {
            "id": task_id,
            "department": dept,
            "prompt": prompt_template.format(dept=dept, i=i),
            "seeded_at": time.time(),
            "source": "fleet-fanout-ui",
        }
        try:
            _r.lpush("tasks", json.dumps(envelope))
            task_ids.append(task_id)
        except Exception as exc:
            logger.warning("fanout enqueue failed: %s", exc)
            break
    return {
        "enqueued": len(task_ids),
        "task_ids": task_ids[:20],  # cap response size
        "queue_depth_after": _r.llen("tasks"),
        "fleet_will_process": "100 insur-agents-* containers (BRPOP `tasks`)",
    }


# ============================================================
# Per-dept Security tab — attack-simulation corpus generation per §64.32
# ============================================================

_SECURITY_ROOT_CANDIDATES = [
    Path("/data/security-tests"),
    Path("/mnt/deepa/insur/data/security-tests"),
    Path(__file__).resolve().parents[2] / "data" / "security-tests",
]
SECURITY_ROOT = next((p for p in _SECURITY_ROOT_CANDIDATES if p.exists()), _SECURITY_ROOT_CANDIDATES[2])


@router.get("/security/attack-classes")
def list_attack_classes() -> dict:
    """List the 12 mandatory attack-class generators per §64.32.3."""
    try:
        from ml.reference.attack_simulators import GENERATORS
        return {
            "attack_classes": [
                {"id": cls, "available": True} for cls in sorted(GENERATORS.keys())
            ],
            "count": len(GENERATORS),
            "executor_authorized": os.environ.get("BEV_AUTHORIZED_ENV") == "1",
        }
    except Exception as exc:
        raise HTTPException(500, f"attack_simulators unavailable: {exc}")


@router.post("/security/{dept}/generate-corpus")
def generate_attack_corpus(dept: str, payload: dict | None = None) -> dict:
    """Generate an attack-simulation corpus for a dept (§64.32.3 generator-only).

    Body: {attack_class, n?, seed?}. Returns corpus manifest including
    payload count + audit path. NEVER executes payloads — generation only.
    """
    try:
        from ml.reference.attack_simulators import generate_corpus, GENERATORS
    except Exception as exc:
        raise HTTPException(500, f"attack_simulators unavailable: {exc}")

    body = payload or {}
    attack_class = (body.get("attack_class") or "").strip()
    if not attack_class or attack_class not in GENERATORS:
        raise HTTPException(400, f"attack_class must be one of {sorted(GENERATORS.keys())}")

    n = int(body.get("n", 5))
    seed = int(body.get("seed", 42))

    from dataclasses import asdict as _asdict
    corpus = generate_corpus(
        attack_class=attack_class, dept=dept, seed=seed, n=n,
        artifacts_root=str(SECURITY_ROOT),
    )
    return _asdict(corpus)


@router.get("/security/{dept}/corpora")
def list_attack_corpora(dept: str, attack_class: str | None = None) -> dict:
    """List existing corpora for a dept, optionally filtered by attack_class."""
    dept_dir = SECURITY_ROOT / dept
    if not dept_dir.exists():
        return {"dept": dept, "corpora": []}

    corpora = []
    classes_to_scan = [attack_class] if attack_class else [d.name for d in dept_dir.iterdir() if d.is_dir()]
    for cls in classes_to_scan:
        cls_dir = dept_dir / cls
        if not cls_dir.exists():
            continue
        for run_dir in sorted(cls_dir.iterdir(), reverse=True):
            corpus_file = run_dir / "corpus.json"
            if not corpus_file.exists():
                continue
            try:
                m = json.loads(corpus_file.read_text())
                corpora.append({
                    "corpus_id": m.get("corpus_id"),
                    "attack_class": m.get("attack_class"),
                    "n_payloads": m.get("n_payloads"),
                    "generated_at": m.get("generated_at"),
                    "authorized_env": m.get("authorized_env", False),
                })
            except Exception:
                continue
    return {"dept": dept, "corpora": corpora}


@router.get("/security/{dept}/corpora/{attack_class}/{corpus_id}")
def get_attack_corpus(dept: str, attack_class: str, corpus_id: str) -> dict:
    """Return a specific corpus by id (path-traversal guarded)."""
    base = SECURITY_ROOT.resolve()
    target = (base / dept / attack_class / corpus_id).resolve()
    if not str(target).startswith(str(base)):
        raise HTTPException(400, "invalid path component")
    cf = target / "corpus.json"
    if not cf.exists():
        raise HTTPException(404, f"corpus not found: {dept}/{attack_class}/{corpus_id}")
    return json.loads(cf.read_text())


# ============================================================
# Agentic stack + orchestration patterns (in-process, no Redis fanout)
# Per global CLAUDE.md §64.40 (10-layer stack) + §64.43 (orchestration patterns)
# ============================================================

_AGENTIC_ROOT_CANDIDATES = [
    Path("/data/evaluation/agentic"),
    Path("/mnt/deepa/insur/data/evaluation/agentic"),
    Path(__file__).resolve().parents[2] / "data" / "evaluation" / "agentic",
]
AGENTIC_ROOT = next((p for p in _AGENTIC_ROOT_CANDIDATES if p.exists()), _AGENTIC_ROOT_CANDIDATES[2])


@router.post("/agentic/execute")
def agentic_execute(payload: dict) -> dict:
    """Run a goal through the 10-layer agentic stack. Returns full run manifest.

    Body: {goal, dept?, user_id?, granted_scopes?, budget_usd?}
    """
    try:
        from ml.reference.agentic_stack import AgenticStackRunner
    except Exception as exc:
        raise HTTPException(500, f"agentic stack unavailable: {exc}")

    body = payload or {}
    goal = (body.get("goal") or "").strip()
    dept = (body.get("dept") or "sales").strip()
    if not goal:
        raise HTTPException(400, "goal required")

    runner = AgenticStackRunner(
        dept=dept,
        user_id=body.get("user_id", "api"),
        granted_scopes=body.get("granted_scopes") or ["public:read", f"read:{dept}"],
        budget_usd=float(body.get("budget_usd", 0.10)),
        artifacts_root=str(AGENTIC_ROOT),
    )
    run = runner.execute(goal)
    from dataclasses import asdict as _asdict
    return _asdict(run)


@router.get("/agentic/runs")
def list_agentic_runs(dept: str | None = None, limit: int = 20) -> dict:
    """List recent agentic runs, optionally filtered by dept."""
    runs = []
    if not AGENTIC_ROOT.exists():
        return {"runs": runs}
    depts = [dept] if dept else [d.name for d in AGENTIC_ROOT.iterdir() if d.is_dir()]
    for dep in depts:
        ddir = AGENTIC_ROOT / dep
        if not ddir.exists():
            continue
        for rdir in sorted(ddir.iterdir(), reverse=True):
            if not rdir.is_dir() or not (rdir / "run.json").exists():
                continue
            try:
                rj = json.loads((rdir / "run.json").read_text())
                runs.append({
                    "request_id": rj.get("request_id"),
                    "dept": rj.get("dept"),
                    "goal": rj.get("goal", "")[:120],
                    "final_status": rj.get("final_status"),
                    "n_tasks": len(rj.get("tasks", [])),
                    "n_denied": rj.get("n_denied", 0),
                    "duration_seconds": rj.get("duration_seconds", 0),
                })
                if len(runs) >= limit:
                    return {"runs": runs}
            except Exception:
                continue
    return {"runs": runs}


@router.get("/agentic/runs/{request_id}")
def get_agentic_run(request_id: str) -> dict:
    """Get full manifest for a specific run."""
    if not AGENTIC_ROOT.exists():
        raise HTTPException(404, "no agentic runs yet")
    # Search across all dept subdirs
    for ddir in AGENTIC_ROOT.iterdir():
        if not ddir.is_dir():
            continue
        rdir = ddir / request_id
        if rdir.exists() and (rdir / "run.json").exists():
            return json.loads((rdir / "run.json").read_text())
    raise HTTPException(404, f"request_id '{request_id}' not found")


@router.post("/orchestration/demo")
def orchestration_demo() -> dict:
    """Run the OrchestrationDemo (DAG + Reflection + MoA) end-to-end.
    Returns manifest with all three pattern results.
    """
    try:
        from ml.reference.agent_orchestration import OrchestrationDemo
    except Exception as exc:
        raise HTTPException(500, f"orchestration module unavailable: {exc}")
    root_candidates = [
        Path("/data/evaluation/orchestration"),
        Path("/mnt/deepa/insur/data/evaluation/orchestration"),
        Path(__file__).resolve().parents[2] / "data" / "evaluation" / "orchestration",
    ]
    root = next((p for p in root_candidates if p.parent.exists()), root_candidates[2])
    demo = OrchestrationDemo(artifacts_root=str(root))
    manifest = demo.run()
    from dataclasses import asdict as _asdict
    return _asdict(manifest)


# ============================================================
# Test-tier dispatch (Redis test_tasks → test_agents fleet)
# Per global CLAUDE.md §65.1 #8 + §65.8
# ============================================================


VALID_TIERS = {"unit", "integration", "api", "boundary", "process", "perf", "smoke", "security"}


@router.get("/testing/tiers")
def list_test_tiers() -> dict:
    """List the 8 supported test tiers + the agent role responsible per global §65.8."""
    return {
        "tiers": [
            {"tier": "unit",        "agent": "pytest-agent",   "framework": "pytest"},
            {"tier": "integration", "agent": "pytest-agent",   "framework": "pytest + real DB"},
            {"tier": "api",         "agent": "api-agent",      "framework": "pytest + httpx / schemathesis"},
            {"tier": "boundary",    "agent": "pytest-agent",   "framework": "hypothesis + faker"},
            {"tier": "process",     "agent": "drill-agent",    "framework": "drills per §43"},
            {"tier": "perf",        "agent": "perf-agent",     "framework": "k6 / locust"},
            {"tier": "smoke",       "agent": "smoke-agent",    "framework": "playwright"},
            {"tier": "security",    "agent": "security-agent", "framework": "ZAP / Garak (auth env only)"},
        ]
    }


@router.post("/testing/dispatch")
def dispatch_test(payload: dict) -> dict:
    """Enqueue a test-tier task for the test-agent fleet.

    Body: {dept, tier, timeout_seconds?, agent_role_required?}
    """
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    dept = (payload or {}).get("dept", "").strip()
    tier = (payload or {}).get("tier", "").strip()
    if not dept or tier not in VALID_TIERS:
        raise HTTPException(400, f"dept required + tier must be in {sorted(VALID_TIERS)}")
    task_id = f"test-{uuid.uuid4().hex[:10]}"
    task = {
        "task_id": task_id,
        "tier": tier,
        "dept": dept,
        "path": f"tests/{dept}/{tier}/",
        "timeout_seconds": int((payload or {}).get("timeout_seconds", 600)),
        "agent_role_required": (payload or {}).get("agent_role_required"),
        "queued_at": time.time(),
    }
    _r.lpush("test_tasks", json.dumps(task))
    return {"task_id": task_id, "queue_depth": _r.llen("test_tasks"), "task": task}


@router.get("/testing/results")
def get_test_results(limit: int = 50, tier: str | None = None, dept: str | None = None) -> dict:
    """Return recent test_results (most recent first), optionally filtered."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    raw = _r.lrange("test_results", 0, max(0, limit - 1))
    out: list[dict] = []
    for r in raw:
        try:
            d = json.loads(r)
            if tier and d.get("tier") != tier:
                continue
            if dept and d.get("dept") != dept:
                continue
            out.append(d)
        except Exception:
            continue
    return {"results": out, "n": len(out)}


@router.get("/testing/result/{task_id}")
def get_test_result(task_id: str) -> dict:
    """Poll a single test task by task_id."""
    if _r is None:
        raise HTTPException(503, "Redis unavailable")
    for raw in _r.lrange("test_results", 0, -1):
        try:
            d = json.loads(raw)
            if d.get("task_id") == task_id:
                return {"status": "done", "result": d}
        except Exception:
            continue
    return {"status": "pending", "task_id": task_id}


# ============================================================
# Role dashboards + reports per §64.37
# ============================================================

ROLE_LIST = [
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect",
    "data-owner", "ai-strategy", "information-security",
]


@router.get("/roles")
def list_roles() -> dict:
    """All 15 standard roles per global §64.37."""
    return {"roles": ROLE_LIST, "count": len(ROLE_LIST)}


@router.get("/dashboards/{dept}/{role}")
def get_role_dashboard(dept: str, role: str) -> dict:
    """Return synthesized tile + chart payload for (dept, role).
    Tiles/charts use deterministic synthetic data per global §64.37."""
    if role not in ROLE_LIST:
        raise HTTPException(404, f"unknown role '{role}'; see /api/v1/holy/roles")
    try:
        from ml.reference.role_dashboard_catalog import build_dashboard_payload
    except Exception as exc:
        raise HTTPException(500, f"catalog unavailable: {exc}")
    payload = build_dashboard_payload(dept, role)
    if payload is None:
        raise HTTPException(404, f"no catalog entry for role '{role}'")
    return payload


@router.get("/reports/{dept}/{role}")
def get_role_reports(dept: str, role: str) -> dict:
    """Return standard-report list for (dept, role) per §64.37."""
    if role not in ROLE_LIST:
        raise HTTPException(404, f"unknown role '{role}'")
    try:
        from ml.reference.role_dashboard_catalog import build_reports_payload
    except Exception as exc:
        raise HTTPException(500, f"catalog unavailable: {exc}")
    payload = build_reports_payload(dept, role)
    if payload is None:
        raise HTTPException(404, f"no catalog entry for role '{role}'")
    return payload


@router.post("/reports/{dept}/{role}/{report_id}/run")
def run_role_report(dept: str, role: str, report_id: str, payload: dict | None = None) -> dict:
    """Trigger a report run. Logs to Redis audit list (proxy for §38.3 audit row)."""
    if role not in ROLE_LIST:
        raise HTTPException(404, "unknown role")
    run_id = f"report-{uuid.uuid4().hex[:8]}"
    audit = {
        "request_id": run_id,
        "kind": "report_run",
        "dept": dept,
        "role": role,
        "report_id": report_id,
        "timestamp": time.time(),
        "format": (payload or {}).get("format", "PDF"),
        "actor": (payload or {}).get("actor", "unknown"),
    }
    if _r is not None:
        try:
            _r.lpush("holy_report_audit", json.dumps(audit))
            _r.ltrim("holy_report_audit", 0, 999)  # keep last 1000
        except Exception:
            pass
    return {
        "run_id": run_id,
        "status": "queued",
        "dept": dept,
        "role": role,
        "report_id": report_id,
        "audit": audit,
    }


@router.get("/sim/{dept}/{process}/runs/{sim_id}/events")
def get_sim_events(dept: str, process: str, sim_id: str, layer: str | None = None) -> dict:
    """Return all events for a simulation. Optional ?layer=backend|process|data|accuracy|reporting."""
    rdir = _safe_sim_dir(dept, process, sim_id)
    ep = rdir / "events.jsonl"
    if not ep.exists():
        raise HTTPException(404, "events.jsonl not found")
    events: list[dict] = []
    for line in ep.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
            if layer and ev.get("layer") != layer:
                continue
            events.append(ev)
        except Exception:
            continue
    return {"sim_id": sim_id, "n_events": len(events), "events": events}
