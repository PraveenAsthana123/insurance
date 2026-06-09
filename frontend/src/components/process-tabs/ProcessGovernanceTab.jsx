import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';
import CorrectionsPanel from '../CorrectionsPanel';
import AuditPanel from '../AuditPanel';
import HITLPanel from '../HITLPanel';

/* ============================================================
   AI GOVERNANCE TAB — Deep detail for each governance area
   ============================================================ */

const GOV_SECTIONS = [
  { id: 'xai', icon: '🔍', label: 'Explainability (XAI)' },
  { id: 'interpretable', icon: '📊', label: 'Interpretable AI' },
  { id: 'responsible', icon: '⚖️', label: 'Responsible AI' },
  { id: 'compliance', icon: '📋', label: 'Compliance AI' },
  { id: 'governance', icon: '🏛️', label: 'Governance AI' },
  { id: 'debug', icon: '🐛', label: 'Debug AI' },
];

/* --- Sample SHAP feature importance --- */
function generateSHAP() {
  const features = ['promo_flag', 'price', 'day_of_week', 'lag_7', 'rolling_mean_14', 'holiday', 'store_type', 'season', 'brand', 'discount_pct'];
  return features.map((f) => ({
    name: f,
    importance: parseFloat((Math.random() * 0.3 + 0.02).toFixed(3)),
    direction: Math.random() > 0.4 ? 'positive' : 'negative',
  })).sort((a, b) => b.importance - a.importance);
}

/* --- Fairness metrics per segment --- */
function generateFairnessMetrics() {
  return [
    { segment: 'Region A', accuracy: 91.2, falsePositive: 4.1, falseNegative: 3.8, dispImpact: 0.92 },
    { segment: 'Region B', accuracy: 89.5, falsePositive: 5.3, falseNegative: 4.2, dispImpact: 0.87 },
    { segment: 'Region C', accuracy: 90.8, falsePositive: 3.9, falseNegative: 4.5, dispImpact: 0.95 },
    { segment: 'Urban', accuracy: 92.1, falsePositive: 3.2, falseNegative: 3.1, dispImpact: 0.98 },
    { segment: 'Rural', accuracy: 86.4, falsePositive: 6.8, falseNegative: 5.9, dispImpact: 0.81 },
  ];
}

/* --- Drift monitoring data --- */
function generateDriftData() {
  return Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    psi: parseFloat((Math.random() * 0.15 + 0.01).toFixed(3)),
    csi: parseFloat((Math.random() * 0.12 + 0.005).toFixed(3)),
    threshold: 0.1,
  }));
}

