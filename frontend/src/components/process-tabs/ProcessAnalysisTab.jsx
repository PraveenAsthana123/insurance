import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ── Statistical Data ── */
const DESCRIPTIVE_STATS = [
  { feature: 'sales_qty',     mean: 142.3, median: 118.0, mode: 100.0, variance: 8741.2, std: 93.5,  skewness: 1.42,  kurtosis: 4.21 },
  { feature: 'price',         mean: 24.87, median: 22.50, mode: 19.99, variance: 182.4,  std: 13.5,  skewness: 0.78,  kurtosis: 3.12 },
  { feature: 'discount_pct',  mean: 12.4,  median: 10.0,  mode: 10.0,  variance: 94.3,   std: 9.71,  skewness: 0.55,  kurtosis: 2.89 },
  { feature: 'promo_spend',   mean: 3240.0, median: 2800.0, mode: 2000.0, variance: 3812000, std: 1952.4, skewness: 1.88, kurtosis: 6.14 },
  { feature: 'stock_level',   mean: 845.0, median: 720.0, mode: 600.0, variance: 214320, std: 463.0, skewness: 0.92,  kurtosis: 3.67 },
];

const HYPOTHESIS_TESTS = [
  { test: 't-test (price vs sales)', h0: 'No mean difference', h1: 'Significant difference', pValue: 0.0012, result: 'Reject H0', conclusion: 'Price has significant effect on sales' },
  { test: 'Chi-Square (promo × region)', h0: 'Promo & region are independent', h1: 'Not independent', pValue: 0.0034, result: 'Reject H0', conclusion: 'Promo performance varies by region' },
  { test: 'ANOVA (category sales)', h0: 'Category means are equal', h1: 'At least one differs', pValue: 0.0001, result: 'Reject H0', conclusion: 'Category significantly impacts sales' },
  { test: 'Shapiro-Wilk (sales_qty)', h0: 'Data is normally distributed', h1: 'Not normal', pValue: 0.023, result: 'Reject H0', conclusion: 'Sales qty is right-skewed — use log transform' },
  { test: 'Kolmogorov-Smirnov', h0: 'Identical distributions', h1: 'Different distributions', pValue: 0.041, result: 'Reject H0', conclusion: 'Train/test distribution slightly differs' },
];

const CORRELATION_FEATURES = ['sales_qty', 'price', 'discount', 'promo_spend', 'stock_level'];
const CORR_MATRIX = [
  [1.00,  -0.67,  0.34,  0.58,  0.21],
  [-0.67,  1.00, -0.42, -0.31, -0.18],
  [0.34,  -0.42,  1.00,  0.47,  0.12],
  [0.58,  -0.31,  0.47,  1.00,  0.29],
  [0.21,  -0.18,  0.12,  0.29,  1.00],
];

/* ── Sensitivity Data ── */
const SENSITIVITY_DATA = [
  { feature: 'price',        sensitivity: 0.82, direction: 'negative', change: '-18.2% sales per +10% price' },
  { feature: 'promo_spend',  sensitivity: 0.71, direction: 'positive', change: '+14.3% sales per +10% spend' },
  { feature: 'discount_pct', sensitivity: 0.64, direction: 'positive', change: '+9.8% sales per +10% discount' },
  { feature: 'stock_level',  sensitivity: 0.48, direction: 'positive', change: '+6.2% sales per +10% stock' },
  { feature: 'seasonality',  sensitivity: 0.43, direction: 'positive', change: '+7.1% during peak season' },
  { feature: 'competitor_price', sensitivity: 0.38, direction: 'negative', change: '-5.4% sales per -10% comp price' },
  { feature: 'shelf_position', sensitivity: 0.31, direction: 'positive', change: '+4.7% sales at eye-level' },
  { feature: 'brand_equity', sensitivity: 0.24, direction: 'positive', change: '+3.1% per brand score point' },
];

const TORNADO_DATA = [...SENSITIVITY_DATA].sort((a, b) => b.sensitivity - a.sensitivity).slice(0, 6).map((d) => ({
  name: d.feature,
  value: d.sensitivity,
  color: d.direction === 'positive' ? '#10b981' : '#ef4444',
}));

/* ── Drift Data ── */
const PSI_DATA = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  psi: +(0.04 + Math.random() * 0.25).toFixed(3),
  threshold_warn: 0.1,
  threshold_action: 0.25,
}));

