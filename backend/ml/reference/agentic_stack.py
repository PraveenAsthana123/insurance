"""HOLY reference: 10-layer agentic execution stack per §64.40.

Operator architecture brief 2026-05-22:

    User Goal → Council → Planner → Task Decomposition → Policy/Governance
    → Computer-Using Agent → Stagehand/Browser-Use → Playwright
    → Browser/Desktop/API → Enterprise Applications

This module ships:
  - PlannerAgent  — decomposes goal → task DAG (uses Ollama)
  - Decomposer    — refines high-level tasks to atomic actions with scope tags
  - PolicyEngine  — allowlist / scope grants / cost gate / approval router
  - CuaOrchestrator — chooses interface adapter (browser / desktop / API)
  - StagehandAdapter (STUB) — would wrap Browserbase Stagehand
  - PlaywrightAdapter (STUB) — would wrap Playwright sessions
  - AgenticRun manifest — full per-layer audit trail

Stubs for layers 7-10 because real browser automation requires a live
session / Browserbase API key / target system. The CONTRACT is honored —
audit rows for every layer, drill-able invariants — actual side-effects
are dry-run by default.

Run dry: `python -m backend.ml.reference.agentic_stack --goal "..."`
"""
from __future__ import annotations

import json
import logging
import re
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

logger = logging.getLogger(__name__)

PolicyDecision = Literal["allow", "deny", "require_human_approval"]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


@dataclass
class Task:
    task_id: str
    action: str            # e.g. "navigate", "fill_form", "click", "api_call", "extract"
    description: str       # natural-language for audit
    target: str            # e.g. "salesforce.com", "/api/leads", "/admin/users"
    scope_required: str    # e.g. "read:leads", "write:leads", "admin:delete"
    depends_on: list[str] = field(default_factory=list)
    est_cost_usd: float = 0.0
    est_latency_ms: float = 200
    reversible: bool = True
    rollback_action: str = ""

    # Filled by lower layers
    policy_decision: PolicyDecision = "allow"
    policy_reason: str = ""
    cua_adapter: str = ""              # "stagehand" | "playwright" | "api"
    execution_status: str = "pending"  # "pending" | "ok" | "denied" | "failed" | "rolled_back"
    execution_result: dict[str, Any] = field(default_factory=dict)
    layer_audit: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgenticRun:
    request_id: str
    user_id: str
    dept: str
    goal: str
    started_at: float
    duration_seconds: float = 0.0
    tasks: list[Task] = field(default_factory=list)
    total_cost_usd: float = 0.0
    total_cost_estimate_usd: float = 0.0
    n_denied: int = 0
    n_human_approval: int = 0
    n_executed: int = 0
    n_rolled_back: int = 0
    layers_traversed: list[str] = field(default_factory=list)
    layer_skips: dict[str, str] = field(default_factory=dict)
    final_status: str = "incomplete"


# ---------------------------------------------------------------------------
# Layer 3 — Planner Agent (LLM-driven, with rule-based fallback)
# ---------------------------------------------------------------------------


