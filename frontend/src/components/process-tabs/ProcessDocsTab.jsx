import { useState } from 'react';
import SequenceDiagram from '../charts/SequenceDiagram';
import { processSequenceDiagrams } from '../../data/sequenceDiagrams';

/* =========================================================
   DOC SUB-TAB CONTENT
   ========================================================= */

const DOC_SUB_TABS = [
  { id: 'hld',      label: 'HLD',              icon: '📐' },
  { id: 'lld',      label: 'LLD',              icon: '📋' },
  { id: 'brd',      label: 'BRD',              icon: '📝' },
  { id: 'adr',      label: 'ADR',              icon: '🏛️' },
  { id: 'c4',       label: 'C4 Model',         icon: '🏗️' },
  { id: 'modelcard',label: 'Model Card',       icon: '🧠' },
  { id: 'runbook',  label: 'Runbook',          icon: '⚙️' },
  { id: 'datadict', label: 'Data Dictionary',  icon: '📖' },
  { id: 'sequence', label: 'Sequence Diagrams',icon: '↔️' },
];

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-md)', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)' }}>
      <span style={{ width: 180, flexShrink: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', flex: 1 }}>{value}</span>
    </div>
  );
}

function SectionH3({ children }) {
  return <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--accent-primary)', marginBottom: 10, marginTop: 18, paddingBottom: 4, borderBottom: '2px solid rgba(59,130,246,0.15)' }}>{children}</div>;
}

