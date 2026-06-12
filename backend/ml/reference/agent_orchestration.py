"""INSUR reference: agentic orchestration patterns (§64.43).

Three high-leverage patterns not previously implemented:

  1. DagExecutor          (§64.43 #8 — DAG Workflow)
                          topological-sort tasks; honor depends_on; halt
                          dependents on parent failure
  2. ReflectionLoop       (§64.43 #10 — Reflection)
                          answer → critique → refine, bounded by max_iters
                          AND quality-improvement threshold
  3. MixtureOfAgents      (§64.43 #12 — Mixture-of-Agents)
                          N models propose → majority vote OR judge-pick;
                          quorum-miss routes to human

Each pattern is a pure-Python class with no external framework dependency
— no LangGraph / CrewAI / AutoGen — to keep the dependency footprint flat
and the contract deterministic for drills.

Reference: composes with agentic_stack.py (the 10-layer execution stack
uses these patterns at Layer 3 (Planner emits a DAG), Layer 6 (CUA can
use Reflection per task), and Layer 6 (CUA can use MoA for risky
classification choices).
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)


# ===========================================================================
# Pattern 1 — DagExecutor (§64.43 #8)
# ===========================================================================


@dataclass
class DagNode:
    node_id: str
    description: str
    depends_on: list[str] = field(default_factory=list)
    # Filled at execution time
    status: str = "pending"  # "pending" | "running" | "ok" | "failed" | "skipped"
    result: Any = None
    error: str = ""
    started_at: float = 0.0
    finished_at: float = 0.0


class DagExecutionError(Exception):
    pass


class DagCycleError(DagExecutionError):
    pass


class DagExecutor:
    """Topological execution with halt-on-parent-failure semantics.

    Contract:
        - execute(nodes, runner) takes a list of DagNode + a runner callable
        - runner(node) → Any (success) OR raises Exception (failure)
        - cycle in depends_on → DagCycleError (drill-asserted)
        - parent failure → child nodes status = 'skipped' (not 'failed')
        - returns dict {node_id: DagNode} with full status
    """

    def execute(self, nodes: list[DagNode], runner: Callable[[DagNode], Any]) -> dict[str, DagNode]:
        # Build id → node map + dependency adjacency
        nmap = {n.node_id: n for n in nodes}
        if len(nmap) != len(nodes):
            raise DagExecutionError("duplicate node_id")

        # Validate dependencies refer to known nodes
        for n in nodes:
            for dep in n.depends_on:
                if dep not in nmap:
                    raise DagExecutionError(f"node {n.node_id} depends on unknown {dep}")

        # Topological sort with cycle detection (Kahn's algorithm)
        in_degree: dict[str, int] = {n.node_id: len(n.depends_on) for n in nodes}
        # children of each node
        children: dict[str, list[str]] = defaultdict(list)
        for n in nodes:
            for dep in n.depends_on:
                children[dep].append(n.node_id)

        ready: list[str] = [nid for nid, d in in_degree.items() if d == 0]
        order: list[str] = []
        remaining = dict(in_degree)

        while ready:
            nid = ready.pop(0)
            order.append(nid)
            for child_nid in children[nid]:
                remaining[child_nid] -= 1
                if remaining[child_nid] == 0:
                    ready.append(child_nid)

        if len(order) != len(nodes):
            unresolved = [nid for nid, d in remaining.items() if d > 0]
            raise DagCycleError(f"cycle detected; unresolved: {unresolved}")

        # Execute in topological order; propagate parent failure as skip
        for nid in order:
            node = nmap[nid]
            # Check if any parent failed → skip
            parent_failed = any(nmap[p].status in ("failed", "skipped") for p in node.depends_on)
            if parent_failed:
                node.status = "skipped"
                node.error = "parent failed"
                continue
            node.status = "running"
            node.started_at = time.time()
            try:
                node.result = runner(node)
                node.status = "ok"
            except Exception as exc:
                node.status = "failed"
                node.error = f"{type(exc).__name__}: {exc}"
                logger.warning("DAG node %s failed: %s", nid, exc)
            finally:
                node.finished_at = time.time()

        return nmap


# ===========================================================================
# Pattern 2 — ReflectionLoop (§64.43 #10)
# ===========================================================================


@dataclass
class ReflectionStep:
    iteration: int
    answer: str
    critique: str
    quality_score: float
    accepted: bool


@dataclass
class ReflectionResult:
    final_answer: str
    iterations: list[ReflectionStep] = field(default_factory=list)
    converged: bool = False
    termination_reason: str = ""


class ReflectionLoop:
    """Answer → critique → refine loop with mandatory termination guarantees.

    Drill invariants:
        - Always terminates within max_iters (no infinite loop)
        - Termination_reason is one of: 'max_iters' | 'quality_threshold' |
          'no_improvement' | 'critic_satisfied'
        - Quality score MUST be in [0, 1]
    """

    def __init__(
        self,
        *,
        max_iters: int = 4,
        quality_threshold: float = 0.85,
        min_improvement: float = 0.02,
    ):
        if max_iters < 1:
            raise ValueError("max_iters must be ≥ 1")
        if not 0 < quality_threshold <= 1:
            raise ValueError("quality_threshold must be in (0, 1]")
        self.max_iters = max_iters
        self.quality_threshold = quality_threshold
        self.min_improvement = min_improvement

    def run(
        self,
        prompt: str,
        propose: Callable[[str, str | None], str],  # propose(prompt, previous_answer) → answer
        critique: Callable[[str, str], tuple[str, float]],  # critique(prompt, answer) → (critique_text, quality_score)
    ) -> ReflectionResult:
        result = ReflectionResult(final_answer="")
        last_quality = 0.0
        for i in range(1, self.max_iters + 1):
            previous = result.iterations[-1].answer if result.iterations else None
            answer = propose(prompt, previous)
            critique_text, quality = critique(prompt, answer)

            # Clip quality to [0, 1]
            quality = float(max(0.0, min(1.0, quality)))

            accepted = quality >= self.quality_threshold
            result.iterations.append(ReflectionStep(
                iteration=i, answer=answer, critique=critique_text,
                quality_score=quality, accepted=accepted,
            ))
            result.final_answer = answer

            if accepted:
                result.converged = True
                result.termination_reason = "quality_threshold"
                return result
            # No improvement vs last iteration?
            if i > 1 and quality - last_quality < self.min_improvement:
                result.termination_reason = "no_improvement"
                return result
            last_quality = quality

        result.termination_reason = "max_iters"
        return result


# ===========================================================================
# Pattern 3 — MixtureOfAgents (§64.43 #12)
# ===========================================================================


@dataclass
class AgentVote:
    agent_id: str
    answer: Any
    confidence: float
    latency_ms: float


@dataclass
class MoAResult:
    aggregated_answer: Any
    votes: list[AgentVote] = field(default_factory=list)
    method: str = ""
    quorum_met: bool = False
    requires_human: bool = False
    vote_breakdown: dict[str, int] = field(default_factory=dict)


class MixtureOfAgents:
    """Ensemble pattern: N agents propose; aggregate by majority OR judge.

    Methods:
        'majority'    — most-voted answer wins; tie → require_human
        'weighted'    — vote weighted by confidence; require quorum > 0.5
        'judge'       — separate judge agent picks among proposals

    Drill invariants:
        - Quorum threshold MUST be enforced; quorum-miss → requires_human=True
        - Every vote captured in votes list (no silent drop)
        - Aggregate decision is reproducible given same votes
    """

    def __init__(
        self,
        *,
        method: str = "majority",
        quorum_threshold: float = 0.5,  # fraction of agents that must agree
    ):
        if method not in ("majority", "weighted", "judge"):
            raise ValueError(f"unknown method {method}")
        if not 0 < quorum_threshold <= 1:
            raise ValueError("quorum_threshold must be in (0, 1]")
        self.method = method
        self.quorum_threshold = quorum_threshold

    def aggregate(self, votes: list[AgentVote], judge: Callable | None = None) -> MoAResult:
        result = MoAResult(aggregated_answer=None, votes=list(votes), method=self.method)
        if not votes:
            result.requires_human = True
            return result

        if self.method == "majority":
            counts = Counter(str(v.answer) for v in votes)
            top, top_n = counts.most_common(1)[0]
            n_total = len(votes)
            quorum_fraction = top_n / n_total
            result.vote_breakdown = dict(counts)
            result.quorum_met = quorum_fraction >= self.quorum_threshold
            if not result.quorum_met:
                result.requires_human = True
                result.aggregated_answer = None
            else:
                # Recover the actual (non-str-coerced) answer from a matching vote
                result.aggregated_answer = next(v.answer for v in votes if str(v.answer) == top)

        elif self.method == "weighted":
            weights: dict[str, float] = defaultdict(float)
            for v in votes:
                weights[str(v.answer)] += v.confidence
            total_w = sum(weights.values()) or 1.0
            top = max(weights.keys(), key=lambda k: weights[k])
            top_frac = weights[top] / total_w
            result.vote_breakdown = {k: round(w, 4) for k, w in weights.items()}
            result.quorum_met = top_frac >= self.quorum_threshold
            if not result.quorum_met:
                result.requires_human = True
                result.aggregated_answer = None
            else:
                result.aggregated_answer = next(v.answer for v in votes if str(v.answer) == top)

        elif self.method == "judge":
            if judge is None:
                raise ValueError("'judge' method requires judge callable")
            chosen = judge(votes)
            result.quorum_met = True
            result.aggregated_answer = chosen
            result.vote_breakdown = {str(v.answer): 1 for v in votes}

        return result


# ===========================================================================
# Pattern 4 — DebateOrchestrator (§64.43 #9)
# ===========================================================================


@dataclass
class DebateRound:
    round_num: int
    proponent_argument: str
    opponent_critique: str
    quality_delta: float    # how much the critique improved the argument
    cost_usd: float


@dataclass
class DebateResult:
    topic: str
    final_position: str     # the converged answer
    rounds: list[DebateRound] = field(default_factory=list)
    converged: bool = False
    termination_reason: str = ""  # "max_rounds" | "cost_budget" | "quality_threshold" | "no_progress"
    total_cost_usd: float = 0.0


class DebateOrchestrator:
    """Agents challenge each other across N rounds with cost + progress gates.

    Failure modes invited by debate pattern:
      - Infinite loop  → MUST cap by max_rounds
      - Cost explosion → MUST cap by max_cost_usd
      - Stalemate      → MUST detect no-progress and exit

    Drill invariants:
      - Always terminates with one of 4 termination reasons
      - total_cost_usd <= max_cost_usd
      - len(rounds) <= max_rounds
      - converged is True only when quality_threshold met
    """

    def __init__(
        self,
        *,
        max_rounds: int = 4,
        max_cost_usd: float = 0.10,
        quality_threshold: float = 0.85,
        min_progress: float = 0.02,
    ):
        if max_rounds < 1:
            raise ValueError("max_rounds must be ≥ 1")
        if max_cost_usd <= 0:
            raise ValueError("max_cost_usd must be > 0")
        if not 0 < quality_threshold <= 1:
            raise ValueError("quality_threshold must be in (0, 1]")
        self.max_rounds = max_rounds
        self.max_cost_usd = max_cost_usd
        self.quality_threshold = quality_threshold
        self.min_progress = min_progress

    def debate(
        self,
        topic: str,
        proponent: Callable[[str, str | None], tuple[str, float]],   # (argument, cost_usd)
        opponent: Callable[[str, str], tuple[str, float, float]],    # (critique, quality_delta, cost_usd)
    ) -> DebateResult:
        result = DebateResult(topic=topic, final_position="")
        last_position = ""
        last_quality_delta = 1.0  # initial baseline so round 1 always runs

        for r in range(1, self.max_rounds + 1):
            # Proponent makes the case (refines based on prior critique)
            position, p_cost = proponent(topic, last_position or None)
            # Opponent critiques
            critique, q_delta, o_cost = opponent(topic, position)
            round_cost = p_cost + o_cost

            result.rounds.append(DebateRound(
                round_num=r,
                proponent_argument=position,
                opponent_critique=critique,
                quality_delta=float(max(0.0, min(1.0, q_delta))),
                cost_usd=round(round_cost, 6),
            ))
            result.total_cost_usd = round(result.total_cost_usd + round_cost, 6)
            result.final_position = position
            last_position = position

            # Termination gates (in priority order):
            # 1. Cost budget exceeded → STOP
            if result.total_cost_usd >= self.max_cost_usd:
                result.termination_reason = "cost_budget"
                return result
            # 2. Quality high enough → CONVERGED
            if q_delta >= self.quality_threshold:
                result.converged = True
                result.termination_reason = "quality_threshold"
                return result
            # 3. No progress for 2 rounds → STALEMATE
            if r >= 2 and abs(q_delta - last_quality_delta) < self.min_progress:
                result.termination_reason = "no_progress"
                return result
            last_quality_delta = q_delta

        result.termination_reason = "max_rounds"
        return result


# ===========================================================================
# Pattern 5 — Blackboard (§64.43 #5)
# ===========================================================================


@dataclass
class BlackboardEntry:
    key: str
    value: Any
    version: int
    writer: str
    timestamp: float
    namespace: str = "default"


class BlackboardConcurrencyError(Exception):
    """Raised when a CAS (compare-and-set) write loses the race."""
    pass


class Blackboard:
    """Shared key-value memory for multi-agent collaboration.

    Failure modes invited by blackboard pattern:
      - Lost-update race conditions → MUST support compare-and-set (CAS)
      - Stale reads                 → MUST expose version on read
      - Namespace pollution         → MUST namespace per agent-team

    Drill invariants:
      - Every write increments version
      - read(key) returns (value, version) tuple — never bare value
      - cas_write requires expected_version match — else raises
      - delete returns the bool actually-deleted, never silently no-ops
    """

    def __init__(self):
        # Keyed by (namespace, key) to support multi-team isolation
        self._store: dict[tuple[str, str], BlackboardEntry] = {}
        self._next_version = 1

    def write(self, key: str, value: Any, *, writer: str = "anonymous",
              namespace: str = "default") -> int:
        """Unconditional write; bumps version. Returns new version number."""
        version = self._next_version
        self._next_version += 1
        self._store[(namespace, key)] = BlackboardEntry(
            key=key, value=value, version=version,
            writer=writer, timestamp=time.time(), namespace=namespace,
        )
        return version

    def cas_write(self, key: str, value: Any, *, expected_version: int,
                  writer: str = "anonymous", namespace: str = "default") -> int:
        """Compare-and-set: writes only if current version matches expected.

        Raises BlackboardConcurrencyError if expected_version doesn't match.
        Returns new version on success.
        """
        existing = self._store.get((namespace, key))
        current_version = existing.version if existing else 0
        if current_version != expected_version:
            raise BlackboardConcurrencyError(
                f"CAS failed for {namespace}/{key}: expected v{expected_version}, "
                f"current is v{current_version}"
            )
        return self.write(key, value, writer=writer, namespace=namespace)

    def read(self, key: str, *, namespace: str = "default") -> tuple[Any, int] | None:
        """Returns (value, version) tuple or None if not present.
        NEVER returns bare value — version is required for CAS.
        """
        entry = self._store.get((namespace, key))
        if entry is None:
            return None
        return (entry.value, entry.version)

    def delete(self, key: str, *, namespace: str = "default") -> bool:
        """Returns True if actually deleted, False if not present.
        Never silently no-ops."""
        return self._store.pop((namespace, key), None) is not None

    def list_keys(self, *, namespace: str = "default") -> list[str]:
        return sorted(k for (ns, k) in self._store.keys() if ns == namespace)

    def list_namespaces(self) -> list[str]:
        return sorted({ns for (ns, _) in self._store.keys()})

    def snapshot(self, *, namespace: str | None = None) -> dict[str, Any]:
        """Read-only snapshot for audit purposes."""
        return {
            f"{ns}/{k}": {"value": e.value, "version": e.version, "writer": e.writer}
            for (ns, k), e in self._store.items()
            if namespace is None or ns == namespace
        }


# ===========================================================================
# Orchestrator wrapper — wires all 3 patterns into one runnable demo
# ===========================================================================


@dataclass
class OrchestrationManifest:
    run_id: str
    artifacts_root: str
    duration_seconds: float = 0.0
    dag_results: dict[str, Any] = field(default_factory=dict)
    reflection_result: dict[str, Any] = field(default_factory=dict)
    moa_result: dict[str, Any] = field(default_factory=dict)


class OrchestrationDemo:
    """End-to-end demo: build a 4-node DAG, reflect on one node's output,
    then ensemble-aggregate via MoA. Used by the drill."""

    def __init__(self, artifacts_root: str | Path = "data/evaluation/orchestration"):
        self.run_id = f"orch-{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / self.run_id
        self.out.mkdir(parents=True, exist_ok=True)
        self.manifest = OrchestrationManifest(run_id=self.run_id, artifacts_root=str(self.out))

    def run(self) -> OrchestrationManifest:
        t0 = time.time()

        # ---- DAG ----
        nodes = [
            DagNode("ingest", "Read input data"),
            DagNode("clean", "Clean + impute", depends_on=["ingest"]),
            DagNode("model", "Train model", depends_on=["clean"]),
            DagNode("eval", "Evaluate model", depends_on=["model"]),
        ]
        def dag_runner(node: DagNode) -> dict:
            return {"node": node.node_id, "rows": 1000}
        dag_result = DagExecutor().execute(nodes, dag_runner)
        self.manifest.dag_results = {nid: asdict(n) for nid, n in dag_result.items()}

        # ---- Reflection ----
        def propose(prompt: str, previous: str | None) -> str:
            # Simulate improving answers each iteration
            base = "Answer to: " + prompt
            iteration = (len(previous or "") % 5) + 1
            return f"{base} [iter {iteration} with more detail]"
        def critique(prompt: str, answer: str) -> tuple[str, float]:
            # Quality grows with answer length (toy proxy)
            quality = min(0.95, 0.4 + 0.1 * (len(answer) / 50))
            return ("answer length increased; quality acceptable" if quality > 0.85 else
                    "answer too short", quality)
        refl = ReflectionLoop(max_iters=5, quality_threshold=0.85).run(
            "Summarize the model evaluation report", propose, critique,
        )
        self.manifest.reflection_result = asdict(refl)

        # ---- Mixture-of-Agents ----
        votes = [
            AgentVote("agent_xgb", "approve", 0.91, 22),
            AgentVote("agent_lgbm", "approve", 0.85, 18),
            AgentVote("agent_logreg", "deny", 0.40, 5),
            AgentVote("agent_nn", "approve", 0.78, 60),
        ]
        moa = MixtureOfAgents(method="weighted", quorum_threshold=0.5).aggregate(votes)
        self.manifest.moa_result = asdict(moa)

        self.manifest.duration_seconds = round(time.time() - t0, 3)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-root", default="data/evaluation/orchestration")
    args = parser.parse_args()
    demo = OrchestrationDemo(artifacts_root=args.artifacts_root)
    manifest = demo.run()
    print(json.dumps(asdict(manifest), indent=2, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
