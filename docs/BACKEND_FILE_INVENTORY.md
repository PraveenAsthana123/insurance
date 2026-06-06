# Backend File Inventory

Generated file inventory. Files without module docstrings are explicitly marked so they can be improved over time.

## `backend/__init__.py`

- layer: `unknown`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/__init__.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/config.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `Settings`
- functions: `get_settings`
- imports: `__future__, functools, pydantic, pydantic_settings, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/dependencies.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `get_cached_settings, get_department_repo, get_process_repo, get_dataset_repo, get_model_repo, get_job_repo, get_department_service, get_process_service, get_dataset_service, get_ml_service, get_job_service, get_db_connection`
- imports: `__future__, contextlib, core.config, functools, logging, psycopg2, psycopg2.extensions, repositories.dataset_repo, repositories.department_repo, repositories.job_repo, repositories.model_repo, repositories.process_repo, services.dataset_service, services.department_service, services.job_service, services.ml_service, services.process_service, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/error_handlers.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `_get_correlation_id, app_error_handler, generic_error_handler, register_error_handlers`
- imports: `__future__, core.exceptions, fastapi, fastapi.responses, logging`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/exceptions.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `AppError, NotFoundError, ValidationError, DataError, ModelError, ExternalServiceError`
- functions: `none`
- imports: `__future__`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/insur_audit.py`

- layer: `trust/infra`
- gist: Shared §38.3 audit-trail helper for INSUR/* routers under §64.43 #7 federation.
- classes: `none`
- functions: `log_insur_access`
- imports: `__future__, core.middleware, fastapi, json, os, pathlib, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/idempotency.py`

- layer: `trust/infra`
- gist: Generic §10.3 idempotency cache layer — namespace-scoped.
- classes: `none`
- functions: `_disk_path, _ttl_seconds, _load_from_disk, _append_to_disk, lookup, store, extract_key`
- imports: `__future__, fastapi, json, os, pathlib, threading, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/logging_config.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `JsonFormatter`
- functions: `setup_logging`
- imports: `__future__, datetime, json, logging, traceback, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/middleware.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `CorrelationIdMiddleware, TenantIdMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware`
- functions: `current_tenant_id`
- imports: `__future__, collections, core.structured_logger, fastapi, fastapi.responses, os, re, starlette.middleware.base, starlette.types, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/rbac_middleware.py`

- layer: `trust/infra`
- gist: rbac_middleware — demo-mode RBAC. Reads X-Demo-Role header, enforces matrix.
- classes: `RBACMiddleware`
- functions: `none`
- imports: `__future__, logging, re, starlette.middleware.base, starlette.requests, starlette.responses, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/structured_logger.py`

- layer: `trust/infra`
- gist: structured_logger — JSON log emitter with correlation_id contextvar.
- classes: `none`
- functions: `new_correlation_id, set_correlation_id, get_correlation_id, emit_event, _safe`
- imports: `__future__, contextvars, datetime, json, logging, sys, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/core/utils.py`

- layer: `trust/infra`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `sanitize_table_name`
- imports: `__future__, re`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/database.py`

- layer: `unknown`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `run_migrations`
- imports: `__future__, core.config, logging, os, pathlib, psycopg2`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/main.py`

- layer: `unknown`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `lifespan, create_app`
- imports: `__future__, contextlib, core.config, core.error_handlers, core.logging_config, core.middleware, core.rbac_middleware, database, fastapi, fastapi.middleware.cors, fastapi.middleware.gzip, logging, routers.admin, routers.agent_platform, routers.ai_explain, routers.customer, routers.datasets, routers.dbviewer, routers.demo_stories, routers.departments, routers.downloads, routers.graph, routers.health, routers.insur, routers.jobs, routers.master_data, routers.models, routers.monitoring, routers.openclaw, routers.paperclip, routers.pipelines, routers.processes, routers.reports, routers.sales, routers.supply_chain, routers.transactions, seeds.seed_runner, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/__init__.py`

- layer: `ml/model`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/features/__init__.py`

- layer: `ml/model`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/features/text_features.py`

- layer: `ml/model`
- gist: Basic NLP feature extraction utilities.
- classes: `none`
- functions: `clean_text, word_count, char_count, avg_word_length, exclamation_count, question_count, polarity_score, add_text_features, tfidf_features`
- imports: `__future__, numpy, pandas, re, sklearn.feature_extraction.text, string, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/features/time_features.py`

- layer: `ml/model`
- gist: Time-series feature engineering utilities.
- classes: `none`
- functions: `add_time_features, add_lag_features, add_rolling_features, add_ewm_features`
- imports: `__future__, numpy, pandas`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/__init__.py`

- layer: `ml/model`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/customer_segmentation.py`

- layer: `ml/model`
- gist: Customer Segmentation Pipeline — Customer department.
- classes: `CustomerSegmentationPipeline`
- functions: `none`
- imports: `__future__, json, logging, mlflow, numpy, pandas, sklearn.cluster, sklearn.metrics, sklearn.preprocessing, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/defect_detection.py`

- layer: `ml/model`
- gist: Defect Detection Pipeline — Quality department.
- classes: `DefectDetectionPipeline`
- functions: `none`
- imports: `__future__, logging, mlflow, numpy, pandas, sklearn.ensemble, sklearn.metrics, sklearn.model_selection, sklearn.preprocessing, tensorflow, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/demand_forecast.py`

- layer: `ml/model`
- gist: Demand Forecasting Pipeline — Sales / Retail departments.
- classes: `DemandForecastPipeline`
- functions: `none`
- imports: `__future__, logging, ml.features.time_features, mlflow, numpy, pandas, sklearn.metrics, sklearn.model_selection, typing, xgboost`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/inventory_optimizer.py`

- layer: `ml/model`
- gist: Inventory Optimizer Pipeline — Supply Chain / Procurement / Logistics departments.
- classes: `InventoryOptimizerPipeline`
- functions: `none`
- imports: `__future__, logging, mlflow, numpy, pandas, sklearn.ensemble, sklearn.metrics, sklearn.model_selection, sklearn.preprocessing, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/predictive_maintenance.py`

- layer: `ml/model`
- gist: Predictive Maintenance Pipeline — Manufacturing / Maintenance departments.
- classes: `PredictiveMaintenancePipeline`
- functions: `none`
- imports: `__future__, logging, mlflow, numpy, pandas, sklearn.ensemble, sklearn.metrics, sklearn.model_selection, sklearn.preprocessing, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/pipelines/sentiment_analysis.py`

- layer: `ml/model`
- gist: Sentiment Analysis / NLP Pipeline — Governance department.
- classes: `SentimentAnalysisPipeline`
- functions: `none`
- imports: `__future__, logging, ml.features.text_features, mlflow, numpy, pandas, sklearn.feature_extraction.text, sklearn.linear_model, sklearn.metrics, sklearn.model_selection, sklearn.pipeline, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/__init__.py`

