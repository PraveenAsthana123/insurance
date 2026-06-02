"""Temporal worker template — durable scheduled workflows.

Per Codex 2026-06-01 recommendation + global ADR-004 (Redis+Celery now,
Temporal for durable workflows).

Use Temporal for:
    - Long-running agent workflows that must survive restart
    - Approval workflows (await human gate then resume)
    - Scheduled per-tenant tasks
    - Retries with exponential backoff
    - Compensation / saga patterns

Composes with LangGraph (LangGraph for DAG of agents within a single
workflow; Temporal for durable orchestration of those workflows across
time + restarts).

Usage:
    # Boot worker in long-running process
    python -m insur_project.temporal_worker

    # Trigger workflow from elsewhere
    from temporalio.client import Client
    client = await Client.connect("localhost:7233")
    handle = await client.start_workflow(
        DailyAuditWorkflow.run,
        WorkflowInput(tenant_id="acme", scope="all"),
        id=f"daily-audit-{tenant_id}-{date}",
        task_queue="insur-tasks",
    )
"""
from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import timedelta

logger = logging.getLogger(__name__)

# Lazy-import temporalio
try:
    from temporalio import activity, workflow
    from temporalio.client import Client
    from temporalio.worker import Worker
    _TEMPORAL_AVAILABLE = True
except ImportError:  # pragma: no cover
    _TEMPORAL_AVAILABLE = False
    activity = None  # type: ignore[assignment]
    workflow = None  # type: ignore[assignment]


# ─────────────────────────────────────────────────────────────────────────
# Workflow inputs / outputs
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class DailyAuditInput:
    tenant_id: str
    scope: str = "all"


@dataclass
class DailyAuditResult:
    tenant_id: str
    n_audits: int
    n_failures: int


# ─────────────────────────────────────────────────────────────────────────
# Activities — the side-effectful work
# ─────────────────────────────────────────────────────────────────────────

if _TEMPORAL_AVAILABLE:
    @activity.defn(name="insur.run_audit")
    async def run_audit_activity(tenant_id: str, scope: str) -> dict:
        """Run one audit. Idempotent: same tenant + scope produces same result."""
        logger.info("run_audit_activity tenant=%s scope=%s", tenant_id, scope)
        # In production: invoke the project's audit script per scope
        return {"tenant_id": tenant_id, "scope": scope, "n_findings": 0}


    @activity.defn(name="insur.notify_oncall")
    async def notify_oncall_activity(tenant_id: str, failures: int) -> None:
        """Page on-call if audit found failures."""
        logger.info("notify_oncall tenant=%s failures=%d", tenant_id, failures)
        # In production: send PagerDuty / Opsgenie alert


    # ─────────────────────────────────────────────────────────────────────
    # Workflow — durable orchestration
    # ─────────────────────────────────────────────────────────────────────

    @workflow.defn(name="insur.DailyAuditWorkflow")
    class DailyAuditWorkflow:
        @workflow.run
        async def run(self, inp: DailyAuditInput) -> DailyAuditResult:
            result = await workflow.execute_activity(
                run_audit_activity,
                args=[inp.tenant_id, inp.scope],
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=workflow.RetryPolicy(
                    initial_interval=timedelta(seconds=10),
                    backoff_coefficient=2.0,
                    maximum_attempts=5,
                ),
            )
            n_failures = result["n_findings"]
            if n_failures > 0:
                await workflow.execute_activity(
                    notify_oncall_activity,
                    args=[inp.tenant_id, n_failures],
                    start_to_close_timeout=timedelta(minutes=1),
                )
            return DailyAuditResult(
                tenant_id=inp.tenant_id,
                n_audits=1,
                n_failures=n_failures,
            )


# ─────────────────────────────────────────────────────────────────────────
# Worker bootstrap
# ─────────────────────────────────────────────────────────────────────────

async def run_worker() -> None:
    if not _TEMPORAL_AVAILABLE:
        raise RuntimeError("temporalio not installed; pip install temporalio")

    address = os.getenv("INSUR_TEMPORAL_ADDRESS", "localhost:7233")
    namespace = os.getenv("INSUR_TEMPORAL_NAMESPACE", "default")
    task_queue = os.getenv("INSUR_TEMPORAL_TASK_QUEUE", "insur-tasks")

    client = await Client.connect(address, namespace=namespace)
    worker = Worker(
        client,
        task_queue=task_queue,
        workflows=[DailyAuditWorkflow],
        activities=[run_audit_activity, notify_oncall_activity],
    )
    logger.info("Temporal worker started on %s (task_queue=%s)", address, task_queue)
    await worker.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
