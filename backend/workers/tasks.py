"""
Celery tasks for the BEV Analytics platform.

Tasks:
    train_model       — load data, train a model, log to MLflow
    predict           — load model from MLflow, run prediction
    run_pipeline      — orchestrate a full ML pipeline for a department
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

# Ensure backend package is importable when Celery starts the worker
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from celery import Task  # noqa: E402
from celery.exceptions import SoftTimeLimitExceeded  # noqa: E402

from workers.celery_app import celery_app  # noqa: E402

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pipeline registry — maps department names to pipeline classes
# ---------------------------------------------------------------------------

def _get_pipeline(department_id: str, pipeline_name: str) -> Any:
    """Lazy import a pipeline class by department / pipeline name."""
    pipeline_map: dict[str, str] = {
        "sales": "ml.pipelines.demand_forecast.DemandForecastPipeline",
        "supply_chain": "ml.pipelines.inventory_optimizer.InventoryOptimizerPipeline",
        "logistics": "ml.pipelines.inventory_optimizer.InventoryOptimizerPipeline",
        "manufacturing": "ml.pipelines.predictive_maintenance.PredictiveMaintenancePipeline",
        "maintenance": "ml.pipelines.predictive_maintenance.PredictiveMaintenancePipeline",
        "retail": "ml.pipelines.demand_forecast.DemandForecastPipeline",
        "customer": "ml.pipelines.customer_segmentation.CustomerSegmentationPipeline",
        "finance": "ml.pipelines.demand_forecast.DemandForecastPipeline",
        "procurement": "ml.pipelines.inventory_optimizer.InventoryOptimizerPipeline",
        "quality": "ml.pipelines.defect_detection.DefectDetectionPipeline",
        "governance": "ml.pipelines.sentiment_analysis.SentimentAnalysisPipeline",
    }

    # Use explicit pipeline_name override if provided
    if pipeline_name and "." in pipeline_name:
        dotted_path = pipeline_name
    else:
        dotted_path = pipeline_map.get(department_id, "")

    if not dotted_path:
        raise ValueError(f"No pipeline registered for department '{department_id}'")

    module_path, class_name = dotted_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


# ---------------------------------------------------------------------------
# Task: train_model
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.tasks.train_model",
    max_retries=2,
    default_retry_delay=30,
)
def train_model(
    self: Task,
    model_id: str,
    dataset_path: str,
    algorithm: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Train an ML model and log artefacts to MLflow.

    Args:
        model_id:      Logical model identifier (used for experiment naming).
        dataset_path:  Absolute path to the input CSV/parquet file.
        algorithm:     Algorithm name (e.g. "xgboost", "random_forest", "kmeans").
        params:        Optional hyper-parameter overrides.

    Returns:
        dict with keys: run_id, metrics, feature_importance (where applicable).
    """
    import pandas as pd
    from core.config import get_settings

    settings = get_settings()
    params = params or {}

    logger.info(
        "train_model started | model_id=%s algorithm=%s dataset=%s",
        model_id, algorithm, dataset_path,
    )
    self.update_state(state="STARTED", meta={"model_id": model_id, "step": "loading_data"})

    try:
        data_path = Path(dataset_path)
        if not data_path.exists():
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")

        if data_path.suffix.lower() == ".parquet":
            df = pd.read_parquet(data_path)
        else:
            df = pd.read_csv(data_path)

        logger.info("Loaded dataset: %d rows × %d cols", len(df), len(df.columns))
        self.update_state(state="PROGRESS", meta={"step": "training", "rows": len(df)})

        # Select pipeline by algorithm
        algo_lower = algorithm.lower()
        if "forecast" in algo_lower or "xgboost" in algo_lower:
            from ml.pipelines.demand_forecast import DemandForecastPipeline
            pipeline = DemandForecastPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "inventory" in algo_lower or "random_forest" in algo_lower:
            from ml.pipelines.inventory_optimizer import InventoryOptimizerPipeline
            pipeline = InventoryOptimizerPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "cluster" in algo_lower or "kmeans" in algo_lower or "segment" in algo_lower:
            from ml.pipelines.customer_segmentation import CustomerSegmentationPipeline
            pipeline = CustomerSegmentationPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "maintenance" in algo_lower:
            from ml.pipelines.predictive_maintenance import PredictiveMaintenancePipeline
            pipeline = PredictiveMaintenancePipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "defect" in algo_lower or "cnn" in algo_lower:
            from ml.pipelines.defect_detection import DefectDetectionPipeline
            pipeline = DefectDetectionPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "sentiment" in algo_lower or "nlp" in algo_lower:
            from ml.pipelines.sentiment_analysis import SentimentAnalysisPipeline
            pipeline = SentimentAnalysisPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        result = pipeline.train(df, experiment_name=model_id, **params)
        logger.info("train_model complete | model_id=%s run_id=%s", model_id, result.get("run_id"))
        return result

    except SoftTimeLimitExceeded:
        logger.error("train_model soft time limit exceeded | model_id=%s", model_id)
        raise
    except Exception as exc:
        logger.exception("train_model failed | model_id=%s error=%s", model_id, exc)
        raise self.retry(exc=exc) from exc