/* --- Radar data for governance maturity --- */
function generateMaturityRadar() {
  return [
    { area: 'Explainability', score: Math.floor(Math.random() * 20 + 75) },
    { area: 'Interpretability', score: Math.floor(Math.random() * 15 + 80) },
    { area: 'Fairness', score: Math.floor(Math.random() * 20 + 70) },
    { area: 'Compliance', score: Math.floor(Math.random() * 10 + 85) },
    { area: 'Monitoring', score: Math.floor(Math.random() * 25 + 65) },
    { area: 'Documentation', score: Math.floor(Math.random() * 15 + 78) },
  ];
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

/* ============================================================ */

export default function ProcessGovernanceTab({ process, dept }) {
  const [activeSection, setActiveSection] = useState('xai');
  const shapData = generateSHAP();
  const fairnessData = generateFairnessMetrics();
  const driftData = generateDriftData();
  const maturityData = generateMaturityRadar();

  return (
    <TabShell
      tabName="governance"
      title="AI Governance · RACI + audit + HITL + compliance"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="RACI table · audit row count · HITL queue · compliance status"
      operation="read-only · wire audit DB (P0 · SOC2 CC6.6)"
      accent="#dc2626"
      todos={[]}
    >
      <CorrectionsPanel accent="#dc2626" />
      <AuditPanel accent="#dc2626" />
      <HITLPanel accent="#d97706" />

      <div>
      {/* Governance Maturity Summary */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🏛️ AI Governance Maturity — {process.name}</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 600 }}>Score: 87/100</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={maturityData}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Maturity" dataKey="score" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="kpi-row" style={{ marginBottom: 'var(--spacing-sm)' }}>
              {[
                { label: 'Overall Score', value: '87/100', color: 'var(--accent-success)' },
                { label: 'Compliance', value: '✓ Pass', color: 'var(--accent-success)' },
                { label: 'Last Audit', value: '2025-04-01', color: 'var(--text-secondary)' },
                { label: 'Next Review', value: '2025-07-01', color: 'var(--accent-warning)' },
              ].map((k, i) => (
                <div key={i} className="kpi-mini">
                  <div className="kpi-mini-label">{k.label}</div>
                  <div className="kpi-mini-value" style={{ color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <table className="data-table" style={{ fontSize: 'var(--font-size-xs)' }}>
              <thead><tr><th>Area</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>
                {maturityData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{d.area}</td>
                    <td>{d.score}%</td>
                    <td><span style={{ color: d.score >= 80 ? 'var(--accent-success)' : d.score >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)', fontWeight: 600 }}>
                      {d.score >= 80 ? '✓ Good' : d.score >= 60 ? '⚠ Review' : '✗ Action'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)' }}>
        {GOV_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 14px', border: 'none', borderRadius: 'var(--border-radius-sm)',
              background: activeSection === s.id ? 'var(--accent-primary)' : 'transparent',
              color: activeSection === s.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--font-size-sm)', fontWeight: 500, cursor: 'pointer',
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ==================== EXPLAINABILITY (XAI) ==================== */}
      {activeSection === 'xai' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🔍 Explainability (XAI) — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              Explainable AI ensures every prediction can be traced back to its driving features. We use SHAP (SHapley Additive exPlanations)
              for global and local explanations, LIME for individual prediction explanations, and attention visualization for deep learning models.
            </p>

            {/* SHAP Feature Importance */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>SHAP Feature Importance (Global)</h4>
            <div style={{ height: 300, marginBottom: 'var(--spacing-lg)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapData} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="importance" name="SHAP Value">
                    {shapData.map((entry, i) => (
                      <Cell key={i} fill={entry.direction === 'positive' ? '#3b82f6' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* XAI Methods Table */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>XAI Methods Applied</h4>
            <table className="data-table">
              <thead><tr><th>Method</th><th>Type</th><th>Scope</th><th>Model Support</th><th>Status</th><th>Description</th></tr></thead>
              <tbody>
                {[
                  ['SHAP TreeExplainer', 'Feature Attribution', 'Global + Local', 'XGBoost, RF, LightGBM', 'Active', 'Exact Shapley values for tree models, fast computation'],
                  ['SHAP KernelSHAP', 'Feature Attribution', 'Local', 'Any model', 'Active', 'Model-agnostic SHAP for complex models, slower but universal'],
                  ['LIME', 'Local Explanation', 'Local', 'Any model', 'Active', 'Local interpretable model-agnostic explanations via perturbation'],
                  ['Partial Dependence Plot', 'Feature Effect', 'Global', 'Any model', 'Active', 'Shows marginal effect of 1-2 features on prediction'],
                  ['ICE Plot', 'Individual Effect', 'Local', 'Any model', 'Active', 'Individual Conditional Expectation — per-instance feature effect'],
                  ['Attention Visualization', 'Attention Maps', 'Local', 'LSTM, Transformer', 'Planned', 'Visualize which input timesteps the model attends to'],
                  ['Counterfactual', 'What-If', 'Local', 'Any model', 'Planned', 'Smallest feature change to flip the prediction'],
                ].map(([method, type, scope, models, status, desc], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{method}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{type}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{scope}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{models}</td>
                    <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: status === 'Active' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{status}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Local Explanation Example */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Local Explanation Example (Single Prediction)</h4>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', lineHeight: 1.8 }}>
              <strong>Prediction:</strong> Sales = 847 units (next week, Store #42, SKU-1205)<br />
              <strong>Confidence:</strong> 92% [780 — 914]<br /><br />
              <strong>Top Drivers (SHAP):</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 8 }}>
                {[
                  { feature: 'promo_flag = 1', impact: '+142 units', color: '#3b82f6' },
                  { feature: 'holiday = Christmas', impact: '+98 units', color: '#3b82f6' },
                  { feature: 'lag_7 = 720', impact: '+67 units', color: '#3b82f6' },
                  { feature: 'price = $4.99', impact: '-32 units', color: '#ef4444' },
                  { feature: 'competitor_promo = 1', impact: '-48 units', color: '#ef4444' },
                ].map((d, i) => (
                  <div key={i} style={{ padding: '6px 10px', borderRadius: 4, border: `1px solid ${d.color}20`, background: `${d.color}08`, fontSize: 'var(--font-size-xs)' }}>
                    <span style={{ fontWeight: 500 }}>{d.feature}</span>
                    <span style={{ float: 'right', color: d.color, fontWeight: 600 }}>{d.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INTERPRETABLE AI ==================== */}
      {activeSection === 'interpretable' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📊 Interpretable AI — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              Interpretability ensures stakeholders can understand <em>how</em> the model makes decisions — not just what features matter,
              but the decision logic itself. This is critical for planner trust and regulatory acceptance.
            </p>

            {/* Interpretability Levels */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Interpretability Spectrum</h4>
            <table className="data-table">
              <thead><tr><th>Level</th><th>Model Type</th><th>Examples</th><th>Interpretability</th><th>Accuracy Trade-off</th></tr></thead>
              <tbody>
                {[
                  ['Level 1: Transparent', 'Linear / Rule-based', 'Linear Regression, Decision Rules', 'Full — coefficients readable', 'Lower accuracy'],
                  ['Level 2: Decomposable', 'Tree-based', 'Decision Tree, Short RF', 'High — decision paths traceable', 'Moderate accuracy'],
                  ['Level 3: Semi-interpretable', 'Ensemble', 'XGBoost, LightGBM, Random Forest', 'Medium — feature importance available', 'Good accuracy'],
                  ['Level 4: Black-box + XAI', 'Deep Learning', 'LSTM, Transformer, CNN', 'Low — requires SHAP/LIME post-hoc', 'Highest accuracy'],
                ].map(([level, type, examples, interp, tradeoff], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{level}</td>
                    <td>{type}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{examples}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{interp}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: i === 0 ? 'var(--accent-danger)' : i === 3 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{tradeoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Decision Path Example */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Decision Path (XGBoost Tree #1)</h4>
            <div style={{ background: '#1a1a2e', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, lineHeight: 2, overflow: 'auto' }}>
              <div>{'IF promo_flag == 1:'}</div>
              <div style={{ paddingLeft: 20 }}>{'IF lag_7 > 500:'}</div>
              <div style={{ paddingLeft: 40 }}>{'IF holiday == 1:'}</div>
              <div style={{ paddingLeft: 60, color: '#10b981' }}>{'→ Predict: HIGH DEMAND (847 units) [confidence: 0.92]'}</div>
              <div style={{ paddingLeft: 40 }}>{'ELSE:'}</div>
              <div style={{ paddingLeft: 60, color: '#f59e0b' }}>{'→ Predict: MODERATE DEMAND (520 units) [confidence: 0.85]'}</div>
              <div style={{ paddingLeft: 20 }}>{'ELSE (lag_7 <= 500):'}</div>
              <div style={{ paddingLeft: 40, color: '#f59e0b' }}>{'→ Predict: LOW-MODERATE (310 units) [confidence: 0.78]'}</div>
              <div>{'ELSE (no promo):'}</div>
              <div style={{ paddingLeft: 20 }}>{'IF season == "holiday":'}</div>
              <div style={{ paddingLeft: 40, color: '#f59e0b' }}>{'→ Predict: MODERATE (430 units) [confidence: 0.81]'}</div>
              <div style={{ paddingLeft: 20 }}>{'ELSE:'}</div>
              <div style={{ paddingLeft: 40, color: '#ef4444' }}>{'→ Predict: BASELINE (220 units) [confidence: 0.88]'}</div>
            </div>

            {/* Model Coefficient Table (for linear models) */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Linear Model Coefficients (Ridge Regression baseline)</h4>
            <table className="data-table">
              <thead><tr><th>Feature</th><th>Coefficient</th><th>Std Error</th><th>p-value</th><th>Significance</th></tr></thead>
              <tbody>
                {[
                  ['promo_flag', '+142.3', '8.2', '< 0.001', '***'],
                  ['price', '-32.1', '4.5', '< 0.001', '***'],
                  ['lag_7_sales', '+0.68', '0.03', '< 0.001', '***'],
                  ['holiday', '+98.7', '12.1', '< 0.001', '***'],
                  ['day_of_week', '+15.4', '3.8', '< 0.01', '**'],
                  ['rolling_mean_14', '+0.42', '0.05', '< 0.01', '**'],
                  ['store_type_premium', '+28.9', '9.7', '< 0.05', '*'],
                  ['discount_pct', '+4.2', '2.1', '0.048', '*'],
                  ['competitor_promo', '-18.5', '11.3', '0.102', 'ns'],
                ].map(([feat, coef, se, p, sig], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{feat}</td>
                    <td style={{ color: coef.startsWith('+') ? '#3b82f6' : '#ef4444', fontWeight: 600 }}>{coef}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{se}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{p}</td>
                    <td style={{ fontWeight: 600, color: sig === '***' ? 'var(--accent-success)' : sig === 'ns' ? 'var(--text-muted)' : 'var(--accent-warning)' }}>{sig}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Partial Dependence Summary */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Partial Dependence Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
              {[
                { feature: 'Price', effect: 'Negative — demand drops ~3.2% per $1 increase', shape: 'Linear negative' },
                { feature: 'Promo Flag', effect: 'Strong positive — +18% demand when promo active', shape: 'Step function' },
                { feature: 'Lag 7-day Sales', effect: 'Positive — strong autocorrelation', shape: 'Linear positive' },
                { feature: 'Holiday', effect: 'Positive — +12% during holidays', shape: 'Binary jump' },
              ].map((pd, i) => (
                <div key={i} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-xs)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{pd.feature}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{pd.effect}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Shape: {pd.shape}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== RESPONSIBLE AI ==================== */}
      {activeSection === 'responsible' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">⚖️ Responsible AI — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              Responsible AI ensures models are fair, unbiased, and equitable across all segments. We monitor
              disparate impact, equal opportunity, calibration, and predictive parity across protected attributes.
            </p>

            {/* Fairness Metrics per Segment */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Fairness Metrics by Segment</h4>
            <table className="data-table">
              <thead><tr><th>Segment</th><th>Accuracy %</th><th>False Positive %</th><th>False Negative %</th><th>Disparate Impact</th><th>Status</th></tr></thead>
              <tbody>
                {fairnessData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{d.segment}</td>
                    <td>{d.accuracy}%</td>
                    <td style={{ color: d.falsePositive > 5 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{d.falsePositive}%</td>
                    <td style={{ color: d.falseNegative > 5 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{d.falseNegative}%</td>
                    <td style={{ fontWeight: 600, color: d.dispImpact >= 0.8 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{d.dispImpact}</td>
                    <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: d.dispImpact >= 0.8 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {d.dispImpact >= 0.8 ? '✓ Fair' : '✗ Review'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bias Detection Methods */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Bias Detection & Mitigation</h4>
            <table className="data-table">
              <thead><tr><th>Method</th><th>Stage</th><th>What It Checks</th><th>Result</th><th>Action</th></tr></thead>
              <tbody>
                {[
                  ['Disparate Impact Ratio', 'Pre-deployment', 'Selection rate ratio across groups', '0.87 (>0.8 threshold)', 'Pass — no action'],
                  ['Equal Opportunity', 'Pre-deployment', 'True positive rate equality', '±3.2% across segments', 'Pass — within tolerance'],
                  ['Calibration Analysis', 'Post-deployment', 'Predicted probability vs actual outcome', 'Well-calibrated (ECE: 0.03)', 'Pass'],
                  ['Predictive Parity', 'Post-deployment', 'PPV equality across groups', '±4.1% gap (Urban vs Rural)', 'Warning — monitoring'],
                  ['Individual Fairness', 'Ongoing', 'Similar inputs → similar outputs', 'Lipschitz: 0.92', 'Pass'],
                  ['Demographic Parity', 'Pre-deployment', 'Outcome independence from protected attr', 'Gap: 6.2%', 'Warning — mitigation applied'],
                ].map(([method, stage, check, result, action], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{method}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{stage}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{check}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{result}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: action.startsWith('Pass') ? 'var(--accent-success)' : 'var(--accent-warning)', fontWeight: 500 }}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mitigation Strategies */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Mitigation Strategies Applied</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-sm)' }}>
              {[
                { title: 'Re-sampling', desc: 'SMOTE oversampling for underrepresented rural stores', status: 'Applied' },
                { title: 'Re-weighting', desc: 'Sample weights adjusted for class imbalance in store types', status: 'Applied' },
                { title: 'Threshold Adjustment', desc: 'Per-segment decision thresholds for equal opportunity', status: 'Testing' },
                { title: 'Adversarial Debiasing', desc: 'Adversarial network to remove protected attribute signal', status: 'Planned' },
              ].map((s, i) => (
                <div key={i} style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 6 }}>{s.desc}</div>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: s.status === 'Applied' ? 'var(--accent-success)' : s.status === 'Testing' ? 'var(--accent-warning)' : 'var(--text-muted)' }}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== COMPLIANCE AI ==================== */}
      {activeSection === 'compliance' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📋 Compliance AI — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              Compliance ensures AI systems meet regulatory requirements (GDPR, CCPA, EU AI Act, industry-specific).
              Data handling, model usage, and predictions are auditable and privacy-preserving.
            </p>

            {/* Regulatory Compliance Matrix */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Regulatory Compliance Matrix</h4>
            <table className="data-table">
              <thead><tr><th>Regulation</th><th>Requirement</th><th>Implementation</th><th>Status</th><th>Evidence</th></tr></thead>
              <tbody>
                {[
                  ['GDPR Art. 22', 'Right to explanation for automated decisions', 'SHAP explanations + human review option', '✓ Compliant', 'XAI audit report Q1-2025'],
                  ['GDPR Art. 17', 'Right to erasure (data deletion)', 'Automated data purge pipeline', '✓ Compliant', 'Purge log available'],
                  ['GDPR Art. 25', 'Data minimization by design', 'Only business-relevant features in model', '✓ Compliant', 'Feature audit report'],
                  ['CCPA Sec. 1798.100', 'Right to know data collected', 'Data catalog + lineage documentation', '✓ Compliant', 'Data dictionary published'],
                  ['EU AI Act (High-Risk)', 'Risk assessment for AI systems', 'FRIA completed, risk level: Limited', '✓ Compliant', 'FRIA doc v2.1'],
                  ['EU AI Act', 'Human oversight requirement', 'Planner approval workflow for overrides', '✓ Compliant', 'Workflow audit trail'],
                  ['SOX (if financial)', 'Audit trail for financial predictions', 'Immutable prediction log + version control', '✓ Compliant', 'Audit log DB'],
                  ['Industry: FDA 21 CFR 11', 'Electronic records integrity', 'Signed model artifacts + hash verification', '⏳ In Progress', 'Implementation Q3-2025'],
                ].map(([reg, req, impl, status, evidence], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{reg}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{req}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{impl}</td>
                    <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: status.includes('✓') ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{status}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Data Privacy Controls */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Data Privacy Controls</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-sm)' }}>
              {[
                { icon: '🔒', title: 'PII Masking', desc: 'Customer names, emails masked in training data', status: 'Active' },
                { icon: '🗑️', title: 'Data Retention', desc: '90-day retention policy, auto-purge enabled', status: 'Active' },
                { icon: '🔐', title: 'Encryption', desc: 'AES-256 at rest, TLS 1.3 in transit', status: 'Active' },
                { icon: '📝', title: 'Consent Tracking', desc: 'Data usage consent logged per source', status: 'Active' },
                { icon: '🌍', title: 'Data Residency', desc: 'Data stored in region-specific clusters', status: 'Active' },
                { icon: '👁️', title: 'Access Control', desc: 'RBAC with MFA for model access', status: 'Active' },
              ].map((c, i) => (
                <div key={i} style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{c.desc}</div>
                  <div style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--accent-success)' }}>{c.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== GOVERNANCE AI ==================== */}
      {activeSection === 'governance' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🏛️ Governance AI — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              AI Governance ensures models are reviewed, approved, version-controlled, and operated with clear ownership.
              Every model has an approval workflow, change log, rollback procedure, and defined SLA.
            </p>

            {/* Model Lifecycle */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Model Lifecycle & Approval Workflow</h4>
            <table className="data-table">
              <thead><tr><th>Stage</th><th>Owner</th><th>Approver</th><th>SLA</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {[
                  ['1. Development', 'Data Scientist', 'Tech Lead', '2 weeks', '✓ Complete', '2025-02-15'],
                  ['2. Peer Review', 'ML Engineer', 'Senior DS', '3 days', '✓ Complete', '2025-02-18'],
                  ['3. Validation', 'QA / Testing', 'Model Risk', '1 week', '✓ Complete', '2025-02-25'],
                  ['4. Governance Review', 'AI Committee', 'CISO + CDO', '5 days', '✓ Complete', '2025-03-02'],
                  ['5. Staging Deploy', 'MLOps', 'Tech Lead', '2 days', '✓ Complete', '2025-03-04'],
                  ['6. A/B Testing', 'Product', 'Business Owner', '2 weeks', '✓ Complete', '2025-03-18'],
                  ['7. Production Deploy', 'MLOps', 'VP Engineering', '1 day', '✓ Complete', '2025-03-19'],
                  ['8. Monitoring', 'MLOps', 'Auto + Human', 'Ongoing', '● Active', 'Continuous'],
                ].map(([stage, owner, approver, sla, status, date], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{stage}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{owner}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{approver}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{sla}</td>
                    <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: status.includes('✓') ? 'var(--accent-success)' : 'var(--accent-primary)' }}>{status}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{date}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Model Card */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Model Card</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <table className="data-table">
                <tbody>
                  {[
                    ['Model Name', 'CPG Demand Forecast v3.2'],
                    ['Algorithm', 'XGBoost + Prophet Ensemble'],
                    ['Training Data', '3M rows, 33 features'],
                    ['Training Period', '2022-01 to 2024-12'],
                    ['Validation', '80/20 time-based split'],
                    ['Primary Metric', 'MAPE: 7.8%'],
                    ['Owner', 'Demand Planning DS Team'],
                    ['Last Retrained', '2025-04-01'],
                  ].map(([k, v], i) => (
                    <tr key={i}><td style={{ fontWeight: 500, width: '40%' }}>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <table className="data-table">
                <tbody>
                  {[
                    ['Intended Use', 'Weekly SKU-store demand forecasting'],
                    ['Out of Scope', 'Real-time pricing, new market entry'],
                    ['Known Limitations', 'Cold-start for new SKUs, extreme events'],
                    ['Ethical Considerations', 'No personal data used in features'],
                    ['Version Control', 'MLflow Registry + Git tags'],
                    ['Rollback Procedure', 'Automated via MLflow model stages'],
                    ['Monitoring', 'PSI/CSI daily, accuracy weekly'],
                    ['Sunset Policy', 'Auto-retire if MAPE > 15% for 4 weeks'],
                  ].map(([k, v], i) => (
                    <tr key={i}><td style={{ fontWeight: 500, width: '40%' }}>{k}</td><td style={{ fontSize: 'var(--font-size-xs)' }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Change Log */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Change Log</h4>
            <table className="data-table">
              <thead><tr><th>Version</th><th>Date</th><th>Change</th><th>Author</th><th>Impact</th></tr></thead>
              <tbody>
                {[
                  ['v3.2', '2025-04-01', 'Added holiday interaction features', 'J. Smith', 'MAPE improved 0.3%'],
                  ['v3.1', '2025-03-01', 'Switched to XGBoost+Prophet ensemble', 'A. Chen', 'MAPE improved 1.2%'],
                  ['v3.0', '2025-02-01', 'Major retrain with 2024 data', 'J. Smith', 'Full model refresh'],
                  ['v2.5', '2024-12-15', 'Added competitor price features', 'M. Garcia', 'MAPE improved 0.8%'],
                  ['v2.0', '2024-09-01', 'Migrated from ARIMA to XGBoost', 'A. Chen', 'MAPE improved 4.1%'],
                ].map(([ver, date, change, author, impact], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{ver}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{date}</td>
                    <td>{change}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{author}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>{impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== DEBUG AI ==================== */}
      {activeSection === 'debug' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🐛 Debug AI — Detailed View</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: 1.7 }}>
              Debug AI covers model monitoring, drift detection, error analysis, and automated retraining.
              Continuous monitoring ensures models stay accurate in production.
            </p>

            {/* Drift Monitoring Chart */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>PSI / CSI Drift Monitoring (Last 12 Weeks)</h4>
            <div style={{ height: 250, marginBottom: 'var(--spacing-lg)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driftData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 0.2]} />
                  <Tooltip />
                  <Bar dataKey="psi" name="PSI (Population Stability)" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="csi" name="CSI (Characteristic Stability)" fill="#8b5cf6" opacity={0.7} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Red line: Drift threshold (0.1) — values above trigger retraining review
              </div>
            </div>

            {/* Error Analysis */}
            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Error Analysis — Where the Model Fails</h4>
            <table className="data-table">
              <thead><tr><th>Error Category</th><th>% of Errors</th><th>MAPE in Segment</th><th>Root Cause</th><th>Mitigation</th></tr></thead>
              <tbody>
                {[
                  ['New SKU (cold start)', '28%', '24.5%', 'No historical data', 'Similar SKU proxy + Bayesian prior'],
                  ['Extreme promo events', '22%', '18.3%', 'Unusual discount depth (>40%)', 'Separate promo uplift model'],
                  ['Holiday transitions', '18%', '15.7%', 'Abrupt demand shift', 'Holiday interaction features added'],
                  ['Store closure days', '15%', '32.1%', 'Zero sales not = zero demand', 'Stockout correction applied'],
                  ['Competitor activity', '12%', '13.2%', 'External data lag', 'Real-time competitor price feed planned'],
                  ['Data quality issues', '5%', '19.8%', 'Missing/incorrect POS data', 'Data validation pipeline'],
                ].map(([cat, pct, mape, cause, fix], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{cat}</td>
                    <td>{pct}</td>
                    <td style={{ color: parseFloat(mape) > 15 ? 'var(--accent-danger)' : 'var(--accent-warning)', fontWeight: 600 }}>{mape}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{cause}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)' }}>{fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Retraining Policy */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Retraining Policy & Schedule</h4>
            <table className="data-table">
              <thead><tr><th>Trigger</th><th>Condition</th><th>Action</th><th>Approval</th><th>Last Triggered</th></tr></thead>
              <tbody>
                {[
                  ['Scheduled', 'Every 4 weeks', 'Full retrain with latest data', 'Auto-approved', '2025-04-01'],
                  ['PSI Drift', 'PSI > 0.10 for 3 consecutive days', 'Alert + review + retrain if confirmed', 'ML Lead approval', '2025-03-12'],
                  ['Accuracy Drop', 'MAPE > 12% for 2 weeks', 'Emergency retrain', 'VP approval', 'Never triggered'],
                  ['Data Schema Change', 'New columns or type changes', 'Feature pipeline update + retrain', 'Tech Lead', '2025-02-20'],
                  ['Business Request', 'New product category launch', 'Cold-start model + retrain', 'Business Owner', '2025-03-25'],
                ].map(([trigger, condition, action, approval, last], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{trigger}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{condition}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{action}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{approval}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{last}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Incident Log */}
            <h4 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }}>Recent Incidents</h4>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Severity</th><th>Issue</th><th>Resolution</th><th>Time to Fix</th></tr></thead>
              <tbody>
                {[
                  ['2025-03-12', 'Medium', 'PSI drift detected on store_type feature', 'Retrained with updated store categories', '4 hours'],
                  ['2025-02-28', 'Low', 'MAPE spike to 11% for 2 days during local event', 'Added event calendar feature', '2 days'],
                  ['2025-01-15', 'High', 'Pipeline failure — missing holiday data', 'Fallback to cached data, fixed ETL', '1 hour'],
                ].map(([date, sev, issue, resolution, ttf], i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{date}</td>
                    <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: sev === 'High' ? 'var(--accent-danger)' : sev === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)' }}>{sev}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{issue}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{resolution}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{ttf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== GOVERNANCE CHECKLIST ==================== */}
      <div className="content-section" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="content-section-header">
          <span className="content-section-title">📋 Master Governance Checklist</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Requirement</th><th>Category</th><th>Status</th><th>Owner</th><th>Last Verified</th></tr></thead>
            <tbody>
              {[
                ['SHAP explanations available for all predictions', 'Explainability', 'pass', 'DS Team', '2025-04-01'],
                ['LIME local explanations on demand', 'Explainability', 'pass', 'DS Team', '2025-04-01'],
                ['Decision paths documented for tree models', 'Interpretability', 'pass', 'ML Engineer', '2025-03-28'],
                ['Linear model coefficients published', 'Interpretability', 'pass', 'DS Team', '2025-03-15'],
                ['Disparate impact ratio > 0.8 all segments', 'Responsible AI', 'pass', 'Ethics Board', '2025-03-20'],
                ['Bias audit completed quarterly', 'Responsible AI', 'pass', 'AI Committee', '2025-02-28'],
                ['GDPR data minimization verified', 'Compliance', 'pass', 'Legal', '2025-03-01'],
                ['EU AI Act FRIA completed', 'Compliance', 'pass', 'Risk Team', '2025-03-10'],
                ['Model approved by AI Governance Committee', 'Governance', 'pass', 'CISO', '2025-03-02'],
                ['Model card published and current', 'Governance', 'pending', 'DS Team', 'In progress'],
                ['PSI/CSI monitoring active', 'Debug', 'pass', 'MLOps', '2025-04-18'],
                ['Retraining policy documented', 'Debug', 'pass', 'ML Lead', '2025-03-15'],
                ['Rollback procedure tested', 'Governance', 'pass', 'MLOps', '2025-03-10'],
                ['Incident response playbook ready', 'Debug', 'pass', 'SRE Team', '2025-03-05'],
              ].map(([req, cat, status, owner, date], i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{req}</td>
                  <td><span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', borderRadius: 10, background: 'var(--bg-hover)' }}>{cat}</span></td>
                  <td><span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: status === 'pass' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                    {status === 'pass' ? '✓ Pass' : '⏳ Pending'}
                  </span></td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{owner}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </TabShell>
  );
}