- layer: `ml/model`
- gist: INSUR reference ML/RAG lifecycle implementations.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/agent_orchestration.py`

- layer: `ml/model`
- gist: INSUR reference: agentic orchestration patterns (§64.43).
- classes: `DagNode, DagExecutionError, DagCycleError, DagExecutor, ReflectionStep, ReflectionResult, ReflectionLoop, AgentVote, MoAResult, MixtureOfAgents, DebateRound, DebateResult, DebateOrchestrator, BlackboardEntry, BlackboardConcurrencyError, Blackboard, OrchestrationManifest, OrchestrationDemo`
- functions: `_main`
- imports: `__future__, argparse, collections, dataclasses, json, logging, pathlib, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/agentic_stack.py`

- layer: `ml/model`
- gist: INSUR reference: 10-layer agentic execution stack per §64.40.
- classes: `Task, AgenticRun, PlannerAgent, Decomposer, PolicyEngine, StagehandAdapter, PlaywrightAdapter, OpenClawAdapter, PaperclipAdapter, CuaOrchestrator, CouncilAdapter, AgenticStackRunner`
- functions: `_main`
- imports: `__future__, argparse, dataclasses, httpx, json, logging, pathlib, re, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/anomaly_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: anomaly-detection lifecycle with multi-detector comparison.
- classes: `AnomalyManifest, AnomalyLifecycle`
- functions: `_main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pandas, pathlib, seaborn, sklearn.ensemble, sklearn.metrics, sklearn.neighbors, sklearn.preprocessing, sklearn.svm, time, torch, torch.utils.data, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/attack_simulators.py`

- layer: `ml/model`
- gist: INSUR reference: attack-simulation payload generators (§64.32.3 + §64.42).
- classes: `AttackPayload, AttackCorpus`
- functions: `_check_executor_authorization, gen_sql_injection, gen_xss, gen_csrf, gen_auth_bypass, gen_prompt_injection, gen_model_theft, gen_data_poisoning, gen_ddos, gen_phishing, gen_deepfake, gen_synthetic_identity, gen_brute_force, generate_corpus, generate_all_classes, _main`
- imports: `__future__, argparse, dataclasses, json, logging, os, pathlib, random, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/cv_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: CV lifecycle with multi-model score comparison.
- classes: `CvManifest, SimpleCNN, ResNetTransfer, CvLifecycle`
- functions: `_main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pathlib, seaborn, sklearn.linear_model, sklearn.metrics, time, torch, torch.utils.data, torchvision, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/dl_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: Deep Learning sequence-classification lifecycle (§64.20).
- classes: `DlManifest, LstmClassifier, TransformerClassifier, DlLifecycle`
- functions: `generate_synthetic_sequences, _main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pathlib, seaborn, sklearn.linear_model, sklearn.metrics, sklearn.model_selection, time, torch, torch.utils.data, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/ensemble_compare.py`

- layer: `ml/model`
- gist: INSUR reference: ensemble model comparison (Voting + Stacking) per §65.1 #5.
- classes: `EnsembleManifest`
- functions: `_score_classifier, _score_regressor, default_classifiers, default_regressors, compare_ensemble, _main`
- imports: `__future__, dataclasses, json, logging, numpy, sklearn.base, sklearn.dummy, sklearn.ensemble, sklearn.linear_model, sklearn.metrics, sklearn.model_selection, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/fraud_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: fraud-detection lifecycle (§64.23 + §40).
- classes: `FraudDecision, FraudManifest, RuleLayer, MlLayer, LlmLayer, DecisionLayer, FraudLifecycle`
- functions: `generate_synthetic_transactions, _main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pathlib, seaborn, sklearn.ensemble, sklearn.metrics, sklearn.model_selection, time, typing, uuid, xgboost`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/full_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: full structured-ML lifecycle.
- classes: `LifecycleManifest, FullLifecycle`
- functions: `_main`
- imports: `__future__, argparse, dataclasses, json, lightgbm, logging, matplotlib, mlflow, numpy, optuna, pandas, pathlib, seaborn, shap, sklearn.compose, sklearn.dummy, sklearn.ensemble, sklearn.feature_selection, sklearn.impute, sklearn.metrics, sklearn.model_selection, sklearn.pipeline, sklearn.preprocessing, time, typing, uuid, xgboost`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/nlp_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: NLP lifecycle with multiple-technique score comparison.
- classes: `NlpManifest, NlpLifecycle`
- functions: `_main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pathlib, seaborn, sentence_transformers, sklearn.feature_extraction.text, sklearn.linear_model, sklearn.metrics, sklearn.model_selection, sklearn.svm, time, transformers, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/noise_handling.py`

- layer: `ml/model`
- gist: INSUR reference: noise-handling utility per data type (§64.19 + §64.26 + §65.1 #5).
- classes: `TabularNoiseReport, ImageNoiseReport, TextNoiseReport, TimeseriesNoiseReport`
- functions: `clean_tabular, clean_image_batch, clean_text_batch, clean_timeseries`
- imports: `__future__, dataclasses, logging, numpy, pandas, re, scipy.ndimage, skimage.transform, sklearn.ensemble, typing, unicodedata`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/rag_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: full RAG lifecycle (chunking → embed → vector DB → retrieve → rerank → LLM → cite → eval).
- classes: `CircuitBreaker, RagManifest, RagLifecycle`
- functions: `chunk_fixed_size, chunk_sentence_aware, chunk_semantic_paragraph, _main`
- imports: `__future__, argparse, chromadb, dataclasses, httpx, json, logging, matplotlib, numpy, pathlib, re, sentence_transformers, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/recommendation_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: recommendation lifecycle with content + CF + hybrid comparison.
- classes: `RecoManifest, PopularityReco, ContentReco, CollabReco, HybridReco, RecoLifecycle`
- functions: `generate_synthetic_data, precision_at_k, recall_at_k, ndcg_at_k, average_precision_at_k, diversity, novelty, _main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pathlib, scipy.sparse, seaborn, sklearn.decomposition, sklearn.metrics.pairwise, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/role_dashboard_catalog.py`

- layer: `ml/model`
- gist: Shared catalog for INSUR role dashboards + reports (§64.37).
- classes: `Tile, ChartSpec, ReportSpec`
- functions: `synthesize_tile_value, synthesize_chart_data, build_dashboard_payload, build_reports_payload, _now_iso`
- imports: `__future__, dataclasses, datetime, hashlib, random, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/simulation_engine.py`

- layer: `ml/model`
- gist: INSUR reference: per-process simulation engine (manual vs automatic).
- classes: `SimEvent, StepDef, SimRunSummary, SimManifest, ProcessSimulator`
- functions: `_three_step, _main`
- imports: `__future__, argparse, dataclasses, json, logging, pathlib, random, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/reference/timeseries_lifecycle.py`