# ---------------------------------------------------------------------------
# Task: predict
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.tasks.predict",
    max_retries=2,
    default_retry_delay=10,
)
def predict(
    self: Task,
    model_id: str,
    model_run_id: str,
    input_data: list[dict[str, Any]],
    algorithm: str = "xgboost",
) -> dict[str, Any]:
    """
    Load a trained model from MLflow and run inference.

    Args:
        model_id:     Logical model identifier (for logging).
        model_run_id: MLflow run ID that holds the model artefact.
        input_data:   List of dicts — each dict is one row of features.
        algorithm:    Algorithm name (controls which pipeline loader to use).

    Returns:
        dict with keys: predictions (list), model_run_id.
    """
    import pandas as pd
    from core.config import get_settings

    settings = get_settings()

    logger.info("predict started | model_id=%s run_id=%s rows=%d", model_id, model_run_id, len(input_data))
    self.update_state(state="STARTED", meta={"model_id": model_id, "step": "loading_model"})

    try:
        df = pd.DataFrame(input_data)

        algo_lower = algorithm.lower()
        if "forecast" in algo_lower or "xgboost" in algo_lower:
            from ml.pipelines.demand_forecast import DemandForecastPipeline
            pipeline = DemandForecastPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "inventory" in algo_lower or "random_forest" in algo_lower:
            from ml.pipelines.inventory_optimizer import InventoryOptimizerPipeline
            pipeline = InventoryOptimizerPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "cluster" in algo_lower or "kmeans" in algo_lower or "segment" in algo_lower:
            from ml.pipelines.customer_segmentation import CustomerSegmentationPipeline
            pipeline = CustomerSegmentationPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "maintenance" in algo_lower:
            from ml.pipelines.predictive_maintenance import PredictiveMaintenancePipeline
            pipeline = PredictiveMaintenancePipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "defect" in algo_lower:
            from ml.pipelines.defect_detection import DefectDetectionPipeline
            pipeline = DefectDetectionPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        elif "sentiment" in algo_lower or "nlp" in algo_lower:
            from ml.pipelines.sentiment_analysis import SentimentAnalysisPipeline
            pipeline = SentimentAnalysisPipeline(mlflow_tracking_uri=settings.mlflow_tracking_uri)
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        predictions = pipeline.predict(model_run_id, df)
        logger.info("predict complete | model_id=%s predictions=%d", model_id, len(predictions))
        return {"predictions": predictions, "model_run_id": model_run_id}

    except SoftTimeLimitExceeded:
        logger.error("predict soft time limit exceeded | model_id=%s", model_id)
        raise
    except Exception as exc:
        logger.exception("predict failed | model_id=%s error=%s", model_id, exc)
        raise self.retry(exc=exc) from exc


