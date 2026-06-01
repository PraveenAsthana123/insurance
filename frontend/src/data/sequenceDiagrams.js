/**
 * sequenceDiagrams.js
 *
 * Keyed by process ID.  Each key maps to an array of diagram objects so that
 * multiple diagrams per process can be listed in a dropdown/tab switcher.
 *
 * Diagram schema:
 *   { id, title, actors: [{id, label, color}], messages: [{from, to, label, type, note?}] }
 *
 * Message types: 'sync' | 'async' | 'return' | 'self'
 */

export const processSequenceDiagrams = {

  /* ================================================================
     DEMAND FORECASTING — 3 diagrams
     ================================================================ */
  'demand-forecasting': [
    {
      id: 'e2e-forecast',
      title: 'E2E Demand Forecast Flow',
      actors: [
        { id: 'user',    label: 'User',         color: '#3b82f6' },
        { id: 'fe',      label: 'Frontend',     color: '#8b5cf6' },
        { id: 'api',     label: 'API',          color: '#10b981' },
        { id: 'celery',  label: 'Celery Worker',color: '#f59e0b' },
        { id: 'mlflow',  label: 'MLflow',       color: '#ef4444' },
        { id: 'pg',      label: 'PostgreSQL',   color: '#06b6d4' },
        { id: 'redis',   label: 'Redis',        color: '#ec4899' },
      ],
      messages: [
        { from: 'user',   to: 'fe',     label: 'Request forecast',           type: 'sync'   },
        { from: 'fe',     to: 'api',    label: 'POST /api/v1/models (train)', type: 'sync'   },
        { from: 'api',    to: 'pg',     label: 'Create job record',           type: 'sync'   },
        { from: 'api',    to: 'redis',  label: 'Queue Celery task',           type: 'async'  },
        { from: 'api',    to: 'fe',     label: 'Return job_id',               type: 'return' },
        { from: 'fe',     to: 'fe',     label: 'Poll job status',             type: 'self'   },
        { from: 'redis',  to: 'celery', label: 'Dispatch training task',      type: 'async'  },
        { from: 'celery', to: 'pg',     label: 'Load training data',          type: 'sync'   },
        { from: 'pg',     to: 'celery', label: 'Return dataset',              type: 'return' },
        { from: 'celery', to: 'celery', label: 'Feature engineering',         type: 'self'   },
        { from: 'celery', to: 'celery', label: 'Train XGBoost model',         type: 'self'   },
        { from: 'celery', to: 'mlflow', label: 'Log model + metrics',         type: 'sync'   },
        { from: 'mlflow', to: 'celery', label: 'Return run_id',               type: 'return' },
        { from: 'celery', to: 'pg',     label: 'Update job status = complete',type: 'sync'   },
        { from: 'celery', to: 'redis',  label: 'Cache predictions',           type: 'async'  },
        { from: 'fe',     to: 'api',    label: 'GET /api/v1/jobs/{id}',       type: 'sync'   },
        { from: 'api',    to: 'pg',     label: 'Fetch job result',            type: 'sync'   },
        { from: 'api',    to: 'fe',     label: 'Return predictions + metrics',type: 'return' },
        { from: 'fe',     to: 'user',   label: 'Display forecast chart',      type: 'return' },
      ],
    },

    {
      id: 'rag-explanation',
      title: 'RAG Explanation Flow',
      actors: [
        { id: 'user',    label: 'User',     color: '#3b82f6' },
        { id: 'fe',      label: 'Frontend', color: '#8b5cf6' },
        { id: 'api',     label: 'API',      color: '#10b981' },
        { id: 'ollama',  label: 'Ollama',   color: '#ef4444' },
        { id: 'chroma',  label: 'ChromaDB', color: '#f59e0b' },
        { id: 'redis',   label: 'Redis',    color: '#ec4899' },
      ],
      messages: [
        { from: 'user',   to: 'fe',     label: 'Ask: Why did demand spike?',      type: 'sync'   },
        { from: 'fe',     to: 'api',    label: 'POST /api/v1/chat',               type: 'sync'   },
        { from: 'api',    to: 'redis',  label: 'Check cache',                     type: 'sync'   },
        { from: 'redis',  to: 'api',    label: 'Cache miss',                      type: 'return' },
        { from: 'api',    to: 'api',    label: 'Expand query',                    type: 'self'   },
        { from: 'api',    to: 'chroma', label: 'Vector search (top 5 chunks)',    type: 'sync'   },
        { from: 'chroma', to: 'api',    label: 'Return relevant docs',            type: 'return' },
        { from: 'api',    to: 'api',    label: 'Rerank + assemble context',       type: 'self'   },
        { from: 'api',    to: 'ollama', label: 'Generate response (ctx + query)', type: 'async'  },
        { from: 'ollama', to: 'api',    label: 'Return explanation',              type: 'return' },
        { from: 'api',    to: 'redis',  label: 'Cache response',                  type: 'async'  },
        { from: 'api',    to: 'fe',     label: 'Return answer + sources',         type: 'return' },
        { from: 'fe',     to: 'user',   label: 'Display explanation + RAG details',type: 'return'},
      ],
    },

    {
      id: 'etl-pipeline',
      title: 'Data Pipeline (ETL) Flow',
      actors: [
        { id: 'sched',   label: 'Scheduler',    color: '#3b82f6' },
        { id: 'etl',     label: 'ETL Worker',   color: '#f59e0b' },
        { id: 'minio',   label: 'MinIO',        color: '#10b981' },
        { id: 'pg',      label: 'PostgreSQL',   color: '#06b6d4' },
        { id: 'fstore',  label: 'Feature Store',color: '#8b5cf6' },
        { id: 'mlflow',  label: 'MLflow',       color: '#ef4444' },
      ],
      messages: [
        { from: 'sched',  to: 'etl',    label: 'Trigger daily pipeline (cron)',   type: 'async'  },
        { from: 'etl',    to: 'minio',  label: 'Read raw CSV (Bronze)',           type: 'sync'   },
        { from: 'minio',  to: 'etl',    label: 'Return raw data',                type: 'return' },
        { from: 'etl',    to: 'etl',    label: 'Validate + clean (→ Silver)',     type: 'self'   },
        { from: 'etl',    to: 'pg',     label: 'Write cleaned data',             type: 'sync'   },
        { from: 'etl',    to: 'etl',    label: 'Aggregate + features (→ Gold)',  type: 'self'   },
        { from: 'etl',    to: 'fstore', label: 'Write feature vectors',          type: 'sync'   },
        { from: 'etl',    to: 'mlflow', label: 'Log data quality metrics',       type: 'sync'   },
        { from: 'fstore', to: 'mlflow', label: 'Feature version registered',     type: 'async'  },
        { from: 'etl',    to: 'sched',  label: 'Pipeline complete (4.2 min)',     type: 'return', note: 'SLA met' },
      ],
    },
  ],

  /* ================================================================
     INVENTORY OPTIMIZATION — 1 diagram
     ================================================================ */
  'inventory-optimization': [
    {
      id: 'reorder-automation',
      title: 'Reorder Point Automation',
      actors: [
        { id: 'wms',      label: 'WMS',       color: '#3b82f6' },
        { id: 'api',      label: 'API',       color: '#10b981' },
        { id: 'ml',       label: 'ML Model',  color: '#8b5cf6' },
        { id: 'pg',       label: 'PostgreSQL',color: '#06b6d4' },
        { id: 'planner',  label: 'Planner',   color: '#f59e0b' },
        { id: 'erp',      label: 'ERP',       color: '#ef4444' },
      ],
      messages: [
        { from: 'wms',     to: 'api',     label: 'Stock level update (real-time)',    type: 'async'  },
        { from: 'api',     to: 'pg',      label: 'Update inventory table',           type: 'sync'   },
        { from: 'api',     to: 'ml',      label: 'Check reorder threshold',          type: 'sync'   },
        { from: 'ml',      to: 'pg',      label: 'Fetch demand forecast',            type: 'sync'   },
        { from: 'ml',      to: 'ml',      label: 'Calculate safety stock + ROP',     type: 'self'   },
        { from: 'ml',      to: 'api',     label: 'Reorder alert (SKU below ROP)',    type: 'return' },
        { from: 'api',     to: 'planner', label: 'Notification: 12 SKUs need reorder',type: 'async' },
        { from: 'planner', to: 'api',     label: 'Approve reorder for 10 SKUs',      type: 'sync'   },
        { from: 'api',     to: 'erp',     label: 'Create purchase orders',           type: 'sync'   },
        { from: 'erp',     to: 'api',     label: 'PO confirmation',                  type: 'return' },
        { from: 'api',     to: 'pg',      label: 'Log reorder event',                type: 'sync'   },
        { from: 'api',     to: 'planner', label: 'PO created successfully',          type: 'return' },
      ],
    },
  ],

  /* ================================================================
     DEFECT DETECTION — 1 diagram
     ================================================================ */
  'defect-detection': [
    {
      id: 'image-defect',
      title: 'Image-Based Defect Detection',
      actors: [
        { id: 'cam',     label: 'Camera',         color: '#3b82f6' },
        { id: 'edge',    label: 'Edge Device',    color: '#f59e0b' },
        { id: 'api',     label: 'API',            color: '#10b981' },
        { id: 'cnn',     label: 'CNN Model',      color: '#8b5cf6' },
        { id: 'pg',      label: 'PostgreSQL',     color: '#06b6d4' },
        { id: 'qm',      label: 'Quality Mgr',   color: '#ef4444' },
      ],
      messages: [
        { from: 'cam',  to: 'edge', label: 'Capture product image',         type: 'sync'   },
        { from: 'edge', to: 'edge', label: 'Preprocess (resize, normalize)',type: 'self'   },
        { from: 'edge', to: 'api',  label: 'POST /detect (image bytes)',    type: 'sync'   },
        { from: 'api',  to: 'cnn',  label: 'Run inference (ResNet-50)',     type: 'sync'   },
        { from: 'cnn',  to: 'cnn',  label: 'Classify: OK / Defect',        type: 'self'   },
        { from: 'cnn',  to: 'api',  label: 'Result: Defect (94.2%)',        type: 'return', note: 'confidence' },
        { from: 'api',  to: 'pg',   label: 'Log detection event',          type: 'sync'   },
        { from: 'api',  to: 'qm',   label: 'Alert: defect on Line 3',      type: 'async'  },
        { from: 'qm',   to: 'api',  label: 'Confirm: reject batch',        type: 'sync'   },
        { from: 'api',  to: 'pg',   label: 'Update batch status = rejected',type: 'sync'  },
      ],
    },
  ],

  /* ================================================================
     DEFAULT — shown for any process without a specific diagram
     ================================================================ */
  '__default__': [
    {
      id: 'generic-pipeline',
      title: 'Generic AI Pipeline Flow',
      actors: [
        { id: 'user',    label: 'User',       color: '#3b82f6' },
        { id: 'fe',      label: 'Frontend',   color: '#8b5cf6' },
        { id: 'api',     label: 'API',        color: '#10b981' },
        { id: 'worker',  label: 'ML Worker',  color: '#f59e0b' },
        { id: 'db',      label: 'Database',   color: '#06b6d4' },
      ],
      messages: [
        { from: 'user',   to: 'fe',     label: 'Initiate pipeline run',         type: 'sync'   },
        { from: 'fe',     to: 'api',    label: 'POST /api/v1/jobs',             type: 'sync'   },
        { from: 'api',    to: 'db',     label: 'Create job record',             type: 'sync'   },
        { from: 'api',    to: 'worker', label: 'Dispatch ML task',              type: 'async'  },
        { from: 'api',    to: 'fe',     label: 'Return job_id',                 type: 'return' },
        { from: 'fe',     to: 'fe',     label: 'Poll status',                   type: 'self'   },
        { from: 'worker', to: 'db',     label: 'Fetch training data',           type: 'sync'   },
        { from: 'worker', to: 'worker', label: 'Preprocess + feature engineer', type: 'self'   },
        { from: 'worker', to: 'worker', label: 'Train model',                   type: 'self'   },
        { from: 'worker', to: 'db',     label: 'Save results + metrics',        type: 'sync'   },
        { from: 'fe',     to: 'api',    label: 'GET /api/v1/jobs/{id}',         type: 'sync'   },
        { from: 'api',    to: 'db',     label: 'Fetch job result',              type: 'sync'   },
        { from: 'api',    to: 'fe',     label: 'Return results',                type: 'return' },
        { from: 'fe',     to: 'user',   label: 'Display results',               type: 'return' },
      ],
    },
  ],
};