- layer: `ml/model`
- gist: INSUR reference: time-series lifecycle with multi-technique score comparison.
- classes: `TimeSeriesManifest, TimeSeriesLifecycle`
- functions: `_mape, _smape, _main`
- imports: `__future__, argparse, dataclasses, json, logging, matplotlib, numpy, pandas, pathlib, sklearn.metrics, statsmodels.tsa.holtwinters, time, typing, uuid, xgboost`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/ml/utils.py`

- layer: `ml/model`
- gist: Shared ML utilities for the Insur Analytics platform.
- classes: `none`
- functions: `load_dataset, calculate_metrics, format_results, describe_dataset`
- imports: `__future__, logging, numpy, pandas, pathlib, sklearn.metrics, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/__init__.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/base.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `BaseRepository`
- functions: `none`
- imports: `__future__, contextlib, core.config, logging, psycopg2, psycopg2.extensions, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/customer_repo.py`

- layer: `data/sql`
- gist: customer_repo.py — read-only repository for the customer-pilot star schema.
- classes: `CustomerRepo`
- functions: `_pg_dsn`
- imports: `__future__, contextlib, os, psycopg, psycopg.rows, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/dataset_repo.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DatasetRepository`
- functions: `none`
- imports: `__future__, json, psycopg2, repositories.base, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/department_repo.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DepartmentRepository`
- functions: `none`
- imports: `__future__, psycopg2, repositories.base, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/job_repo.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `JobRepository`
- functions: `none`
- imports: `__future__, json, psycopg2, repositories.base, schemas.job, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/model_repo.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ModelRepository`
- functions: `none`
- imports: `__future__, json, psycopg2, repositories.base, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/process_repo.py`

- layer: `data/sql`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ProcessRepository`
- functions: `none`
- imports: `__future__, psycopg2, repositories.base, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/sales_repo.py`

- layer: `data/sql`
- gist: sales_repo.py — read-only repository for the sales star schema.
- classes: `SalesRepo`
- functions: `_pg_dsn`
- imports: `__future__, contextlib, datetime, os, psycopg, psycopg.rows, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/repositories/supply_chain_repo.py`

- layer: `data/sql`
- gist: supply_chain_repo.py — read-only repository for supply chain star schema.
- classes: `SupplyChainRepo`
- functions: `_pg_dsn`
- imports: `__future__, contextlib, os, psycopg, psycopg.rows, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/__init__.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/admin.py`

- layer: `http/api`
- gist: Admin API — cross-tenant compliance + reporting surfaces.
- classes: `none`
- functions: `get_agent_platform_service, admin_list_cua_audit`
- imports: `__future__, fastapi, schemas.agent_platform, services.agent_platform_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/agent_platform.py`

- layer: `http/api`
- gist: Unified agent platform setup/status API.
- classes: `none`
- functions: `get_agent_platform_service, get_status, get_manifest, evaluate_governance, execute_cua, decide_approval_broker, run_typed_council, list_cua_audit, get_adapters_status, get_tenant_activity`
- imports: `__future__, core.middleware, fastapi, schemas.agent_platform, services.agent_platform_service, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/ai_explain.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `_rag_for, get_rag_service, explain, feedback`
- imports: `__future__, core.structured_logger, fastapi, functools, logging, schemas.ai_explain, services.rag_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/customer.py`

- layer: `http/api`
- gist: customer.py — HTTP-only FastAPI routes for the Customer Analytics pilot.
- classes: `none`
- functions: `_repo, _churn_service, get_repo, get_churn_service, churn_predict, churn_top, churn_metrics`
- imports: `__future__, fastapi, functools, logging, repositories.customer_repo, schemas.customer, services.churn_model_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/datasets.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `list_datasets, get_dataset, create_dataset, upload_dataset, preview_dataset`
- imports: `__future__, core.config, core.dependencies, fastapi, logging, schemas.common, schemas.dataset, services.dataset_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/dbviewer.py`

- layer: `http/api`
- gist: §68.1 + §68.2 — INSUR DB Viewer + per-function table catalog.
- classes: `none`
- functions: `_validate_db_id, _validate_ident, _validate_dept, global_overview, database_info, schema_tables, table_detail, table_sample, process_tables_global, process_tables_dept, process_tables_detail`
- imports: `__future__, core.insur_audit, core.middleware, fastapi, re, services, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/demo_stories.py`

- layer: `http/api`
- gist: INSUR demo-stories router — per-dept × per-role demo scripts.
- classes: `none`
- functions: `_validate_dept, _validate_role, _demo_for, global_inventory, dept_catalog, role_demo_detail`
- imports: `__future__, core.insur_audit, fastapi, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/departments.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `list_departments, get_department, list_department_processes, get_department_ai_stack, get_department_roi`
- imports: `__future__, core.dependencies, fastapi, schemas.common, schemas.department, schemas.process, services.department_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/downloads.py`

- layer: `http/api`
- gist: INSUR data-downloads router — per-dept downloadable sample data.
- classes: `none`
- functions: `_validate_dept, _datasets_for, _file_urls, global_inventory, dept_catalog, serve_file`
- imports: `__future__, core.insur_audit, fastapi, fastapi.responses, pathlib, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/graph.py`

- layer: `http/api`
- gist: INSUR Graph AI router — per-dept relationship graph (Cytoscape-compatible).
- classes: `none`
- functions: `_validate_dept, _build_graph, global_summary, dept_graph, dept_nodes_filtered, dept_neighbors`
- imports: `__future__, core.insur_audit, fastapi, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/health.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `_health_payload, health_check_v1, health_check_unversioned`
- imports: `__future__, fastapi`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/insur.py`

- layer: `http/api`
- gist: INSUR endpoints — nav (live INSUR_NAV.json) + council (Redis queue/poll).
- classes: `none`
- functions: `get_nav, list_depts, get_spec, council_ask, council_result, _safe_run_dir, list_runs, get_manifest, get_plot, get_latest, _safe_sim_dir, list_reference_processes, run_simulation, list_sim_runs, get_sim_manifest, get_fleet_stats, get_recent_done, fanout_tasks, list_attack_classes, generate_attack_corpus, list_attack_corpora, get_attack_corpus, agentic_execute, list_agentic_runs, get_agentic_run, orchestration_demo, list_test_tiers, dispatch_test, get_test_results, get_test_result, list_roles, get_role_dashboard, get_role_reports, run_role_report, get_sim_events`
- imports: `__future__, dataclasses, fastapi, fastapi.responses, json, logging, ml.reference.agent_orchestration, ml.reference.agentic_stack, ml.reference.attack_simulators, ml.reference.role_dashboard_catalog, ml.reference.simulation_engine, os, pathlib, random, redis, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/jobs.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `list_jobs, create_job, get_job, get_job_results, create_schedule, list_schedules, get_schedule, pause_schedule, resume_schedule, delete_schedule, run_schedule_now`
- imports: `__future__, core.dependencies, fastapi, schemas.common, schemas.job, services.job_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/master_data.py`

