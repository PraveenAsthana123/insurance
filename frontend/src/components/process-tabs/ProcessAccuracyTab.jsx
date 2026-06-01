import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, Legend, Cell, ReferenceLine,
} from 'recharts';
import '../../styles/workbench.css';

/* ---- Static Data ---- */
const MODELS_METRICS = [
  { model: 'XGBoost',          accuracy: 91.2, precision: 89.7, recall: 90.1, f1: 90.4, auc: 0.951, mape: 7.8,  rmse: 34.2, mae: 22.1, r2: 0.94, logloss: 0.221 },
  { model: 'LightGBM',         accuracy: 89.8, precision: 88.2, recall: 88.9, f1: 88.5, auc: 0.942, mape: 8.4,  rmse: 37.1, mae: 24.3, r2: 0.93, logloss: 0.238 },
  { model: 'Random Forest',    accuracy: 87.6, precision: 86.1, recall: 87.0, f1: 86.5, auc: 0.928, mape: 9.9,  rmse: 41.8, mae: 27.6, r2: 0.91, logloss: 0.261 },
  { model: 'LSTM',             accuracy: 85.4, precision: 83.9, recall: 84.7, f1: 84.3, auc: 0.912, mape: 11.2, rmse: 46.3, mae: 31.4, r2: 0.89, logloss: 0.284 },
  { model: 'Prophet',          accuracy: 83.1, precision: 81.6, recall: 82.4, f1: 82.0, auc: 0.897, mape: 13.1, rmse: 52.7, mae: 35.8, r2: 0.86, logloss: 0.312 },
  { model: 'ARIMA',            accuracy: 79.3, precision: 77.8, recall: 78.5, f1: 78.1, auc: 0.864, mape: 16.4, rmse: 61.9, mae: 43.2, r2: 0.81, logloss: 0.358 },
  { model: 'Ridge Regression', accuracy: 76.8, precision: 75.2, recall: 76.0, f1: 75.6, auc: 0.841, mape: 19.2, rmse: 71.4, mae: 49.7, r2: 0.78, logloss: 0.391 },
  { model: 'Ensemble',         accuracy: 92.4, precision: 91.1, recall: 91.8, f1: 91.4, auc: 0.963, mape: 6.9,  rmse: 31.4, mae: 20.3, r2: 0.96, logloss: 0.198 },
];

/* Best values per metric (for highlighting) */
function getBests(rows) {
  const bests = {};
  const higherBetter = ['accuracy', 'precision', 'recall', 'f1', 'auc', 'r2'];
  const lowerBetter  = ['mape', 'rmse', 'mae', 'logloss'];
  higherBetter.forEach((k) => { bests[k] = Math.max(...rows.map((r) => r[k])); });
  lowerBetter.forEach((k)  => { bests[k] = Math.min(...rows.map((r) => r[k])); });
  return bests;
}

/* ---- ROC Curve Data (20 pts per model) ---- */
function makeRocCurve(label, color, auc) {
  const pts = [{ fpr: 0, tpr: 0 }];
  for (let i = 1; i <= 18; i++) {
    const fpr = i / 20;
    const tpr = Math.min(1, fpr + auc - 0.5 + (Math.random() - 0.5) * 0.06);
    pts.push({ fpr: parseFloat(fpr.toFixed(3)), tpr: parseFloat(Math.max(fpr, tpr).toFixed(3)) });
  }
  pts.push({ fpr: 1, tpr: 1 });
  return { label, color, auc, pts };
}

const ROC_CURVES = [
  makeRocCurve('Ensemble',  '#10b981', 0.963),
  makeRocCurve('XGBoost',   '#3b82f6', 0.951),
  makeRocCurve('LightGBM',  '#8b5cf6', 0.942),
];
const ROC_BASELINE = Array.from({ length: 11 }, (_, i) => ({ fpr: i / 10, tpr: i / 10 }));