function MiniTable({ headers, rows }) {
  return (
    <div className="table-wrapper" style={{ marginBottom: 'var(--spacing-md)' }}>
      <table className="data-table">
        <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ fontSize: 10 }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function HLDContent() {
  return (
    <div>
      <SectionH3>System Context</SectionH3>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>
        The Demand Forecasting System sits at the intersection of CPG operational data and AI-powered planning.
        External data sources (POS, ERP, weather APIs, promotional calendars) flow into the ingestion layer.
        Outputs are consumed by ERP planning modules, the web dashboard, and mobile alerts.
      </p>
      <SectionH3>Component Overview</SectionH3>
      <MiniTable
        headers={['Component', 'Role', 'Technology']}
        rows={[
          ['Data Ingestion Layer', 'Pull from SAP, WMS, POS, external APIs', 'Python / Airflow'],
          ['Feature Store', 'Compute and serve ML features at scale', 'Redis + PostgreSQL'],
          ['Training Pipeline', 'Scheduled model training with CV', 'MLflow + XGBoost'],
          ['Inference Engine', 'Real-time and batch scoring', 'FastAPI + Celery'],
          ['Forecast Dashboard', 'Planner UI with drill-down and alerts', 'React + Vite'],
          ['ERP Integration', 'Push forecasts to SAP S/4HANA', 'REST API / RFC'],
        ]}
      />
      <SectionH3>Data Flow</SectionH3>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>
        <strong>Source</strong> → SAP S/4HANA (sales actuals, inventory), WMS (on-hand stock), POS feeds (daily sell-through), Weather API, Promo Calendar &nbsp;|&nbsp;
        <strong>Processing</strong> → Airflow DAG normalises, validates, and loads to Feature Store &nbsp;|&nbsp;
        <strong>Output</strong> → 30-day SKU×store forecast written to data warehouse, exposed via REST API &nbsp;|&nbsp;
        <strong>Consumers</strong> → ERP planning module, Demand Dashboard, Email/SMS alerts, Finance reporting cube
      </p>
      <SectionH3>Non-Functional Requirements</SectionH3>
      <MiniTable
        headers={['NFR', 'Target', 'Measurement']}
        rows={[
          ['Forecast Latency (batch)', '< 4 hours / full cycle', 'Airflow DAG run duration'],
          ['API Response Time (p95)', '< 500 ms per SKU query', 'APM p95 latency metric'],
          ['Availability', '99.5% uptime (Mon–Fri 06:00–22:00)', 'Uptime Robot / PagerDuty'],
          ['Throughput', '3,200 SKU × 850 stores × 30 days in < 4h', 'Batch job timing'],
          ['Data Freshness', 'Actuals lag ≤ 24 hours', 'ETL pipeline SLA'],
          ['MAPE Target', '< 10% on 4-week holdout', 'Accuracy monitor'],
        ]}
      />
      <SectionH3>Technology Stack</SectionH3>
      <MiniTable
        headers={['Layer', 'Technology', 'Version', 'Notes']}
        rows={[
          ['ML Framework', 'XGBoost + LightGBM', '2.0 / 4.3', 'Ensemble weighted by recent CV'],
          ['Orchestration', 'Apache Airflow', '2.8', 'Weekly + ad-hoc DAGs'],
          ['API Backend', 'FastAPI + Uvicorn', '0.110', 'Async endpoints'],
          ['Database', 'PostgreSQL', '15', 'Feature store + results'],
          ['Cache', 'Redis', '7.2', 'Feature serving'],
          ['Frontend', 'React + Vite', '18 / 5', 'Dashboard UI'],
          ['Monitoring', 'Prometheus + Grafana', 'Latest', 'Drift + latency'],
        ]}
      />
      <SectionH3>Integration Points</SectionH3>
      <MiniTable
        headers={['System', 'Direction', 'Protocol', 'Frequency']}
        rows={[
          ['SAP S/4HANA', 'IN', 'RFC / OData v4', 'Daily 02:00'],
          ['WMS (Manhattan)', 'IN', 'REST API', 'Every 6h'],
          ['POS Aggregator', 'IN', 'SFTP + CSV', 'Daily 06:00'],
          ['Weather API', 'IN', 'REST (OpenWeather)', 'Daily 05:00'],
          ['ERP Planning', 'OUT', 'REST API', 'Post-forecast run'],
          ['Email/SMS Alerts', 'OUT', 'SMTP / Twilio', 'On trigger'],
        ]}
      />
    </div>
  );
}

function LLDContent() {
  return (
    <div>
      <SectionH3>Module Structure</SectionH3>
      <MiniTable
        headers={['Module', 'File / Class', 'Responsibility']}
        rows={[
          ['Config', 'core/config.py → Settings', 'Pydantic BaseSettings; all env vars'],
          ['Ingestion', 'pipelines/ingest.py → IngestJob', 'Pull, validate, normalise source data'],
          ['Feature Store', 'repositories/feature_repo.py → FeatureRepo', 'Read/write feature vectors'],
          ['Training', 'services/training_service.py → TrainingService', 'Train, evaluate, register models'],
          ['Inference', 'services/forecast_service.py → ForecastService', 'Batch & real-time scoring'],
          ['Alert', 'services/alert_service.py → AlertService', 'Drift detection, notification dispatch'],
          ['Router', 'routers/forecast.py', 'REST endpoints — no SQL'],
        ]}
      />
      <SectionH3>Key Database Tables</SectionH3>
      <MiniTable
        headers={['Table', 'Key Columns', 'Index', 'Notes']}
        rows={[
          ['sales_actuals', 'sku_id, store_id, date, quantity, price', 'idx_actuals_date, idx_actuals_sku', 'Partitioned by year'],
          ['forecasts', 'sku_id, store_id, forecast_date, p10, p50, p90, model_version', 'idx_fc_date, idx_fc_sku', 'Append-only'],
          ['feature_store', 'sku_id, store_id, feature_date, feature_json', 'idx_fs_sku_date', 'JSONB column'],
          ['model_registry', 'model_id, version, mape, bias, trained_at, status', 'idx_mr_status', 'Active flag'],
          ['audit_log', 'event_type, entity_id, user_id, payload, created_at', 'idx_al_created_at', 'WAL + retention 90d'],
        ]}
      />
      <SectionH3>API Contract (Key Endpoints)</SectionH3>
      <MiniTable
        headers={['Method', 'Endpoint', 'Request', 'Response']}
        rows={[
          ['GET', '/api/v1/forecasts', '?sku_id&store_id&horizon=30', 'ForecastResponse{p10,p50,p90,dates}'],
          ['POST', '/api/v1/jobs/train', '{model_type, hyperparams}', 'JobCreated{job_id, status}'],
          ['GET', '/api/v1/jobs/{id}', '-', 'JobStatus{status, mape, logs}'],
          ['GET', '/api/v1/accuracy', '?period=4w', 'AccuracyReport{mape, bias, fva}'],
          ['POST', '/api/v1/scenarios', '{sku_id, adjustments}', 'ScenarioResult{demand_curve, pnl}'],
          ['GET', '/api/health', '-', '{"status":"ok","version":"..."}'],
        ]}
      />
      <SectionH3>Algorithm Pseudocode — Feature Engineering</SectionH3>
      <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.8, overflowX: 'auto' }}>
        <pre>{`for each (sku_id, store_id, date) in raw_sales:
    lags = [sales[t-1], sales[t-4], sales[t-8], sales[t-13]]
    rolling_mean_4w = mean(sales[t-4 : t])
    rolling_std_4w  = std(sales[t-4 : t])
    promo_flag      = 1 if date in promo_calendar else 0
    holiday_flag    = 1 if date in holiday_calendar else 0
    dow_enc         = one_hot(day_of_week(date))
    month_sin/cos   = sin/cos(2π × month / 12)
    features.append([lags, rolling_mean_4w, rolling_std_4w,
                      promo_flag, holiday_flag, dow_enc,
                      month_sin, month_cos, sku_attrs...])`}</pre>
      </div>
      <SectionH3>Error Handling Strategy</SectionH3>
      <MiniTable
        headers={['Scenario', 'Handler', 'User Impact']}
        rows={[
          ['ERP API timeout', 'Retry ×3 exp backoff → raise ExternalServiceError', 'Job marked FAILED, planner notified'],
          ['MAPE > 15% gate', 'Forecast NOT auto-published; planner review required', 'Manual override available'],
          ['Feature store miss', 'Fallback to 4-week rolling average', 'Logged as WARNING; cold-start flag set'],
          ['DB connection lost', 'Circuit breaker (5 fails / 60s)', 'Health endpoint returns 503'],
          ['Null SKU in payload', 'Pydantic validation raises 422', 'Client receives field-level error'],
        ]}
      />
      <SectionH3>Configuration Parameters</SectionH3>
      <MiniTable
        headers={['Parameter', 'Default', 'Description']}
        rows={[
          ['FORECAST_HORIZON_DAYS', '30', 'Days ahead to forecast'],
          ['MAPE_GATE_THRESHOLD', '0.10', 'Max MAPE to auto-publish'],
          ['RETRAIN_DRIFT_THRESHOLD', '0.15', 'MAPE delta to trigger retraining'],
          ['RATE_LIMIT_API', '100', 'Requests/min per IP'],
          ['COLD_START_UNCERTAINTY', '0.30', 'Default ±% for cold-start SKUs'],
          ['AUDIT_RETENTION_DAYS', '90', 'Days to retain audit log entries'],
        ]}
      />
    </div>
  );
}

