#!/usr/bin/env python3
"""
Drill: HOLY 10-layer agentic execution stack (§43, §64.40).

Steps (10 total; 4 negative assertions):
    1. (+) Stack runs end-to-end on read goal (idempotent dry-run)
    2. (+) Planner emits ≥ 1 task for non-trivial goal
    3. (+) Every task has scope_required field populated (drill invariant #3)
    4. (+) All 10 layers traversed (no skips on valid goal)
    5. (-) NEGATIVE — empty goal rejected, no audit fabrication (invariant #1)
    6. (-) NEGATIVE — trivial "hello" produces ≤ 1 task, never 50 (invariant #2)
    7. (-) NEGATIVE — task lacking granted scope → policy DENY (invariant #4)
    8. (-) NEGATIVE — denylist pattern (production.*delete) → DENY
    9. (+) Reversible action stays reversible; irreversible+admin gets approval
   10. (+) Run manifest persisted with per-layer audit per task

# RESOURCES: ml_agentic_stack disk_io ollama

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.agentic_stack import AgenticStackRunner

    print("\nDRILL: HOLY 10-layer agentic stack (§64.40)\n")
    t0 = time.time()

    # ----- Step 1: end-to-end on read goal -----
    runner = AgenticStackRunner(
        dept="sales",
        granted_scopes=["public:read", "read:sales"],
        artifacts_root=str(REPO_ROOT / "data" / "evaluation" / "agentic"),
    )
    run = runner.execute("list the 10 most recent leads from CRM")
    step(1, "stack runs end-to-end on read goal", run.final_status in ("complete", "all_denied"),
         f"status={run.final_status} tasks={len(run.tasks)} layers={len(run.layers_traversed)}")

    # ----- Step 2: planner emits ≥ 1 task -----
    step(2, "planner emits ≥ 1 task for non-trivial goal", len(run.tasks) >= 1,
         f"got {len(run.tasks)}")

    # ----- Step 3: every task has scope_required -----
    missing = [t.task_id for t in run.tasks if not t.scope_required]
    step(3, "every task has scope_required (invariant #3)", not missing,
         f"missing on: {missing}" if missing else "")

    # ----- Step 4: all 10 layers traversed -----
    expected_layers = {
        "layer_1_user_goal", "layer_2_council", "layer_3_planner",
        "layer_4_decomposition", "layer_5_policy", "layer_6_cua",
        "layer_7_stagehand", "layer_8_playwright", "layer_9_runtime",
        "layer_10_enterprise",
    }
    actual = set(run.layers_traversed)
    missing_layers = expected_layers - actual
    step(4, "all 10 layers traversed (no silent skips)",
         not missing_layers, f"missing: {sorted(missing_layers)}" if missing_layers else "")

    # ----- Step 5: NEGATIVE — empty goal -----
    empty_run = runner.execute("")
    step(5, "NEGATIVE: empty goal rejected (no audit fabrication)",
         empty_run.final_status == "rejected_empty_goal" and len(empty_run.tasks) == 0,
         f"status={empty_run.final_status} tasks={len(empty_run.tasks)}")

    # ----- Step 6: NEGATIVE — trivial "hello" -----
    hello_run = runner.execute("hello")
    step(6, "NEGATIVE: trivial 'hello' produces ≤ 1 task (no over-decomposition)",
         len(hello_run.tasks) <= 1, f"got {len(hello_run.tasks)}")

    # ----- Step 7: NEGATIVE — scope denial -----
    # Force rule-based planner (deterministic) by pointing at an unreachable
    # Ollama URL; the planner will fall back to rule_plan which deterministically
    # emits scope_required="write:admin" for "create..." goals.
    no_admin = AgenticStackRunner(
        dept="admin",
        granted_scopes=["public:read"],  # NO write or admin
        artifacts_root=str(REPO_ROOT / "data" / "evaluation" / "agentic"),
        ollama_url="http://127.0.0.1:1",  # unreachable → forces rule_plan fallback
    )
    create_run = no_admin.execute("create a new admin user with full privileges")
    denied = [t for t in create_run.tasks if t.policy_decision == "deny"]
    step(7, "NEGATIVE: task without granted scope → DENY (invariant #4)",
         len(denied) >= 1,
         f"got {len(denied)} denied of {len(create_run.tasks)} tasks")

    # ----- Step 8: NEGATIVE — denylist pattern -----
    # Construct a task whose target matches a denylist regex
    from ml.reference.agentic_stack import PolicyEngine, Task
    policy = PolicyEngine(
        granted_scopes=["admin:*"],  # scope-allowed
        denylist_patterns=[r"production.*\.delete"],
    )
    danger = Task(
        task_id="t-danger", action="api_call",
        description="delete prod table", target="production_db.delete_users",
        scope_required="admin:delete", reversible=False,
    )
    policy.evaluate([danger])
    step(8, "NEGATIVE: denylist pattern blocks even scope-allowed task",
         danger.policy_decision == "deny",
         f"decision={danger.policy_decision} reason='{danger.policy_reason}'")

    # ----- Step 9: irreversible + admin → require_human_approval -----
    irrev = Task(
        task_id="t-irrev", action="api_call",
        description="hard-delete archived records",
        target="/api/archive/hard_delete",
        scope_required="admin:archive", reversible=False,
    )
    policy2 = PolicyEngine(granted_scopes=["admin:archive"])
    policy2.evaluate([irrev])
    step(9, "irreversible + admin → require_human_approval",
         irrev.policy_decision == "require_human_approval",
         f"decision={irrev.policy_decision} reason='{irrev.policy_reason}'")

    # ----- Step 10: manifest persisted with per-task layer audit -----
    manifest_path = Path(runner.out) / "run.json"
    if not manifest_path.exists():
        step(10, "manifest persisted", False, f"missing {manifest_path}")
        return
    manifest = json.loads(manifest_path.read_text())
    has_per_layer = all(
        "layer_audit" in t and len(t["layer_audit"]) >= 5
        for t in manifest["tasks"]
    )
    step(10, "manifest persisted with per-layer audit per task",
         has_per_layer and len(manifest["tasks"]) > 0,
         f"{len(manifest['tasks'])} tasks, all have ≥5 layer-audit entries")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