/* Flatten for Recharts: one object per fpr step */
function flattenRocData(curves) {
  const map = {};
  curves.forEach(({ label, pts }) => {
    pts.forEach(({ fpr, tpr }) => {
      const key = fpr.toFixed(3);
      if (!map[key]) map[key] = { fpr: parseFloat(key) };
      map[key][label] = tpr;
    });
  });
  ROC_BASELINE.forEach(({ fpr, tpr }) => {
    const key = fpr.toFixed(1);
    if (!map[key]) map[key] = { fpr: parseFloat(key) };
    map[key]['Random'] = tpr;
  });
  return Object.values(map).sort((a, b) => a.fpr - b.fpr);
}

/* ---- PR Curve ---- */
function makePrCurve(label, color, basePrecision) {
  const pts = [{ recall: 0, precision: 1 }];
  for (let i = 1; i <= 18; i++) {
    const recall = i / 20;
    const prec = Math.max(0, basePrecision - recall * 0.35 + (Math.random() - 0.5) * 0.04);
    pts.push({ recall: parseFloat(recall.toFixed(3)), precision: parseFloat(prec.toFixed(3)) });
  }
  pts.push({ recall: 1, precision: 0.3 + Math.random() * 0.1 });
  return { label, color, pts };
}

const PR_CURVES = [
  makePrCurve('Ensemble',  '#10b981', 0.93),
  makePrCurve('XGBoost',   '#3b82f6', 0.90),
  makePrCurve('LightGBM',  '#8b5cf6', 0.88),
];

function flattenPrData(curves) {
  const map = {};
  curves.forEach(({ label, pts }) => {
    pts.forEach(({ recall, precision }) => {
      const key = recall.toFixed(3);
      if (!map[key]) map[key] = { recall: parseFloat(key) };
      map[key][label] = precision;
    });
  });
  return Object.values(map).sort((a, b) => a.recall - b.recall);
}

/* ---- Confusion Matrix Data ---- */
const CM = { tp: 8241, fp: 712, fn: 617, tn: 7430 };
const total = CM.tp + CM.fp + CM.fn + CM.tn;
const sensitivity = (CM.tp / (CM.tp + CM.fn) * 100).toFixed(1);
const specificity = (CM.tn / (CM.tn + CM.fp) * 100).toFixed(1);
const ppv         = (CM.tp / (CM.tp + CM.fp) * 100).toFixed(1);
const npv         = (CM.tn / (CM.tn + CM.fn) * 100).toFixed(1);

/* ---- Classification Report ---- */
const CLASS_REPORT = [
  { cls: 'Low Demand',   prec: 92.1, rec: 91.4, f1: 91.7, sup: 4213 },
  { cls: 'Normal',       prec: 89.3, rec: 90.2, f1: 89.7, sup: 7841 },
  { cls: 'High Demand',  prec: 87.6, rec: 86.9, f1: 87.2, sup: 3102 },
  { cls: 'Spike',        prec: 84.1, rec: 83.7, f1: 83.9, sup: 844  },
  { cls: 'Macro Avg',    prec: 88.3, rec: 88.1, f1: 88.1, sup: null },
  { cls: 'Weighted Avg', prec: 89.7, rec: 90.1, f1: 89.9, sup: 16000 },
];

/* ---- Benchmarking Data ---- */
const BENCH_DATA = MODELS_METRICS.map((m) => ({
  model: m.model,
  mape:  m.mape,
  f1:    m.f1,
  baseline: 22.4,
  industry: 14.1,
  bestClass: 6.5,
}));

/* ---- Cross-Validation ---- */
const CV_DATA = MODELS_METRICS.map((m) => {
  const base = m.accuracy;
  const folds = Array.from({ length: 5 }, () => parseFloat((base + (Math.random() - 0.5) * 4).toFixed(2)));
  const mean  = parseFloat((folds.reduce((a, b) => a + b, 0) / 5).toFixed(2));
  const std   = parseFloat(Math.sqrt(folds.reduce((a, b) => a + (b - mean) ** 2, 0) / 5).toFixed(2));
  return { model: m.model, folds, mean, std, min: Math.min(...folds).toFixed(2), max: Math.max(...folds).toFixed(2) };
});

/* ---- Residual Scatter ---- */
function makeResiduals(n = 120) {
  return Array.from({ length: n }, () => {
    const actual = 50 + Math.random() * 450;
    const predicted = actual + (Math.random() - 0.5) * actual * 0.15;
    return { actual: parseFloat(actual.toFixed(1)), predicted: parseFloat(predicted.toFixed(1)), residual: parseFloat((predicted - actual).toFixed(1)) };
  });
}
const RESIDUALS = makeResiduals();