class PlannerAgent:
    """Decomposes a user goal into a task DAG.

    Tries Ollama for LLM-driven planning; falls back to rule-based heuristics
    when Ollama is unavailable. Always emits structured Task objects.
    """

    def __init__(self, ollama_url: str = "http://localhost:11434", model: str = "gemma3:1b"):
        self.ollama_url = ollama_url
        self.model = model

    def plan(self, goal: str, dept: str) -> list[Task]:
        # Heuristic fast-path for trivial / empty goals (drill invariant #2)
        clean = goal.strip().lower()
        if len(clean) < 5 or clean in ("hi", "hello", "test", "ping"):
            return [
                Task(
                    task_id="acknowledge", action="acknowledge",
                    description="Acknowledge trivial input", target="self",
                    scope_required="public:read", est_cost_usd=0.0,
                    reversible=True,
                )
            ]

        # Try LLM
        llm_tasks = self._llm_plan(goal, dept)
        if llm_tasks:
            return llm_tasks
        # Fallback: rule-based
        return self._rule_plan(goal, dept)

    def _llm_plan(self, goal: str, dept: str) -> list[Task]:
        try:
            import httpx
            prompt = (
                f"You are a planner agent for the {dept} dept of HOLY Beverage.\n"
                f"User goal: {goal}\n\n"
                "Break this into 3-6 atomic tasks. Output ONLY a JSON array of objects with keys:\n"
                "  action (one of: navigate, fill_form, click, api_call, extract)\n"
                "  description (1 short sentence)\n"
                "  target (URL or API path)\n"
                "  scope_required (one of: public:read, read:<resource>, write:<resource>, admin:<action>)\n"
                "  reversible (true/false)\n\n"
                "No explanation. Just the JSON array."
            )
            r = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=30.0,
            )
            r.raise_for_status()
            response = r.json().get("response", "")
            # Extract JSON array
            match = re.search(r"\[\s*\{.*\}\s*\]", response, re.DOTALL)
            if not match:
                return []
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                return []
            tasks = []
            for i, p in enumerate(parsed[:8]):  # cap at 8
                if not isinstance(p, dict) or "action" not in p:
                    continue
                tasks.append(Task(
                    task_id=f"task-{i+1:02d}",
                    action=str(p.get("action", "unknown"))[:30],
                    description=str(p.get("description", ""))[:200],
                    target=str(p.get("target", "unknown"))[:120],
                    scope_required=str(p.get("scope_required", "public:read"))[:50],
                    reversible=bool(p.get("reversible", True)),
                    est_cost_usd=0.001,
                    est_latency_ms=300,
                ))
            return tasks
        except Exception as exc:
            logger.warning("LLM planner failed (%s); falling back to rule-based", exc)
            return []

    def _rule_plan(self, goal: str, dept: str) -> list[Task]:
        """Pattern-match on common verbs in the goal."""
        clean = goal.lower()
        tasks: list[Task] = []
        if any(v in clean for v in ("list", "show", "find", "get", "what", "how many")):
            tasks.append(Task(
                task_id="task-01", action="api_call",
                description=f"Query {dept} read endpoint", target=f"/api/v1/holy/{dept}/list",
                scope_required=f"read:{dept}", est_cost_usd=0.0001,
            ))
            tasks.append(Task(
                task_id="task-02", action="extract",
                description="Extract relevant fields from response", target="memory",
                scope_required="public:read", depends_on=["task-01"], est_cost_usd=0.0,
            ))
        elif any(v in clean for v in ("create", "add", "new", "send", "submit")):
            tasks.append(Task(
                task_id="task-01", action="fill_form",
                description=f"Fill {dept} create form", target=f"/holy/{dept}/new",
                scope_required=f"write:{dept}", est_cost_usd=0.001,
                reversible=True, rollback_action="delete created entity",
            ))
            tasks.append(Task(
                task_id="task-02", action="click",
                description="Click submit", target="button[type=submit]",
                scope_required=f"write:{dept}", depends_on=["task-01"], est_cost_usd=0.0001,
            ))
            tasks.append(Task(
                task_id="task-03", action="extract",
                description="Read confirmation", target="page", scope_required="public:read",
                depends_on=["task-02"], est_cost_usd=0.0,
            ))
        elif any(v in clean for v in ("delete", "remove", "cancel", "revoke")):
            tasks.append(Task(
                task_id="task-01", action="api_call",
                description=f"Delete {dept} resource (REVERSIBLE only if soft-delete supported)",
                target=f"/api/v1/holy/{dept}/delete",
                scope_required=f"admin:delete:{dept}",  # high-risk scope
                est_cost_usd=0.001, reversible=False,
            ))
        else:
            tasks.append(Task(
                task_id="task-01", action="extract",
                description=f"Interpret goal: {goal[:80]}",
                target=f"/holy/{dept}", scope_required=f"read:{dept}",
                est_cost_usd=0.0,
            ))
        return tasks


# ---------------------------------------------------------------------------
# Layer 4 — Decomposer (validates + refines)
# ---------------------------------------------------------------------------


class Decomposer:
    @staticmethod
    def refine(tasks: list[Task]) -> list[Task]:
        # Drill invariant #3: every task MUST have scope_required
        for t in tasks:
            if not t.scope_required:
                t.scope_required = "public:read"
            # Tag reversibility based on action verb
            if t.action in ("api_call",) and "delete" in t.target.lower():
                t.reversible = False
            if t.action == "click" and "submit" in t.target.lower():
                t.reversible = True  # most submits are reversible via soft-delete
            # Latency estimate per action
            t.est_latency_ms = {
                "navigate": 800, "fill_form": 300, "click": 100,
                "api_call": 250, "extract": 50, "acknowledge": 10,
            }.get(t.action, 200)
        return tasks