- layer: `http/api`
- gist: INSUR master-data router — per-dept SAP-style master + reference data.
- classes: `none`
- functions: `_validate_dept, _validate_entity, global_catalog, dept_catalog, entity_sample`
- imports: `__future__, core.insur_audit, fastapi, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/models.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `list_models, create_model, get_model, predict, get_model_metrics`
- imports: `__future__, core.dependencies, fastapi, schemas.common, schemas.model, services.ml_service, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/monitoring.py`

- layer: `http/api`
- gist: INSUR monitoring AI router — per-dept job + pipeline health surface.
- classes: `none`
- functions: `_log_monitoring_access, _validate_dept, _validate_job, _scan_runs, _job_health, global_rollup, dept_monitoring, list_runs, get_run`
- imports: `__future__, core.middleware, datetime, fastapi, json, logging, os, pathlib, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/openclaw.py`

- layer: `http/api`
- gist: OpenClaw bridge API.
- classes: `none`
- functions: `get_openclaw_service, get_status, get_manifest, create_task, get_task_result`
- imports: `__future__, core, core.middleware, fastapi, schemas.openclaw, services.openclaw_gateway_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/paperclip.py`

- layer: `http/api`
- gist: Paperclip local artifact/context adapter API.
- classes: `none`
- functions: `get_paperclip_service, get_status, create_clip, list_clips, get_clip, delete_clip, build_context_pack`
- imports: `__future__, core, core.middleware, fastapi, schemas.paperclip, services.paperclip_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/pipelines.py`

- layer: `http/api`
- gist: INSUR automated-pipelines router — 5-phase per-process catalog per dept.
- classes: `none`
- functions: `_catalog_for, _validate_dept, global_inventory, dept_catalog, process_detail`
- imports: `__future__, core.insur_audit, fastapi, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/processes.py`

- layer: `http/api`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `get_process, get_process_data_flow, get_process_models, get_process_ai_mappings, get_process_test_cases`
- imports: `__future__, core.dependencies, fastapi, schemas.common, schemas.model, schemas.process, services.ml_service, services.process_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/reports.py`

- layer: `http/api`
- gist: INSUR reports-catalog router — dept-level rollup of standard reports.
- classes: `none`
- functions: `_validate_dept, _title_for, _enrich, global_inventory, dept_catalog, report_detail`
- imports: `__future__, core.insur_audit, fastapi, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/sales.py`

- layer: `http/api`
- gist: sales.py — HTTP-only FastAPI routes for the Sales deep-dive.
- classes: `none`
- functions: `_repo, _forecast_service, _simulation_service, get_repo, get_forecast_service, get_simulation_service, list_stores, forecast, simulate`
- imports: `__future__, fastapi, functools, logging, repositories.sales_repo, schemas.sales, services.forecast_service, services.simulation_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/supply_chain.py`

- layer: `http/api`
- gist: supply_chain.py — HTTP-only FastAPI routes for Supply Chain deep-dive.
- classes: `none`
- functions: `_repo, _stockout_service, _eta_service, _score_service, _simulation_service, get_repo, get_stockout_service, get_eta_service, get_score_service, get_simulation_service, list_skus, list_suppliers, stockout_risk, eta, simulate`
- imports: `__future__, fastapi, functools, logging, repositories.supply_chain_repo, schemas.supply_chain, services.eta_service, services.stockout_service, services.supplier_score_service, services.supply_chain_simulation_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/routers/transactions.py`

- layer: `http/api`
- gist: INSUR transactional history router — unified chronological audit feed per dept.
- classes: `none`
- functions: `_validate_dept, _ts_from_run_id, _redact_pii, _scan_cron_events, _scan_ml_events, _scan_sim_events, _wildcard_match, global_summary, list_transactions, get_event`
- imports: `__future__, core.insur_audit, fastapi, json, logging, pathlib, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/__init__.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/agent_platform.py`

- layer: `api/schema`
- gist: Unified agent platform integration schemas.
- classes: `AgentToolStatus, AgentPlatformStatusResponse, AgentPlatformManifestResponse, AgentPolicyEvaluationRequest, AgentPolicyEvaluationResponse, ApprovalBrokerRequest, ApprovalBrokerResponse, TypedCouncilRunRequest, TypedCouncilRunResponse, CuaExecutionRequest, CuaExecutionResponse, CuaAuditRow, CuaAuditListResponse, TenantActivityItem, TenantActivityResponse, AdminCuaAuditListResponse`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/ai_explain.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ExplainContext, ExplainRequest, Citation, ExplainResponse, FeedbackRequest`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/common.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `PaginatedResponse, ErrorResponse, SuccessResponse`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/customer.py`

- layer: `api/schema`
- gist: customer.py — Pydantic schemas for the Customer Analytics pilot API.
- classes: `ChurnDriver, ChurnPredictionRequest, ChurnPredictionResponse, AtRiskCustomer, ChurnTopNResponse, ChurnMetricsResponse`
- functions: `none`
- imports: `__future__, pydantic`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/dataset.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DatasetCreate, DatasetResponse, DatasetSummary, DatasetPreview`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/department.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DepartmentResponse, DepartmentSummary, DepartmentCreate`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/job.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `JobCreate, ScheduleCreate, ScheduleResponse, ScheduleSummary, JobResponse, JobSummary, JobResultResponse`
- functions: `none`
- imports: `__future__, datetime, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/model.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ModelCreate, ModelResponse, ModelSummary, PredictRequest, PredictResponse`
- functions: `none`
- imports: `__future__, datetime, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/openclaw.py`

- layer: `api/schema`
- gist: OpenClaw bridge schemas.
- classes: `OpenClawTaskRequest, OpenClawTaskResponse, OpenClawTaskResultResponse, OpenClawQueueStatus, OpenClawStatusResponse, OpenClawManifestResponse`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/paperclip.py`

- layer: `api/schema`
- gist: Paperclip local context/artifact adapter schemas.
- classes: `PaperclipCreateRequest, PaperclipArtifactResponse, PaperclipArtifactDetail, PaperclipContextPackRequest, PaperclipContextPackResponse, PaperclipStatusResponse`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/process.py`

- layer: `api/schema`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ProcessResponse, ProcessSummary, ProcessCreate, AIMappingResponse, DataFlowStepResponse`
- functions: `none`
- imports: `__future__, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/sales.py`

- layer: `api/schema`
- gist: sales.py — Pydantic schemas for the Sales deep-dive API.
- classes: `StoreSummary, ForecastRequest, ForecastPoint, ForecastComponents, ForecastResponse, SimulationRequest, WaterfallStep, SimulationResponse`
- functions: `none`
- imports: `__future__, datetime, pydantic, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/schemas/supply_chain.py`

- layer: `api/schema`
- gist: supply_chain.py — Pydantic request/response models for Supply Chain deep-dive.
- classes: `SkuSummary, SupplierScored, StockoutRiskRequest, StockoutRiskResponse, ETARequest, ETAResponse, SimulationRequest, SimulationResponse`
- functions: `none`
- imports: `__future__, pydantic`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/seeds/__init__.py`

- layer: `data/seed`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/seeds/seed_runner.py`