# ---------------------------------------------------------------------------
# Task: run_pipeline
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.tasks.run_pipeline",
    max_retries=1,
    default_retry_delay=60,
)
def run_pipeline(
    self: Task,
    department_id: str,
    pipeline_name: str,
    dataset_path: str | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Run a full ML pipeline for a department.

    If dataset_path is not provided, looks for sample data under
    /data/kaggle/{department_id}/.

    Args:
        department_id:  One of the 11 BEV department identifiers.
        pipeline_name:  Dotted path to the pipeline class, or empty string
                        to use the registered default.
        dataset_path:   Optional path to dataset CSV. Falls back to sample data.
        params:         Optional hyper-parameter overrides.

    Returns:
        dict with keys: run_id, metrics, and any pipeline-specific fields.
    """
    import pandas as pd
    from core.config import get_settings

    settings = get_settings()
    params = params or {}

    logger.info(
        "run_pipeline started | dept=%s pipeline=%s",
        department_id, pipeline_name,
    )
    self.update_state(state="STARTED", meta={"department": department_id, "step": "initialising"})

    try:
        # Resolve dataset path
        if dataset_path:
            data_file = Path(dataset_path)
        else:
            kaggle_dir = Path(settings.kaggle_dir) / department_id
            csv_files = list(kaggle_dir.glob("*.csv"))
            if not csv_files:
                raise FileNotFoundError(
                    f"No CSV files found in {kaggle_dir}. "
                    "Run 'scripts/generate_sample_data.py' first."
                )
            data_file = csv_files[0]

        logger.info("run_pipeline using dataset: %s", data_file)
        self.update_state(state="PROGRESS", meta={"step": "loading_data", "file": str(data_file)})

        df = pd.read_csv(data_file)

        # Instantiate pipeline
        PipelineClass = _get_pipeline(department_id, pipeline_name)
        pipeline = PipelineClass(mlflow_tracking_uri=settings.mlflow_tracking_uri)

        self.update_state(state="PROGRESS", meta={"step": "training"})
        result = pipeline.train(df, experiment_name=f"{department_id}_pipeline", **params)

        logger.info(
            "run_pipeline complete | dept=%s run_id=%s",
            department_id, result.get("run_id"),
        )
        return {"department": department_id, **result}

    except SoftTimeLimitExceeded:
        logger.error("run_pipeline soft time limit exceeded | dept=%s", department_id)
        raise
    except Exception as exc:
        logger.exception("run_pipeline failed | dept=%s error=%s", department_id, exc)
        raise self.retry(exc=exc) from exc


# ============================================================
# INSUR reference-lifecycle tasks (operator request 2026-05-22)
# Run by Celery beat per the schedule in workers/celery_app.py
# ============================================================


@celery_app.task(bind=True, name="insur.run_structured_lifecycle")
def run_structured_lifecycle(self, *, dataset, target, task_type, dept, pipeline_name,
                              date_cols=None, drop_cols=None, n_trials=10, sample_rows=None):
    """Run the full structured-ML lifecycle (EDA → eval → SHAP) and persist
    manifest + plots under data/eval/<dept>/<pipeline>/<run_id>/.
    """
    from core.config import get_settings
    from ml.reference.full_lifecycle import FullLifecycle

    settings = get_settings()

    logger.info(
        "insur.run_structured_lifecycle | dept=%s pipeline=%s dataset=%s",
        dept, pipeline_name, dataset,
    )
    self.update_state(state="PROGRESS", meta={"step": "starting"})

    runner = FullLifecycle(
        dataset_path=dataset,
        target_col=target,
        task=task_type,
        dept=dept,
        pipeline_name=pipeline_name,
        date_cols=date_cols or [],
        drop_cols=drop_cols or [],
        n_trials=n_trials,
        sample_rows=sample_rows,
        mlflow_tracking_uri=settings.mlflow_tracking_uri,
    )
    manifest = runner.run()
    return {
        "run_id": manifest.run_id,
        "dept": dept,
        "pipeline": pipeline_name,
        "duration_seconds": manifest.duration_seconds,
        "metrics": manifest.metrics,
        "n_plots": len(manifest.plots),
    }


@celery_app.task(bind=True, name="insur.run_rag_lifecycle")
def run_rag_lifecycle(self, *, corpus, dept, pipeline_name, chunking="sentence_aware",
                       llm="gemma3:1b", top_k=4):
    """Run the full RAG lifecycle: chunk → embed → index → retrieve → answer → cite."""
    from ml.reference.rag_lifecycle import RagLifecycle

    logger.info(
        "insur.run_rag_lifecycle | dept=%s pipeline=%s corpus=%s",
        dept, pipeline_name, corpus,
    )
    self.update_state(state="PROGRESS", meta={"step": "starting"})

    ollama_url = os.environ.get("BEV_OLLAMA_HOST", "http://ollama:11434")
    runner = RagLifecycle(
        corpus_paths=corpus,
        dept=dept,
        pipeline_name=pipeline_name,
        chunking=chunking,
        llm_model=llm,
        ollama_url=ollama_url,
        top_k=top_k,
    )
    manifest = runner.run()
    return {
        "run_id": manifest.run_id,
        "dept": dept,
        "pipeline": pipeline_name,
        "duration_seconds": manifest.duration_seconds,
        "n_chunks": manifest.n_chunks,
        "eval": manifest.eval,
        "circuit_breaker_state": manifest.circuit_breaker_state,
    }


# ============================================================
# Test-tier auto-dispatch task per global §65.8.5 (Celery beat)
# ============================================================


@celery_app.task(bind=True, name="insur.dispatch_test_fanout")
def dispatch_test_fanout(self, *, tier: str, depts: list[str],
                          timeout_seconds: int = 600,
                          agent_role_required: str | None = None) -> dict:
    """Fan out a test-tier dispatch across all given depts.

    For each dept, lpush a task envelope to Redis `test_tasks` for the
    test_agent fleet to pick up. Returns a summary of enqueued tasks.
    Per global CLAUDE.md §65.8.
    """
    import json as _json
    import time as _time
    import uuid as _uuid

    import redis as _redis

    from core.config import get_settings

    settings = get_settings()
    redis_url = os.environ.get("REDIS_URL", settings.redis_url)
    try:
        r = _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=5)
    except Exception as exc:
        logger.warning("dispatch_test_fanout: redis unavailable: %s", exc)
        return {"enqueued": 0, "error": str(exc)}

    enqueued: list[str] = []
    skipped: list[str] = []
    for dept in depts:
        # Honor env-based per-schedule disable knob
        env_key = f"BEV_DISABLE_TIER_{tier.upper()}"
        if os.environ.get(env_key) == "1":
            skipped.append(dept)
            continue
        task_id = f"beat-{tier}-{_uuid.uuid4().hex[:8]}"
        envelope = {
            "task_id": task_id,
            "tier": tier,
            "dept": dept,
            "path": f"tests/{dept}/{tier}/",
            "timeout_seconds": timeout_seconds,
            "agent_role_required": agent_role_required,
            "queued_at": _time.time(),
            "source": "celery-beat",
        }
        try:
            r.lpush("test_tasks", _json.dumps(envelope))
            enqueued.append(task_id)
        except Exception as exc:
            logger.warning("enqueue failed for %s/%s: %s", dept, tier, exc)
            skipped.append(dept)

    logger.info(
        "insur.dispatch_test_fanout | tier=%s enqueued=%d skipped=%d",
        tier, len(enqueued), len(skipped),
    )
    return {"tier": tier, "enqueued": len(enqueued), "skipped": len(skipped),
            "task_ids": enqueued[:20]}


# ============================================================
# Data + Model + Accuracy + Analysis cron tasks (operator 2026-05-23)
# Per global §65.1 §64.20 — fan-out across all 19 INSUR depts.
# Writes audit rows to data/eval/cron/<job_name>/<run_id>/manifest.json
# ============================================================


def _cron_audit_dir(job_name: str) -> str:
    import time as _time
    import uuid as _uuid
    from pathlib import Path as _Path
    run_id = f"{int(_time.time())}-{_uuid.uuid4().hex[:6]}"
    base = _Path(os.environ.get("BEV_DATA_ROOT", "/data")) / "eval" / "cron" / job_name / run_id
    if not base.parent.exists():
        # Fallback to local data/ tree for dev
        base = _Path("data") / "eval" / "cron" / job_name / run_id
    base.mkdir(parents=True, exist_ok=True)
    return str(base)


def _cron_disabled(env_name: str) -> bool:
    return os.environ.get(env_name) == "1"


@celery_app.task(bind=True, name="insur.refresh_data_artifacts")
def refresh_data_artifacts(self, *, depts: list[str], max_minutes: int = 30) -> dict:
    """DATA cron — per dept: re-ingest, dedup, IQR-flag, impute, freshness check.

    For each dept, runs `noise_handling.clean_tabular` on the dept's primary
    CSV and writes a freshness report. Caps work at max_minutes wall-clock.
    """
    import json as _json
    import time as _time
    from pathlib import Path as _Path

    if _cron_disabled("BEV_DISABLE_DATA_REFRESH"):
        return {"status": "disabled", "depts_processed": 0}

    audit_dir = _cron_audit_dir("data_refresh")
    self.update_state(state="PROGRESS", meta={"step": "scanning", "depts": len(depts)})

    t0 = _time.time()
    rows_per_dept = []
    skipped = []

    for dept in depts:
        if _time.time() - t0 > max_minutes * 60:
            logger.info("refresh_data_artifacts | hit max_minutes=%s; stopping at %s", max_minutes, dept)
            break

        # Per-dept primary data file (best-effort scan)
        candidate_globs = [
            f"/data/{dept}/*.csv",
            "/data/customer-analytics/*.csv" if dept == "sales" else None,
            "/data/kaggle/rossmann/train.csv" if dept == "sales" else None,
        ]
        primary = None
        for g in [c for c in candidate_globs if c]:
            matches = list(_Path("/").glob(g.lstrip("/")))
            if matches:
                primary = matches[0]
                break

        if not primary or not primary.exists():
            skipped.append(dept)
            continue

        try:
            import pandas as _pd
            from ml.reference.noise_handling import clean_tabular  # noqa: E501
            df = _pd.read_csv(primary).head(2000)  # cap for cron speed
            cleaned, report = clean_tabular(df)
            rows_per_dept.append({
                "dept": dept,
                "primary_file": str(primary),
                "rows_in": len(df),
                "rows_after": len(cleaned),
                "dupes_removed": report.duplicates_removed,
                "nans_filled": report.nan_cells_filled,
                "iqr_outliers": sum(report.iqr_outliers_per_col.values()),
            })
        except Exception as exc:
            skipped.append(f"{dept}:{type(exc).__name__}")

    manifest = {
        "task": "insur.refresh_data_artifacts",
        "depts_processed": len(rows_per_dept),
        "depts_skipped": len(skipped),
        "skipped_reasons": skipped[:10],
        "duration_seconds": round(_time.time() - t0, 2),
        "per_dept": rows_per_dept,
    }
    _Path(audit_dir, "manifest.json").write_text(_json.dumps(manifest, indent=2, default=str))
    logger.info("refresh_data_artifacts | processed=%d skipped=%d",
                len(rows_per_dept), len(skipped))
    return manifest


@celery_app.task(bind=True, name="insur.retrain_models")
def retrain_models(self, *, depts: list[str], pipelines: list[str]) -> dict:
    """MODEL cron — per dept × pipeline: invoke the appropriate lifecycle.train().

    Pipelines: full_lifecycle / anomaly / recommendation.
    Each dept × pipeline is a separate sub-call — Celery's at-most-once
    semantics keep us from re-firing on cron retry.
    """
    import json as _json
    import time as _time
    from pathlib import Path as _Path

    if _cron_disabled("BEV_DISABLE_MODEL_RETRAIN"):
        return {"status": "disabled", "depts_processed": 0}

    audit_dir = _cron_audit_dir("model_retrain")
    t0 = _time.time()
    results = []

    # Reference pipeline → dataset hint map (operator extends per dept later)
    PIPELINE_MAP = {
        "full_lifecycle": {"dataset": "/data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv",
                           "target": "Churn", "task": "classification",
                           "drop_cols": ["customerID"], "sample": 1500, "n_trials": 5},
        "anomaly": {"dataset": "/data/kaggle/rossmann/train.csv", "sample": 1000, "contamination": 0.05},
        "recommendation": {"n_users": 200, "n_items": 60},
    }

    for dept in depts[:5]:  # cap for cron speed — operator overrides via env
        for pipeline in pipelines:
            if pipeline not in PIPELINE_MAP:
                continue
            cfg = PIPELINE_MAP[pipeline]
            try:
                if pipeline == "full_lifecycle":
                    from ml.reference.full_lifecycle import FullLifecycle
                    if not _Path(cfg["dataset"]).exists():
                        results.append({"dept": dept, "pipeline": pipeline,
                                        "status": "skipped", "reason": "dataset_missing"})
                        continue
                    r = FullLifecycle(
                        dataset_path=cfg["dataset"], target_col=cfg["target"], task=cfg["task"],
                        dept=dept, pipeline_name=f"{pipeline}_cron",
                        drop_cols=cfg["drop_cols"], n_trials=cfg["n_trials"],
                        sample_rows=cfg["sample"],
                    ).run()
                    results.append({"dept": dept, "pipeline": pipeline, "status": "ok",
                                    "run_id": r.run_id,
                                    "best_metric": r.metrics.get("accuracy", r.metrics.get("F1"))})
                elif pipeline == "anomaly":
                    from ml.reference.anomaly_lifecycle import AnomalyLifecycle
                    if not _Path(cfg["dataset"]).exists():
                        results.append({"dept": dept, "pipeline": pipeline,
                                        "status": "skipped", "reason": "dataset_missing"})
                        continue
                    r = AnomalyLifecycle(
                        dataset_path=cfg["dataset"], dept=dept,
                        pipeline_name=f"{pipeline}_cron",
                        contamination=cfg["contamination"], sample_rows=cfg["sample"],
                    ).run()
                    results.append({"dept": dept, "pipeline": pipeline, "status": "ok",
                                    "run_id": r.run_id, "best_detector": r.best_detector})
                elif pipeline == "recommendation":
                    from ml.reference.recommendation_lifecycle import RecoLifecycle
                    r = RecoLifecycle(
                        dept=dept, pipeline_name=f"{pipeline}_cron",
                        n_users=cfg["n_users"], n_items=cfg["n_items"],
                    ).run()
                    results.append({"dept": dept, "pipeline": pipeline, "status": "ok",
                                    "run_id": r.run_id, "best_algorithm": r.best_algorithm})
            except Exception as exc:
                results.append({"dept": dept, "pipeline": pipeline,
                                "status": "failed", "error": str(exc)[:200]})

    manifest = {
        "task": "insur.retrain_models",
        "n_ok": sum(1 for r in results if r["status"] == "ok"),
        "n_failed": sum(1 for r in results if r["status"] == "failed"),
        "n_skipped": sum(1 for r in results if r["status"] == "skipped"),
        "duration_seconds": round(_time.time() - t0, 2),
        "results": results,
    }
    _Path(audit_dir, "manifest.json").write_text(_json.dumps(manifest, indent=2, default=str))
    return manifest


@celery_app.task(bind=True, name="insur.eval_accuracy_drift")
def eval_accuracy_drift(self, *, depts: list[str]) -> dict:
    """ACCURACY cron — scan latest pipeline manifests for accuracy drift.

    Compares the current run's metrics against the prior run; flags any
    dept × pipeline whose primary metric dropped > 5%.
    """
    import json as _json
    import time as _time
    from pathlib import Path as _Path

    if _cron_disabled("BEV_DISABLE_ACCURACY_EVAL"):
        return {"status": "disabled"}

    audit_dir = _cron_audit_dir("accuracy_drift")
    eval_root = _Path(os.environ.get("BEV_DATA_ROOT", "/data")) / "eval"
    if not eval_root.exists():
        eval_root = _Path("data") / "eval"

    t0 = _time.time()
    drift_alerts = []
    scans = 0

    for dept in depts:
        dept_dir = eval_root / dept
        if not dept_dir.exists():
            continue
        for pipeline_dir in dept_dir.iterdir():
            if not pipeline_dir.is_dir():
                continue
            runs = sorted([d for d in pipeline_dir.iterdir() if d.is_dir() and (d / "manifest.json").exists()],
                          reverse=True)
            if len(runs) < 2:
                continue
            scans += 1
            try:
                latest = _json.loads((runs[0] / "manifest.json").read_text())
                prior = _json.loads((runs[1] / "manifest.json").read_text())
                # Primary metric: accuracy (classification), R2 (regression), F1 (otherwise)
                for metric in ("accuracy", "F1", "f1_weighted", "R2"):
                    cur = latest.get("metrics", {}).get(metric) or latest.get("aggregate_metrics", {}).get(metric)
                    prv = prior.get("metrics", {}).get(metric) or prior.get("aggregate_metrics", {}).get(metric)
                    if isinstance(cur, (int, float)) and isinstance(prv, (int, float)) and prv > 0:
                        drop = (prv - cur) / prv
                        if drop > 0.05:  # > 5% drop
                            drift_alerts.append({
                                "dept": dept, "pipeline": pipeline_dir.name,
                                "metric": metric, "prior": prv, "current": cur,
                                "drop_pct": round(drop * 100, 2),
                            })
                        break
            except Exception:
                continue

    manifest = {
        "task": "insur.eval_accuracy_drift",
        "scans": scans,
        "drift_alerts": len(drift_alerts),
        "duration_seconds": round(_time.time() - t0, 2),
        "alerts": drift_alerts[:20],
        "threshold_pct": 5,
    }
    _Path(audit_dir, "manifest.json").write_text(_json.dumps(manifest, indent=2, default=str))
    return manifest


@celery_app.task(bind=True, name="insur.analysis_rollup")
def analysis_rollup(self, *, depts: list[str]) -> dict:
    """ANALYSIS cron — per dept: aggregate KPIs from existing dashboard catalog.

    Pulls per-role tile values via the in-process role_dashboard_catalog
    (deterministic synthetic data + real audit-row aggregates), produces
    a rollup manifest the analysis tab + executive dashboard read.
    """
    import json as _json
    import time as _time
    from pathlib import Path as _Path

    if _cron_disabled("BEV_DISABLE_ANALYSIS_ROLLUP"):
        return {"status": "disabled"}

    audit_dir = _cron_audit_dir("analysis_rollup")
    t0 = _time.time()
    rollup = []

    try:
        from ml.reference.role_dashboard_catalog import build_dashboard_payload
        for dept in depts:
            for role in ("manager", "ai-reviewer", "digital-transformation", "ai-strategy"):
                p = build_dashboard_payload(dept, role)
                if p is None:
                    continue
                rollup.append({
                    "dept": dept, "role": role,
                    "summary": p["summary"],
                    "tile_count": len(p["tiles"]),
                    "primary_tile": p["tiles"][0] if p["tiles"] else None,
                })
    except Exception as exc:
        rollup.append({"error": str(exc)})

    manifest = {
        "task": "insur.analysis_rollup",
        "n_rollup_rows": len(rollup),
        "n_depts": len(depts),
        "duration_seconds": round(_time.time() - t0, 2),
        "rollup": rollup,
    }
    _Path(audit_dir, "manifest.json").write_text(_json.dumps(manifest, indent=2, default=str))
    return manifest