# ---------------------------------------------------------------------------
# Layer 5 — Policy / Governance Engine
# ---------------------------------------------------------------------------


class PolicyEngine:
    """Allowlist + scope check + cost gate + approval router.

    Decision matrix:
      scope NOT in granted_scopes              → deny
      action is irreversible + scope is admin: → require_human_approval
      total est_cost > budget                  → require_human_approval
      action target matches denylist regex     → deny
      else                                     → allow
    """

    def __init__(
        self,
        granted_scopes: list[str] | None = None,
        budget_usd: float = 0.10,
        denylist_patterns: list[str] | None = None,
    ):
        self.granted_scopes = set(granted_scopes or ["public:read"])
        self.budget_usd = budget_usd
        self.denylist_patterns = [
            re.compile(p) for p in (denylist_patterns or [
                r"production.*\.delete",
                r"prod-db.*\.drop",
                r".*force.*push",
                r"admin\.dangerous_.*",
            ])
        ]

    def evaluate(self, tasks: list[Task]) -> list[Task]:
        running_cost = 0.0
        for t in tasks:
            # Denylist
            if any(p.search(t.target) for p in self.denylist_patterns):
                t.policy_decision = "deny"
                t.policy_reason = f"target matches denylist pattern"
                continue
            # Scope check
            if t.scope_required not in self.granted_scopes:
                # Wildcard scope match: read:*, write:*, admin:*
                prefix = t.scope_required.split(":")[0] + ":*"
                if prefix not in self.granted_scopes:
                    t.policy_decision = "deny"
                    t.policy_reason = f"scope '{t.scope_required}' not granted"
                    continue
            # Reversibility + admin scope check
            if not t.reversible and t.scope_required.startswith("admin:"):
                t.policy_decision = "require_human_approval"
                t.policy_reason = "irreversible + admin scope"
                continue
            # Cost gate
            running_cost += t.est_cost_usd
            if running_cost > self.budget_usd:
                t.policy_decision = "require_human_approval"
                t.policy_reason = f"cumulative cost ${running_cost:.4f} > budget ${self.budget_usd}"
                continue
            t.policy_decision = "allow"
            t.policy_reason = "policy passed"
        return tasks


# ---------------------------------------------------------------------------
# Layers 6-10 — Adapters (stubs that honor the contract)
# ---------------------------------------------------------------------------


class StagehandAdapter:
    """STUB — real implementation would wrap browserbase/stagehand SDK.

    The interface mirrors Stagehand's: page.act(instruction), page.extract(schema).
    Production wiring needs:
      - BROWSERBASE_API_KEY env var
      - stagehand-python pip install
      - one Stagehand session per task
    """

    available: bool = False  # stub mode

    def act(self, instruction: str, target: str) -> dict[str, Any]:
        return {
            "adapter": "stagehand", "available": self.available,
            "instruction": instruction, "target": target,
            "result": "DRY_RUN (would invoke page.act in production)",
        }

    def extract(self, schema: str, target: str) -> dict[str, Any]:
        return {
            "adapter": "stagehand", "available": self.available,
            "schema": schema, "target": target,
            "result": "DRY_RUN (would invoke page.extract in production)",
        }


class PlaywrightAdapter:
    """STUB — real implementation would use playwright-python sync API.

    Layer 8 receives the high-level command from layer 7 and translates to
    Playwright primitives (page.goto, page.fill, page.click).
    Production wiring needs: pip install playwright + browser install.
    """

    available: bool = False  # stub mode

    def navigate(self, url: str) -> dict[str, Any]:
        return {"adapter": "playwright", "available": self.available,
                "command": f"page.goto({url})", "result": "DRY_RUN"}

    def fill(self, selector: str, value: str) -> dict[str, Any]:
        return {"adapter": "playwright", "available": self.available,
                "command": f"page.fill({selector}, {value[:20]}...)", "result": "DRY_RUN"}

    def click(self, selector: str) -> dict[str, Any]:
        return {"adapter": "playwright", "available": self.available,
                "command": f"page.click({selector})", "result": "DRY_RUN"}