- layer: `data/seed`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `_load_json, run_seeds`
- imports: `__future__, core.config, json, logging, os, psycopg2`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/__init__.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/agent_platform_service.py`

- layer: `service/business`
- gist: Unified agent platform integration service.
- classes: `_AgentOpsSession, AgentPlatformIntegrationService`
- functions: `_idempotency_disk_load, _idempotency_disk_append, _playwright_allowlist, _target_in_allowlist, _write_cua_audit_row, _agentops_enabled`
- imports: `__future__, agentops, hashlib, importlib, json, os, pathlib, playwright.sync_api, re, schemas.agent_platform, schemas.openclaw, services, services.openclaw_gateway_service, services.paperclip_service, sys, time, typing, urllib, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/churn_model_service.py`

- layer: `service/business`
- gist: churn_model_service.py — scikit-learn churn model with lazy-fit + in-proc cache.
- classes: `_Fitted, ChurnModelService`
- functions: `_precision_at_top_k, _segment_for, _human_label`
- imports: `__future__, core.structured_logger, dataclasses, datetime, logging, numpy, pandas, repositories.customer_repo, sklearn.ensemble, sklearn.linear_model, sklearn.metrics, sklearn.model_selection, sklearn.preprocessing, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/dataset_service.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DatasetService`
- functions: `none`
- imports: `__future__, core.exceptions, csv, logging, os, pathlib, psycopg2, re, repositories.dataset_repo, schemas.dataset, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/model_compare_service.py`

- layer: `service`
- gist: §68.11 Multi-model comparison — joins §68.8 functional + §68.9 cost + §68.10 safety logs for the requested (model_id, eval_set) tuples and persists the scorecard to data/agent-supervisor/model_compare/<comparison_id>/manifest.json. Cross-axis winner determination (accuracy / latency / total_cost / hallucination_rate / safety_verdict). Partial data gracefully degrades — model with only functional eval shows found_in=['functional']. Max 8 models per comparison.
- classes: `none`
- functions: `_manifest_dir, _safety_verdict_rank, _latest_functional_for, _cost_for, _latest_safety_for, _build_scorecard, _persist_manifest, run_comparison, get_comparison, list_history`
- imports: `__future__, collections, json, logging, os, pathlib, re, time, typing, uuid, services.{cost_eval,functional_eval,safety_eval}_service`
- flow: run_comparison validates models + eval_set, calls _build_scorecard which joins the 3 source services, computes winners per-axis, persists manifest, returns. get_comparison reads back. list_history sorts by mtime newest-first.

## `backend/services/observability_hub_service.py`

- layer: `service`
- gist: §68 aggregator — probes all 7 §68 read surfaces' source-of-truth logs in one call (path + exists + n_rows + last_ts + n_corrupt_lines). Mirrors §56 /adapters aggregator shape. Per §57.7: a broken per-surface probe NEVER breaks the aggregator — the try/except is at the call site, so even a monkeypatched probe that raises surfaces as status='probe_error'.
- classes: `none`
- functions: `_resolve_path, _probe_jsonl, _probe_json, _probe_one, overview`
- imports: `__future__, json, logging, os, pathlib, time, typing`
- flow: overview() iterates _SURFACES registry, calls _probe_one(s) inside try/except, accumulates results; each surface contributes its log path + probe status without ever raising into the aggregator.

## `backend/services/safety_eval_service.py`

- layer: `service`
- gist: §68.10 Safety eval — read-only aggregation over `data/agent-supervisor/safety_eval_runs.jsonl` (INSUR_EVAL_SAFETY_LOG env). Classifies each row's verdict (safe/review/unsafe/unknown) using §48 + §64.21 thresholds: hallucination ≤0.05, toxicity ≤0.02, bias ≤0.10, disparate_impact ≥0.80, equal_opportunity_gap ≤0.05. fairness_gate distinguishes 'review' (missing metric, no fail) from 'safe' (all known + no missing). Composes the §68.8/9/10 eval triplet.
- classes: `none`
- functions: `_log_path, _read_rows, _classify, _latest_per_model, global_scorecard, per_model_history, list_incidents`
- imports: `__future__, json, logging, os, pathlib, re, time, typing`
- flow: /_global builds scorecard latest-per-model with verdicts, sorted unsafe→review→unknown→safe. /{model_id} returns history with per-row verdict_summary. /incidents returns rows where verdict=unsafe OR n_safety_incidents>0.

## `backend/services/cost_eval_service.py`

- layer: `service`
- gist: §68.9 Cost eval — read-only aggregation over `data/agent-supervisor/cost_runs.jsonl` (INSUR_EVAL_COST_LOG env). Returns 24h/7d/30d cost windows + all-time totals, per-tenant breakdown with nested per-model totals, per-model cost ranking, single-request lookup. WRITE side (LLM-gateway/LiteLLM adapter) is a separate iteration. Cost rounded to 6 decimal places.
- classes: `none`
- functions: `_log_path, _read_rows, _sum_cost, global_summary, per_tenant_breakdown, by_model_ranking, by_request`
- imports: `__future__, collections, json, logging, os, pathlib, re, time, typing`
- flow: /_global computes 3 time windows + all_time totals. /{tenant_id} nests per-model totals within tenant. /by-model ranks models by total_cost_usd desc. /by-request/{id} linear match.

## `backend/services/functional_eval_service.py`

- layer: `service`
- gist: §68.8 Functional eval — read-only aggregation over `data/agent-supervisor/functional_eval_runs.jsonl` (INSUR_EVAL_FUNCTIONAL_LOG env). Returns cross-model leaderboard (latest-per-model, sorted by accuracy/f1/auc desc), per-model history with drift_summary between two latest runs, single-run detail. WRITE side (MLflow / scheduled eval job appending rows) is a separate iteration. PII never in row — only eval_set_hash + ground_truth_hash.
- classes: `none`
- functions: `_log_path, _read_rows, _latest_per_model, global_summary, model_history, run_detail`
- imports: `__future__, collections, json, logging, os, pathlib, re, time, typing`
- flow: /_global builds leaderboard sorting by accuracy desc with f1/auc/map fallbacks. /{model_id} filters by model + optional dataset, sorts newest-first, computes drift between two latest. /runs/{run_id} linear scan match.

## `backend/services/security_posture_service.py`

- layer: `service`
- gist: §68.7 Security posture — read-only aggregation of three signals: live-probed §47.6 compliance gates (federated_audit_helper / rbac_matrix_density / tenant_id_middleware / pii_inventory / guardrails / drill_discipline) + external CVE snapshot from `data/agent-supervisor/security_posture.json` (INSUR_SECURITY_POSTURE_PATH env) + attack-attempt scan over insur_reads audit log (rbac_denial / scope_denial / malformed_path patterns). Graceful when posture snapshot missing per §57.7. WRITE side (CVE scanner job) is external + out-of-scope.
- classes: `none`
- functions: `_posture_path, _audit_log_path, _load_posture, _compliance_gates, _scan_attacks, global_summary, per_dept_score, list_attacks`
- imports: `__future__, collections, json, logging, os, pathlib, re, time, typing, lazy: core.insur_audit / core.rbac_middleware / core.middleware / services.pii_inventory_service / services.guardrails_service`
- flow: /_global → load posture (env or fallback) + probe compliance gates + scan attacks-24h → aggregate. /{dept} → per-dept slice of posture + dept-filtered attack count + INSUR_SECURITY.md spec doc pointer. /attacks → audit-log scan with 3 attack-type regexes.

## `backend/services/guardrails_service.py`

- layer: `service`
- gist: §68.5 Guardrails — read-only aggregation over `data/agent-supervisor/guardrail_decisions.jsonl` (env-overridable via INSUR_GUARDRAIL_LOG). Returns cross-dept rollup (counts per guardrail_type × decision), per-dept decisions with filters, and single-decision lookup. The WRITE side (middleware appending rows when a guardrail fires) is a separate §68.5 iteration. PII never in row — only input_hash (SHA-256 truncated).
- classes: `none`
- functions: `_log_path, _read_rows, global_summary, per_dept_decisions, get_decision`
- imports: `__future__, collections, json, logging, os, pathlib, re, time, typing`
- flow: caller hits /guardrails/_global → read JSONL → aggregate by_type / by_decision / by_type×decision / by_dept / by_filter → response. /{dept} → filter rows by dept + optional decision/guardrail_type, newest-first up to limit. /decision/{id} → linear scan match on decision_id or request_id.

## `backend/services/pii_inventory_service.py`

- layer: `service`
- gist: §68.6 PII inventory — aggregates PII column annotations from per_process_tables + master_data ENTITY_CATALOG into one cross-dept view + per-dept slice. Adds a `scan_leaks` heuristic over the federated insur_reads audit log for plaintext PII patterns (email/phone/SSN/credit-card/IBAN) returning redacted match metadata (NEVER the raw PII). Honors INSUR_AUDIT_PATH env.
- classes: `none`
- functions: `_audit_log_path, cross_dept_inventory, per_dept_inventory, scan_leaks`
- imports: `__future__, json, logging, os, pathlib, re, routers.master_data (lazy), services.dbviewer_service, time, typing`
- flow: /pii/_global → load per_process_tables.json + ENTITY_CATALOG → aggregate distinct PII columns + entity inventory. /pii/leaks → read audit log (INSUR_AUDIT_PATH or fallback) → blank false-positive ID fields → run leak regex catalog → return hits with redacted match strings + position metadata.

## `backend/services/dbviewer_service.py`

- layer: `service/business`
- gist: §68 INSUR Observability + Data Hub — DB Viewer service.
- classes: `none`
- functions: `_process_tables_path, load_process_tables, is_pii_column, redact_row, safe_ident, _connect_pg, list_registered_databases, get_database_info, list_schemas, list_tables, describe_table, sample_rows, process_tables_global, process_tables_for_dept, process_tables_for_process`
- imports: `__future__, core.config, json, logging, pathlib, psycopg2, re, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/department_service.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `DepartmentService`
- functions: `none`
- imports: `__future__, core.exceptions, logging, repositories.department_repo, repositories.process_repo, schemas.department, schemas.process, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/dspy_optimizer.py`

