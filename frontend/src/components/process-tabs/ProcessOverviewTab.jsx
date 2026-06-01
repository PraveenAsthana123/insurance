import { useState, useRef } from 'react';
import '../../styles/workbench.css';
import SequenceDiagram from '../charts/SequenceDiagram';
import { processSequenceDiagrams } from '../../data/sequenceDiagrams';

const PIPELINE_STEPS = [
  {
    id: 'data-input', label: 'Data Input', icon: '📥',
    desc: 'Load raw data from source system or custom path.',
    output: 'Raw dataset loaded — {rows} rows × {cols} columns',
    richOutput: [
      { label: 'Source', value: 'data/kaggle/sales/train.csv' },
      { label: 'Rows loaded', value: '3,000,000' },
      { label: 'Columns', value: '10 (store_id, item_id, date, sales, …)' },
      { label: 'Date range', value: '2013-01-01 → 2015-10-31' },
      { label: 'File size', value: '52.4 MB' },
      { label: 'Load time', value: '1.8s' },
    ],
  },
  {
    id: 'eda', label: 'EDA', icon: '🔍',
    desc: 'Exploratory data analysis: shape, distributions, correlations.',
    output: 'EDA complete — 3 high-missing columns flagged, skewness detected',
    richOutput: [
      { label: 'Columns analysed', value: '10' },
      { label: 'Missing values', value: '3.2% (96,000 rows affected)' },
      { label: 'Outliers detected', value: '847 (IQR method)' },
      { label: 'Skewed features', value: 'sales (+2.4), promo_cost (+1.9)' },
      { label: 'Correlations >0.8', value: '3 pairs flagged (multicollinearity risk)' },
      { label: 'Seasonality', value: 'Weekly + Annual patterns confirmed' },
    ],
  },
  {
    id: 'preprocessing', label: 'Preprocessing', icon: '🧹',
    desc: 'Clean nulls, remove duplicates, fix data types.',
    output: 'Preprocessing done — 0 nulls, 0 duplicates, types validated',
    richOutput: [
      { label: 'Strategy: missing values', value: 'Median imputation (numerical), mode (categorical)' },
      { label: 'Strategy: outliers', value: 'IQR capping (1.5×)' },
      { label: 'Duplicate rows removed', value: '127' },
      { label: 'Clean rows', value: '2,987,153' },
      { label: 'Type fixes', value: 'date → datetime, store_id → category' },
      { label: 'Processing time', value: '3.2s' },
    ],
  },
  {
    id: 'feature-eng', label: 'Feature Eng.', icon: '🛠️',
    desc: 'Create lag features, rolling stats, one-hot encoding.',
    output: 'Feature engineering done — 12 new features added (33 → 45 total)',
    richOutput: [
      { label: 'Lag features', value: '7 (lag_1, lag_7, lag_14, lag_28, lag_30, lag_60, lag_90)' },
      { label: 'Rolling window features', value: '5 (mean_7d, mean_30d, std_7d, min_30d, max_30d)' },
      { label: 'Calendar features', value: '8 (day_of_week, month, quarter, is_holiday, …)' },
      { label: 'Interaction features', value: '13 (promo × lag_1, store × item, …)' },
      { label: 'Total features', value: '33 (original: 10, engineered: 23)' },
      { label: 'Time elapsed', value: '5.7s' },
    ],
  },
  {
    id: 'model-select', label: 'Model Select', icon: '🧠',
    desc: 'Auto-select best model from candidates.',
    output: 'XGBoost selected — highest CV score (0.91 AUROC)',
    richOutput: [
      { label: 'Models evaluated', value: '4 (XGBoost, LightGBM, Ridge, ARIMA)' },
      { label: 'Selection metric', value: 'MAPE (5-fold CV)' },
      { label: 'Best model', value: 'XGBoost — MAPE: 7.8%' },
      { label: 'Runner-up', value: 'LightGBM — MAPE: 8.4%' },
      { label: 'Baseline (naive)', value: 'MAPE: 22.4%' },
      { label: 'Improvement vs baseline', value: '+65.2%' },
    ],
  },
  {
    id: 'training', label: 'Training', icon: '🏋️',
    desc: 'Train selected model with tuned hyperparameters.',
    output: 'Training complete — 50 epochs, best val loss: 0.082',
    richOutput: [
      { label: 'Algorithm', value: 'XGBoost (gradient boosted trees)' },
      { label: 'Training time', value: '42.3s' },
      { label: 'Trees trained', value: '100 (n_estimators=100)' },
      { label: 'Max depth', value: '6' },
      { label: 'Best val loss', value: '0.082' },
      { label: 'MLflow run ID', value: 'abc123def456' },
    ],
  },
  {
    id: 'evaluation', label: 'Evaluation', icon: '📊',
    desc: 'Score on holdout set, generate metrics and charts.',
    output: 'Accuracy: 92.4% | F1: 0.914 | AUC: 0.963',
    richOutput: [
      { label: 'MAPE', value: '7.8%' },
      { label: 'RMSE', value: '34.2' },
      { label: 'R²', value: '0.94' },
      { label: 'Bias', value: '+0.3% (near-zero)' },
      { label: 'Accuracy (cls)', value: '92.4%' },
      { label: 'F1 / AUC', value: '0.914 / 0.963' },
    ],
  },
  {
    id: 'output', label: 'Output', icon: '📤',
    desc: 'Export predictions, push to ERP/dashboard.',
    output: 'Predictions exported to /output/predictions_v1.csv (750K rows)',
    richOutput: [
      { label: 'Forecast horizon', value: '30 days' },
      { label: 'Stores', value: '50' },
      { label: 'SKUs', value: '200' },
      { label: 'Total predictions', value: '300,000' },
      { label: 'Output file', value: '/output/predictions_2024W48_v1.csv' },
      { label: 'Dashboard', value: 'Updated — live at /forecasts/v1' },
    ],
  },
];