/* ---- Helpers ---- */
function StatBadge({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)' }}>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{value}%</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="content-section-header">
      <span className="content-section-title">{title}</span>
    </div>
  );
}

export default function ProcessAccuracyTab() {
  const [activeMetric, setActiveMetric] = useState('mape');
  const bests = useMemo(() => getBests(MODELS_METRICS), []);
  const rocData = useMemo(() => flattenRocData(ROC_CURVES), []);
  const prData  = useMemo(() => flattenPrData(PR_CURVES), []);

  function isBest(model, key) {
    return MODELS_METRICS.find((m) => m.model === model)?.[key] === bests[key];
  }

  return (
    <div>

      {/* ===== A. KPI CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        {[
          { label: 'Overall Accuracy', value: '91.2%', sub: 'XGBoost on holdout set', color: 'var(--accent-success)', icon: '🎯' },
          { label: 'Best Model',       value: 'Ensemble', sub: '92.4% accuracy',         color: 'var(--accent-primary)', icon: '👑' },
          { label: 'Precision (wtd)', value: '89.7%', sub: 'Weighted average',          color: 'var(--accent-purple)', icon: '🎯' },
          { label: 'F1 Score',         value: '90.4%', sub: 'Harmonic mean P/R',         color: 'var(--accent-warning)', icon: '⚖️' },
        ].map((kpi) => (
          <div key={kpi.label} className="metric-card" style={{ borderLeft: `4px solid ${kpi.color}`, padding: 'var(--spacing-md)' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{kpi.icon}</div>
            <div className="metric-card-label">{kpi.label}</div>
            <div className="metric-card-value" style={{ color: kpi.color, fontSize: '1.6rem' }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ===== B. FULL METRICS MATRIX ===== */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <SectionHeader title="📊 Full Metrics Matrix — All Models" />
        <div className="table-wrapper">
          <table className="stats-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th>
                <th>AUC-ROC</th><th>MAPE</th><th>RMSE</th><th>MAE</th><th>R²</th><th>Log Loss</th>
              </tr>
            </thead>
            <tbody>
              {MODELS_METRICS.map((m) => (
                <tr key={m.model} style={{ fontWeight: m.model === 'Ensemble' ? 700 : 400 }}>
                  <td style={{ fontWeight: 700 }}>{m.model === 'Ensemble' ? '🏆 ' : ''}{m.model}</td>
                  {[
                    { k: 'accuracy', v: `${m.accuracy}%` },
                    { k: 'precision', v: `${m.precision}%` },
                    { k: 'recall', v: `${m.recall}%` },
                    { k: 'f1', v: `${m.f1}%` },
                    { k: 'auc', v: m.auc },
                    { k: 'mape', v: `${m.mape}%` },
                    { k: 'rmse', v: m.rmse },
                    { k: 'mae', v: m.mae },
                    { k: 'r2', v: m.r2 },
                    { k: 'logloss', v: m.logloss },
                  ].map(({ k, v }) => (
                    <td key={k} style={{
                      color: isBest(m.model, k) ? 'var(--accent-success)' : 'var(--text-secondary)',
                      fontWeight: isBest(m.model, k) ? 800 : 400,
                      background: isBest(m.model, k) ? 'rgba(16,185,129,0.08)' : 'transparent',
                    }}>
                      {isBest(m.model, k) ? '★ ' : ''}{v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: 'var(--accent-success)', marginTop: 6 }}>
          ★ = Best value per metric (green highlight). Lower is better for MAPE, RMSE, MAE, Log Loss.
        </div>
      </div>

      {/* ===== C. ROC CURVE ===== */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <SectionHeader title="📈 ROC Curves — Top 3 Models vs Random Baseline" />
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rocData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} label={{ value: 'False Positive Rate', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: 'var(--text-muted)' }} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-muted)' }} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v?.toFixed ? v.toFixed(3) : v} labelFormatter={(l) => `FPR: ${Number(l).toFixed(3)}`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Ensemble"  stroke="#10b981" strokeWidth={2.5} dot={false} name="Ensemble (AUC=0.963)" />
              <Line type="monotone" dataKey="XGBoost"   stroke="#3b82f6" strokeWidth={2}   dot={false} name="XGBoost (AUC=0.951)" />
              <Line type="monotone" dataKey="LightGBM"  stroke="#8b5cf6" strokeWidth={2}   dot={false} name="LightGBM (AUC=0.942)" />
              <Line type="monotone" dataKey="Random"    stroke="#6b7280" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="Random (AUC=0.500)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== D. PRECISION-RECALL CURVE ===== */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <SectionHeader title="🎯 Precision-Recall Curves" />
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Recall', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: 'var(--text-muted)' }} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-muted)' }} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v?.toFixed ? v.toFixed(3) : v} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Ensemble" stroke="#10b981" strokeWidth={2.5} dot={false} name="Ensemble" />
              <Line type="monotone" dataKey="XGBoost"  stroke="#3b82f6" strokeWidth={2}   dot={false} name="XGBoost" />
              <Line type="monotone" dataKey="LightGBM" stroke="#8b5cf6" strokeWidth={2}   dot={false} name="LightGBM" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== E. CONFUSION MATRIX + F. CLASSIFICATION REPORT ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>

        {/* Confusion Matrix */}
        <div className="content-section">
          <SectionHeader title="🔲 Confusion Matrix (Binary)" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'flex-start' }}>Predicted →</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Actual ↓</div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 120px 120px', gap: 4 }}>
                <div />
                <div style={{ padding: '6px 0', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>Positive</div>
                <div style={{ padding: '6px 0', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>Negative</div>

                <div style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Positive</div>
                <div style={{ padding: '16px 8px', textAlign: 'center', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--accent-success)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-success)' }}>{CM.tp.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-success)', fontWeight: 700 }}>TP</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>True Positive</div>
                </div>
                <div style={{ padding: '16px 8px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-danger)' }}>{CM.fn.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-danger)', fontWeight: 700 }}>FN</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>False Negative</div>
                </div>

                <div style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Negative</div>
                <div style={{ padding: '16px 8px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-danger)' }}>{CM.fp.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-danger)', fontWeight: 700 }}>FP</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>False Positive</div>
                </div>
                <div style={{ padding: '16px 8px', textAlign: 'center', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--accent-success)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-success)' }}>{CM.tn.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-success)', fontWeight: 700 }}>TN</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>True Negative</div>
                </div>
              </div>
            </div>

            {/* Derived stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%' }}>
              {[
                { label: 'Sensitivity', value: `${sensitivity}%`, desc: 'TP / (TP+FN)' },
                { label: 'Specificity', value: `${specificity}%`, desc: 'TN / (TN+FP)' },
                { label: 'PPV',         value: `${ppv}%`,         desc: 'TP / (TP+FP)' },
                { label: 'NPV',         value: `${npv}%`,         desc: 'TN / (TN+FN)' },
              ].map((s) => (
                <div key={s.label} style={{ padding: '8px 6px', background: 'var(--bg-hover)', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Classification Report */}
        <div className="content-section">
          <SectionHeader title="📋 Classification Report" />
          <div className="table-wrapper">
            <table className="stats-table">
              <thead>
                <tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>
              </thead>
              <tbody>
                {CLASS_REPORT.map((row, i) => (
                  <tr key={row.cls} style={{ fontWeight: i >= 4 ? 700 : 400, borderTop: i === 4 ? '2px solid var(--border-color)' : undefined }}>
                    <td>{row.cls}</td>
                    <td>{row.prec.toFixed(1)}%</td>
                    <td>{row.rec.toFixed(1)}%</td>
                    <td>{row.f1.toFixed(1)}%</td>
                    <td style={{ color: 'var(--text-muted)' }}>{row.sup !== null ? row.sup.toLocaleString() : '16,000'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Samples', value: total.toLocaleString() },
              { label: 'Correct', value: (CM.tp + CM.tn).toLocaleString() },
              { label: 'Overall Acc', value: `${((CM.tp + CM.tn) / total * 100).toFixed(1)}%` },
            ].map((s) => (
              <div key={s.label} style={{ padding: '4px 12px', background: 'var(--bg-hover)', borderRadius: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== G. MODEL BENCHMARKING ===== */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="content-section-header">
          <span className="content-section-title">📊 Model Benchmarking vs Baseline / Industry / Best-in-Class</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['mape', 'f1'].map((m) => (
              <button key={m} onClick={() => setActiveMetric(m)} style={{
                padding: '4px 12px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)',
                background: activeMetric === m ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: activeMetric === m ? '#fff' : 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)', fontWeight: 700, cursor: 'pointer',
              }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={BENCH_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} unit={activeMetric === 'f1' ? '%' : '%'} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey={activeMetric} name={activeMetric.toUpperCase() + ' (model)'} fill="#3b82f6" />
              {activeMetric === 'mape' && <>
                <ReferenceLine y={22.4} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Baseline 22.4%', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={14.1} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Industry 14.1%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={6.5}  stroke="#10b981" strokeDasharray="4 2" label={{ value: 'Best 6.5%', fill: '#10b981', fontSize: 10 }} />
              </>}
              {activeMetric === 'f1' && <>
                <ReferenceLine y={68}   stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Baseline 68%', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={80}   stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Industry 80%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={93}   stroke="#10b981" strokeDasharray="4 2" label={{ value: 'Best 93%', fill: '#10b981', fontSize: 10 }} />
              </>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== H. CROSS-VALIDATION ===== */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <SectionHeader title="🔁 5-Fold Cross-Validation Results" />
        <div className="table-wrapper">
          <table className="stats-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Fold 1</th><th>Fold 2</th><th>Fold 3</th><th>Fold 4</th><th>Fold 5</th>
                <th>Mean</th><th>Std</th><th>Min</th><th>Max</th>
              </tr>
            </thead>
            <tbody>
              {CV_DATA.map((r) => (
                <tr key={r.model}>
                  <td style={{ fontWeight: 700 }}>{r.model}</td>
                  {r.folds.map((f, i) => <td key={i}>{f}%</td>)}
                  <td style={{ fontWeight: 800, color: 'var(--accent-success)' }}>{r.mean}%</td>
                  <td style={{ color: 'var(--text-muted)' }}>±{r.std}</td>
                  <td style={{ color: 'var(--accent-danger)' }}>{r.min}%</td>
                  <td style={{ color: 'var(--accent-primary)' }}>{r.max}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          Lower Std indicates more consistent (stable) model performance across data splits.
        </div>
      </div>

      {/* ===== I. RESIDUAL ANALYSIS ===== */}
      <div className="content-section">
        <SectionHeader title="📉 Residual Analysis — Predicted vs Actual" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          {/* Scatter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Predicted vs Actual (n=120)</div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="actual" name="Actual" type="number" tick={{ fontSize: 10 }} label={{ value: 'Actual', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis dataKey="predicted" name="Predicted" type="number" tick={{ fontSize: 10 }} label={{ value: 'Predicted', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 11 }} />
                  <ReferenceLine stroke="#10b981" strokeDasharray="5 3" segment={[{ x: 50, y: 50 }, { x: 500, y: 500 }]} label={{ value: 'Perfect fit', fill: '#10b981', fontSize: 9 }} />
                  <Scatter data={RESIDUALS} fill="#3b82f6" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Residual distribution */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Residual Distribution</div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    const bins = Array.from({ length: 16 }, (_, i) => ({ bin: (i - 8) * 12, count: 0 }));
                    RESIDUALS.forEach(({ residual }) => {
                      const idx = Math.min(15, Math.max(0, Math.floor((residual + 96) / 12)));
                      bins[idx].count += 1;
                    });
                    return bins;
                  })()}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="bin" tick={{ fontSize: 9 }} label={{ value: 'Residual', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 11 }} />
                  <ReferenceLine x={0} stroke="#10b981" strokeDasharray="4 2" />
                  <Bar dataKey="count" name="Frequency" fill="#8b5cf6" fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Mean Residual', value: '+0.3 (near-zero bias)' },
            { label: 'Residual Std', value: '34.2' },
            { label: 'Within ±50',   value: '81.7%' },
            { label: 'R²',           value: '0.94' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '4px 12px', background: 'var(--bg-hover)', borderRadius: 6, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