class OpenClawAdapter:
    """LIVE adapter — wraps the local OpenClaw bridge at /api/v1/openclaw/*.

    Promoted from stub (commit e8963c5) to live after parallel agent shipped
    the bridge (commit d043667) + router wire-up (commit 57641d6).

    `available` is determined dynamically by probing /status; this avoids
    the test_agent / drill having to know whether backend is up. When
    backend is down, falls back to DRY_RUN payload (preserves contract).

    act(instruction, target) → POST /tasks (council mode)
    extract(schema, target)  → POST /tasks (simple mode) + poll
    """

    confirmed_tool_name: str = "local-openclaw-bridge"

    def __init__(self, base_url: str = "http://localhost:8000",
                 timeout_seconds: float = 5.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds

    @property
    def available(self) -> bool:
        try:
            import httpx
            r = httpx.get(f"{self.base_url}/api/v1/openclaw/status", timeout=self.timeout)
            return r.status_code == 200 and r.json().get("available", False)
        except Exception:
            return False

    def act(self, instruction: str, target: str) -> dict[str, Any]:
        if not self.available:
            return {
                "adapter": "openclaw", "available": False,
                "confirmed_tool_name": self.confirmed_tool_name,
                "instruction": instruction, "target": target,
                "result": "DRY_RUN (backend bridge unreachable)",
            }
        try:
            import httpx
            r = httpx.post(
                f"{self.base_url}/api/v1/openclaw/tasks",
                json={"mode": "council", "prompt": instruction, "metadata": {"target": target}},
                timeout=self.timeout,
            )
            return {
                "adapter": "openclaw", "available": True,
                "confirmed_tool_name": self.confirmed_tool_name,
                "instruction": instruction, "target": target,
                "result": r.json() if r.status_code < 400 else {"http_status": r.status_code, "body": r.text[:200]},
            }
        except Exception as exc:
            return {"adapter": "openclaw", "available": True, "error": str(exc)}

    def extract(self, schema: str, target: str) -> dict[str, Any]:
        if not self.available:
            return {"adapter": "openclaw", "available": False,
                    "schema": schema, "target": target, "result": "DRY_RUN"}
        try:
            import httpx
            r = httpx.post(
                f"{self.base_url}/api/v1/openclaw/tasks",
                json={"mode": "simple", "prompt": f"extract: {schema} from {target}"},
                timeout=self.timeout,
            )
            return {
                "adapter": "openclaw", "available": True,
                "schema": schema, "target": target,
                "result": r.json() if r.status_code < 400 else {"http_status": r.status_code},
            }
        except Exception as exc:
            return {"adapter": "openclaw", "available": True, "error": str(exc)}


class PaperclipAdapter:
    """LIVE adapter — wraps the local Paperclip artifact/context bridge at
    /api/v1/paperclip/*.

    Promoted from stub (commit e8963c5) to live after parallel agent shipped
    the bridge (commit d043667) + router wire-up (commit 57641d6).

    Paperclip stores text artifacts locally with PII redaction + SHA-256
    hashing + bounded context-pack builder for agents. NOT the legacy Ruby
    Paperclip file-upload gem.

    act(instruction, target)  → POST /clips (store text artifact)
    extract(schema, target)   → POST /context-pack (build bounded context)
    """

    confirmed_tool_name: str = "local-paperclip-bridge"

    def __init__(self, base_url: str = "http://localhost:8000",
                 timeout_seconds: float = 5.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds

    @property
    def available(self) -> bool:
        try:
            import httpx
            r = httpx.get(f"{self.base_url}/api/v1/paperclip/status", timeout=self.timeout)
            return r.status_code == 200 and r.json().get("available", False)
        except Exception:
            return False

    def act(self, instruction: str, target: str) -> dict[str, Any]:
        """Store the (instruction, target) as a paperclip artifact for future retrieval."""
        if not self.available:
            return {"adapter": "paperclip", "available": False,
                    "instruction": instruction, "target": target,
                    "result": "DRY_RUN (backend bridge unreachable)"}
        try:
            import httpx
            r = httpx.post(
                f"{self.base_url}/api/v1/paperclip/clips",
                json={"content": f"{instruction}\n\nTarget: {target}",
                      "metadata": {"source": "agentic_stack", "target": target}},
                timeout=self.timeout,
            )
            return {
                "adapter": "paperclip", "available": True,
                "confirmed_tool_name": self.confirmed_tool_name,
                "result": r.json() if r.status_code < 400 else {"http_status": r.status_code, "body": r.text[:200]},
            }
        except Exception as exc:
            return {"adapter": "paperclip", "available": True, "error": str(exc)}

    def extract(self, schema: str, target: str) -> dict[str, Any]:
        """Build a bounded context pack from past artifacts matching the schema."""
        if not self.available:
            return {"adapter": "paperclip", "available": False,
                    "schema": schema, "target": target, "result": "DRY_RUN"}
        try:
            import httpx
            r = httpx.post(
                f"{self.base_url}/api/v1/paperclip/context-pack",
                json={"query": schema, "max_clips": 5, "max_chars": 4000},
                timeout=self.timeout,
            )
            return {
                "adapter": "paperclip", "available": True,
                "confirmed_tool_name": self.confirmed_tool_name,
                "schema": schema, "target": target,
                "result": r.json() if r.status_code < 400 else {"http_status": r.status_code},
            }
        except Exception as exc:
            return {"adapter": "paperclip", "available": True, "error": str(exc)}


class CuaOrchestrator:
    """Layer 6 — picks the right adapter per task action.

    Routing rules:
      action=api_call          → direct httpx call (no browser)
      action in (navigate, fill_form, click, extract) → Stagehand → Playwright
      action=acknowledge       → no-op
    """

    def __init__(self):
        self.stagehand = StagehandAdapter()
        self.playwright = PlaywrightAdapter()

    def execute(self, task: Task) -> dict[str, Any]:
        if task.policy_decision != "allow":
            task.execution_status = "denied"
            return {"adapter": "none", "reason": task.policy_reason}

        if task.action == "api_call":
            task.cua_adapter = "api"
            res = self._api(task)
        elif task.action == "navigate":
            task.cua_adapter = "stagehand+playwright"
            res = {"stagehand": self.stagehand.act("navigate", task.target),
                   "playwright": self.playwright.navigate(task.target)}
        elif task.action == "fill_form":
            task.cua_adapter = "stagehand+playwright"
            res = {"stagehand": self.stagehand.act("fill form", task.target),
                   "playwright": self.playwright.fill("form", "{auto-filled}")}
        elif task.action == "click":
            task.cua_adapter = "stagehand+playwright"
            res = {"stagehand": self.stagehand.act("click", task.target),
                   "playwright": self.playwright.click(task.target)}
        elif task.action == "extract":
            task.cua_adapter = "stagehand"
            res = self.stagehand.extract("auto", task.target)
        elif task.action == "acknowledge":
            task.cua_adapter = "noop"
            res = {"adapter": "noop", "result": "acknowledged"}
        else:
            task.cua_adapter = "none"
            res = {"adapter": "none", "error": f"unknown action {task.action}"}

        task.execution_status = "ok"
        task.execution_result = res
        return res

    @staticmethod
    def _api(task: Task) -> dict[str, Any]:
        return {
            "adapter": "api", "target": task.target,
            "result": f"DRY_RUN (would call {task.target} with scope {task.scope_required})",
            "http_status": 200,
        }


# ---------------------------------------------------------------------------
# Council adapter (layer 2)
# ---------------------------------------------------------------------------


class CouncilAdapter:
    """Layer 2 — uses existing 3-stage council if available; trivial pass-through otherwise."""

    def triage(self, goal: str, dept: str) -> dict[str, Any]:
        # In a wired-through implementation, this would lpush to Redis council_tasks
        # and poll. For drill-determinism, we return a synthetic interpretation.
        return {
            "draft": f"Author draft: interpret goal '{goal[:60]}' for {dept}",
            "critique": f"Reviewer critique: scope is bounded; no PII flagged",
            "chair_decision": "approved",
            "council_run_id": f"council-{uuid.uuid4().hex[:8]}",
        }


# ---------------------------------------------------------------------------
# Top-level runner
# ---------------------------------------------------------------------------


class AgenticStackRunner:
    def __init__(
        self,
        *,
        dept: str,
        user_id: str = "anonymous",
        granted_scopes: list[str] | None = None,
        budget_usd: float = 0.10,
        artifacts_root: str | Path = "data/evaluation/agentic",
        ollama_url: str = "http://localhost:11434",
        ollama_model: str = "gemma3:1b",
    ):
        self.dept = dept
        self.user_id = user_id
        self.request_id = f"req-{uuid.uuid4().hex[:10]}"
        self.out = Path(artifacts_root) / dept / self.request_id
        self.out.mkdir(parents=True, exist_ok=True)

        self.council = CouncilAdapter()
        self.planner = PlannerAgent(ollama_url=ollama_url, model=ollama_model)
        self.decomposer = Decomposer()
        self.policy = PolicyEngine(
            granted_scopes=granted_scopes or ["public:read", f"read:{dept}", f"write:{dept}"],
            budget_usd=budget_usd,
        )
        self.cua = CuaOrchestrator()

    def execute(self, goal: str) -> AgenticRun:
        t0 = time.time()
        run = AgenticRun(
            request_id=self.request_id,
            user_id=self.user_id,
            dept=self.dept,
            goal=goal,
            started_at=t0,
        )

        # Drill invariant #1 — no goal means no audit (no fabrication)
        if not goal or not goal.strip():
            run.final_status = "rejected_empty_goal"
            run.layer_skips = {f"layer_{i}": "no goal" for i in range(2, 11)}
            self._persist(run)
            return run

        # Layer 1 — User Goal
        run.layers_traversed.append("layer_1_user_goal")

        # Layer 2 — Council
        council_out = self.council.triage(goal, self.dept)
        run.layers_traversed.append("layer_2_council")

        # Layer 3 — Planner
        tasks = self.planner.plan(goal, self.dept)
        run.tasks = tasks
        run.layers_traversed.append("layer_3_planner")

        # Layer 4 — Decomposer
        tasks = self.decomposer.refine(tasks)
        run.layers_traversed.append("layer_4_decomposition")

        # Layer 5 — Policy
        tasks = self.policy.evaluate(tasks)
        run.layers_traversed.append("layer_5_policy")

        # Layers 6-10 — execute each task
        for t in tasks:
            adapter_result = self.cua.execute(t)
            t.layer_audit = {
                "layer_2_council": council_out,
                "layer_5_policy": {"decision": t.policy_decision, "reason": t.policy_reason},
                "layer_6_cua": {"adapter": t.cua_adapter},
                "layer_7_stagehand": adapter_result if "stagehand" in str(adapter_result) else {"skipped": "non-browser action"},
                "layer_8_playwright": adapter_result if "playwright" in str(adapter_result) else {"skipped": "non-browser action"},
                "layer_9_runtime": {"target": t.target, "status": t.execution_status},
                "layer_10_enterprise": {"system": t.target.split("/")[1] if "/" in t.target else t.target, "side_effect": t.execution_result},
            }

        run.layers_traversed.extend(["layer_6_cua", "layer_7_stagehand", "layer_8_playwright",
                                    "layer_9_runtime", "layer_10_enterprise"])

        # Aggregate
        run.n_denied = sum(1 for t in tasks if t.policy_decision == "deny")
        run.n_human_approval = sum(1 for t in tasks if t.policy_decision == "require_human_approval")
        run.n_executed = sum(1 for t in tasks if t.execution_status == "ok")
        run.total_cost_estimate_usd = round(sum(t.est_cost_usd for t in tasks), 6)
        run.duration_seconds = round(time.time() - t0, 3)
        run.final_status = "complete" if run.n_executed > 0 or run.n_denied == 0 else "all_denied"

        self._persist(run)
        return run

    def _persist(self, run: AgenticRun) -> None:
        (self.out / "run.json").write_text(json.dumps(asdict(run), indent=2, default=str))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--goal", required=True)
    parser.add_argument("--dept", default="sales")
    parser.add_argument("--user", default="demo_user")
    parser.add_argument("--scopes", nargs="*", default=None)
    parser.add_argument("--budget", type=float, default=0.10)
    parser.add_argument("--ollama-url", default="http://localhost:11434")
    parser.add_argument("--ollama-model", default="gemma3:1b")
    parser.add_argument("--artifacts-root", default="data/evaluation/agentic")
    args = parser.parse_args()

    runner = AgenticStackRunner(
        dept=args.dept, user_id=args.user, granted_scopes=args.scopes,
        budget_usd=args.budget, artifacts_root=args.artifacts_root,
        ollama_url=args.ollama_url, ollama_model=args.ollama_model,
    )
    run = runner.execute(args.goal)
    print(json.dumps(asdict(run), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