- layer: `service/business`
- gist: DSPy RAG prompt optimizer — §56 Stage-1 adapter (4th in the series).
- classes: `DSPyOptimizationResult`
- functions: `is_enabled, is_importable, _write_audit_row, _base_row, _validate_inputs, _build_metric, _score_program, run_optimization, status`
- imports: `__future__, dataclasses, dspy, dspy.teleprompt, importlib, json, os, pathlib, sys, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/eta_service.py`

- layer: `service/business`
- gist: eta_service — rule-based ETA prediction per transportation mode.
- classes: `ETAService`
- functions: `none`
- imports: `__future__, core.structured_logger, repositories.supply_chain_repo, schemas.supply_chain, statistics`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/forecast_service.py`

- layer: `service/business`
- gist: forecast_service.py — Prophet per-store forecast wrapper with an LRU cache.
- classes: `_FittedModel, ForecastService`
- functions: `_to_points, _mape`
- imports: `__future__, core.structured_logger, dataclasses, datetime, functools, logging, pandas, prophet, repositories.sales_repo, schemas.sales, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/job_service.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `JobService`
- functions: `none`
- imports: `__future__, core.exceptions, logging, repositories.job_repo, schemas.job, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/llm_gateway.py`

- layer: `service/business`
- gist: LiteLLM provider-agnostic LLM gateway (§56 Stage-1 adapter).
- classes: `LlmCompletion`
- functions: `is_enabled, is_importable, _write_audit_row, _provider_from_model, complete, status`
- imports: `__future__, dataclasses, importlib, json, litellm, os, pathlib, sys, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/ml_service.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `MLService`
- functions: `none`
- imports: `__future__, core.exceptions, logging, repositories.model_repo, schemas.model, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/openclaw_gateway_service.py`

- layer: `service/business`
- gist: OpenClaw bridge service.
- classes: `OpenClawGatewayService`
- functions: `_result_matches, _redact_url`
- imports: `__future__, core.config, json, logging, redis, schemas.openclaw, time, typing, urllib.parse, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/paperclip_service.py`

- layer: `service/business`
- gist: Local Paperclip artifact/context adapter service.
- classes: `PaperclipService`
- functions: `_redact, _preview, _read_json, _write_json`
- imports: `__future__, fastapi, hashlib, json, logging, os, pathlib, re, schemas.paperclip, time, typing, uuid`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/process_service.py`

- layer: `service/business`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `ProcessService`
- functions: `none`
- imports: `__future__, core.exceptions, logging, repositories.process_repo, schemas.process, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/rag_service.py`

- layer: `service/business`
- gist: rag_service.py — hybrid retrieval + Ollama generation + citation extraction.
- classes: `Chunk, RAGService`
- functions: `_tokenize`
- imports: `__future__, core.structured_logger, dataclasses, logging, numpy, pathlib, rank_bm25, re, requests, schemas.ai_explain, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/simulation_service.py`

- layer: `service/business`
- gist: simulation_service.py — price × promo simulation using beta forecast as baseline.
- classes: `SimulationService`
- functions: `none`
- imports: `__future__, core.structured_logger, logging, schemas.sales, services.forecast_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/stockout_service.py`

- layer: `service/business`
- gist: stockout_service — heuristic stockout-risk assessment for a single SKU.
- classes: `StockoutService`
- functions: `none`
- imports: `__future__, core.structured_logger, repositories.supply_chain_repo, schemas.supply_chain`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/supplier_score_service.py`

- layer: `service/business`
- gist: supplier_score_service — composite 0-100 score per supplier.
- classes: `SupplierScoreService`
- functions: `none`
- imports: `__future__, core.structured_logger, repositories.supply_chain_repo, schemas.supply_chain`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/supply_chain_simulation_service.py`

- layer: `service/business`
- gist: supply_chain_simulation_service — what-if delay impact per supplier.
- classes: `SupplyChainSimulationService`
- functions: `none`
- imports: `__future__, core.structured_logger, repositories.supply_chain_repo, schemas.supply_chain`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/services/typed_council.py`

- layer: `service/business`
- gist: Pydantic AI typed council — §56 Stage-1 adapter.
- classes: `CouncilAuthorOutput, CouncilReviewerOutput, CouncilChairDecision, CouncilResult`
- functions: `is_enabled, is_importable, _write_audit_row, _base_row, run_typed_council, status`
- imports: `__future__, dataclasses, importlib, json, os, pathlib, pydantic, pydantic_ai, sys, time, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/__init__.py`

- layer: `unknown`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/eval/__init__.py`