/* ---- User Stories by process ID ---- */
const USER_STORIES = {
  'demand-forecasting': [
    {
      role: 'Demand Planner',
      avatar: '📋',
      action: 'see next 30-day forecasts by SKU',
      benefit: 'align production schedules and avoid stockouts',
      priority: 'High',
      status: 'Done',
      criteria: ['Forecast available at SKU-level', 'Confidence bands shown (±15%)', 'Downloadable as CSV'],
    },
    {
      role: 'Supply Chain Manager',
      avatar: '🔗',
      action: 'receive alerts when forecast deviates >15% from baseline',
      benefit: 'proactively adjust inventory before disruptions occur',
      priority: 'High',
      status: 'Done',
      criteria: ['Deviation threshold configurable', 'Email + dashboard alert', 'Root cause shown'],
    },
    {
      role: 'Finance Analyst',
      avatar: '💰',
      action: 'see forecast confidence bands',
      benefit: 'plan budget ranges and set risk reserves appropriately',
      priority: 'Medium',
      status: 'In Progress',
      criteria: ['P10/P50/P90 forecasts shown', 'Financial impact estimated', 'Exportable to Excel'],
    },
    {
      role: 'Category Manager',
      avatar: '🗂️',
      action: 'filter forecasts by product category and region',
      benefit: 'make targeted assortment decisions without noise',
      priority: 'Medium',
      status: 'Planned',
      criteria: ['Category filter in UI', 'Regional view available', 'Trend annotations visible'],
    },
  ],
  'price-elasticity': [
    {
      role: 'Pricing Analyst',
      avatar: '💲',
      action: 'see price elasticity by SKU and channel',
      benefit: 'set optimal prices that maximise revenue without losing volume',
      priority: 'High',
      status: 'Done',
      criteria: ['Elasticity coefficient shown', 'Revenue impact simulated', 'Competitor price factored in'],
    },
    {
      role: 'Trade Marketing Manager',
      avatar: '📣',
      action: 'simulate "what-if" price scenarios',
      benefit: 'evaluate promo ROI before committing budget',
      priority: 'High',
      status: 'Done',
      criteria: ['Scenario builder available', 'Volume & margin impact shown', 'Comparison table exported'],
    },
    {
      role: 'Sales Director',
      avatar: '🏆',
      action: 'see cross-elasticity between competing SKUs',
      benefit: 'prevent cannibalisation when changing prices',
      priority: 'Medium',
      status: 'In Progress',
      criteria: ['Substitution matrix visible', 'Alert when cross-elasticity > 0.8', 'Historical validation provided'],
    },
  ],
  'inventory-optimization': [
    {
      role: 'Inventory Planner',
      avatar: '📦',
      action: 'receive automated reorder recommendations',
      benefit: 'reduce manual planning time and prevent stock-outs',
      priority: 'High',
      status: 'Done',
      criteria: ['Recommendations auto-generated daily', 'ERP integration complete', 'Override capability present'],
    },
    {
      role: 'Warehouse Manager',
      avatar: '🏭',
      action: 'see safety stock levels per SKU',
      benefit: 'optimise storage utilisation without service level risk',
      priority: 'High',
      status: 'Done',
      criteria: ['Safety stock shown per location', 'Service level trade-off visible', 'Seasonal adjustments included'],
    },
    {
      role: 'CFO',
      avatar: '💼',
      action: 'view working capital impact of inventory decisions',
      benefit: 'balance cash flow with service level targets',
      priority: 'Medium',
      status: 'Planned',
      criteria: ['Cash impact quantified', 'Scenario comparison available', 'Board-ready export format'],
    },
  ],
  '__default__': [
    {
      role: 'Business Analyst',
      avatar: '📊',
      action: 'view real-time model outputs in a dashboard',
      benefit: 'make faster, data-driven decisions without waiting for reports',
      priority: 'High',
      status: 'Done',
      criteria: ['Dashboard refreshes every 15 min', 'KPIs highlighted', 'Alert on anomaly detected'],
    },
    {
      role: 'Operations Manager',
      avatar: '⚙️',
      action: 'trigger manual pipeline re-runs when needed',
      benefit: 'ensure data quality and timely outputs during incidents',
      priority: 'High',
      status: 'Done',
      criteria: ['One-click pipeline restart', 'Run log captured', 'Failure notification sent'],
    },
    {
      role: 'Data Engineer',
      avatar: '🔧',
      action: 'monitor data pipeline health via metrics',
      benefit: 'detect and fix ingestion failures before they impact models',
      priority: 'Medium',
      status: 'In Progress',
      criteria: ['Row count checks automated', 'Schema drift alerts enabled', 'SLA dashboard created'],
    },
    {
      role: 'Executive Sponsor',
      avatar: '🎯',
      action: 'see ROI and performance summaries monthly',
      benefit: 'validate AI investment and prioritise next initiatives',
      priority: 'Low',
      status: 'Planned',
      criteria: ['Monthly PDF report auto-sent', 'Trend vs baseline shown', 'Cost savings quantified'],
    },
  ],
};

