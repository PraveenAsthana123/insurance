import { useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ReferenceLine,
} from 'recharts';
import '../../styles/workbench.css';

/* ─────────────────────────────────────────────
   PIPELINE STEPS DEFINITION
───────────────────────────────────────────── */
const PIPELINE_STEPS = [
  {
    id: 'ingest', label: 'Data Ingestion', icon: '📥',
    desc: 'Load CSV from source path, validate schema, check file integrity.',
    durationMs: 1800,
    output: [
      { label: 'Source',       value: 'data/cpg_sales/train.csv' },
      { label: 'Rows loaded',  value: '2,847,312' },
      { label: 'Columns',      value: '14 (store_id, sku, date, units, price, …)' },
      { label: 'Date range',   value: '2022-01-01 → 2025-12-31' },
      { label: 'File size',    value: '68.2 MB' },
      { label: 'Load time',    value: '1.8s' },
    ],
  },
  {
    id: 'profile', label: 'Data Profiling', icon: '🔍',
    desc: 'Run EDA — shape, dtypes, missing %, cardinality, skewness.',
    durationMs: 2200,
    output: [
      { label: 'Shape',               value: '2,847,312 rows × 14 columns' },
      { label: 'Missing values',      value: '2.8% (79,725 cells)' },
      { label: 'Duplicate rows',      value: '342 detected' },
      { label: 'Skewed features',     value: 'units (+2.9), promo_cost (+3.1)' },
      { label: 'Correlations >0.8',   value: '2 pairs flagged' },
      { label: 'Seasonality',         value: 'Weekly + Annual confirmed' },
    ],
  },
  {
    id: 'clean', label: 'Data Cleaning', icon: '🧹',
    desc: 'Impute nulls, remove duplicates, cap outliers (IQR 1.5×).',
    durationMs: 3100,
    output: [
      { label: 'Rows before',         value: '2,847,312' },
      { label: 'Duplicates removed',  value: '342' },
      { label: 'Nulls imputed',       value: '79,725 (median/mode strategy)' },
      { label: 'Outliers capped',     value: '1,241 cells' },
      { label: 'Rows after',          value: '2,846,970' },
      { label: 'Processing time',     value: '3.1s' },
    ],
  },
  {
    id: 'features', label: 'Feature Engineering', icon: '🛠️',
    desc: 'Create lag, rolling-window, calendar and interaction features.',
    durationMs: 4200,
    output: [
      { label: 'Lag features',         value: '7 (lag_1 … lag_90)' },
      { label: 'Rolling features',     value: '5 (mean_7d, mean_30d, std_7d, min/max_30d)' },
      { label: 'Calendar features',    value: '9 (DoW, month, quarter, is_holiday, …)' },
      { label: 'Interaction features', value: '11 (promo×lag1, store×sku, …)' },
      { label: 'Total features',       value: '46 (14 original + 32 engineered)' },
      { label: 'Time elapsed',         value: '4.2s' },
    ],
  },
  {
    id: 'split', label: 'Data Splitting', icon: '✂️',
    desc: 'Time-aware train / validation / test split (70 / 15 / 15).',
    durationMs: 900,
    output: [
      { label: 'Train set',     value: '1,992,879 rows (70%)' },
      { label: 'Val set',       value: '427,046 rows (15%)' },
      { label: 'Test set',      value: '427,045 rows (15%)' },
      { label: 'Split method',  value: 'Time-based (no leakage)' },
      { label: 'Train end',     value: '2024-09-01' },
      { label: 'Test start',    value: '2025-06-01' },
    ],
  },
  {
    id: 'train', label: 'Model Training', icon: '🧠',
    desc: 'Train XGBoost with early stopping on validation MAPE.',
    durationMs: 6800,
    output: [
      { label: 'Model',          value: 'XGBoost (n_estimators=500, max_depth=8)' },
      { label: 'Training time',  value: '6.8s' },
      { label: 'Best epoch',     value: '347 / 500 (early stopping)' },
      { label: 'Train MAPE',     value: '6.2%' },
      { label: 'Val MAPE',       value: '7.8%' },
      { label: 'Convergence',    value: 'Stable (no overfitting detected)' },
    ],
  },
  {
    id: 'eval', label: 'Model Evaluation', icon: '📊',
    desc: 'Compute MAPE, RMSE, R², MAE on held-out test set.',
    durationMs: 2500,
    output: [
      { label: 'MAPE',     value: '7.8%' },
      { label: 'RMSE',     value: '34.2 units' },
      { label: 'MAE',      value: '22.1 units' },
      { label: 'R²',       value: '0.941' },
      { label: 'Bias',     value: '-1.3% (slight under-forecast)' },
      { label: 'Coverage', value: '94.3% within ±20%' },
    ],
  },
  {
    id: 'hpo', label: 'Hyperparameter Tuning', icon: '⚙️',
    desc: 'Bayesian optimisation — 50 trials across key hyperparams.',
    durationMs: 8200,
    output: [
      { label: 'Method',         value: 'Bayesian Optimisation (Optuna)' },
      { label: 'Trials',         value: '50 completed' },
      { label: 'Best MAPE',      value: '7.1% (vs 7.8% baseline)' },
      { label: 'Best params',    value: 'lr=0.04, max_depth=9, subsample=0.8' },
      { label: 'Improvement',    value: '-9% relative MAPE' },
      { label: 'Search time',    value: '8.2s' },
    ],
  },
  {
    id: 'cv', label: 'Cross-Validation', icon: '🔄',
    desc: 'Time-series aware 5-fold CV — report mean ± std MAPE.',
    durationMs: 5500,
    output: [
      { label: 'Fold 1 MAPE', value: '7.4%' },
      { label: 'Fold 2 MAPE', value: '7.0%' },
      { label: 'Fold 3 MAPE', value: '7.6%' },
      { label: 'Fold 4 MAPE', value: '6.9%' },
      { label: 'Fold 5 MAPE', value: '7.2%' },
      { label: 'Mean ± Std',  value: '7.22% ± 0.27%' },
    ],
  },
  {
    id: 'registry', label: 'Model Registration', icon: '📦',
    desc: 'Log experiment to MLflow, save artifacts, tag version.',
    durationMs: 1400,
    output: [
      { label: 'Run ID',        value: 'a8c3f921e7b4d' },
      { label: 'Experiment',    value: 'cpg-demand-forecast' },
      { label: 'Artifact URI',  value: 'mlflow-artifacts:/runs/a8c3f921/artifacts' },
      { label: 'Model tag',     value: 'v2.3.1-production-candidate' },
      { label: 'Dataset hash',  value: 'sha256:d4f8a2e1…' },
      { label: 'Registered at', value: '2026-04-18T11:42:07Z' },
    ],
  },
  {
    id: 'predict', label: 'Prediction Generation', icon: '🎯',
    desc: 'Generate 30-day demand forecasts for all store-SKU pairs.',
    durationMs: 3600,
    output: [
      { label: 'Forecast horizon',   value: '30 days (2026-04-19 → 2026-05-18)' },
      { label: 'Predictions',        value: '47,280 (1,576 store-SKU pairs × 30 days)' },
      { label: 'Avg confidence',     value: '86.4%' },
      { label: 'High confidence (>90%)', value: '61.3%' },
      { label: 'Low confidence (<70%)',  value: '4.2%' },
      { label: 'Generation time',    value: '3.6s' },
    ],
  },
  {
    id: 'report', label: 'Report Generation', icon: '📄',
    desc: 'Create executive summary, accuracy report, feature importance.',
    durationMs: 2100,
    output: [
      { label: 'Sections',          value: '7 (Executive Summary, Accuracy, FI, Residuals, …)' },
      { label: 'Visualisations',    value: '12 charts generated' },
      { label: 'KPI highlights',    value: 'MAPE 7.1%, R² 0.941, FVA +18%' },
      { label: 'Recommendations',   value: '4 flagged (cold-start SKUs, holiday gaps)' },
      { label: 'Format',            value: 'PDF + JSON (machine-readable)' },
      { label: 'Generation time',   value: '2.1s' },
    ],
  },
];

