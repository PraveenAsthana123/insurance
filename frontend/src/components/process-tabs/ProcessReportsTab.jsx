import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ================================================================
   REPORTS & DASHBOARD TAB — 4 sub-tabs
   Executive Summary | Visualizations | Data Report | Tech Stack
   ================================================================ */

const REPORT_TABS = [
  { id: 'executive',   label: 'Executive Summary',       icon: '📊' },
  { id: 'visuals',     label: 'Visualizations Catalog',  icon: '📉' },
  { id: 'data',        label: 'Data Source Report',      icon: '🗂️' },
  { id: 'techstack',   label: 'Tech Stack & Requirements', icon: '🔧' },
];

/* ── shared helpers ── */
const Th = ({ children, style: s }) => (
  <th style={{ padding: '8px 10px', textAlign: 'left', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', ...s }}>{children}</th>
);
const Td = ({ children, style: s }) => (
  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle', fontSize: 12, ...s }}>{children}</td>
);
const TableWrapper = ({ children }) => (
  <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
  </div>
);

const statusBadge = (s) => {
  const map = {
    Green:    { bg: '#d1fae5', color: '#065f46' },
    Amber:    { bg: '#fef3c7', color: '#92400e' },
    Red:      { bg: '#fee2e2', color: '#991b1b' },
    Active:   { bg: '#dbeafe', color: '#1e40af' },
    Planned:  { bg: '#ede9fe', color: '#5b21b6' },
    High:     { bg: '#fee2e2', color: '#991b1b' },
    Medium:   { bg: '#fef3c7', color: '#92400e' },
    Low:      { bg: '#d1fae5', color: '#065f46' },
    Critical: { bg: '#fee2e2', color: '#991b1b' },
    Good:     { bg: '#d1fae5', color: '#065f46' },
  };
  const style = map[s] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color }}>{s}</span>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="content-section-header">
    <span className="content-section-title">{title}</span>
    {subtitle && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{subtitle}</span>}
  </div>
);

/* ================================================================
   SAMPLE DATA
   ================================================================ */
const ACCURACY_TREND = [
  { month: 'May', accuracy: 81, target: 90 },
  { month: 'Jun', accuracy: 83, target: 90 },
  { month: 'Jul', accuracy: 85, target: 90 },
  { month: 'Aug', accuracy: 84, target: 90 },
  { month: 'Sep', accuracy: 87, target: 90 },
  { month: 'Oct', accuracy: 88, target: 90 },
  { month: 'Nov', accuracy: 87, target: 90 },
  { month: 'Dec', accuracy: 90, target: 90 },
  { month: 'Jan', accuracy: 91, target: 90 },
  { month: 'Feb', accuracy: 92, target: 90 },
  { month: 'Mar', accuracy: 93, target: 90 },
  { month: 'Apr', accuracy: 94, target: 90 },
];

const SAVINGS_TREND = [
  { month: 'May', savings: 120 },
  { month: 'Jun', savings: 145 },
  { month: 'Jul', savings: 160 },
  { month: 'Aug', savings: 155 },
  { month: 'Sep', savings: 180 },
  { month: 'Oct', savings: 210 },
  { month: 'Nov', savings: 225 },
  { month: 'Dec', savings: 260 },
  { month: 'Jan', savings: 280 },
  { month: 'Feb', savings: 295 },
  { month: 'Mar', savings: 320 },
  { month: 'Apr', savings: 340 },
];