- layer: `unknown`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/eval/test_rag_groundedness.py`

- layer: `unknown`
- gist: RAG eval harness — groundedness only for Phase gamma.
- classes: `none`
- functions: `_ollama_judge_groundedness, test_groundedness_across_5_questions`
- imports: `__future__, backend.schemas.ai_explain, backend.services.rag_service, pytest, re, requests`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_agent_platform_router.py`

- layer: `unknown`
- gist: Tests for the unified agent platform setup/status API.
- classes: `none`
- functions: `ensure_agent_platform_router_mounted, client, test_agent_platform_status_lists_requested_tools, test_agent_platform_manifest_contract, test_poliysai_governance_denies_secret_target, test_cua_dry_run_allowed_for_manager, test_cua_real_write_requires_manager_or_tester_rbac, test_typed_council_run_default_disabled_is_tenant_scoped, test_typed_council_run_rbac_blocks_team_member, test_approval_broker_auto_approves_safe_local_work, test_approval_broker_requires_human_for_production_secret, test_approval_broker_submit_next_uses_openclaw_when_safe, test_approval_broker_rbac_blocks_team_member`
- imports: `__future__, core.rbac_middleware, fastapi.testclient, main, pytest, re, routers.agent_platform, schemas.openclaw, services, services.agent_platform_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_ai_explain_router.py`

