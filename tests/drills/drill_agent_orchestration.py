#!/usr/bin/env python3
"""
Drill: INSUR agent orchestration patterns (§43, §64.43 #5/#8/#9/#10/#12).

Steps (14 total; 6 negative assertions):
    1.  (+) DAG executes 4-node linear chain in correct order
    2.  (-) NEGATIVE — DAG with cycle is rejected (DagCycleError)
    3.  (-) NEGATIVE — DAG with unknown depends_on rejected
    4.  (+) DAG with mid-failure marks downstream nodes 'skipped' (not 'failed')
    5.  (+) Reflection loop terminates within max_iters
    6.  (-) NEGATIVE — Reflection with max_iters=0 rejected at __init__
    7.  (+) Reflection termination_reason is one of the 4 allowed values
    8.  (+) MoA majority method aggregates correctly
    9.  (-) NEGATIVE — MoA below quorum sets requires_human=True (no silent aggregate)
    10. (+) Full OrchestrationDemo runs end-to-end + persists manifest
    11. (+) Debate terminates with one of 4 allowed reasons
    12. (-) NEGATIVE — Debate cost budget hard-stops infinite-loop scenario
    13. (+) Blackboard read returns (value, version) tuple — never bare value
    14. (-) NEGATIVE — Blackboard CAS rejects stale expected_version

# RESOURCES: ml_orchestration

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

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
    from ml.reference.agent_orchestration import (
        AgentVote,
        Blackboard,
        BlackboardConcurrencyError,
        DagCycleError,
        DagExecutionError,
        DagExecutor,
        DagNode,
        DebateOrchestrator,
        MixtureOfAgents,
        OrchestrationDemo,
        ReflectionLoop,
    )

    print("\nDRILL: INSUR agent orchestration (DAG + Reflection + MoA)\n")
    t0 = time.time()

    # ----- Step 1: DAG linear chain -----
    nodes = [
        DagNode("a", "first"),
        DagNode("b", "second", depends_on=["a"]),
        DagNode("c", "third", depends_on=["b"]),
    ]
    order: list[str] = []
    def runner(node):
        order.append(node.node_id)
        return f"ran {node.node_id}"
    result = DagExecutor().execute(nodes, runner)
    step(1, "DAG 3-node chain executes in topological order",
         order == ["a", "b", "c"] and all(n.status == "ok" for n in result.values()),
         f"order={order}")

    # ----- Step 2: NEGATIVE cycle -----
    cycle = [
        DagNode("x", "x", depends_on=["y"]),
        DagNode("y", "y", depends_on=["x"]),
    ]
    try:
        DagExecutor().execute(cycle, runner)
        step(2, "NEGATIVE: cycle rejected", False, "no exception raised")
    except DagCycleError:
        step(2, "NEGATIVE: cycle rejected (DagCycleError)", True)

    # ----- Step 3: NEGATIVE unknown depends_on -----
    bad_dep = [DagNode("p", "p", depends_on=["does_not_exist"])]
    try:
        DagExecutor().execute(bad_dep, runner)
        step(3, "NEGATIVE: unknown dependency rejected", False, "no exception")
    except DagExecutionError:
        step(3, "NEGATIVE: unknown dependency rejected (DagExecutionError)", True)

    # ----- Step 4: parent failure cascades as 'skipped' -----
    nodes2 = [
        DagNode("a", "ok"),
        DagNode("b", "fail", depends_on=["a"]),
        DagNode("c", "downstream", depends_on=["b"]),
        DagNode("d", "downstream2", depends_on=["c"]),
    ]
    def maybe_fail(node):
        if node.node_id == "b":
            raise RuntimeError("simulated b failure")
        return "ok"
    result = DagExecutor().execute(nodes2, maybe_fail)
    ok = (result["a"].status == "ok" and result["b"].status == "failed"
          and result["c"].status == "skipped" and result["d"].status == "skipped")
    step(4, "parent failure → downstream nodes status='skipped' (not 'failed')",
         ok, f"a={result['a'].status} b={result['b'].status} c={result['c'].status} d={result['d'].status}")

    # ----- Step 5: Reflection terminates within max_iters -----
    counter = {"n": 0}
    def propose(prompt, prev):
        counter["n"] += 1
        return f"answer-{counter['n']}"
    def critique(prompt, ans):
        # Quality always low — forces max_iters termination
        return ("low quality", 0.3 + 0.01 * counter["n"])
    refl = ReflectionLoop(max_iters=3, quality_threshold=0.95, min_improvement=0.0).run("test", propose, critique)
    step(5, "Reflection terminates within max_iters",
         len(refl.iterations) <= 3, f"iters={len(refl.iterations)}")

    # ----- Step 6: NEGATIVE Reflection max_iters=0 -----
    try:
        ReflectionLoop(max_iters=0)
        step(6, "NEGATIVE: max_iters=0 rejected", False, "no ValueError")
    except ValueError:
        step(6, "NEGATIVE: max_iters=0 rejected (ValueError)", True)

    # ----- Step 7: termination_reason in allowed set -----
    allowed = {"max_iters", "quality_threshold", "no_improvement", "critic_satisfied"}
    step(7, "Reflection termination_reason in allowed set",
         refl.termination_reason in allowed, f"got '{refl.termination_reason}'")

    # ----- Step 8: MoA majority correct -----
    votes = [
        AgentVote("a1", "yes", 0.9, 10),
        AgentVote("a2", "yes", 0.8, 12),
        AgentVote("a3", "no", 0.7, 8),
    ]
    moa = MixtureOfAgents(method="majority", quorum_threshold=0.5).aggregate(votes)
    step(8, "MoA majority picks 'yes' (2/3 voters)",
         moa.quorum_met and moa.aggregated_answer == "yes",
         f"answer='{moa.aggregated_answer}' quorum={moa.quorum_met}")

    # ----- Step 9: NEGATIVE quorum miss -----
    split_votes = [
        AgentVote("a1", "yes", 0.5, 10),
        AgentVote("a2", "no", 0.5, 10),
        AgentVote("a3", "maybe", 0.5, 10),
    ]
    moa2 = MixtureOfAgents(method="majority", quorum_threshold=0.6).aggregate(split_votes)
    step(9, "NEGATIVE: quorum miss → requires_human=True (no silent aggregate)",
         moa2.requires_human and moa2.aggregated_answer is None,
         f"requires_human={moa2.requires_human} answer={moa2.aggregated_answer}")

    # ----- Step 10: OrchestrationDemo end-to-end -----
    demo = OrchestrationDemo(artifacts_root=str(REPO_ROOT / "data" / "evaluation" / "orchestration"))
    manifest = demo.run()
    mp = Path(manifest.artifacts_root) / "manifest.json"
    ok = (mp.exists() and mp.stat().st_size > 100
          and len(manifest.dag_results) == 4
          and manifest.reflection_result["iterations"]
          and manifest.moa_result["quorum_met"])
    step(10, "OrchestrationDemo runs end-to-end + persists manifest",
         ok, f"dag_nodes={len(manifest.dag_results)} reflection_iters={len(manifest.reflection_result['iterations'])} moa_quorum={manifest.moa_result['quorum_met']}")

    # ----- Step 11: Debate terminates with allowed reason -----
    debate_counter = {"n": 0}
    def proponent(topic, prev):
        debate_counter["n"] += 1
        # Quality climbs each round (simulates real refinement)
        return f"argument-{debate_counter['n']} for {topic}", 0.01

    def opponent(topic, position):
        # Critique quality grows steadily; eventually trips threshold
        q = 0.4 + 0.15 * debate_counter["n"]
        return f"critique of {position[:20]}", q, 0.01

    debate = DebateOrchestrator(max_rounds=5, max_cost_usd=1.0, quality_threshold=0.85, min_progress=0.0).debate(
        "should we raise prices?", proponent, opponent,
    )
    allowed = {"max_rounds", "cost_budget", "quality_threshold", "no_progress"}
    step(11, "Debate terminates with one of 4 allowed reasons",
         debate.termination_reason in allowed,
         f"reason='{debate.termination_reason}' rounds={len(debate.rounds)} converged={debate.converged}")

    # ----- Step 12: NEGATIVE Debate cost budget hard-stops -----
    def expensive_proponent(topic, prev):
        return f"big arg ({len(prev or '')})", 0.5  # each round costs $0.50

    def slow_opponent(topic, position):
        return "weak critique", 0.1, 0.5  # quality stays low → can't converge

    debate2 = DebateOrchestrator(max_rounds=100, max_cost_usd=1.5).debate(
        "infinite topic", expensive_proponent, slow_opponent,
    )
    # Cost is checked AFTER each round's run, so total may overshoot by
    # at most one round's worth. The invariant is "cost hard-stops the loop
    # well before max_rounds=100" — drill accepts ≤ 2.5× budget overshoot.
    ok = (
        debate2.termination_reason == "cost_budget"
        and debate2.total_cost_usd <= 2.5 * 1.5  # ≤ 2.5× budget tolerance
        and len(debate2.rounds) <= 5  # would be 100 without cost gate
    )
    step(12, "NEGATIVE: Debate cost budget hard-stops infinite-loop scenario",
         ok, f"reason='{debate2.termination_reason}' cost=${debate2.total_cost_usd} rounds={len(debate2.rounds)} (vs would-be 100)")

    # ----- Step 13: Blackboard read returns (value, version) tuple -----
    bb = Blackboard()
    v1 = bb.write("counter", 1, writer="agent_a")
    read_result = bb.read("counter")
    ok = (
        isinstance(read_result, tuple)
        and len(read_result) == 2
        and read_result[0] == 1
        and read_result[1] == v1
    )
    step(13, "Blackboard read returns (value, version) tuple — never bare value",
         ok, f"read={read_result} expected (1, {v1})")

    # ----- Step 14: NEGATIVE Blackboard CAS rejects stale version -----
    bb.write("counter", 2, writer="agent_b")  # version bumped to 2
    try:
        # Agent A still thinks version is 1; CAS should reject
        bb.cas_write("counter", 99, expected_version=v1, writer="agent_a")
        step(14, "NEGATIVE: stale CAS write rejected", False, "no BlackboardConcurrencyError")
    except BlackboardConcurrencyError as exc:
        # Also verify the value didn't change
        actual, _ = bb.read("counter")
        step(14, "NEGATIVE: stale CAS rejected + value preserved",
             actual == 2, f"value after rejected CAS = {actual} (expected 2)")

    print(f"\n\033[32mALL 14 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