const FEATURE_DRIFT = [
  { feature: 'price',       psi: 0.043, status: 'Stable',  csi: 0.031 },
  { feature: 'sales_qty',   psi: 0.089, status: 'Stable',  csi: 0.072 },
  { feature: 'discount_pct',psi: 0.124, status: 'Warning', csi: 0.118 },
  { feature: 'promo_spend', psi: 0.198, status: 'Warning', csi: 0.187 },
  { feature: 'competitor_price', psi: 0.287, status: 'Drifted', csi: 0.261 },
  { feature: 'stock_level', psi: 0.052, status: 'Stable',  csi: 0.044 },
];

/* ── Model Versioning Data ── */
const MODEL_VERSIONS = [
  { version: 'v1.0', date: '2024-01-15', algorithm: 'Ridge Regression',  accuracy: 76.8, auc: 0.841, status: 'Retired',  notes: 'Baseline model' },
  { version: 'v1.1', date: '2024-03-02', algorithm: 'Random Forest',     accuracy: 87.6, auc: 0.928, status: 'Retired',  notes: 'Added feature engineering' },
  { version: 'v2.0', date: '2024-06-10', algorithm: 'XGBoost',           accuracy: 91.2, auc: 0.951, status: 'Retired',  notes: 'Hyperparameter tuning' },
  { version: 'v2.1', date: '2024-09-18', algorithm: 'LightGBM',          accuracy: 89.8, auc: 0.942, status: 'Testing',  notes: 'Faster inference' },
  { version: 'v3.0', date: '2025-01-05', algorithm: 'Ensemble (XGB+LGB)', accuracy: 92.4, auc: 0.963, status: 'Active',   notes: 'Champion model' },
  { version: 'v3.1', date: '2025-03-20', algorithm: 'Ensemble + LSTM',   accuracy: 93.1, auc: 0.971, status: 'Testing',  notes: 'Challenger — time-series aware' },
];

const ACCURACY_OVER_TIME = MODEL_VERSIONS.map((m) => ({ version: m.version, accuracy: m.accuracy, auc: +(m.auc * 100).toFixed(1) }));

/* ── Domain Analysis Data ── */
const FEATURE_RATIONALE = [
  { feature: 'price', rationale: 'Price elasticity is primary demand driver in CPG', source: 'IRI / Nielsen studies', impact: 'High' },
  { feature: 'promo_spend', rationale: 'Trade promotions account for 22% of total spend', source: 'Internal finance data', impact: 'High' },
  { feature: 'seasonality', rationale: 'Holiday peaks drive 35% lift in confectionery', source: 'Historical sales', impact: 'High' },
  { feature: 'competitor_price', rationale: 'Category price parity affects brand switching', source: 'POS scanner data', impact: 'Medium' },
  { feature: 'shelf_position', rationale: 'Eye-level placement increases visibility 2x', source: 'Planogram study', impact: 'Medium' },
  { feature: 'brand_equity', rationale: 'Brand trust reduces price sensitivity by 15%', source: 'Brand tracker survey', impact: 'Medium' },
];

const STATUS_COLOR = { Active: '#10b981', Testing: '#3b82f6', Retired: '#9ca3af' };
const DRIFT_COLOR = { Stable: '#10b981', Warning: '#f59e0b', Drifted: '#ef4444' };

const SUB_TABS = ['Statistical', 'Sensitivity', 'Subject Matter', 'Drift', 'Versioning'];