- layer: `unknown`
- gist: test_ai_explain_router.py — router-level tests for /api/v1/ai/*.
- classes: `none`
- functions: `client, test_feedback_positive_returns_204, test_feedback_negative_minimal_payload_returns_204, test_feedback_rejects_invalid_rating, test_feedback_rejects_unknown_field`
- imports: `__future__, backend.main, fastapi.testclient, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_churn_model_service.py`

- layer: `unknown`
- gist: test_churn_model_service.py — smoke + quality checks for the churn model.
- classes: `none`
- functions: `svc, test_fit_and_metrics, test_rank_top_n, test_predict_single_customer, test_predict_unknown_customer, test_predict_cached_same_result`
- imports: `__future__, pytest, repositories.customer_repo, services.churn_model_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_customer_corpus.py`

- layer: `unknown`
- gist: test_customer_corpus.py — smoke-check the customer RAG corpus.
- classes: `none`
- functions: `test_corpus_files_exist, test_corpus_chunks_parseable, test_corpus_covers_all_four_files, test_explainrequest_accepts_customer_corpus, test_explainrequest_rejects_unknown_corpus, test_corpus_content_includes_key_vocab`
- imports: `__future__, pathlib, pydantic, pytest, schemas.ai_explain, services.rag_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_customer_ingestion.py`

- layer: `unknown`
- gist: test_customer_ingestion.py — smoke-check the customer pilot schema after ingest.
- classes: `none`
- functions: `_dsn, conn, _count, _ingested, test_customer_pilot_row_count, test_churn_label_matches_customers, test_interaction_count_reasonable, test_churn_rate_matches_benchmark, test_contract_types_complete`
- imports: `__future__, os, psycopg2, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_customer_router.py`

- layer: `unknown`
- gist: test_customer_router.py — end-to-end HTTP tests for /api/v1/customer/*.
- classes: `none`
- functions: `client, test_churn_metrics, test_churn_top, test_churn_top_limit_bounds, test_churn_predict_known, test_churn_predict_unknown, test_churn_predict_validation, test_rbac_reporting_monitoring_allowed, test_rbac_invalid_role_400`
- imports: `__future__, fastapi.testclient, main, pytest, repositories.customer_repo`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_forecast_service.py`

- layer: `unknown`
- gist: test_forecast_service.py — unit tests for ForecastService.
- classes: `none`
- functions: `_make_synthetic_history, mock_repo, test_mape_zero_when_perfect, test_mape_skips_zero_actual, test_forecast_returns_schema, test_forecast_mape_reasonable_on_synthetic, test_cache_hit_skips_refit, test_missing_history_raises, test_insufficient_history_raises`
- imports: `__future__, backend.services.forecast_service, datetime, pytest, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_insurance_router.py`

- layer: `test`
- gist: HTTP coverage for insurance department artifact endpoints and generated INSUR navigator shape. Verifies priority department listing, markdown artifact reads, anti-enumeration 404s, missing artifact 404s, pipeline registry listing, and `/api/v1/insur/nav/{dept}` JSON shape.
- classes: `none`
- functions: `test_insurance_depts_lists_four_priority_domains, test_insurance_markdown_artifacts_are_served, test_insurance_invalid_dept_and_role_are_not_enumerable, test_insurance_missing_artifact_returns_404, test_insurance_pipeline_list_uses_registry, test_insur_nav_lists_generated_insurance_departments, test_insur_nav_serves_generated_nav_shape`
- imports: `__future__, fastapi.testclient, main, pathlib, routers.insurance, routers.insur`
- flow: TestClient exercises mounted FastAPI routers against filesystem-backed insurance artifacts and generated INSUR_NAV.json files.

## `backend/tests/test_openclaw_router.py`

- layer: `unknown`
- gist: OpenClaw bridge router tests.
- classes: `FakeOpenClawService`
- functions: `ensure_openclaw_router_mounted, client, test_openclaw_status_contract, test_openclaw_manifest_contract, test_openclaw_create_task_manager_allowed, test_openclaw_create_task_non_manager_forbidden, test_openclaw_get_task_result, test_openclaw_rejects_blank_prompt, test_openclaw_create_task_idempotency_replays_cached_response`
- imports: `__future__, core.rbac_middleware, fastapi.testclient, main, pathlib, pytest, re, routers.openclaw, schemas.openclaw, typing`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_paperclip_router.py`

- layer: `unknown`
- gist: Tests for the local Paperclip context/artifact adapter API.
- classes: `none`
- functions: `ensure_paperclip_router_mounted, client, test_paperclip_status, test_create_get_list_and_context_pack_redacts_pii, test_non_manager_cannot_create_or_delete, test_manager_can_delete, test_create_clip_idempotency_replays_cached_response, test_create_clip_idempotency_is_tenant_isolated`
- imports: `__future__, core.rbac_middleware, fastapi.testclient, main, pathlib, pytest, re, routers.paperclip, services.paperclip_service`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_rag_service.py`

- layer: `unknown`
- gist: Unit tests for RAGService. Mock Ollama HTTP calls — no network needed.
- classes: `none`
- functions: `corpus_tmp, _mock_embed, test_tokenize_lowercases_and_splits, test_pii_redacts_email_and_phone, test_read_chunks_splits_on_h2, test_retrieval_returns_relevant_chunks, test_explain_calls_ollama_and_returns_citations, test_explain_soft_fails_when_response_missing_ref, test_default_corpus_dir_points_at_sales_context, test_corpus_dir_override_reads_from_specified_dir, test_router_per_corpus_cache_returns_distinct_services, test_explain_request_accepts_corpus_field`
- imports: `__future__, backend.routers.ai_explain, backend.schemas.ai_explain, backend.services.rag_service, pytest, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_rbac_middleware.py`

- layer: `unknown`
- gist: test_rbac_middleware — permission matrix enforcement for Sales + AI endpoints.
- classes: `none`
- functions: `client, test_stores_allowed_for_all_roles, test_simulate_manager_only, test_unknown_role_returns_400, test_missing_role_defaults_to_manager, test_non_matrix_path_is_allowed, test_supply_chain_simulate_manager_only, test_supply_chain_stockout_allowed_for_all_roles, test_tester_can_hit_stores, test_tester_cannot_simulate`
- imports: `__future__, fastapi.testclient, main, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_rossmann_ingestion.py`

- layer: `unknown`
- gist: test_rossmann_ingestion.py — data-quality assertions against the ingested tables.
- classes: `none`
- functions: `repo, counts, _require_ingested, test_dim_store_row_count_matches_expected, test_fact_sales_row_count_is_order_of_magnitude_correct, test_dim_date_row_count_is_reasonable, test_no_null_sales, test_store_123_exists, test_get_sales_history_returns_nonempty`
- imports: `__future__, backend.repositories.sales_repo, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_sales_repo.py`

- layer: `unknown`
- gist: test_sales_repo.py — unit tests for SalesRepo that exercise SQL shape without needing Postgres.
- classes: `none`
- functions: `mock_repo, test_list_stores_executes_expected_sql, test_get_store_parameterized, test_get_sales_history_no_dates, test_get_sales_history_with_dates`
- imports: `__future__, backend.repositories.sales_repo, contextlib, datetime, pytest, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_sales_router.py`

- layer: `unknown`
- gist: test_sales_router.py — integration tests against FastAPI TestClient.
- classes: `none`
- functions: `client, _require_ingested, test_list_stores_returns_1115, test_forecast_happy_path, test_forecast_bad_store_returns_404, test_forecast_rejects_unknown_field, test_forecast_bounds, test_simulate_happy_path, test_simulate_bad_discount_returns_422, test_simulate_unknown_field_returns_422`
- imports: `__future__, backend.main, backend.repositories.sales_repo, fastapi.testclient, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_simulation_service.py`

- layer: `unknown`
- gist: test_simulation_service.py — unit tests for the price × promo simulation.
- classes: `none`
- functions: `_mock_forecast_service, test_simulate_baseline_revenue_matches_forecast_sum, test_simulate_elasticity_uplift_sign, test_simulate_zero_discount_zero_uplift, test_simulate_waterfall_has_four_steps, test_simulate_constants_returned`
- imports: `__future__, datetime, schemas.sales, services.simulation_service, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_structured_logger.py`

- layer: `unknown`
- gist: Unit tests for core.structured_logger — JSON emitter + correlation_id contextvar.
- classes: `none`
- functions: `_capture_logs, test_new_correlation_id_is_16_chars_hex, test_emit_event_includes_correlation_id, test_emit_event_default_correlation_id, test_emit_event_stringifies_nonjson_values`
- imports: `__future__, core.structured_logger, io, json, logging`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_supply_chain_ingestion.py`

- layer: `unknown`
- gist: test_supply_chain_ingestion.py — data-quality assertions against ingested tables.
- classes: `none`
- functions: `repo, counts, _require_ingested, test_fact_shipment_has_rows, test_dim_sku_has_at_least_one_entry_per_product_type, test_dim_supplier_has_unique_locations, test_get_shipments_for_known_sku_returns_records`
- imports: `__future__, pytest, repositories.supply_chain_repo`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_supply_chain_repo.py`

- layer: `unknown`
- gist: test_supply_chain_repo.py — unit tests for SupplyChainRepo SQL shape.
- classes: `none`
- functions: `mock_repo, test_list_skus_sql, test_list_suppliers_sql, test_get_sku_parameterized, test_get_shipments_for_sku`
- imports: `__future__, contextlib, pytest, repositories.supply_chain_repo, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_supply_chain_router.py`

- layer: `unknown`
- gist: test_supply_chain_router — TestClient integration tests against real DB.
- classes: `none`
- functions: `client, _require_ingested, test_list_skus, test_list_suppliers_scored, test_stockout_risk_happy_path, test_stockout_risk_unknown_sku_returns_404, test_stockout_risk_rejects_unknown_field, test_eta_happy_path, test_simulate_happy_path, test_simulate_rejects_out_of_range`
- imports: `__future__, backend.main, backend.repositories.supply_chain_repo, fastapi.testclient, pytest`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/tests/test_supply_chain_services.py`

- layer: `unknown`
- gist: test_supply_chain_services — unit tests for 4 Supply Chain services.
- classes: `_NoDBSupplierScoreService, _FixedRevenueSim`
- functions: `_mock_repo, test_stockout_high_risk_when_cover_short, test_stockout_unknown_sku_raises, test_eta_predict_uses_cached_stats, test_eta_predict_unknown_sku_raises, test_supplier_score_ranks_descending, test_supplier_score_inspection_mapping, test_simulation_zero_delay_has_no_impact, test_simulation_linear_scaling_with_delay`
- imports: `__future__, pytest, schemas.supply_chain, services.eta_service, services.stockout_service, services.supplier_score_service, services.supply_chain_simulation_service, unittest.mock`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/workers/__init__.py`

- layer: `worker/orchestration`
- gist: No module docstring yet. Add file-level input/process/output/flow documentation.
- classes: `none`
- functions: `none`
- imports: `none`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/workers/celery_app.py`

- layer: `worker/orchestration`
- gist: Celery application factory for Insur Analytics background workers.
- classes: `none`
- functions: `none`
- imports: `__future__, celery, core.config, os, sys`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

## `backend/workers/tasks.py`

- layer: `worker/orchestration`
- gist: Celery tasks for the Insur Analytics platform.
- classes: `none`
- functions: `_get_pipeline, train_model, predict, run_pipeline, run_structured_lifecycle, run_rag_lifecycle, dispatch_test_fanout, _cron_audit_dir, _cron_disabled, refresh_data_artifacts, retrain_models, eval_accuracy_drift, analysis_rollup`
- imports: `__future__, celery, celery.exceptions, core.config, importlib, json, logging, ml.pipelines.customer_segmentation, ml.pipelines.defect_detection, ml.pipelines.demand_forecast, ml.pipelines.inventory_optimizer, ml.pipelines.predictive_maintenance, ml.pipelines.sentiment_analysis, ml.reference.anomaly_lifecycle, ml.reference.full_lifecycle, ml.reference.noise_handling, ml.reference.rag_lifecycle, ml.reference.recommendation_lifecycle, ml.reference.role_dashboard_catalog, os, pandas, pathlib, redis, sys, time, typing, uuid, workers.celery_app`
- flow: See docs/BACKEND_GLOBAL_POLICY.md for required cross-file input/process/output flow comments.