/* ─────────────────────────────────────────────
   SCENARIO DEFINITIONS
───────────────────────────────────────────── */
const SCENARIOS = [
  { id: 'normal',    label: 'Normal Week',          icon: '📅', color: '#3b82f6', mapeAdj: 0,    demandMult: 1.0, desc: 'Standard demand pattern, no major disruptions.' },
  { id: 'holiday',   label: 'Holiday Rush',         icon: '🎄', color: '#ef4444', mapeAdj: 1.8,  demandMult: 3.0, desc: '3× demand spike — model requires additional promo features.' },
  { id: 'promo',     label: 'Promotion Launch',     icon: '🏷️', color: '#f59e0b', mapeAdj: 0.9,  demandMult: 2.0, desc: '40% discount drives 2× uplift. Elasticity model engaged.' },
  { id: 'supply',    label: 'Supply Disruption',    icon: '⚠️', color: '#ef4444', mapeAdj: 2.4,  demandMult: 0.5, desc: '50% supply constraint — fill-rate model switches to allocation.' },
  { id: 'newprod',   label: 'New Product',          icon: '🆕', color: '#8b5cf6', mapeAdj: 3.2,  demandMult: 0.3, desc: 'Cold start — no history. Attribute-based forecast activated.' },
  { id: 'compete',   label: 'Competitor Price War', icon: '⚔️', color: '#64748b', mapeAdj: 1.4,  demandMult: 0.8, desc: '20% competitor price cut — cross-elasticity correction applied.' },
];