/* ---- Demo Scenarios by process ID ---- */
const DEMO_SCENARIOS = {
  'demand-forecasting': {
    title: 'Predict next 30 days demand and explain it',
    steps: [
      { icon: '📂', label: 'Load Kaggle Data', desc: 'Import retail sales dataset — 500K rows, 12 columns', status: 'completed' },
      { icon: '🔍', label: 'Run EDA', desc: 'Show distributions, seasonality, missing values heatmap', status: 'completed' },
      { icon: '🧹', label: 'Preprocess', desc: 'Handle missing values, encode promotions, scale features', status: 'completed' },
      { icon: '🤖', label: 'Train XGBoost', desc: 'Show training metrics: RMSE=142, MAPE=6.2%, R²=0.94', status: 'current' },
      { icon: '📈', label: 'Generate Forecast', desc: 'Plot 30-day forecast with confidence bands per SKU', status: 'upcoming' },
      { icon: '💬', label: 'RAG Explain', desc: 'LLM explains: "Spike driven by promotions + seasonality"', status: 'upcoming' },
      { icon: '📄', label: 'Export Report', desc: 'Download PDF with metrics, charts, and interpretation', status: 'upcoming' },
    ],
  },
  'price-elasticity': {
    title: 'Estimate price elasticity and simulate price change',
    steps: [
      { icon: '📂', label: 'Load Price Data', desc: 'Import historical pricing and volume data per SKU', status: 'completed' },
      { icon: '🔍', label: 'EDA & Correlation', desc: 'Analyse price-volume relationship and competitor impact', status: 'completed' },
      { icon: '🧹', label: 'Feature Engineering', desc: 'Create lag prices, promo flags, cross-elasticity terms', status: 'current' },
      { icon: '🤖', label: 'Fit Ridge Model', desc: 'Show elasticity coefficients per SKU: avg -1.4', status: 'upcoming' },
      { icon: '💡', label: 'Scenario Builder', desc: 'Simulate +5% price → volume impact, revenue change', status: 'upcoming' },
      { icon: '💬', label: 'AI Recommendation', desc: 'LLM recommends optimal price point per category', status: 'upcoming' },
      { icon: '📄', label: 'Export Playbook', desc: 'Download pricing playbook as PDF with all scenarios', status: 'upcoming' },
    ],
  },
  '__default__': {
    title: 'Run end-to-end AI pipeline and generate insights',
    steps: [
      { icon: '📂', label: 'Load Data', desc: 'Ingest data from source system — preview sample rows', status: 'completed' },
      { icon: '🔍', label: 'Run EDA', desc: 'Explore distributions, correlations, and data quality', status: 'completed' },
      { icon: '🧹', label: 'Preprocess', desc: 'Clean, validate, and engineer features for modelling', status: 'current' },
      { icon: '🤖', label: 'Train Model', desc: 'Fit best-selected algorithm — show training metrics', status: 'upcoming' },
      { icon: '📈', label: 'Generate Output', desc: 'Produce predictions or recommendations with charts', status: 'upcoming' },
      { icon: '💬', label: 'RAG Explain', desc: 'Language model explains results in business terms', status: 'upcoming' },
      { icon: '📄', label: 'Export Report', desc: 'Download full report: metrics, charts, interpretation', status: 'upcoming' },
    ],
  },
};