/* Chart mini-data sets */
const makeLineData = () => Array.from({ length: 12 }, (_, i) => ({ x: i + 1, actual: 50 + Math.round(Math.random() * 30), pred: 48 + Math.round(Math.random() * 32) }));
const makeBinData = () => Array.from({ length: 8 }, (_, i) => ({ name: `Feat ${i + 1}`, value: 90 - i * 9 }));
const makeHistData = () => Array.from({ length: 10 }, (_, i) => ({ bin: (i - 5) * 2, count: Math.round(5 + Math.random() * 20) }));
const makeBarData = () => Array.from({ length: 6 }, (_, i) => ({ store: `S${i + 1}`, mape: 4 + Math.round(Math.random() * 14) }));
const makePieData = () => [{ name: 'Class A', value: 55 }, { name: 'Class B', value: 30 }, { name: 'Class C', value: 15 }];
const makeLossData = () => Array.from({ length: 20 }, (_, i) => ({ epoch: i + 1, loss: 1.2 / (1 + i * 0.15) }));
const makePsiData = () => Array.from({ length: 8 }, (_, i) => ({ feat: `F${i + 1}`, psi: +(0.02 + Math.random() * 0.18).toFixed(3) }));
const makeGrpBar = () => Array.from({ length: 5 }, (_, i) => ({ sku: `SKU${i + 1}`, actual: 400 + i * 80, forecast: 380 + i * 85 }));
const makeAreaData = () => Array.from({ length: 12 }, (_, i) => ({ x: i + 1, low: 30 + i * 3, mid: 50 + i * 3, high: 70 + i * 3 }));
const makeMultiLine = () => Array.from({ length: 12 }, (_, i) => ({ x: i + 1, kpi1: 80 + i * 1.2, kpi2: 70 + i * 1.5, kpi3: 60 + i * 2 }));
const makePrecRecall = () => Array.from({ length: 11 }, (_, i) => ({ recall: i * 0.1, precision: 1 - i * 0.07 }));
const makeRoc = () => Array.from({ length: 11 }, (_, i) => ({ fpr: i * 0.1, tpr: Math.min(1, i * 0.14 + 0.02) }));
const makeHeatmapData = () => [
  [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0.9, 0.1], [0, 0, 0.05, 0.95],
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

/* ================================================================
   SUB-TAB 1: EXECUTIVE SUMMARY
   ================================================================ */
const KPI_CARDS = [
  { label: 'Forecast Accuracy', value: '94.2%', delta: '+3.1%', color: '#3b82f6', icon: '📈' },
  { label: 'Revenue Impact',    value: '$3.2M',  delta: '+12%',  color: '#10b981', icon: '💰' },
  { label: 'Cost Savings',      value: '$1.8M',  delta: '+8%',   color: '#8b5cf6', icon: '💎' },
  { label: 'Adoption Rate',     value: '87%',    delta: '+15pp', color: '#f59e0b', icon: '👥' },
  { label: 'Data Quality',      value: '97.3%',  delta: '+1.2%', color: '#06b6d4', icon: '🗂️' },
  { label: 'Model Health',      value: 'Good',   delta: 'Stable', color: '#22c55e', icon: '🤖' },
];

const TRAFFIC_LIGHTS = [
  { area: 'Data',        status: 'Green', detail: 'Freshness 98%, quality 97.3%, no pipeline gaps' },
  { area: 'Model',       status: 'Green', detail: 'MAPE 5.8%, below 10% threshold, no drift alerts' },
  { area: 'Process',     status: 'Amber', detail: 'Manual override rate 12% — above 8% target' },
  { area: 'People',      status: 'Green', detail: '87% user adoption, training complete for all planners' },
  { area: 'Technology',  status: 'Amber', detail: 'ERP integration latency 3.2s — SLA is <2s' },
];

const FINDINGS = [
  'Forecast accuracy improved from 81% to 94.2% over 12 months, exceeding the 90% target by Q3.',
  'Revenue protection of $3.2M achieved by reducing high-velocity SKU stockouts from 4.3% to 1.8%.',
  'Planner productivity tripled — weekly cycle reduced from 3 days to <4 hours through automation.',
  'ERP integration latency increased to 3.2s in April; root cause identified as batch job contention — fix in progress.',
  'Promotional uplift model is the weakest component with ±14% accuracy; retraining scheduled for May.',
];

const RECOMMENDATIONS = [
  { item: 'Resolve ERP latency regression by May 15', priority: 'High',   owner: 'ML Ops' },
  { item: 'Retrain promo uplift model with 2024 promo data', priority: 'High',   owner: 'Data Science' },
  { item: 'Reduce manual override rate via confidence threshold tuning', priority: 'Medium', owner: 'Demand Planning' },
  { item: 'Expand SKU coverage to seasonal categories (2,800 → 3,200)', priority: 'Low',    owner: 'Product' },
];

function ExecutiveSummary() {
  const handleExport = (type) => {
    alert(`[Simulated] Exporting report as ${type}...`);
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="content-section">
        <SectionHeader title="Key Performance Indicators" subtitle="Rolling 30-day vs. prior period" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} style={{
              padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
              border: `1px solid ${kpi.color}30`, background: `${kpi.color}08`,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3rem' }}>{kpi.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: kpi.color, background: `${kpi.color}18`, padding: '2px 8px', borderRadius: 10 }}>{kpi.delta}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Charts */}
      <div className="content-section">
        <SectionHeader title="Trend Analysis" subtitle="12-month performance" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Forecast Accuracy (%) — 12 Months</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ACCURACY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target 90%" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Monthly Cost Savings ($K) — 12 Months</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SAVINGS_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} name="Savings ($K)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Traffic Lights */}
      <div className="content-section">
        <SectionHeader title="Health Status — Traffic Light" subtitle="5 strategic areas" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRAFFIC_LIGHTS.map((t) => {
            const colorMap = { Green: '#22c55e', Amber: '#f59e0b', Red: '#ef4444' };
            const col = colorMap[t.status] || '#6b7280';
            return (
              <div key={t.area} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '12px 16px', borderRadius: 'var(--border-radius)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 8px ${col}80` }} />
                <div style={{ width: 90, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.area}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: col, width: 60 }}>{t.status}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{t.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="content-section">
          <SectionHeader title="Key Findings" />
          <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FINDINGS.map((f, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="content-section">
          <SectionHeader title="Recommendations" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--border-radius)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: r.priority === 'High' ? '#fee2e2' : r.priority === 'Medium' ? '#fef3c7' : '#d1fae5', color: r.priority === 'High' ? '#991b1b' : r.priority === 'Medium' ? '#92400e' : '#065f46', whiteSpace: 'nowrap', marginTop: 2 }}>{r.priority}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{r.item}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Owner: {r.owner}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 'var(--spacing-md)' }}>
        <button
          onClick={() => handleExport('PDF')}
          style={{ padding: '10px 24px', borderRadius: 'var(--border-radius)', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >Export as PDF</button>
        <button
          onClick={() => handleExport('PowerPoint')}
          style={{ padding: '10px 24px', borderRadius: 'var(--border-radius)', background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >Export as PowerPoint</button>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 2: VISUALIZATIONS CATALOG
   ================================================================ */
const CHART_CATALOG = [
  { id: 1,  name: 'Actual vs Predicted',         type: 'Line Chart',         purpose: 'Model fit validation', source: 'Model output', freq: 'Weekly', color: '#3b82f6' },
  { id: 2,  name: 'Feature Importance',           type: 'Horizontal Bar',     purpose: 'Model interpretability', source: 'XGBoost / SHAP', freq: 'Per retrain', color: '#8b5cf6' },
  { id: 3,  name: 'Residual Distribution',        type: 'Histogram',          purpose: 'Error bias detection', source: 'Model output', freq: 'Weekly', color: '#10b981' },
  { id: 4,  name: 'Confusion Matrix',             type: 'Heatmap Grid',       purpose: 'Classification accuracy', source: 'Classifier', freq: 'Per retrain', color: '#f59e0b' },
  { id: 5,  name: 'ROC Curve',                    type: 'Line Chart',         purpose: 'Discriminatory power', source: 'Classifier', freq: 'Per retrain', color: '#ef4444' },
  { id: 6,  name: 'Precision-Recall Curve',       type: 'Line Chart',         purpose: 'Class imbalance analysis', source: 'Classifier', freq: 'Per retrain', color: '#06b6d4' },
  { id: 7,  name: 'MAPE by Store',                type: 'Bar Chart',          purpose: 'Store-level accuracy', source: 'Forecast engine', freq: 'Weekly', color: '#22c55e' },
  { id: 8,  name: 'Demand Distribution',          type: 'Histogram',          purpose: 'Volume pattern analysis', source: 'Sales data', freq: 'Monthly', color: '#f43f5e' },
  { id: 9,  name: 'Correlation Matrix',           type: 'Heatmap',            purpose: 'Feature correlation', source: 'Feature store', freq: 'Per retrain', color: '#a855f7' },
  { id: 10, name: 'Class Distribution',           type: 'Pie Chart',          purpose: 'Label balance check', source: 'Training data', freq: 'Per retrain', color: '#0ea5e9' },
  { id: 11, name: 'Training Loss Curve',          type: 'Line Chart',         purpose: 'Convergence monitoring', source: 'Training logs', freq: 'Per retrain', color: '#84cc16' },
  { id: 12, name: 'Drift PSI Monitor',            type: 'Bar Chart',          purpose: 'Data drift alerting', source: 'MLOps pipeline', freq: 'Daily', color: '#fb923c' },
  { id: 13, name: 'Forecast vs Actual by SKU',    type: 'Grouped Bar',        purpose: 'SKU-level bias', source: 'Forecast + actuals', freq: 'Weekly', color: '#2dd4bf' },
  { id: 14, name: 'Confidence Bands',             type: 'Area Chart',         purpose: 'Uncertainty quantification', source: 'Ensemble model', freq: 'Weekly', color: '#7c3aed' },
  { id: 15, name: 'KPI Trend Dashboard',          type: 'Multi-Line Chart',   purpose: 'Executive reporting', source: 'KPI warehouse', freq: 'Monthly', color: '#be185d' },
];

function MiniChart({ id, color }) {
  const h = 80;
  switch (id) {
    case 1: case 5: case 6: case 11: {
      const data = id === 6 ? makePrecRecall() : id === 5 ? makeRoc() : id === 11 ? makeLossData() : makeLineData();
      const k1 = Object.keys(data[0])[1];
      const k2 = Object.keys(data[0])[2];
      return (
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <Line type="monotone" dataKey={k1} stroke={color} strokeWidth={1.5} dot={false} />
            {k2 && <Line type="monotone" dataKey={k2} stroke="#94a3b8" strokeWidth={1} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      );
    }
    case 2: case 7: case 12: {
      const data = id === 2 ? makeBinData() : id === 7 ? makeBarData() : makePsiData();
      const dk = id === 7 ? 'mape' : id === 12 ? 'psi' : 'value';
      const nameKey = id === 7 ? 'store' : id === 12 ? 'feat' : 'name';
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} layout={id === 2 ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 4, left: id === 2 ? -10 : -30, bottom: 0 }}>
            {id === 2 ? <><XAxis type="number" tick={false} /><YAxis type="category" dataKey={nameKey} tick={{ fontSize: 8 }} width={40} /></> : <><XAxis dataKey={nameKey} tick={{ fontSize: 8 }} /><YAxis tick={false} /></>}
            <Bar dataKey={dk} fill={color} radius={2} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 3: case 8: {
      const data = makeHistData();
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <XAxis dataKey="bin" tick={false} />
            <Bar dataKey="count" fill={color} radius={1} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 4: {
      const matrix = makeHeatmapData();
      const labels = ['A', 'B', 'C', 'D'];
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, height: h, padding: 4 }}>
          {matrix.map((row, ri) => row.map((v, ci) => (
            <div key={`${ri}-${ci}`} style={{ background: `rgba(245,158,11,${v})`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: v > 0.5 ? '#fff' : '#374151', fontWeight: 700 }}>{v > 0 ? v.toFixed(2) : ''}</div>
          )))}
        </div>
      );
    }
    case 9: {
      const feats = ['A', 'B', 'C', 'D', 'E'];
      const vals = feats.map(() => feats.map(() => +(Math.random()).toFixed(2)));
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${feats.length}, 1fr)`, gap: 1, height: h, padding: 4 }}>
          {vals.map((row, ri) => row.map((v, ci) => (
            <div key={`${ri}-${ci}`} style={{ background: `rgba(168,85,247,${v})`, borderRadius: 1 }} />
          )))}
        </div>
      );
    }
    case 10: {
      const data = makePieData();
      return (
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={35}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }
    case 13: {
      const data = makeGrpBar();
      return (
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <XAxis dataKey="sku" tick={{ fontSize: 8 }} />
            <Bar dataKey="actual" fill={color} radius={2} />
            <Bar dataKey="forecast" fill="#94a3b8" radius={2} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 14: {
      const data = makeAreaData();
      return (
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <Area type="monotone" dataKey="high" fill={`${color}30`} stroke="none" />
            <Area type="monotone" dataKey="low" fill="#fff" stroke="none" />
            <Line type="monotone" dataKey="mid" stroke={color} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    case 15: {
      const data = makeMultiLine();
      return (
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <Line type="monotone" dataKey="kpi1" stroke={color} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="kpi2" stroke="#10b981" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="kpi3" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    default:
      return <div style={{ height: h, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>Preview</div>;
  }
}

function VisualizationsCatalog() {
  return (
    <div>
      <div className="content-section">
        <SectionHeader title="Complete Visualizations Catalog" subtitle="15 charts available for this process — all generated from real model/pipeline data" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
          {CHART_CATALOG.map((chart) => (
            <div key={chart.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>#{chart.id} {chart.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{chart.type}</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${chart.color}15`, color: chart.color, fontWeight: 600 }}>{chart.freq}</span>
              </div>
              <div style={{ padding: '8px 14px', background: '#f8fafc' }}>
                <MiniChart id={chart.id} color={chart.color} />
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}><strong>Purpose:</strong> {chart.purpose}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}><strong>Source:</strong> {chart.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 3: DATA SOURCE REPORT
   ================================================================ */
const DATA_SOURCES = [
  { source: 'SAP S/4HANA',       type: 'Transactional', format: 'OData API',  size: '4.2 GB', freshness: 'Real-time', quality: 97, owner: 'IT / ERP Team' },
  { source: 'Oracle Planning',    type: 'Planning',      format: 'REST API',   size: '1.1 GB', freshness: 'Daily',     quality: 95, owner: 'Finance' },
  { source: 'Retail POS',         type: 'Transactional', format: 'CSV/SFTP',   size: '8.7 GB', freshness: 'Daily',     quality: 92, owner: 'Sales Ops' },
  { source: 'WMS Inventory',      type: 'Operational',   format: 'JDBC',       size: '2.3 GB', freshness: 'Hourly',    quality: 98, owner: 'DC Ops' },
  { source: 'Promotions Calendar',type: 'Reference',     format: 'Excel/API',  size: '45 MB',  freshness: 'Weekly',    quality: 94, owner: 'Trade Marketing' },
  { source: 'Weather API',        type: 'External',      format: 'REST JSON',  size: '120 MB', freshness: 'Daily',     quality: 96, owner: 'Vendor (Open-Meteo)' },
  { source: 'Social Trends',      type: 'External',      format: 'REST JSON',  size: '80 MB',  freshness: 'Weekly',    quality: 88, owner: 'Digital Marketing' },
  { source: 'Product Master',     type: 'Reference',     format: 'Database',   size: '210 MB', freshness: 'On change', quality: 99, owner: 'MDM Team' },
];

const DATA_QUALITY = [
  { dimension: 'Completeness', score: 98.2, detail: '1.8% null rate across 45M records — primary gaps in weather data for rural stores' },
  { dimension: 'Accuracy',     score: 96.5, detail: 'Cross-validated against 3rd-party sales data; 3.5% systematic bias in POS channel' },
  { dimension: 'Consistency',  score: 97.8, detail: 'Minor SKU code inconsistencies between SAP and Oracle — 420 mappings resolved' },
  { dimension: 'Timeliness',   score: 94.1, detail: 'Average data lag 2.1 hours; target <1 hour for ERP feeds' },
  { dimension: 'Uniqueness',   score: 99.7, detail: '0.3% duplicate transaction rate — de-duplication applied at ingestion' },
  { dimension: 'Validity',     score: 97.3, detail: 'All fields pass schema validation; 2.7% corrected via business rules' },
];

const DATA_ATTRIBUTES = [
  { col: 'transaction_date', type: 'DATE',    desc: 'Sale transaction date', source: 'SAP',      nullable: 'No',  pii: 'No',  rule: 'Must be <= current date' },
  { col: 'sku_code',         type: 'VARCHAR', desc: 'Stock keeping unit ID', source: 'Product Master', nullable: 'No', pii: 'No', rule: 'Must exist in product master' },
  { col: 'store_id',         type: 'INT',     desc: 'Retail store identifier', source: 'SAP',   nullable: 'No',  pii: 'No',  rule: 'Valid store in org hierarchy' },
  { col: 'quantity_sold',    type: 'INT',     desc: 'Units sold in period', source: 'POS',       nullable: 'No',  pii: 'No',  rule: '>= 0' },
  { col: 'gross_revenue',    type: 'DECIMAL', desc: 'Revenue before discounts', source: 'SAP',  nullable: 'No',  pii: 'No',  rule: '>= 0' },
  { col: 'unit_price',       type: 'DECIMAL', desc: 'Selling price per unit', source: 'SAP',    nullable: 'No',  pii: 'No',  rule: '> 0' },
  { col: 'promotion_flag',   type: 'BOOLEAN', desc: 'Whether a promo was active', source: 'Promo Cal.', nullable: 'Yes', pii: 'No', rule: 'Null = no promotion' },
  { col: 'promo_depth_pct',  type: 'DECIMAL', desc: 'Discount % during promo', source: 'Promo Cal.', nullable: 'Yes', pii: 'No', rule: '0-100' },
  { col: 'inventory_on_hand',type: 'INT',     desc: 'Units in DC at run time', source: 'WMS',   nullable: 'No',  pii: 'No',  rule: '>= 0' },
  { col: 'reorder_point',    type: 'INT',     desc: 'Reorder trigger level', source: 'SAP',     nullable: 'Yes', pii: 'No',  rule: 'Must be set for top 500 SKUs' },
  { col: 'weather_temp_c',   type: 'FLOAT',   desc: 'Avg daily temperature', source: 'Weather API', nullable: 'Yes', pii: 'No', rule: '-50 to 60' },
  { col: 'weather_rain_mm',  type: 'FLOAT',   desc: 'Daily rainfall (mm)', source: 'Weather API', nullable: 'Yes', pii: 'No', rule: '>= 0' },
  { col: 'customer_segment', type: 'VARCHAR', desc: 'Customer tier (A/B/C)', source: 'CRM',    nullable: 'Yes', pii: 'No',  rule: 'Enum: A, B, C, Unknown' },
  { col: 'channel',          type: 'VARCHAR', desc: 'Sales channel', source: 'SAP',             nullable: 'No',  pii: 'No',  rule: 'Enum: retail, DTC, wholesale' },
  { col: 'region_code',      type: 'VARCHAR', desc: 'Distribution region', source: 'Org Master', nullable: 'No', pii: 'No', rule: 'N/S/E/W/Central' },
  { col: 'social_score',     type: 'FLOAT',   desc: 'Social media trend index', source: 'Social API', nullable: 'Yes', pii: 'No', rule: '0.0 to 1.0' },
  { col: 'created_at',       type: 'TIMESTAMP', desc: 'Row creation timestamp', source: 'Pipeline', nullable: 'No', pii: 'No', rule: 'Auto-populated' },
  { col: 'updated_at',       type: 'TIMESTAMP', desc: 'Last update timestamp', source: 'Pipeline', nullable: 'No', pii: 'No', rule: 'Auto-populated' },
];

const DATA_VOLUME = [
  { period: 'Daily',   records: '420K',  size: '1.8 GB', growth: '+2.1%/mo' },
  { period: 'Weekly',  records: '2.9M',  size: '12.4 GB', growth: '+2.1%/mo' },
  { period: 'Monthly', records: '12.6M', size: '54 GB',   growth: '+2.1%/mo' },
  { period: 'Yearly',  records: '151M',  size: '648 GB',  growth: '+25%/yr' },
];

function DataSourceReport() {
  return (
    <div>
      {/* Source Inventory */}
      <div className="content-section">
        <SectionHeader title="Source Inventory" subtitle="All data sources feeding this process" />
        <TableWrapper>
          <thead>
            <tr>
              {['Source', 'Type', 'Format', 'Size', 'Freshness', 'Quality Score', 'Owner'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {DATA_SOURCES.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><strong>{s.source}</strong></Td>
                <Td>{s.type}</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.format}</Td>
                <Td>{s.size}</Td>
                <Td>{s.freshness}</Td>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                      <div style={{ width: `${s.quality}%`, height: '100%', background: s.quality >= 97 ? '#22c55e' : s.quality >= 93 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{s.quality}%</span>
                  </div>
                </Td>
                <Td>{s.owner}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Data Quality Report */}
      <div className="content-section">
        <SectionHeader title="Data Quality Report" subtitle="6 quality dimensions — ISO 8000 framework" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
          {DATA_QUALITY.map((q) => {
            const color = q.score >= 97 ? '#22c55e' : q.score >= 94 ? '#f59e0b' : '#ef4444';
            return (
              <div key={q.dimension} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: `1px solid ${color}30`, background: `${color}06` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{q.dimension}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color }}>{q.score}%</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, marginBottom: 8 }}>
                  <div style={{ width: `${q.score}%`, height: '100%', background: color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{q.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Attributes Catalog */}
      <div className="content-section">
        <SectionHeader title="Data Attributes Catalog" subtitle={`${DATA_ATTRIBUTES.length} columns documented`} />
        <TableWrapper>
          <thead>
            <tr>
              {['Column', 'Type', 'Description', 'Source', 'Nullable', 'PII', 'Business Rule'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {DATA_ATTRIBUTES.map((a, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{a.col}</code></Td>
                <Td><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{a.type}</span></Td>
                <Td>{a.desc}</Td>
                <Td>{a.source}</Td>
                <Td>{statusBadge(a.nullable === 'Yes' ? 'Amber' : 'Green')}</Td>
                <Td>{statusBadge(a.pii === 'Yes' ? 'Red' : 'Green')}</Td>
                <Td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.rule}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Data Lineage */}
      <div className="content-section">
        <SectionHeader title="Data Lineage" subtitle="End-to-end data flow from source to model" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '12px 0' }}>
          {[
            { label: 'Source Systems', sub: 'SAP, Oracle, POS, WMS', icon: '🗄️', color: '#3b82f6' },
            { label: 'Ingestion Layer', sub: 'Kafka + Airflow DAGs', icon: '⬇️', color: '#8b5cf6' },
            { label: 'Transform (dbt)', sub: 'Clean, normalize, join', icon: '⚙️', color: '#f59e0b' },
            { label: 'Feature Store', sub: 'Redis + Feast', icon: '🧩', color: '#10b981' },
            { label: 'ML Model', sub: 'XGBoost ensemble', icon: '🤖', color: '#ef4444' },
            { label: 'Forecast Output', sub: 'API + Dashboard', icon: '📊', color: '#06b6d4' },
          ].map((step, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ padding: '14px 18px', borderRadius: 'var(--border-radius-lg)', background: `${step.color}10`, border: `1.5px solid ${step.color}40`, textAlign: 'center', minWidth: 130 }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{step.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: step.color }}>{step.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && <div style={{ fontSize: 20, color: 'var(--text-muted)', padding: '0 8px' }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Reference Data */}
      <div className="content-section">
        <SectionHeader title="Reference Data" subtitle="Lookup tables, master data, and external sources" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
          {[
            { name: 'Product Master', type: 'Internal', rows: '3,240 SKUs', owner: 'MDM Team', freshness: 'On change' },
            { name: 'Store Hierarchy', type: 'Internal', rows: '850 stores', owner: 'IT', freshness: 'Monthly' },
            { name: 'Customer Segments', type: 'Internal', rows: '5 segments', owner: 'Marketing', freshness: 'Quarterly' },
            { name: 'Holiday Calendar', type: 'External', rows: '240 events/yr', owner: 'Trade Mktg', freshness: 'Annual' },
            { name: 'Currency Rates', type: 'External', rows: 'Daily feed', owner: 'Finance', freshness: 'Daily' },
            { name: 'Geocode Mapping', type: 'External', rows: '850 stores', owner: 'IT', freshness: 'Annual' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: 'var(--border-radius)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', marginBottom: 6 }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: r.type === 'External' ? '#dbeafe' : '#d1fae5', color: r.type === 'External' ? '#1e40af' : '#065f46', fontWeight: 600 }}>{r.type}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.rows}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Owner: {r.owner} | Refresh: {r.freshness}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Volume */}
      <div className="content-section">
        <SectionHeader title="Data Volume Metrics" subtitle="Volume, size, and growth rate" />
        <TableWrapper>
          <thead>
            <tr>
              {['Period', 'Records Processed', 'Data Size', 'Growth Rate'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {DATA_VOLUME.map((v, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><strong>{v.period}</strong></Td>
                <Td>{v.records}</Td>
                <Td>{v.size}</Td>
                <Td><span style={{ color: '#22c55e', fontWeight: 700 }}>{v.growth}</span></Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 4: TECH STACK & REQUIREMENTS
   ================================================================ */
const TECH_STACK = [
  { layer: 'Ingestion',       tech: 'Apache Kafka',          version: '3.7.0',   purpose: 'Real-time event streaming from ERP/POS',         license: 'Apache 2.0' },
  { layer: 'Orchestration',   tech: 'Apache Airflow',        version: '2.9.1',   purpose: 'DAG-based pipeline scheduling & monitoring',     license: 'Apache 2.0' },
  { layer: 'Transform',       tech: 'dbt Core',              version: '1.8.0',   purpose: 'SQL-based data transformation & lineage',        license: 'Apache 2.0' },
  { layer: 'Storage',         tech: 'PostgreSQL',            version: '16.2',    purpose: 'Primary data warehouse and metadata store',      license: 'PostgreSQL' },
  { layer: 'Feature Store',   tech: 'Feast',                 version: '0.40.0',  purpose: 'Feature registry, serving, and versioning',      license: 'Apache 2.0' },
  { layer: 'Caching',         tech: 'Redis',                 version: '7.2.4',   purpose: 'Low-latency feature retrieval (<10ms)',          license: 'BSD 3-Clause' },
  { layer: 'ML Framework',    tech: 'scikit-learn',          version: '1.4.2',   purpose: 'Preprocessing pipelines, evaluation metrics',    license: 'BSD 3-Clause' },
  { layer: 'Boosting',        tech: 'XGBoost',               version: '2.0.3',   purpose: 'Primary forecasting model (gradient boosting)',  license: 'Apache 2.0' },
  { layer: 'Boosting',        tech: 'LightGBM',              version: '4.3.0',   purpose: 'Ensemble member — fast tree-based learning',     license: 'MIT' },
  { layer: 'Time Series',     tech: 'Prophet',               version: '1.1.5',   purpose: 'Seasonal decomposition and holiday effects',     license: 'MIT' },
  { layer: 'Experiment Track',tech: 'MLflow',                version: '2.12.1',  purpose: 'Model registry, experiment tracking, artifacts', license: 'Apache 2.0' },
  { layer: 'API Framework',   tech: 'FastAPI',               version: '0.111.0', purpose: 'REST API serving forecast results',              license: 'MIT' },
  { layer: 'Serving',         tech: 'Uvicorn',               version: '0.29.0',  purpose: 'ASGI server for production API',                 license: 'BSD 3-Clause' },
  { layer: 'Monitoring',      tech: 'Prometheus + Grafana',  version: 'latest',  purpose: 'Metrics, alerts, drift dashboards',              license: 'Apache 2.0' },
  { layer: 'Data Validation', tech: 'Great Expectations',    version: '0.18.14', purpose: 'Automated data quality checks in pipeline',      license: 'Apache 2.0' },
];

const REQUIREMENTS_TXT = `# Core API
fastapi>=0.110.0,<0.112.0
uvicorn[standard]>=0.27.0,<0.30.0
pydantic>=2.6.0,<3.0.0
httpx>=0.27.0,<0.28.0

# Data processing
pandas>=2.2.0,<3.0.0
numpy>=1.26.0,<2.0.0
pyarrow>=16.0.0,<17.0.0

# ML / Forecasting
scikit-learn>=1.4.0,<2.0.0
xgboost>=2.0.0,<3.0.0
lightgbm>=4.3.0,<5.0.0
prophet>=1.1.5,<2.0.0
shap>=0.45.0,<0.46.0

# Database
psycopg2-binary>=2.9.9,<3.0.0
sqlalchemy>=2.0.0,<3.0.0
alembic>=1.13.0,<2.0.0

# Task queue
celery[redis]>=5.3.0,<6.0.0
redis>=5.0.0,<6.0.0

# MLOps
mlflow>=2.12.0,<3.0.0
feast>=0.40.0,<0.41.0

# Observability
prometheus-client>=0.20.0,<0.21.0
structlog>=24.1.0,<25.0.0

# Security
python-jose[cryptography]>=3.3.0,<4.0.0
passlib[bcrypt]>=1.7.4,<2.0.0
cryptography>=42.0.0,<43.0.0

# Utils
python-dotenv>=1.0.0,<2.0.0
tenacity>=8.2.0,<9.0.0
pydantic-settings>=2.2.0,<3.0.0`;

const INFRA_REQS = [
  { component: 'API Server',           requirement: 'Compute',  spec: '8 vCPU, 32 GB RAM, t3.2xlarge or equivalent' },
  { component: 'Training Worker',      requirement: 'Compute',  spec: '16 vCPU, 64 GB RAM — CPU-optimised (r6i.4xlarge)' },
  { component: 'PostgreSQL',           requirement: 'Storage',  spec: '500 GB SSD, IOPS ≥3000, Multi-AZ RDS' },
  { component: 'Redis Cache',          requirement: 'Memory',   spec: '8 GB RAM, ElastiCache r7g.large' },
  { component: 'Kafka Cluster',        requirement: 'Network',  spec: '3-broker cluster, 1 Gbps throughput, MSK' },
  { component: 'Airflow',              requirement: 'Compute',  spec: '4 vCPU, 16 GB RAM, 2 workers' },
  { component: 'GPU (Optional)',        requirement: 'GPU',      spec: 'NVIDIA T4 for deep learning experiments only' },
  { component: 'Object Storage',       requirement: 'Storage',  spec: 'S3 / GCS: 2 TB for model artifacts and training data' },
  { component: 'Network Bandwidth',    requirement: 'Network',  spec: '1 Gbps internal; 100 Mbps external for ERP sync' },
];

function TechStackTab() {
  const [showFull, setShowFull] = useState(false);

  return (
    <div>
      {/* Tech stack table */}
      <div className="content-section">
        <SectionHeader title="Technology Stack" subtitle={`${TECH_STACK.length} components — full stack inventory`} />
        <TableWrapper>
          <thead>
            <tr>
              {['Layer', 'Technology', 'Version', 'Purpose', 'License'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {TECH_STACK.map((t, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>{t.layer}</span></Td>
                <Td><strong style={{ color: 'var(--text-primary)' }}>{t.tech}</strong></Td>
                <Td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{t.version}</code></Td>
                <Td style={{ maxWidth: 260 }}>{t.purpose}</Td>
                <Td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.license}</span></Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* requirements.txt */}
      <div className="content-section">
        <SectionHeader title="requirements.txt" subtitle="Pinned version ranges for reproducible builds" />
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#0f172a', color: '#e2e8f0', padding: '20px', borderRadius: 'var(--border-radius-lg)',
            fontSize: 12, lineHeight: 1.7, overflowX: 'auto',
            maxHeight: showFull ? 'none' : 340,
            overflow: showFull ? 'visible' : 'hidden',
          }}>
            {REQUIREMENTS_TXT}
          </pre>
          {!showFull && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, #0f172a)', borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 12 }}>
              <button onClick={() => setShowFull(true)} style={{ padding: '6px 18px', borderRadius: 20, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Show full requirements.txt</button>
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure requirements */}
      <div className="content-section">
        <SectionHeader title="Infrastructure Requirements" subtitle="Compute, memory, storage, and network specifications" />
        <TableWrapper>
          <thead>
            <tr>
              {['Component', 'Requirement Type', 'Specification'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {INFRA_REQS.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><strong>{r.component}</strong></Td>
                <Td><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#ede9fe', color: '#5b21b6', fontWeight: 600 }}>{r.requirement}</span></Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.spec}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Environment config table */}
      <div className="content-section">
        <SectionHeader title="Environment Configuration" subtitle="Key environment variables required" />
        <TableWrapper>
          <thead>
            <tr>
              {['Variable', 'Required', 'Example Value', 'Description'].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { var: 'DATABASE_URL',       req: 'Yes', example: 'postgresql://user:pass@host:5432/db', desc: 'Primary PostgreSQL connection string' },
              { var: 'REDIS_URL',          req: 'Yes', example: 'redis://localhost:6379/0',           desc: 'Redis connection for feature caching and Celery broker' },
              { var: 'MLFLOW_TRACKING_URI',req: 'Yes', example: 'http://mlflow:5000',                desc: 'MLflow server for experiment tracking' },
              { var: 'FEAST_REPO_PATH',    req: 'Yes', example: '/app/feature_repo',                 desc: 'Path to Feast feature store repo' },
              { var: 'MODEL_S3_BUCKET',    req: 'Yes', example: 's3://cpg-models/demand-forecast',   desc: 'S3 bucket for model artifact storage' },
              { var: 'SAP_API_BASE_URL',   req: 'Yes', example: 'https://sap.internal/odata/v2',    desc: 'SAP S/4HANA OData API base URL' },
              { var: 'API_KEY',            req: 'Yes', example: '***',                               desc: 'Service API key (never hardcode)' },
              { var: 'CELERY_CONCURRENCY', req: 'No',  example: '4',                                 desc: 'Number of Celery worker threads' },
              { var: 'LOG_LEVEL',          req: 'No',  example: 'INFO',                              desc: 'Logging verbosity (DEBUG/INFO/WARNING/ERROR)' },
              { var: 'RATE_LIMIT',         req: 'No',  example: '100',                               desc: 'API rate limit per IP per minute' },
            ].map((e, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                <Td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{e.var}</code></Td>
                <Td>{statusBadge(e.req === 'Yes' ? 'Critical' : 'Low')}</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{e.example}</Td>
                <Td>{e.desc}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Deployment architecture */}
      <div className="content-section">
        <SectionHeader title="Deployment Architecture Summary" subtitle="Production topology" />
        <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', lineHeight: 1.8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Ingestion layer:</strong> SAP/Oracle/POS data streams into Kafka topics via custom connectors. Airflow DAGs trigger hourly batch jobs for WMS and reference data.</p>
          <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Processing layer:</strong> dbt transforms raw data into analytics-ready tables in PostgreSQL. Great Expectations validates data quality at each stage and fires alerts on failure.</p>
          <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Feature layer:</strong> Feast materialises features from PostgreSQL into Redis for low-latency online serving. Historical features retrieved from PostgreSQL offline store for training.</p>
          <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Model layer:</strong> XGBoost + LightGBM + Prophet ensemble trained weekly via Celery tasks. MLflow tracks all experiments, registers production models, and manages promotion through staging to production.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Serving layer:</strong> FastAPI exposes /forecast, /score, and /explain endpoints. Prometheus collects metrics; Grafana dashboards monitor drift, latency, and accuracy in real time.</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export default function ProcessReportsTab({ process, dept }) {
  const [activeTab, setActiveTab] = useState('executive');

  return (
    <TabShell
      tabName="reports"
      title="Reports · list + cadence + last-run + download"
      phase="Operate"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P2"
      information="report list · cadence · recipients · format · history"
      operation="read-only · populate report list"
      accent="#10b981"
      todos={[]}
    >
    <div>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 'var(--spacing-md)',
        borderBottom: '2px solid var(--border-color)', paddingBottom: 0,
        overflowX: 'auto',
      }}>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', border: 'none', borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              marginBottom: -2, flexShrink: 0,
            }}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeTab === 'executive' && <ExecutiveSummary />}
      {activeTab === 'visuals' && <VisualizationsCatalog />}
      {activeTab === 'data' && <DataSourceReport />}
      {activeTab === 'techstack' && <TechStackTab />}
    </div>
    </TabShell>
  );
}