/* Simulated prediction data (30 days) */
function makeSimData(demandMult) {
  return Array.from({ length: 30 }, (_, i) => {
    const base = 280 + Math.sin(i * 0.4) * 40;
    const actual = Math.round(base * demandMult + (Math.random() - 0.5) * 30);
    const predicted = Math.round(actual * (1 + (Math.random() - 0.5) * 0.16));
    return { day: `D${i + 1}`, actual, predicted };
  });
}

const FEATURE_IMPORTANCE = [
  { feature: 'lag_7',        importance: 0.214 },
  { feature: 'rolling_mean_30d', importance: 0.187 },
  { feature: 'lag_1',        importance: 0.163 },
  { feature: 'promo_flag',   importance: 0.142 },
  { feature: 'is_holiday',   importance: 0.098 },
  { feature: 'price',        importance: 0.074 },
  { feature: 'lag_28',       importance: 0.061 },
  { feature: 'month',        importance: 0.061 },
];

const RESIDUAL_DIST = [
  { bucket: '<-30', count: 42 },
  { bucket: '-20', count: 124 },
  { bucket: '-10', count: 389 },
  { bucket: '0',   count: 812 },
  { bucket: '+10', count: 421 },
  { bucket: '+20', count: 138 },
  { bucket: '>+30', count: 51 },
];