function fmt(d) {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const PRIORITY_COLORS = {
  High: { bg: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', border: 'rgba(239,68,68,0.2)' },
  Medium: { bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-warning)', border: 'rgba(245,158,11,0.2)' },
  Low: { bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', border: 'rgba(16,185,129,0.2)' },
};

const STATUS_COLORS = {
  Done: { bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)' },
  'In Progress': { bg: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' },
  Planned: { bg: 'var(--bg-hover)', color: 'var(--text-muted)' },
};

const STEP_STATUS_STYLES = {
  completed: { color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.1)', dot: 'var(--accent-success)', label: '✓ Done' },
  current: { color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.08)', dot: 'var(--accent-primary)', label: '▶ Current' },
  upcoming: { color: 'var(--text-muted)', bg: 'var(--bg-hover)', dot: 'var(--border-color)', label: '○ Next' },
};

/* ---- Interactive Demo Scenario Runner ---- */
function DemoScenarioRunner({ scenario }) {
  const [doneStep, setDoneStep] = useState(0);
  const [runningStep, setRunningStep] = useState(null);
  const [runningAll, setRunningAll] = useState(false);

  async function runStep(idx) {
    setRunningStep(idx);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
    setDoneStep(idx + 1);
    setRunningStep(null);
  }

  async function runAllSteps() {
    setRunningAll(true);
    setDoneStep(0);
    for (let i = 0; i < scenario.steps.length; i++) {
      setRunningStep(i);
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
      setDoneStep(i + 1);
      setRunningStep(null);
    }
    setRunningAll(false);
  }

  return (
    <div className="content-section">
      <div className="content-section-header">
        <span className="content-section-title">🎬 Demo Scenario</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          "{scenario.title}"
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
        <button onClick={runAllSteps} disabled={runningAll}
          style={{ padding: '6px 16px', border: 'none', borderRadius: 'var(--border-radius-sm)', background: 'var(--accent-primary)', color: '#fff', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' }}>
          {runningAll ? '⏳ Running All...' : '▶ Run All Steps'}
        </button>
        <button onClick={() => { setDoneStep(0); setRunningStep(null); }}
          style={{ padding: '6px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
          🔄 Reset
        </button>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {doneStep}/{scenario.steps.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, marginBottom: 'var(--spacing-md)', overflow: 'hidden' }}>
        <div style={{ width: `${(doneStep / scenario.steps.length) * 100}%`, height: '100%', background: 'var(--accent-success)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {scenario.steps.map((step, idx) => {
          const isComplete = idx < doneStep;
          const isRunning = runningStep === idx;
          const canRun = !runningAll && !isRunning && idx === doneStep;
          return (
            <div key={idx} style={{
              borderRadius: 'var(--border-radius)',
              background: isComplete ? 'rgba(16,185,129,0.07)' : isRunning ? 'rgba(59,130,246,0.08)' : 'var(--bg-hover)',
              border: `1px solid ${isComplete ? 'rgba(16,185,129,0.25)' : isRunning ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
              overflow: 'hidden', transition: 'all 0.3s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '10px 14px' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isComplete ? 'var(--accent-success)' : isRunning ? 'var(--accent-primary)' : 'var(--border-color)',
                  color: isComplete || isRunning ? '#fff' : 'var(--text-muted)', fontWeight: 800, fontSize: 12,
                }}>
                  {isComplete ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: 18 }}>{step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: isComplete ? 'var(--accent-success)' : isRunning ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{step.desc}</div>
                </div>
                {canRun && (
                  <button onClick={() => runStep(idx)} style={{
                    padding: '5px 14px', border: 'none', borderRadius: 'var(--border-radius-sm)',
                    background: 'var(--accent-primary)', color: '#fff', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}>▶ Run</button>
                )}
                {isRunning && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)', fontWeight: 600 }}>⏳ Running...</span>}
                {isComplete && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 600 }}>✓ Done</span>}
                {!canRun && !isRunning && !isComplete && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>○ Pending</span>}
              </div>

              {/* Expanded output */}
              {isComplete && (
                <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: 4 }}>📥 INPUT</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {step.desc.split('—')[0] || 'Process input data'}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.05em', marginBottom: 4 }}>⚙️ PROCESS</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Duration: {(0.5 + Math.random() * 3).toFixed(1)}s</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-success)', letterSpacing: '0.05em', marginBottom: 4 }}>📤 OUTPUT</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {step.desc.split('—')[1] || 'Step completed successfully'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--accent-success)', marginTop: 4 }}>Status: ✓ Complete</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Report generation */}
      {doneStep === scenario.steps.length && (
        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--border-radius)' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-success)', marginBottom: 6 }}>🎉 Demo Complete — All {scenario.steps.length} steps passed</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Full pipeline executed successfully. Report ready for download.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '5px 14px', border: 'none', borderRadius: 4, background: 'var(--accent-success)', color: '#fff', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' }}>
              📄 Download Report (PDF)
            </button>
            <button style={{ padding: '5px 14px', border: 'none', borderRadius: 4, background: 'var(--accent-primary)', color: '#fff', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' }}>
              📊 Export Metrics (CSV)
            </button>
            <button style={{ padding: '5px 14px', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
              🔗 Share Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProcessOverviewTab({ process, dept }) {
  const [stepStates, setStepStates] = useState(() => Object.fromEntries(PIPELINE_STEPS.map((s) => [s.id, 'pending'])));
  const [expandedStep, setExpandedStep] = useState(null);
  const [txLog, setTxLog] = useState([]);
  const [runningAll, setRunningAll] = useState(false);
  const runAllRef = useRef(false);

  function addLog(step, msg, type = 'info') {
    setTxLog((prev) => [...prev, { time: fmt(new Date()), step, msg, type }]);
  }

  async function runStep(stepId) {
    const step = PIPELINE_STEPS.find((s) => s.id === stepId);
    if (!step) return;
    setStepStates((prev) => ({ ...prev, [stepId]: 'running' }));
    addLog(step.label, `Starting ${step.label}…`, 'info');
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));
    const success = Math.random() > 0.05;
    const newStatus = success ? 'complete' : 'error';
    setStepStates((prev) => ({ ...prev, [stepId]: newStatus }));
    addLog(step.label, success ? step.output : `Error in ${step.label} — check data path`, success ? 'success' : 'error');
    return success;
  }

  async function runAll() {
    if (runningAll) return;
    setRunningAll(true);
    runAllRef.current = true;
    setStepStates(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.id, 'pending'])));
    setTxLog([]);
    addLog('Pipeline', 'Starting full pipeline run…', 'info');
    for (const step of PIPELINE_STEPS) {
      if (!runAllRef.current) break;
      const ok = await runStep(step.id);
      if (!ok) { addLog('Pipeline', 'Pipeline halted due to error.', 'error'); break; }
    }
    if (runAllRef.current) addLog('Pipeline', 'All steps complete!', 'success');
    setRunningAll(false);
    runAllRef.current = false;
  }

  function resetAll() {
    runAllRef.current = false;
    setStepStates(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.id, 'pending'])));
    setTxLog([]);
    setRunningAll(false);
  }

  const completedCount = Object.values(stepStates).filter((s) => s === 'complete').length;
  const hasError = Object.values(stepStates).includes('error');

  // Resolve user stories and demo scenario for this process
  const userStories = USER_STORIES[process.id] || USER_STORIES['__default__'];
  const demoScenario = DEMO_SCENARIOS[process.id] || DEMO_SCENARIOS['__default__'];

  // Sequence diagram (first/primary for this process)
  const seqDiagrams = processSequenceDiagrams[process.id] || processSequenceDiagrams['__default__'];
  const primaryDiagram = seqDiagrams[0];
  const [seqExpanded, setSeqExpanded] = useState(false);

  return (
    <div>
      {/* Process description */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 Process Description</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {process.aiTypes.map((t) => (
              <span key={t} className={`ai-badge ai-badge-${t.toLowerCase().replace(' ', '')}`}>{t}</span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{process.description}</p>
      </div>

      {/* ---- USER STORIES ---- */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📖 User Stories</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{userStories.length} stories</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
          {userStories.map((story, i) => {
            const priStyle = PRIORITY_COLORS[story.priority] || PRIORITY_COLORS.Medium;
            const stStyle = STATUS_COLORS[story.status] || STATUS_COLORS.Planned;
            return (
              <div key={i} style={{
                padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                    }}>
                      {story.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>{story.role}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stakeholder</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: priStyle.bg, color: priStyle.color, border: `1px solid ${priStyle.border}`,
                    }}>{story.priority}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: stStyle.bg, color: stStyle.color,
                    }}>{story.status}</span>
                  </div>
                </div>

                {/* Story text */}
                <div style={{
                  padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)',
                  fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>As a </span>
                  {story.role},
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}> I want to </span>
                  {story.action},
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}> so that </span>
                  {story.benefit}.
                </div>

                {/* Acceptance criteria */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Acceptance Criteria
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'none' }}>
                    {story.criteria.map((c, ci) => (
                      <li key={ci} style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <span style={{ color: story.status === 'Done' ? 'var(--accent-success)' : 'var(--text-muted)', flexShrink: 0 }}>
                          {story.status === 'Done' ? '✓' : '○'}
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- DEMO SCENARIO (Interactive) ---- */}
      <DemoScenarioRunner scenario={demoScenario} />

      {/* Manual Pipeline Runner */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🚀 Manual Pipeline Runner</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{completedCount}/{PIPELINE_STEPS.length} steps</span>
            <button
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', padding: '5px 14px' }}
              onClick={runAll}
              disabled={runningAll}
            >
              {runningAll ? '⏳ Running…' : '▶ Run All Steps'}
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '5px 10px' }} onClick={resetAll}>Reset</button>
          </div>
        </div>

        {/* Progress bar */}
        {completedCount > 0 && (
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${(completedCount / PIPELINE_STEPS.length) * 100}%`,
                height: '100%',
                background: hasError ? 'var(--accent-danger)' : 'var(--accent-success)',
                transition: 'width 0.3s', borderRadius: 4,
              }} />
            </div>
          </div>
        )}

        {/* Pipeline visual */}
        <div className="pipeline-steps">
          {PIPELINE_STEPS.map((step, idx) => {
            const status = stepStates[step.id];
            return (
              <div key={step.id} className="pipeline-step-wrapper">
                <div
                  className={`pipeline-step status-${status}`}
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                >
                  <div className="pipeline-step-icon-wrap">
                    <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                    <div className="pipeline-step-status-dot" />
                  </div>
                  <div className="pipeline-step-label">
                    <div>{`${idx + 1}. ${step.label}`}</div>
                  </div>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className={`pipeline-connector${status === 'complete' ? ' done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded step detail */}
        {expandedStep && (() => {
          const step = PIPELINE_STEPS.find((s) => s.id === expandedStep);
          const status = stepStates[expandedStep];
          return (
            <div className={`pipeline-step-detail status-${status}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{step.icon} {step.label}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                    background: status === 'complete' ? 'rgba(16,185,129,0.1)' : status === 'running' ? 'rgba(59,130,246,0.1)' : status === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)',
                    color: status === 'complete' ? 'var(--accent-success)' : status === 'running' ? 'var(--accent-primary)' : status === 'error' ? 'var(--accent-danger)' : 'var(--text-muted)',
                  }}>
                    {status}
                  </span>
                  <button
                    className={`pipeline-run-btn ${status === 'running' ? 'running' : status === 'complete' ? 'complete' : status === 'error' ? 'error' : 'run'}`}
                    disabled={status === 'running' || runningAll}
                    onClick={() => runStep(step.id)}
                  >
                    {status === 'running' ? '⏳ Running…' : status === 'complete' ? '✓ Re-run' : status === 'error' ? '↺ Retry' : '▶ Run'}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 8 }}>{step.desc}</p>
              {status === 'complete' && (
                <div>
                  <div style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 4, fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 500, marginBottom: 8 }}>
                    ✓ {step.output}
                  </div>
                  {step.richOutput && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {step.richOutput.map((r) => (
                        <div key={r.label} style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 6 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {status === 'error' && (
                <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.06)', borderRadius: 4, fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)', fontWeight: 500 }}>
                  ✗ Error in {step.label} — check data path and logs below
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Transaction Log */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 Transaction Log</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{txLog.length} entries</span>
        </div>
        {txLog.length === 0 ? (
          <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
            No actions yet. Click "Run All Steps" or run individual steps.
          </div>
        ) : (
          <div className="tx-log">
            {txLog.map((entry, i) => (
              <div key={i} className="tx-log-entry">
                <span className="tx-log-time">{entry.time}</span>
                <span className="tx-log-step">[{entry.step}]</span>
                <span className={`tx-log-msg ${entry.type}`}>{entry.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Original Before/After */}
      <div className="before-after-grid">
        <div className="before-after-card before-card">
          <div className="before-after-header">⚠️ Before AI (Pain Points)</div>
          <div className="before-after-body">
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{process.painPoints}</p>
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 6, fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)' }}>
              {process.dataFlow.before}
            </div>
          </div>
        </div>
        <div className="before-after-card after-card">
          <div className="before-after-header">✅ After AI (Outcome)</div>
          <div className="before-after-body">
            <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>
              {process.dataFlow.after}
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>KPIs</div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{process.kpi}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Original Process Flow */}
      <div className="process-flow">
        <div className="process-flow-step">
          <div className="process-card input-step">
            <div className="process-card-label">Input</div>
            <div className="process-card-title">Data Inputs</div>
            <ul className="process-card-items">
              {process.inputs.split(',').map((inp, i) => (
                <li key={i}>{inp.trim()}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="process-flow-step">
          <div className="process-card process-step">
            <div className="process-card-label">Process</div>
            <div className="process-card-title">AI Processing</div>
            <ul className="process-card-items">
              {process.dataFlow.process.split('→').map((step, i) => (
                <li key={i}>{step.trim()}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="process-flow-step">
          <div className="process-card output-step">
            <div className="process-card-label">Output</div>
            <div className="process-card-title">Outputs</div>
            <ul className="process-card-items">
              {process.outputs.split(',').map((out, i) => (
                <li key={i}>{out.trim()}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ---- SEQUENCE DIAGRAM (collapsible) ---- */}
      <div className="content-section">
        {/* Clickable header */}
        <button
          onClick={() => setSeqExpanded((v) => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <span className="content-section-title">↔️ View Sequence Diagram</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {primaryDiagram.title}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--accent-primary)',
              transform: seqExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>▼</span>
          </div>
        </button>

        {seqExpanded && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <div style={{
              padding: 'var(--spacing-md)',
              background: 'var(--bg-hover)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--border-color)',
            }}>
              <SequenceDiagram
                title={primaryDiagram.title}
                actors={primaryDiagram.actors}
                messages={primaryDiagram.messages}
              />
            </div>

            {/* Actor colour legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {primaryDiagram.actors.map((actor) => (
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

            {seqDiagrams.length > 1 && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 10 }}>
                {seqDiagrams.length - 1} more diagram{seqDiagrams.length > 2 ? 's' : ''} available in the Documentation tab → Sequence Diagrams.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