export default function ProcessAnalysisTab() {
  const [activeSubTab, setActiveSubTab] = useState('Statistical');
  const [driftChecked, setDriftChecked] = useState(false);

  return (
    <TabShell
      tabName="analysis"
      title="Analysis · SHAP + feature importance + counterfactual"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="feature importance · SHAP top-10 · counterfactual · per-segment drill"
      operation="read-only · wire SHAP backend (P0.4 · EU AI Act blocker)"
      accent="#dc2626"
      todos={[]}
    >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border-color)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveSubTab(t)}
            style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeSubTab === t ? 700 : 400,
              color: activeSubTab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
              marginBottom: -2, fontSize: 'var(--font-size-sm)', borderRadius: '4px 4px 0 0',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Statistical Analysis ── */}
      {activeSubTab === 'Statistical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

          {/* Descriptive Stats */}
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Descriptive Statistics</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Feature', 'Mean', 'Median', 'Mode', 'Variance', 'Std Dev', 'Skewness', 'Kurtosis'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Feature' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DESCRIPTIVE_STATS.map((row) => (
                    <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{row.feature}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.mean.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.median.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.mode.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.variance.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.std.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: Math.abs(row.skewness) > 1 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{row.skewness.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: row.kurtosis > 4 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{row.kurtosis.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Hypothesis Tests */}
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Hypothesis Testing</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Test', 'H₀', 'H₁', 'p-value', 'Result', 'Conclusion'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HYPOTHESIS_TESTS.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{row.test}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>{row.h0}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>{row.h1}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: row.pValue < 0.05 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{row.pValue}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600, background: row.result === 'Reject H0' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: row.result === 'Reject H0' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{row.result}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.conclusion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Correlation Matrix */}
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Correlation Matrix (Pearson)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px', background: 'var(--bg-hover)', borderBottom: '2px solid var(--border-color)' }}></th>
                    {CORRELATION_FEATURES.map((f) => (
                      <th key={f} style={{ padding: '6px 10px', background: 'var(--bg-hover)', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)', minWidth: 80 }}>{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CORRELATION_FEATURES.map((row, i) => (
                    <tr key={row}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-hover)', borderRight: '1px solid var(--border-color)' }}>{row}</td>
                      {CORR_MATRIX[i].map((val, j) => {
                        const abs = Math.abs(val);
                        const isStrong = abs > 0.6;
                        const isMod = abs > 0.3 && abs <= 0.6;
                        const bg = i === j ? '#e5e7eb' : isStrong ? (val > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)') : isMod ? (val > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent';
                        return (
                          <td key={j} style={{ padding: '6px 10px', textAlign: 'center', background: bg, borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
              <span style={{ color: 'var(--accent-success)' }}>■ Strong positive (&gt;0.6)</span>
              <span style={{ color: 'var(--accent-danger)' }}>■ Strong negative (&lt;-0.6)</span>
              <span style={{ color: 'var(--text-secondary)' }}>■ Diagonal = self-correlation</span>
            </div>
          </section>
        </div>
      )}

      {/* ── Sensitivity Analysis ── */}
      {activeSubTab === 'Sensitivity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>One-at-a-Time (OAT) Sensitivity Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
              Impact on model output when each feature changes by ±10% while holding others constant
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {['Feature', 'Sensitivity', 'Direction', 'Output Change'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SENSITIVITY_DATA.map((row) => (
                      <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{row.feature}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 80, height: 8, background: 'var(--bg-hover)', borderRadius: 4 }}>
                              <div style={{ width: `${row.sensitivity * 100}%`, height: '100%', background: row.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)', borderRadius: 4 }} />
                            </div>
                            <span style={{ fontWeight: 700 }}>{row.sensitivity.toFixed(2)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600, background: row.direction === 'positive' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: row.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {row.direction === 'positive' ? '↑ Positive' : '↓ Negative'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tornado Chart */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Tornado Chart — Top 6 Features</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={TORNADO_DATA} layout="vertical" margin={{ top: 4, right: 20, left: 100, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={95} />
                    <Tooltip formatter={(v) => [v.toFixed(3), 'Sensitivity Index']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {TORNADO_DATA.map((entry, i) => (
                        <rect key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Morris / Sobol */}
            <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--border-radius)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent-primary)' }}>Global Sensitivity: Morris Method + Sobol Indices</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)' }}>
                {[
                  { label: 'Morris μ* (price)', value: '0.821', desc: 'Elementary effects mean' },
                  { label: 'Morris σ (price)', value: '0.143', desc: 'Interactions measure' },
                  { label: 'Sobol S1 (price)', value: '0.412', desc: 'First-order index' },
                  { label: 'Sobol ST (price)', value: '0.497', desc: 'Total-order index' },
                ].map((m) => (
                  <div key={m.label} style={{ padding: 10, background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 'var(--font-size-base)' }}>{m.value}</div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>{m.label}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Subject Matter Analysis ── */}
      {activeSubTab === 'Subject Matter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Business Context & Domain Interpretation</h3>
            <div style={{ padding: 'var(--spacing-lg)', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--border-radius-lg)', marginBottom: 'var(--spacing-lg)' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                The model targets demand forecasting for CPG products across 450+ SKUs in 12 regions. Key business insight: price elasticity varies significantly by product category — premium brands show inelasticity (&lt;0.4) while private label products are highly elastic (&gt;1.2). Promotional response is non-linear and shows diminishing returns beyond a 25% discount threshold.
              </p>
            </div>

            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Feature Engineering Rationale</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Feature', 'Business Rationale', 'Data Source', 'Impact'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_RATIONALE.map((row) => (
                    <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{row.feature}</td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{row.rationale}</td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{row.source}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600, background: row.impact === 'High' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: row.impact === 'High' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>{row.impact}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Domain Expert Validation Checklist</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
              {[
                { check: 'Price elasticity coefficients are within expected industry range (-0.3 to -1.8)', status: true },
                { check: 'Seasonal peaks align with known holidays and trade events', status: true },
                { check: 'Promo uplift percentages match category manager expectations', status: true },
                { check: 'Regional variation coefficients validated by commercial team', status: true },
                { check: 'New product launch features approved by brand team', status: false },
                { check: 'Competitor data lag corrected (was 2 days, should be 0)', status: false },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{item.status ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: item.status ? 'var(--text-primary)' : 'var(--accent-warning)', lineHeight: 1.5 }}>{item.check}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Drift Monitoring ── */}
      {activeSubTab === 'Drift' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>PSI — Population Stability Index (12 Weeks)</h3>
              <button
                onClick={() => setDriftChecked(!driftChecked)}
                style={{
                  padding: '8px 16px', border: '1px solid var(--accent-primary)', borderRadius: 'var(--border-radius)',
                  background: driftChecked ? 'var(--accent-primary)' : 'white', color: driftChecked ? 'white' : 'var(--accent-primary)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', transition: 'all 0.15s',
                }}
              >
                {driftChecked ? '✓ Drift Check Complete' : '▶ Run Drift Check'}
              </button>
            </div>

            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PSI_DATA} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={0.1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warning (0.1)', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={0.25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Action (0.25)', fill: '#ef4444', fontSize: 10 }} />
                  <Bar dataKey="psi" fill="#3b82f6" radius={[4, 4, 0, 0]} name="PSI" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {driftChecked && (
              <div style={{ marginTop: 'var(--spacing-sm)', padding: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-success)', fontWeight: 600 }}>
                ✓ Drift check completed — 2 features flagged for review (competitor_price, promo_spend)
              </div>
            )}
          </section>

          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Feature Drift Table (PSI + CSI)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Feature', 'PSI Value', 'Drift Status', 'CSI Value', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_DRIFT.map((row) => (
                    <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{row.feature}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.psi}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 700, background: `${DRIFT_COLOR[row.status]}22`, color: DRIFT_COLOR[row.status] }}>{row.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.csi}</td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {row.status === 'Drifted' ? '⚠ Retrain required' : row.status === 'Warning' ? '👁 Monitor closely' : '✓ No action'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-lg)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              <span>🟢 Stable: PSI &lt; 0.1</span>
              <span>🟡 Warning: 0.1 ≤ PSI &lt; 0.25</span>
              <span>🔴 Drifted: PSI ≥ 0.25</span>
            </div>
          </section>
        </div>
      )}

      {/* ── Model Versioning ── */}
      {activeSubTab === 'Versioning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <section>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>Model Version History</h3>
            <div style={{ overflowX: 'auto', marginBottom: 'var(--spacing-lg)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Version', 'Date', 'Algorithm', 'Accuracy', 'AUC', 'Status', 'Notes'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODEL_VERSIONS.map((row) => (
                    <tr key={row.version} style={{ borderBottom: '1px solid var(--border-color)', background: row.status === 'Active' ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{row.version}</td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{row.date}</td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)' }}>{row.algorithm}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.accuracy}%</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.auc}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 700, background: `${STATUS_COLOR[row.status]}22`, color: STATUS_COLOR[row.status] }}>{row.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              {/* Accuracy over versions chart */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Accuracy per Model Version</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={ACCURACY_OVER_TIME} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="version" tick={{ fontSize: 11 }} />
                    <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Accuracy %" />
                    <Line type="monotone" dataKey="auc" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="AUC ×100" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* A/B Test & Retraining */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>A/B Test: Champion vs Challenger</div>
                  {[
                    { label: 'Champion (v3.0)', accuracy: 92.4, traffic: '80%', color: '#10b981' },
                    { label: 'Challenger (v3.1)', accuracy: 93.1, traffic: '20%', color: '#3b82f6' },
                  ].map((m) => (
                    <div key={m.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--font-size-xs)' }}>
                        <span style={{ fontWeight: 600, color: m.color }}>{m.label}</span>
                        <span>{m.accuracy}% acc | {m.traffic} traffic</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                        <div style={{ width: m.traffic, height: '100%', background: m.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Retraining Schedule</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
                    <div>📅 <strong>Scheduled:</strong> Monthly (1st of each month)</div>
                    <div>📊 <strong>Trigger — PSI:</strong> &gt;0.25 on 2+ features</div>
                    <div>📉 <strong>Trigger — Accuracy:</strong> Drops below 88%</div>
                    <div>📦 <strong>Registry:</strong> MLflow experiment tracking</div>
                    <div>🔄 <strong>Train/Test Split:</strong> 80% / 20% stratified</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

    </div>
    </TabShell>
  );
}