const SIM_HISTORY = [
  { run: 'SIM-024', date: '2026-04-18 09:12', scenario: 'Normal Week',       duration: '42s', accuracy: '7.1%', params: 'default' },
  { run: 'SIM-023', date: '2026-04-17 14:33', scenario: 'Holiday Rush',       duration: '44s', accuracy: '8.9%', params: 'holiday_boost=3×' },
  { run: 'SIM-022', date: '2026-04-17 11:05', scenario: 'Promotion Launch',   duration: '43s', accuracy: '8.0%', params: 'discount=40%' },
  { run: 'SIM-021', date: '2026-04-16 16:22', scenario: 'Supply Disruption',  duration: '41s', accuracy: '10.2%', params: 'supply_cut=50%' },
  { run: 'SIM-020', date: '2026-04-15 10:44', scenario: 'Normal Week',        duration: '42s', accuracy: '7.3%', params: 'price_change=+5%' },
  { run: 'SIM-019', date: '2026-04-14 15:18', scenario: 'Competitor Price War', duration: '42s', accuracy: '8.5%', params: 'competitor_cut=20%' },
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
const STATUS_ICON = { pending: '⏳', running: '⟳', complete: '✅', error: '❌' };
const STATUS_COLOR = { pending: '#94a3b8', running: '#f59e0b', complete: '#10b981', error: '#ef4444' };

export default function ProcessSimulationTab() {
  const [activeSection, setActiveSection] = useState('pipeline');
  const [stepStatuses, setStepStatuses] = useState(() => Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, 'pending'])));
  const [expandedSteps, setExpandedSteps] = useState({});
  const [simStatus, setSimStatus] = useState('Not Started'); // Not Started / Running / Paused / Complete
  const [speed, setSpeed] = useState(1);
  const [currentRunningStep, setCurrentRunningStep] = useState(null);
  const [simComplete, setSimComplete] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('normal');
  const [compareScenario, setCompareScenario] = useState('holiday');
  const [whatIfParams, setWhatIfParams] = useState({ price: 0, promo: 20, weather: 'normal', competitor: 'none', inventory: 'normal' });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const runningRef = useRef(false);
  const stepIndexRef = useRef(0);

  const scenario = SCENARIOS.find(s => s.id === selectedScenario);
  const simData = makeSimData(scenario.demandMult);

  const totalDuration = PIPELINE_STEPS.reduce((a, s) => a + s.durationMs, 0);
  const completedCount = Object.values(stepStatuses).filter(v => v === 'complete').length;

  const sections = [
    { id: 'pipeline',  label: 'E2E Pipeline' },
    { id: 'results',   label: 'Simulation Results' },
    { id: 'scenario',  label: 'Scenario Simulator' },
    { id: 'whatif',    label: 'What-If Parameters' },
    { id: 'history',   label: 'Simulation History' },
  ];

  const resetSim = useCallback(() => {
    runningRef.current = false;
    stepIndexRef.current = 0;
    setStepStatuses(Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, 'pending'])));
    setExpandedSteps({});
    setSimStatus('Not Started');
    setCurrentRunningStep(null);
    setSimComplete(false);
  }, []);

  const runStep = useCallback(async (idx) => {
    if (idx >= PIPELINE_STEPS.length || !runningRef.current) return;
    const step = PIPELINE_STEPS[idx];
    setCurrentRunningStep(step.id);
    setStepStatuses(prev => ({ ...prev, [step.id]: 'running' }));
    await new Promise(r => setTimeout(r, step.durationMs / speed));
    if (!runningRef.current) return;
    setStepStatuses(prev => ({ ...prev, [step.id]: 'complete' }));
    setExpandedSteps(prev => ({ ...prev, [step.id]: true }));
    setCurrentRunningStep(null);
    stepIndexRef.current = idx + 1;
    if (idx + 1 >= PIPELINE_STEPS.length) {
      setSimStatus('Complete');
      setSimComplete(true);
      runningRef.current = false;
    } else {
      await runStep(idx + 1);
    }
  }, [speed]);

  const handleRunFull = useCallback(() => {
    if (simStatus === 'Running') return;
    if (simComplete) resetSim();
    runningRef.current = true;
    setSimStatus('Running');
    const startIdx = stepIndexRef.current;
    runStep(startIdx);
  }, [simStatus, simComplete, resetSim, runStep]);

  const handlePause = useCallback(() => {
    runningRef.current = false;
    setSimStatus('Paused');
  }, []);

  const handleStepThrough = useCallback(() => {
    const idx = stepIndexRef.current;
    if (idx >= PIPELINE_STEPS.length) return;
    runningRef.current = true;
    setSimStatus('Running');
    const step = PIPELINE_STEPS[idx];
    setCurrentRunningStep(step.id);
    setStepStatuses(prev => ({ ...prev, [step.id]: 'running' }));
    setTimeout(() => {
      runningRef.current = false;
      setStepStatuses(prev => ({ ...prev, [step.id]: 'complete' }));
      setExpandedSteps(prev => ({ ...prev, [step.id]: true }));
      setCurrentRunningStep(null);
      stepIndexRef.current = idx + 1;
      if (idx + 1 >= PIPELINE_STEPS.length) {
        setSimStatus('Complete');
        setSimComplete(true);
      } else {
        setSimStatus('Paused');
      }
    }, step.durationMs / speed);
  }, [speed]);

  const handleSimulate = () => {
    const priceEffect = whatIfParams.price / 100;
    const promoEffect = whatIfParams.promo / 100 * 0.6;
    const weatherEffect = whatIfParams.weather === 'extreme' ? -0.12 : 0;
    const competitorEffect = whatIfParams.competitor === 'aggressive' ? -0.15 : whatIfParams.competitor === 'mild' ? -0.06 : 0;
    const inventoryEffect = whatIfParams.inventory === 'low' ? -0.10 : whatIfParams.inventory === 'high' ? 0.05 : 0;
    const demandChange = (-priceEffect * 1.2 + promoEffect + weatherEffect + competitorEffect + inventoryEffect) * 100;
    setWhatIfResult({
      demandChange: demandChange.toFixed(1),
      mapeAdj: (7.1 + Math.abs(demandChange) * 0.05).toFixed(1),
      revenueChange: (demandChange * 0.85).toFixed(1),
      riskLevel: Math.abs(demandChange) > 20 ? 'High' : Math.abs(demandChange) > 10 ? 'Medium' : 'Low',
    });
  };

  const statusColor = { 'Not Started': '#64748b', Running: '#f59e0b', Paused: '#3b82f6', Complete: '#10b981' };

  return (
    <div style={{ fontFamily: 'var(--font-family, system-ui)', color: 'var(--text-primary, #1e293b)' }}>

      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              background: activeSection === s.id ? '#3b82f6' : '#f1f5f9',
              color: activeSection === s.id ? '#fff' : '#475569', fontWeight: activeSection === s.id ? 600 : 400 }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── A. Control Panel (always visible in pipeline view) ── */}
      {activeSection === 'pipeline' && (
        <div>
          {/* Control Panel */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Simulation Control</div>
              <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                background: statusColor[simStatus] + '22', color: statusColor[simStatus] }}>
                {simStatus}
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleRunFull} disabled={simStatus === 'Running'}
                  style={{ padding: '8px 16px', background: simStatus === 'Running' ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: simStatus === 'Running' ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  ▶ Run Full Simulation
                </button>
                <button onClick={handleStepThrough} disabled={simStatus === 'Running' || simComplete}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  ⏭ Step Through
                </button>
                <button onClick={handlePause} disabled={simStatus !== 'Running'}
                  style={{ padding: '8px 16px', background: simStatus === 'Running' ? '#f59e0b' : '#e2e8f0', color: simStatus === 'Running' ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  ⏸ Pause
                </button>
                <button onClick={resetSim}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  ↺ Reset
                </button>
              </div>

              {/* Speed control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Speed</span>
                {[0.5, 1, 2, 5].map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: speed === s ? '#3b82f6' : '#e2e8f0', color: speed === s ? '#fff' : '#475569' }}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                <span>{completedCount} / {PIPELINE_STEPS.length} steps complete</span>
                <span>{Math.round(completedCount / PIPELINE_STEPS.length * 100)}%</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981)', height: '100%',
                  width: `${(completedCount / PIPELINE_STEPS.length) * 100}%`, transition: 'width 0.3s', borderRadius: 6 }} />
              </div>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PIPELINE_STEPS.map((step, idx) => {
              const status = stepStatuses[step.id];
              const expanded = expandedSteps[step.id];
              return (
                <div key={step.id} style={{ background: '#fff', border: `2px solid ${status === 'running' ? '#f59e0b' : status === 'complete' ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: status === 'running' ? '#fffbeb' : status === 'complete' ? '#f0fdf4' : '#f8fafc' }}>
                    <span style={{ fontSize: 20 }}>{step.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Step {idx + 1}: {step.label}
                        {status === 'running' && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b', fontWeight: 400 }}>Running…</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{step.desc}</div>
                    </div>
                    <span style={{ fontSize: 18 }}>{STATUS_ICON[status]}</span>
                    <span style={{ fontSize: 11, color: STATUS_COLOR[status], fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                      {status === 'complete' ? `${(step.durationMs / 1000).toFixed(1)}s` : status.toUpperCase()}
                    </span>
                    {status === 'complete' && (
                      <button onClick={() => setExpandedSteps(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                        style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#475569' }}>
                        {expanded ? '▲ Hide' : '▼ Show Output'}
                      </button>
                    )}
                  </div>
                  {expanded && status === 'complete' && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
                        {step.output.map(o => (
                          <div key={o.label} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                            <span style={{ color: '#94a3b8', minWidth: 140 }}>{o.label}:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{o.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── B. Results Dashboard ── */}
      {activeSection === 'results' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Simulation Results Dashboard</h3>

          {!simComplete && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              Run the full simulation in the E2E Pipeline tab to unlock live results. Showing sample data below.
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Duration',  value: simComplete ? '42s' : '—', color: '#3b82f6' },
              { label: 'Rows Processed',  value: '2.8M', color: '#10b981' },
              { label: 'Predictions',     value: '47,280', color: '#8b5cf6' },
              { label: 'MAPE',            value: `${(7.1 + scenario.mapeAdj).toFixed(1)}%`, color: '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Actual vs Predicted */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Actual vs Predicted (30-day Forecast)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={simData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Feature Importance */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Feature Importance</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={FEATURE_IMPORTANCE} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v.toFixed(2)} />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={v => v.toFixed(3)} />
                  <Bar dataKey="importance" name="Importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Residuals */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, gridColumn: '1 / -1' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Residual Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={RESIDUAL_DIST}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <ReferenceLine x="0" stroke="#ef4444" strokeDasharray="4 2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── C. Scenario Simulator ── */}
      {activeSection === 'scenario' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Scenario Simulator</h3>

          {/* Scenario Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {SCENARIOS.map(sc => (
              <div key={sc.id} onClick={() => setSelectedScenario(sc.id)}
                style={{ background: '#fff', border: `2px solid ${selectedScenario === sc.id ? sc.color : '#e2e8f0'}`,
                  borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'border-color 0.2s',
                  boxShadow: selectedScenario === sc.id ? `0 0 0 3px ${sc.color}22` : 'none' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{sc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: selectedScenario === sc.id ? sc.color : '#1e293b' }}>{sc.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sc.desc}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                    MAPE adj: {sc.mapeAdj > 0 ? '+' : ''}{sc.mapeAdj}%
                  </span>
                  <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                    Demand ×{sc.demandMult}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected scenario details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {scenario.icon} {scenario.label} — Forecast
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{scenario.desc}</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={simData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke={scenario.color} dot={false} strokeWidth={2} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Compare side by side */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Compare Scenarios</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <select value={compareScenario} onChange={e => setCompareScenario(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
                  {SCENARIOS.filter(s => s.id !== selectedScenario).map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>vs current</span>
              </div>
              {(() => {
                const cmpScenario = SCENARIOS.find(s => s.id === compareScenario);
                const cmpData = makeSimData(cmpScenario.demandMult);
                return (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line data={simData} type="monotone" dataKey="actual" name={scenario.label} stroke={scenario.color} dot={false} strokeWidth={2} />
                      <Line data={cmpData} type="monotone" dataKey="actual" name={cmpScenario.label} stroke={cmpScenario.color} dot={false} strokeWidth={2} strokeDasharray="5 3" />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── D. What-If Parameters ── */}
      {activeSection === 'whatif' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>What-If Parameter Simulator</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Configure Parameters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Price Change: {whatIfParams.price > 0 ? '+' : ''}{whatIfParams.price}%
                  </label>
                  <input type="range" min={-50} max={50} value={whatIfParams.price}
                    onChange={e => setWhatIfParams(p => ({ ...p, price: Number(e.target.value) }))}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                    <span>-50%</span><span>0%</span><span>+50%</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Promo Depth: {whatIfParams.promo}%
                  </label>
                  <input type="range" min={0} max={100} value={whatIfParams.promo}
                    onChange={e => setWhatIfParams(p => ({ ...p, promo: Number(e.target.value) }))}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Weather</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['normal', 'extreme'].map(w => (
                      <button key={w} onClick={() => setWhatIfParams(p => ({ ...p, weather: w }))}
                        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: whatIfParams.weather === w ? '#3b82f6' : '#e2e8f0', color: whatIfParams.weather === w ? '#fff' : '#475569' }}>
                        {w.charAt(0).toUpperCase() + w.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Competitor Action</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['none', 'mild', 'aggressive'].map(c => (
                      <button key={c} onClick={() => setWhatIfParams(p => ({ ...p, competitor: c }))}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: whatIfParams.competitor === c ? '#3b82f6' : '#e2e8f0', color: whatIfParams.competitor === c ? '#fff' : '#475569' }}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Inventory Level</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['low', 'normal', 'high'].map(inv => (
                      <button key={inv} onClick={() => setWhatIfParams(p => ({ ...p, inventory: inv }))}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: whatIfParams.inventory === inv ? '#3b82f6' : '#e2e8f0', color: whatIfParams.inventory === inv ? '#fff' : '#475569' }}>
                        {inv.charAt(0).toUpperCase() + inv.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSimulate}
                  style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Simulate Impact
                </button>
              </div>
            </div>

            {/* Results panel */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Simulation Results</div>
              {whatIfResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Demand Change', value: `${whatIfResult.demandChange > 0 ? '+' : ''}${whatIfResult.demandChange}%`,
                      color: whatIfResult.demandChange > 0 ? '#10b981' : '#ef4444' },
                    { label: 'Expected MAPE', value: `${whatIfResult.mapeAdj}%`, color: '#3b82f6' },
                    { label: 'Revenue Change', value: `${whatIfResult.revenueChange > 0 ? '+' : ''}${whatIfResult.revenueChange}%`,
                      color: whatIfResult.revenueChange > 0 ? '#10b981' : '#ef4444' },
                    { label: 'Risk Level', value: whatIfResult.riskLevel,
                      color: whatIfResult.riskLevel === 'High' ? '#ef4444' : whatIfResult.riskLevel === 'Medium' ? '#f59e0b' : '#10b981' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                  Configure parameters and click "Simulate Impact" to see results.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── E. Simulation History ── */}
      {activeSection === 'history' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Simulation History</h3>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Run #', 'Date', 'Scenario', 'Duration', 'Accuracy (MAPE)', 'Parameters', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIM_HISTORY.map((row, i) => (
                  <tr key={row.run} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#3b82f6', fontSize: 12 }}>{row.run}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.scenario}</td>
                    <td style={{ padding: '10px 14px' }}>{row.duration}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: parseFloat(row.accuracy) < 8 ? '#10b981' : '#f59e0b' }}>{row.accuracy}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{row.params}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#3b82f6', fontWeight: 600 }}>Replay</button>
                        <button style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#8b5cf6', fontWeight: 600 }}>Compare</button>
                        <button style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#10b981', fontWeight: 600 }}>Export</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