function BRDContent() {
  return (
    <div>
      <SectionH3>Business Objective</SectionH3>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>
        Replace manual Excel-based demand forecasting with an AI-driven platform that delivers SKU-level 30-day forecasts
        at &lt;10% MAPE, enabling the supply chain team to reduce stockouts, cut excess inventory, and free planner time for
        exception management. Target go-live: Q3 2025.
      </p>
      <SectionH3>Success Criteria (Measurable KPIs)</SectionH3>
      <MiniTable
        headers={['KPI', 'Baseline', 'Target', 'Measurement']}
        rows={[
          ['Forecast MAPE (SKU/week)', '18–24%', '< 10%', '4-week rolling holdout'],
          ['Forecast Cycle Time', '3 days', '< 4 hours', 'Pipeline run duration'],
          ['Planner Hours / Week', '40 hrs', '< 16 hrs', 'Time-tracking survey'],
          ['Stockout Rate', '4.3%', '< 2.0%', 'WMS OOS events / total SKUs'],
          ['Excess Inventory Write-off', '$2.1M/yr', '< $400K/yr', 'Finance ERP report'],
          ['Service Level (Fill Rate)', '95.7%', '> 98%', 'Customer order fulfilment data'],
        ]}
      />
      <SectionH3>Stakeholders & RACI</SectionH3>
      <MiniTable
        headers={['Role', 'Responsible', 'Accountable', 'Consulted', 'Informed']}
        rows={[
          ['Demand Planning Lead', '✓', '', '', ''],
          ['Supply Chain VP', '', '✓', '', ''],
          ['Data Science Lead', '✓', '', '', ''],
          ['IT / MLOps', '✓', '', '', ''],
          ['Finance (FP&A)', '', '', '✓', '✓'],
          ['Category Management', '', '', '✓', '✓'],
          ['Retail Partners', '', '', '', '✓'],
        ]}
      />
      <SectionH3>Functional Requirements</SectionH3>
      <MiniTable
        headers={['ID', 'Requirement', 'Priority']}
        rows={[
          ['FR-01', 'System shall generate 30-day SKU×store forecast weekly', 'Must Have'],
          ['FR-02', 'System shall output P10/P50/P90 confidence bands', 'Must Have'],
          ['FR-03', 'System shall integrate promo calendar for uplift modelling', 'Must Have'],
          ['FR-04', 'System shall score stockout risk per SKU-store pair', 'Must Have'],
          ['FR-05', 'System shall support cold-start forecasting for new SKUs', 'Should Have'],
          ['FR-06', 'System shall provide planner override UI', 'Should Have'],
          ['FR-07', 'System shall auto-retrain when MAPE drifts > 5pp', 'Should Have'],
          ['FR-08', 'System shall expose what-if scenario API', 'Could Have'],
          ['FR-09', 'System shall produce SHAP explanations per SKU', 'Could Have'],
        ]}
      />
      <SectionH3>Non-Functional Requirements</SectionH3>
      <MiniTable
        headers={['ID', 'Requirement', 'Priority']}
        rows={[
          ['NFR-01', 'Full forecast cycle completed in < 4 hours', 'Must Have'],
          ['NFR-02', 'API p95 response time < 500ms', 'Must Have'],
          ['NFR-03', 'System uptime 99.5% business hours', 'Must Have'],
          ['NFR-04', 'All secrets encrypted at rest (Fernet); no plaintext in DB', 'Must Have'],
          ['NFR-05', 'Audit log retained 90 days; GDPR-compliant PII handling', 'Must Have'],
          ['NFR-06', 'Dashboard loads in < 2 seconds on standard network', 'Should Have'],
        ]}
      />
      <SectionH3>Constraints & Assumptions</SectionH3>
      <MiniTable
        headers={['Type', 'Description']}
        rows={[
          ['Constraint', 'Must integrate with existing SAP S/4HANA — no ERP replacement'],
          ['Constraint', 'Budget cap: £480K for Phase 1 delivery'],
          ['Constraint', 'On-premise deployment required (data residency — EU)'],
          ['Assumption', 'SAP actuals available within 24h of transaction'],
          ['Assumption', 'Promotional calendar managed by Trade Marketing; updated weekly'],
          ['Assumption', 'Minimum 12 months of clean historical data available at launch'],
        ]}
      />
      <SectionH3>Risks & Mitigations</SectionH3>
      <MiniTable
        headers={['Risk', 'Likelihood', 'Impact', 'Mitigation']}
        rows={[
          ['Data quality below threshold at go-live', 'Medium', 'High', 'Data audit sprint in Week 2; fallback to naïve model'],
          ['ERP API rate limits block ingestion', 'Low', 'High', 'Batch ingestion + exponential backoff retry'],
          ['Model MAPE > target at go-live', 'Medium', 'Medium', 'Shadow mode first; planner override always available'],
          ['Planner adoption resistance', 'Medium', 'High', 'Change management plan; champion-led training'],
          ['Key person dependency (ML lead)', 'Low', 'Medium', 'Documentation + MLflow model registry + runbook'],
        ]}
      />
      <SectionH3>Timeline & Milestones</SectionH3>
      <MiniTable
        headers={['Milestone', 'Date', 'Deliverable']}
        rows={[
          ['Kickoff', '2025-01-13', 'Signed BRD, project charter'],
          ['Data Audit Complete', '2025-02-07', 'Data quality report, gap list'],
          ['Feature Store v1', '2025-03-01', 'Feature pipeline live, 24h refresh'],
          ['Model Baseline', '2025-03-28', 'XGBoost baseline MAPE < 12%'],
          ['Dashboard Beta', '2025-04-25', 'Planner UI: forecast + stockout view'],
          ['UAT Complete', '2025-05-30', 'Sign-off from Demand Planning Lead'],
          ['Production Go-Live', '2025-06-20', 'Full rollout; shadow mode lifted'],
          ['Phase 1 Review', '2025-09-19', 'KPI measurement vs. targets'],
        ]}
      />
    </div>
  );
}

function ADRContent() {
  const adrs = [
    {
      id: 'ADR-001', title: 'XGBoost over LSTM for Demand Forecasting Baseline',
      status: 'Accepted', date: '2025-01-20',
      context: 'We needed to select the primary ML algorithm for the 30-day demand forecast. Options evaluated: LSTM (deep learning, sequence model), XGBoost (gradient boosting, tabular), Prophet (time-series specific), ARIMA (statistical). The dataset has 3,200 SKUs with irregular promotions, cold-start items, and moderate data sparsity.',
      decision: 'Use XGBoost as the primary baseline model, with LightGBM as a secondary candidate in the ensemble. The final forecast is a weighted average of both.',
      consequences: [
        'Positive: XGBoost trains in < 30 min on full SKU set; LSTM would require 4–8 hours GPU training per run.',
        'Positive: XGBoost handles missing values natively; no imputation needed for sparse SKUs.',
        'Positive: SHAP explainability is first-class with XGBoost — critical for planner trust.',
        'Negative: XGBoost requires manual feature engineering for seasonality (sin/cos encoding); LSTM learns this automatically.',
        'Mitigation: Add seasonal features to feature store. Revisit LSTM if MAPE target not met by Phase 2.',
      ],
    },
    {
      id: 'ADR-002', title: 'PostgreSQL over MongoDB for Feature Store and Results',
      status: 'Accepted', date: '2025-01-27',
      context: 'Needed a database to store: (1) ML features (structured, tabular), (2) forecast results (structured, append-only), (3) audit log (structured), (4) model registry (structured). MongoDB was proposed for its schema flexibility. PostgreSQL with JSONB was the alternative.',
      decision: 'Use PostgreSQL 15 with JSONB for semi-structured data (feature vectors). Enforce schema via Pydantic at the application layer.',
      consequences: [
        'Positive: SQL joins simplify accuracy reporting across multiple tables.',
        'Positive: PostgreSQL WAL mode + point-in-time recovery → better disaster recovery than MongoDB in our on-prem setup.',
        'Positive: Existing DBA team expertise in PostgreSQL — lower operational overhead.',
        'Negative: JSONB queries are slower than native document lookups for deeply nested feature vectors.',
        'Mitigation: Index on (sku_id, feature_date); cache hot features in Redis.',
      ],
    },
    {
      id: 'ADR-003', title: 'Celery + Redis over FastAPI BackgroundTasks for Long-Running Jobs',
      status: 'Accepted', date: '2025-02-03',
      context: 'Training a model for 3,200 SKUs takes 25–40 minutes. FastAPI BackgroundTasks runs in the same process as the API server — a crash kills the job with no recovery. Celery with Redis as broker provides proper task queuing, retries, and visibility.',
      decision: 'Use Celery 5.x with Redis 7.2 as broker for all long-running jobs (training, batch scoring, bulk export). FastAPI routes only enqueue jobs; status polling via GET /jobs/{id}.',
      consequences: [
        'Positive: Job survives API server restarts — Celery worker is a separate process.',
        'Positive: Native retry with exponential backoff; visibility via Flower dashboard.',
        'Positive: Horizontal scaling: add more Celery workers without changing API code.',
        'Negative: Adds operational complexity: Redis + Celery worker + Flower to manage.',
        'Mitigation: Docker Compose manages all services; health checks on Redis and Celery workers.',
      ],
    },
  ];

  return (
    <div>
      {adrs.map((adr, i) => (
        <div key={i} style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--accent-primary)' }}>{adr.id}</span>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginTop: 2 }}>{adr.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: 'var(--accent-success)', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 4 }}>{adr.status}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{adr.date}</span>
            </div>
          </div>
          {[
            { label: 'Context', text: adr.context, color: 'var(--accent-primary)' },
            { label: 'Decision', text: adr.decision, color: 'var(--accent-success)' },
          ].map((sec, si) => (
            <div key={si} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: sec.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{sec.label}</div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sec.text}</p>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Consequences</div>
            <ul style={{ paddingLeft: 16 }}>
              {adr.consequences.map((c, ci) => (
                <li key={ci} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 3 }}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function C4Content() {
  return (
    <div>
      <SectionH3>Level 1 — System Context</SectionH3>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
        The Demand Forecasting System is used by Demand Planners and Supply Chain Managers. It interacts with external systems
        SAP S/4HANA, WMS, POS feeds, and Weather APIs. Outputs are consumed by the ERP Planning module and the web dashboard.
      </p>
      <MiniTable
        headers={['Actor / System', 'Type', 'Interaction']}
        rows={[
          ['Demand Planner', 'Person', 'Reviews forecasts, overrides, approves exceptions via dashboard'],
          ['Supply Chain Manager', 'Person', 'Monitors stockout alerts, triggers replenishment'],
          ['Finance Analyst', 'Person', 'Downloads accuracy reports, uses confidence bands for budgeting'],
          ['SAP S/4HANA', 'External System', 'Provides sales actuals; receives approved forecasts'],
          ['WMS (Manhattan)', 'External System', 'Provides on-hand inventory levels every 6 hours'],
          ['POS Aggregator', 'External System', 'Daily sell-through data per store'],
          ['Weather API (OpenWeather)', 'External System', 'Daily temperature, precipitation forecasts'],
        ]}
      />
      <SectionH3>Level 2 — Container Diagram</SectionH3>
      <MiniTable
        headers={['Container', 'Technology', 'Responsibility']}
        rows={[
          ['Web Dashboard (SPA)', 'React + Vite', 'Planner UI: view forecasts, alerts, overrides'],
          ['API Server', 'FastAPI + Uvicorn', 'REST API: forecasts, jobs, accuracy, scenarios'],
          ['Celery Workers', 'Celery + Redis', 'Training pipeline, batch scoring, export jobs'],
          ['Feature Store', 'PostgreSQL + Redis', 'Compute, store, and serve ML feature vectors'],
          ['ML Model Registry', 'MLflow + PostgreSQL', 'Model versioning, metadata, artefacts'],
          ['Ingestion DAGs', 'Apache Airflow', 'Pull from SAP, WMS, POS, Weather; load to DB'],
          ['Notification Service', 'SMTP + Twilio', 'Email / SMS alerts on stockout risk or drift'],
        ]}
      />
      <SectionH3>Level 3 — Component (API Server)</SectionH3>
      <MiniTable
        headers={['Component', 'Type', 'Responsibility']}
        rows={[
          ['ForecastRouter', 'FastAPI Router', 'GET /forecasts, GET /accuracy — delegates to service'],
          ['JobRouter', 'FastAPI Router', 'POST /jobs/train, GET /jobs/{id} — enqueues Celery tasks'],
          ['ScenarioRouter', 'FastAPI Router', 'POST /scenarios — calls ScenarioService'],
          ['ForecastService', 'Service Class', 'Reads from ForecastRepo; applies planner overrides'],
          ['TrainingService', 'Service Class', 'Builds feature matrix, trains model, registers in MLflow'],
          ['AlertService', 'Service Class', 'Computes stockout risk; dispatches notifications'],
          ['ForecastRepo', 'Repository Class', 'All SQL for forecasts table'],
          ['FeatureRepo', 'Repository Class', 'All SQL for feature_store table'],
          ['AuthMiddleware', 'Middleware', 'API key validation — env-driven, disabled in dev'],
          ['CorrelationIdMiddleware', 'Middleware', 'Injects X-Correlation-ID on every request/response'],
        ]}
      />
    </div>
  );
}

function ModelCardContent() {
  return (
    <div>
      <SectionH3>Model Overview</SectionH3>
      <MiniTable
        headers={['Field', 'Value']}
        rows={[
          ['Model Name', 'DemandForecastEnsemble v2.1'],
          ['Model Type', 'Ensemble — XGBoost + LightGBM (weighted average)'],
          ['Task', 'Regression — 30-day demand point forecast + quantile bands (P10/P50/P90)'],
          ['Version', '2.1.0 (production), 2.0.3 (archived)'],
          ['Trained On', '4 years sales history, 3,200 SKUs, 850 stores (332,800 rows × 45 features)'],
          ['Validation Method', 'Walk-forward 5-fold time-series CV; holdout: last 4 weeks'],
          ['Training Date', '2025-04-07'],
          ['Framework', 'XGBoost 2.0 + LightGBM 4.3 + MLflow 2.11'],
        ]}
      />
      <SectionH3>Intended Use</SectionH3>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
        This model is intended to support demand planning for CPG SKUs sold through retail channels in the UK & Ireland.
        It is designed for use by trained demand planners who can review, override, and contextualise model outputs.
        It is NOT designed for fully autonomous purchasing without human review.
      </p>
      <SectionH3>Evaluation Results</SectionH3>
      <MiniTable
        headers={['Metric', 'Overall', 'Promo SKUs', 'New SKUs (Cold Start)', 'Seasonal SKUs']}
        rows={[
          ['MAPE', '8.7%', '11.2%', '22.4% (±30% band)', '9.4%'],
          ['BIAS', '+1.8%', '+3.1%', '+4.2%', '+1.2%'],
          ['SMAPE', '9.1%', '12.3%', '24.1%', '9.8%'],
          ['FVA vs. Naïve', '+6.3pp', '+8.1pp', '+2.1pp', '+7.2pp'],
          ['Coverage (P10–P90)', '83.4%', '79.2%', '88.1%', '84.7%'],
        ]}
      />
      <SectionH3>Ethical Considerations</SectionH3>
      <MiniTable
        headers={['Consideration', 'Risk Level', 'Mitigation']}
        rows={[
          ['Bias against low-volume / niche SKUs', 'Medium', 'Minimum training sample filter; cold-start model for new SKUs'],
          ['Over-reliance by planners (automation bias)', 'Medium', 'Override UI always available; SHAP explanations mandatory'],
          ['Data privacy (store-level sales)', 'Low', 'Aggregated to SKU-store; no individual consumer PII'],
          ['Feedback loop (forecast drives replenishment drives actuals)', 'Low', 'Actuals sourced from POS (actual sell-through), not orders'],
        ]}
      />
    </div>
  );
}

function RunbookContent() {
  return (
    <div>
      <SectionH3>Deployment Procedure</SectionH3>
      <MiniTable
        headers={['Step', 'Command / Action', 'Expected Result']}
        rows={[
          ['1. Pull latest image', 'docker pull cpg-forecast:v2.1.0', 'Image downloaded'],
          ['2. Run DB migrations', 'python -m backend.database migrate', '0 errors, migrations applied'],
          ['3. Health check', 'curl /api/health → {"status":"ok"}', 'Green'],
          ['4. Swap traffic (blue-green)', 'nginx upstream switch via Ansible', '0 downtime'],
          ['5. Monitor for 30 min', 'Grafana dashboard: latency, error rate', 'p95 < 500ms, errors < 0.1%'],
          ['6. Rollback if needed', 'docker pull cpg-forecast:v2.0.3 → re-run steps 1–5', 'Previous version restored'],
        ]}
      />
      <SectionH3>Monitoring Setup</SectionH3>
      <MiniTable
        headers={['Signal', 'Tool', 'Threshold', 'Action']}
        rows={[
          ['API p95 latency', 'Prometheus + Grafana', '> 500ms', 'PagerDuty alert → on-call engineer'],
          ['Forecast MAPE drift', 'Custom monitor (daily)', '> 15%', 'Retraining job auto-queued'],
          ['Celery queue depth', 'Flower', '> 100 pending', 'Scale workers + alert'],
          ['DB connection pool', 'Prometheus', '> 80% utilisation', 'Alert → check query performance'],
          ['ETL pipeline failure', 'Airflow alerting', 'Any DAG failure', 'Slack alert → data team'],
        ]}
      />
      <SectionH3>Alerting Rules</SectionH3>
      <MiniTable
        headers={['Alert', 'Severity', 'Recipient', 'SLA']}
        rows={[
          ['API down (health fails)', 'P1', 'On-call + Manager', 'Acknowledge 15 min, resolve 60 min'],
          ['Forecast not generated by 08:00 Mon', 'P2', 'Demand Planning Lead', 'Acknowledge 30 min'],
          ['MAPE drift > 15%', 'P2', 'Data Science Lead', 'Investigate same day'],
          ['Stockout risk for top-20 SKUs', 'P3', 'Demand Planners', 'Review within 4 hours'],
        ]}
      />
      <SectionH3>Incident Response Playbook</SectionH3>
      <MiniTable
        headers={['Symptom', 'Likely Cause', 'Resolution']}
        rows={[
          ['Forecast not in dashboard Monday morning', 'Airflow DAG failed; feature store not refreshed', 'Check Airflow logs → restart failed task → trigger manual DAG run'],
          ['MAPE spike this week', 'Promotional event not in calendar; data quality issue', 'Check promo calendar upload; inspect actuals for anomalies; override if needed'],
          ['API 503 errors', 'DB connection pool exhausted or Redis down', 'Check DB slow query log; restart Redis; scale API pods'],
          ['Cold-start SKU MAPE > 35%', 'Analogue SKU match poor', 'Manually select analogue in UI; flag for data science review'],
        ]}
      />
      <SectionH3>Rollback Steps</SectionH3>
      <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.8 }}>
        <pre>{`# 1. Identify last known-good version
mlflow models list --name DemandForecastEnsemble --stage Production

# 2. Roll back API server
docker pull cpg-forecast:v2.0.3
docker-compose up -d --no-deps api

# 3. Reactivate previous model in registry
mlflow models transition-stage \\
  --name DemandForecastEnsemble --version 2.0.3 --stage Production

# 4. Verify health
curl https://forecast.internal/api/health

# 5. Notify stakeholders
./scripts/notify_rollback.sh "v2.1.0 → v2.0.3" "MAPE spike detected"`}</pre>
      </div>
    </div>
  );
}

function DataDictContent() {
  return (
    <div>
      <SectionH3>sales_actuals</SectionH3>
      <MiniTable
        headers={['Column', 'Type', 'Description', 'Example']}
        rows={[
          ['sku_id', 'VARCHAR(20)', 'Unique product identifier (SAP material number)', 'SKU-12345'],
          ['store_id', 'VARCHAR(10)', 'Store code (SAP plant)', 'STR-0042'],
          ['date', 'DATE', 'Transaction date (YYYY-MM-DD)', '2025-04-14'],
          ['quantity', 'DECIMAL(12,3)', 'Units sold (in base unit of measure)', '142.000'],
          ['price', 'DECIMAL(10,2)', 'Selling price per unit (GBP)', '2.50'],
          ['channel', 'VARCHAR(20)', 'Sales channel: retail/dtc/wholesale', 'retail'],
          ['loaded_at', 'TIMESTAMPTZ', 'ETL load timestamp', '2025-04-15 02:34:12+00'],
        ]}
      />
      <SectionH3>forecasts</SectionH3>
      <MiniTable
        headers={['Column', 'Type', 'Description', 'Example']}
        rows={[
          ['forecast_id', 'UUID', 'Primary key', 'a1b2c3d4-...'],
          ['sku_id', 'VARCHAR(20)', 'Product identifier (FK → sales_actuals)', 'SKU-12345'],
          ['store_id', 'VARCHAR(10)', 'Store code (FK → stores)', 'STR-0042'],
          ['forecast_date', 'DATE', 'Date the forecast is for', '2025-05-01'],
          ['run_date', 'DATE', 'Date the forecast was generated', '2025-04-14'],
          ['p10', 'DECIMAL(12,3)', '10th percentile demand (pessimistic)', '98.000'],
          ['p50', 'DECIMAL(12,3)', 'Median demand (central estimate)', '142.000'],
          ['p90', 'DECIMAL(12,3)', '90th percentile demand (optimistic)', '187.000'],
          ['model_version', 'VARCHAR(20)', 'Model version used', 'v2.1.0'],
          ['cold_start', 'BOOLEAN', 'TRUE if cold-start forecast', 'false'],
          ['planner_override', 'DECIMAL(12,3)', 'Manual override (NULL = not overridden)', 'NULL'],
        ]}
      />
      <SectionH3>feature_store</SectionH3>
      <MiniTable
        headers={['Column', 'Type', 'Description', 'Example']}
        rows={[
          ['sku_id', 'VARCHAR(20)', 'Product identifier', 'SKU-12345'],
          ['store_id', 'VARCHAR(10)', 'Store code', 'STR-0042'],
          ['feature_date', 'DATE', 'Date the features apply to', '2025-04-14'],
          ['lag_1w', 'DECIMAL(12,3)', 'Sales quantity 1 week ago', '138.000'],
          ['lag_4w', 'DECIMAL(12,3)', 'Sales quantity 4 weeks ago', '129.500'],
          ['rolling_mean_4w', 'DECIMAL(12,3)', 'Rolling 4-week average', '135.750'],
          ['rolling_std_4w', 'DECIMAL(12,3)', 'Rolling 4-week std deviation', '8.120'],
          ['promo_flag', 'SMALLINT', '1 if promotional event active', '0'],
          ['holiday_flag', 'SMALLINT', '1 if public holiday', '0'],
          ['month_sin', 'DECIMAL(8,6)', 'Month encoded as sine wave', '0.866025'],
          ['month_cos', 'DECIMAL(8,6)', 'Month encoded as cosine wave', '0.500000'],
        ]}
      />
      <SectionH3>Glossary</SectionH3>
      <MiniTable
        headers={['Term', 'Definition']}
        rows={[
          ['MAPE', 'Mean Absolute Percentage Error — primary forecast accuracy metric'],
          ['BIAS', 'Mean forecast error — positive = over-forecast, negative = under-forecast'],
          ['FVA', 'Forecast Value Added — improvement over naïve (last-period) baseline'],
          ['Cold Start', 'Forecasting a new SKU with < 4 weeks of sales history'],
          ['P10/P50/P90', '10th, 50th, 90th percentile — bounds on forecast uncertainty'],
          ['Days Cover', 'Stock on Hand divided by daily forecast rate — stockout risk signal'],
          ['TPR', 'Temporary Price Reduction — promotional mechanic'],
          ['Fill Rate', 'Proportion of customer demand fulfilled without stockout'],
        ]}
      />
    </div>
  );
}

function SequenceContent({ process }) {
  const diagrams = processSequenceDiagrams[process?.id] || processSequenceDiagrams['__default__'];
  const [activeDiagramIdx, setActiveDiagramIdx] = useState(0);
  const diagram = diagrams[activeDiagramIdx];

  return (
    <div>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--spacing-md)' }}>
        Sequence diagrams illustrate the runtime interactions between actors and system components
        for this process. Arrows show message flow, activation, and return values.
      </p>

      {/* Diagram selector (when multiple diagrams exist) */}
      {diagrams.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
          {diagrams.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setActiveDiagramIdx(i)}
              style={{
                padding: '5px 14px',
                border: `1.5px solid ${i === activeDiagramIdx ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                background: i === activeDiagramIdx ? 'rgba(59,130,246,0.1)' : 'var(--bg-hover)',
                color: i === activeDiagramIdx ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: i === activeDiagramIdx ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {d.title}
            </button>
          ))}
        </div>
      )}

      {/* Diagram title */}
      <div style={{
        fontWeight: 700,
        fontSize: 'var(--font-size-sm)',
        color: 'var(--accent-primary)',
        marginBottom: 'var(--spacing-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span>↔️</span> {diagram.title}
      </div>

      {/* Render the diagram */}
      <div style={{
        padding: 'var(--spacing-md)',
        background: 'var(--bg-hover)',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--border-color)',
      }}>
        <SequenceDiagram
          title={diagram.title}
          actors={diagram.actors}
          messages={diagram.messages}
        />
      </div>

      {/* Actor legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--spacing-md)' }}>
        {diagram.actors.map((actor) => (
          <div key={actor.id} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: 'var(--text-secondary)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: `${actor.color}22`,
              border: `1.5px solid ${actor.color}`,
              flexShrink: 0,
            }} />
            {actor.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocSubTabContent({ activeTab, process }) {
  switch (activeTab) {
    case 'hld':      return <HLDContent />;
    case 'lld':      return <LLDContent />;
    case 'brd':      return <BRDContent />;
    case 'adr':      return <ADRContent />;
    case 'c4':       return <C4Content />;
    case 'modelcard':return <ModelCardContent />;
    case 'runbook':  return <RunbookContent />;
    case 'datadict': return <DataDictContent />;
    case 'sequence': return <SequenceContent process={process} />;
    default:         return null;
  }
}

/* =========================================================
   ORIGINAL DATA (kept for index table only)
   ========================================================= */

const DOC_TYPES = [
  { type: 'C4', icon: '🏗️', title: 'C4 Architecture Model', description: 'Context, Container, Component, and Code diagrams showing system structure at 4 levels of abstraction.' },
  { type: 'HLD', icon: '📐', title: 'High-Level Design', description: 'System overview, major components, data flows, integration points, and NFRs for this process.' },
  { type: 'LLD', icon: '📋', title: 'Low-Level Design', description: 'Detailed class diagrams, API contracts, database schema, state machines, and algorithm pseudocode.' },
  { type: 'BRD', icon: '📝', title: 'Business Requirements', description: 'Functional and non-functional requirements, acceptance criteria, stakeholder sign-offs, and use cases.' },
  { type: 'ADR', icon: '🏛️', title: 'Architecture Decision Records', description: 'Key architecture decisions with context, decision made, consequences, and alternatives considered.' },
  { type: 'API', icon: '🔌', title: 'API Documentation', description: 'REST API endpoints, request/response schemas, authentication, error codes, and Postman collection.' },
  { type: 'ML', icon: '🧠', title: 'Model Card', description: 'Model metadata, intended use, evaluation results, ethical considerations, and caveats.' },
  { type: 'OPS', icon: '⚙️', title: 'Operations Runbook', description: 'Deployment procedures, monitoring setup, alerting rules, incident response, and rollback steps.' },
];

const COMING_SOON = [
  { label: 'Test Evidence Report', eta: 'Q3 2025' },
  { label: 'Compliance Certificate', eta: 'Q3 2025' },
];

/* ---- Process Flow steps ---- */
const PROCESS_FLOW_NODES = [
  { label: 'Data Sources', icon: '🗄️', type: 'input', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)', active: true },
  { label: 'Ingestion', icon: '📥', type: 'process', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)', active: true },
  { label: 'Validation', icon: '✅', type: 'process', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.08)', active: true },
  { label: 'Feature Store', icon: '🏪', type: 'store', color: 'var(--accent-purple)', bg: 'rgba(139,92,246,0.08)', active: true },
  { label: 'Model Training', icon: '🤖', type: 'process', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)', active: true },
  { label: 'Evaluation', icon: '📊', type: 'decision', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.08)', active: false },
  { label: 'Deployment', icon: '🚀', type: 'process', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)', active: false },
  { label: 'Monitoring', icon: '📡', type: 'output', color: 'var(--accent-pink)', bg: 'rgba(236,72,153,0.08)', active: false },
];

const ANALYSIS_FLOW_NODES = [
  { label: 'Raw Data', icon: '📂', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)' },
  { label: 'EDA', icon: '🔍', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)' },
  { label: 'Cleaning', icon: '🧹', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.08)' },
  { label: 'Feature Eng.', icon: '🛠️', color: 'var(--accent-purple)', bg: 'rgba(139,92,246,0.08)' },
  { label: 'Model Select', icon: '🧠', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)' },
  { label: 'Training', icon: '🏋️', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)' },
  { label: 'Validation', icon: '📋', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.08)' },
  { label: 'Testing', icon: '🧪', color: 'var(--accent-pink)', bg: 'rgba(236,72,153,0.08)' },
  { label: 'Production', icon: '🚀', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.1)' },
];

/* ---- Inline styles for flow diagram ---- */
const flowNodeStyle = (node, isActive) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '8px 10px', borderRadius: node.type === 'decision' ? 0 : 'var(--border-radius)',
  background: isActive ? node.bg : 'var(--bg-hover)',
  border: `1px solid ${isActive ? node.color : 'var(--border-color)'}`,
  minWidth: 80, maxWidth: 90, textAlign: 'center', flexShrink: 0,
  transform: node.type === 'decision' ? 'rotate(45deg)' : 'none',
  opacity: isActive ? 1 : 0.55,
  position: 'relative',
  transition: 'all 0.2s',
});

function FlowArrow({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <div style={{
        width: 20, height: 2,
        background: active ? 'var(--accent-primary)' : 'var(--border-color)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -5, top: -3,
          width: 0, height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: `6px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        }} />
      </div>
    </div>
  );
}

function ProcessFlowDiagram() {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 700, padding: '16px 0' }}>
          {PROCESS_FLOW_NODES.map((node, idx) => {
            const isActive = node.active;
            const isHovered = hoveredIdx === idx;
            const isDiamond = node.type === 'decision';

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Node */}
                <div
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}
                >
                  {/* Diamond wrapper for decision nodes */}
                  {isDiamond ? (
                    <div style={{ position: 'relative', width: 72, height: 72 }}>
                      <div style={{
                        position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%',
                        background: isHovered ? node.bg : (isActive ? node.bg : 'var(--bg-hover)'),
                        border: `1px solid ${isActive ? node.color : 'var(--border-color)'}`,
                        transform: 'rotate(45deg)',
                        borderRadius: 4,
                        opacity: isActive ? 1 : 0.55,
                      }} />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: '1rem' }}>{node.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: node.color, textAlign: 'center', lineHeight: 1.2 }}>{node.label}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '10px 8px', borderRadius: 'var(--border-radius)',
                      background: isHovered ? node.bg : (isActive ? node.bg : 'var(--bg-hover)'),
                      border: `1.5px solid ${isActive ? node.color : 'var(--border-color)'}`,
                      minWidth: 76, maxWidth: 90, textAlign: 'center', flexShrink: 0,
                      opacity: isActive ? 1 : 0.55, gap: 3,
                      boxShadow: isHovered ? `0 0 0 3px ${node.color}22` : 'none',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{node.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? node.color : 'var(--text-muted)', lineHeight: 1.2 }}>{node.label}</span>
                    </div>
                  )}
                  {/* Status badge */}
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                    background: isActive ? node.bg : 'var(--bg-hover)',
                    color: isActive ? node.color : 'var(--text-muted)',
                    border: `1px solid ${isActive ? node.color + '44' : 'var(--border-color)'}`,
                  }}>
                    {isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>

                {/* Arrow between nodes */}
                {idx < PROCESS_FLOW_NODES.length - 1 && (
                  <FlowArrow active={isActive && PROCESS_FLOW_NODES[idx + 1].active} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
        {[
          { shape: 'rect', label: 'Process Step', color: 'var(--accent-primary)' },
          { shape: 'diamond', label: 'Decision Point', color: 'var(--accent-warning)' },
          { shape: 'rect', label: 'Active', color: 'var(--accent-success)', active: true },
          { shape: 'rect', label: 'Inactive', color: 'var(--text-muted)', faded: true },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
            <div style={{
              width: item.shape === 'diamond' ? 10 : 12, height: 10,
              background: item.faded ? 'var(--bg-hover)' : `${item.color}22`,
              border: `1px solid ${item.faded ? 'var(--border-color)' : item.color}`,
              transform: item.shape === 'diamond' ? 'rotate(45deg)' : 'none',
              borderRadius: 2, flexShrink: 0,
            }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisFlowDiagram() {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 700, padding: '12px 0' }}>
        {ANALYSIS_FLOW_NODES.map((node, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 6px', borderRadius: 'var(--border-radius)',
                background: hoveredIdx === idx ? node.bg : (idx < 3 ? node.bg : 'var(--bg-hover)'),
                border: `1.5px solid ${idx < 3 ? node.color : 'var(--border-color)'}`,
                minWidth: 70, maxWidth: 80, textAlign: 'center', flexShrink: 0, gap: 3,
                opacity: idx > 5 ? 0.7 : 1,
                boxShadow: hoveredIdx === idx ? `0 0 0 3px ${node.color}22` : 'none',
                transition: 'all 0.15s', cursor: 'default',
              }}
            >
              <span style={{ fontSize: '0.95rem' }}>{node.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: idx < 3 ? node.color : 'var(--text-secondary)', lineHeight: 1.2 }}>{node.label}</span>
            </div>
            {idx < ANALYSIS_FLOW_NODES.length - 1 && (
              <FlowArrow active={idx < 5} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProcessDocsTab({ process, dept }) {
  const [activeDocTab, setActiveDocTab] = useState('hld');

  return (
    <div>
      {/* ---- PROCESS FLOW CHART ---- */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🔄 Process Flow Chart</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>End-to-end data pipeline</span>
        </div>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.6 }}>
          The diagram below shows the full data lifecycle from raw sources through to production monitoring.
          Active steps are highlighted — hover each node for details.
        </p>
        <ProcessFlowDiagram />

        {/* Branching info */}
        <div style={{
          marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--border-radius)',
          border: '1px solid rgba(245,158,11,0.2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
        }}>
          <strong style={{ color: 'var(--accent-warning)' }}>◆ Decision — Evaluation Gate:</strong>{' '}
          If model accuracy passes threshold (MAPE &lt; 10%) → proceed to Deployment.
          Otherwise → return to Feature Store for re-engineering.
        </div>
      </div>

      {/* ---- ANALYSIS FLOW ---- */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🔬 Analysis Flow</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ML development lifecycle</span>
        </div>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.6 }}>
          Step-by-step analysis workflow from raw data ingestion through to production deployment.
          First 3 steps (Raw Data → EDA → Cleaning) are completed; remaining steps are queued.
        </p>
        <AnalysisFlowDiagram />

        {/* Stage progress */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
          {[
            { label: 'Data Preparation', steps: 'Raw Data → EDA → Cleaning', status: 'Complete', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.08)' },
            { label: 'Modelling', steps: 'Feature Eng. → Model Select → Training', status: 'In Progress', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)' },
            { label: 'Release', steps: 'Validation → Testing → Production', status: 'Upcoming', color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
          ].map((phase, i) => (
            <div key={i} style={{
              padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--border-radius)',
              background: phase.bg, border: `1px solid ${phase.color}33`,
            }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: phase.color, marginBottom: 2 }}>{phase.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{phase.steps}</div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: `${phase.color}22`, color: phase.color,
              }}>{phase.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- DOCUMENTATION SUITE — Sub-tabs ---- */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📚 Documentation Suite</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>HLD · LLD · BRD · ADR · C4 · Model Card · Runbook · Data Dictionary</span>
        </div>

        {/* Sub-tab bar */}
        <div style={{
          display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: '2px solid var(--border-color)', marginBottom: 'var(--spacing-md)',
          paddingBottom: 0,
        }}>
          {DOC_SUB_TABS.map((tab) => {
            const isActive = activeDocTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDocTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500, fontSize: 'var(--font-size-xs)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                  marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tab content */}
        <DocSubTabContent activeTab={activeDocTab} process={process} />
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🚧 Coming Soon</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          {COMING_SOON.map((item, i) => (
            <div key={i} style={{
              padding: '8px 14px', borderRadius: 'var(--border-radius)',
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: 'var(--font-size-xs)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>{item.label}</div>
              <div style={{ color: 'var(--text-muted)' }}>ETA: {item.eta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
