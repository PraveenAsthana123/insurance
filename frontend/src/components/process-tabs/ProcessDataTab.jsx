import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, Legend,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ---- DATA INFO MAP (from original) ---- */
const DATA_INFO = {
  'demand-forecasting': { size: '2.4 GB', rows: '3,000,000', columns: 33, format: 'CSV / Parquet', path: 'data/kaggle/sales/train.csv' },
  'price-elasticity': { size: '850 MB', rows: '1,200,000', columns: 18, format: 'CSV', path: 'data/kaggle/sales/transactions.csv' },
  'promo-uplift': { size: '1.1 GB', rows: '1,800,000', columns: 22, format: 'CSV', path: 'data/kaggle/sales/train.csv' },
  'inventory-optimization': { size: '560 MB', rows: '800,000', columns: 15, format: 'CSV', path: 'data/kaggle/supply_chain/inventory.csv' },
  'safety-stock': { size: '340 MB', rows: '500,000', columns: 12, format: 'CSV', path: 'data/kaggle/supply_chain/stock_levels.csv' },
  'route-optimization': { size: '720 MB', rows: '950,000', columns: 20, format: 'CSV', path: 'data/kaggle/logistics/shipments.csv' },
  'production-planning': { size: '1.5 GB', rows: '2,100,000', columns: 28, format: 'CSV / Parquet', path: 'data/kaggle/manufacturing/sensor_data.csv' },
  'predictive-maintenance': { size: '980 MB', rows: '1,400,000', columns: 25, format: 'CSV', path: 'data/kaggle/maintenance/equipment.csv' },
  'shelf-optimization': { size: '450 MB', rows: '650,000', columns: 16, format: 'CSV', path: 'data/kaggle/retail/transactions.csv' },
  'customer-segmentation': { size: '120 MB', rows: '200,000', columns: 11, format: 'CSV', path: 'data/kaggle/customer/customers.csv' },
  'revenue-forecasting': { size: '380 MB', rows: '550,000', columns: 14, format: 'CSV', path: 'data/kaggle/finance/financial_data.csv' },
  'supplier-scoring': { size: '210 MB', rows: '300,000', columns: 13, format: 'CSV', path: 'data/kaggle/procurement/suppliers.csv' },
  'defect-detection': { size: '3.2 GB', rows: '12,000 images', columns: 'N/A', format: 'JPG / PNG', path: 'data/kaggle/quality/casting_images/' },
  'compliance-monitoring': { size: '180 MB', rows: '250,000', columns: 18, format: 'CSV / JSON', path: 'data/kaggle/governance/food_enforcement.csv' },
};
const DEFAULT_DATA = { size: '500 MB', rows: '750,000', columns: 15, format: 'CSV', path: 'data/kaggle/default/data.csv' };

const BEFORE_ROWS = [
  { field: 'Data Source', value: 'Manual spreadsheets / ERP export' },
  { field: 'Update Frequency', value: 'Weekly batch, 3-day lag' },
  { field: 'Format', value: 'Excel (.xlsx), no schema validation' },
  { field: 'Data Quality', value: 'Missing values ~15%, duplicates ~5%' },
  { field: 'Accessibility', value: 'Email distribution, no versioning' },
];

const AFTER_ROWS = [
  { field: 'Data Source', value: 'Automated pipeline from ERP + API' },
  { field: 'Update Frequency', value: 'Real-time / daily refresh' },
  { field: 'Format', value: 'Parquet + Delta Lake, schema enforced' },
  { field: 'Data Quality', value: 'Automated validation, <0.5% issues' },
  { field: 'Accessibility', value: 'API + dashboard, versioned datasets' },
];

/* ---- Sample EDA data generators ---- */
function generateColumnStats() {
  const columns = ['sales_qty', 'price', 'promo_flag', 'store_id', 'date', 'category', 'brand', 'region', 'discount_pct', 'sku_id'];
  const types = ['numeric', 'numeric', 'categorical', 'categorical', 'datetime', 'categorical', 'categorical', 'categorical', 'numeric', 'categorical'];
  return columns.map((col, i) => ({
    name: col,
    type: types[i],
    missing: Math.floor(Math.random() * 8),
    unique: types[i] === 'numeric' ? null : Math.floor(Math.random() * 500 + 10),
    mean: types[i] === 'numeric' ? (Math.random() * 100 + 5).toFixed(2) : null,
    std: types[i] === 'numeric' ? (Math.random() * 20 + 1).toFixed(2) : null,
  }));
}

function generateDistribData() {
  return Array.from({ length: 12 }, (_, i) => ({
    bin: `${i * 8}-${(i + 1) * 8}`,
    count: Math.floor(Math.random() * 8000 + 500),
  }));
}

function generateMissingData(cols) {
  return cols.map((c) => ({ name: c.name, missing: c.missing }));
}

function generateCorrelation() {
  const cols = ['sales', 'price', 'promo', 'discount', 'season'];
  return cols.map((row) =>
    cols.reduce((acc, col) => {
      const v = row === col ? 1 : parseFloat((Math.random() * 2 - 1).toFixed(2));
      return { ...acc, [col]: v };
    }, { name: row })
  );
}

function generateSummaryStats(cols) {
  return cols.filter((c) => c.type === 'numeric').map((c) => ({
    column: c.name,
    mean: c.mean,
    std: c.std,
    min: (parseFloat(c.mean) - parseFloat(c.std) * 2).toFixed(2),
    max: (parseFloat(c.mean) + parseFloat(c.std) * 3).toFixed(2),
    median: (parseFloat(c.mean) + (Math.random() - 0.5) * 2).toFixed(2),
    skewness: (Math.random() * 2 - 1).toFixed(3),
    kurtosis: (Math.random() * 3 + 0.5).toFixed(3),
  }));
}

function generateClassDist() {
  return [
    { name: 'Class A', value: Math.floor(Math.random() * 4000 + 3000) },
    { name: 'Class B', value: Math.floor(Math.random() * 2000 + 1000) },
    { name: 'Class C', value: Math.floor(Math.random() * 1500 + 500) },
    { name: 'Other', value: Math.floor(Math.random() * 800 + 200) },
  ];
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function corrColor(v) {
  const abs = Math.abs(v);
  if (abs >= 0.7) return v > 0 ? '#065f46' : '#7f1d1d';
  if (abs >= 0.4) return v > 0 ? '#047857' : '#b91c1c';
  return '#6b7280';
}

function corrBg(v) {
  const abs = Math.abs(v);
  if (abs >= 0.7) return v > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)';
  if (abs >= 0.4) return v > 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)';
  return 'rgba(107,114,128,0.08)';
}

/* ---- Data Operations ---- */
const DATA_OPS = [
  {
    id: 'normalize',
    icon: '📐',
    title: 'Normalization (Min-Max)',
    desc: 'Scales features to [0, 1] range.',
    before: { label: 'Raw Range', value: '0.8 – 9,847', sub: 'sales_qty: raw' },
    after: { label: 'Scaled Range', value: '0.000 – 1.000', sub: 'sales_qty: normalized' },
  },
  {
    id: 'standardize',
    icon: '📊',
    title: 'Standardization (Z-score)',
    desc: 'Transforms to mean=0, std=1.',
    before: { label: 'Mean / Std', value: '324.5 / 87.2', sub: 'price: original' },
    after: { label: 'Mean / Std', value: '0.000 / 1.000', sub: 'price: z-scored' },
  },
  {
    id: 'outliers-detect',
    icon: '🔍',
    title: 'Outlier Detection (IQR)',
    desc: 'Detects points outside 1.5×IQR.',
    before: { label: 'Total Rows', value: '750,000', sub: 'all data' },
    after: { label: 'Outliers Found', value: `${Math.floor(Math.random() * 800 + 200).toLocaleString()}`, sub: '~0.11% of data' },
  },
  {
    id: 'outliers-clean',
    icon: '🧹',
    title: 'Outlier Cleaning (Cap)',
    desc: 'Caps values at 99th percentile.',
    before: { label: 'Before / Max', value: '9,847 raw max', sub: 'sales_qty: uncapped' },
    after: { label: 'After / Max', value: '850 capped max', sub: 'sales_qty: capped' },
  },
  {
    id: 'missing',
    icon: '🩹',
    title: 'Missing Value Handling',
    desc: 'Fills nulls with column median.',
    before: { label: 'Missing Count', value: `${Math.floor(Math.random() * 4000 + 1000).toLocaleString()}`, sub: 'across 3 columns' },
    after: { label: 'Missing After', value: '0', sub: 'median imputation applied' },
  },
  {
    id: 'bias',
    icon: '⚖️',
    title: 'Bias Detection',
    desc: 'Checks class imbalance ratio.',
    before: { label: 'Imbalance Ratio', value: '8.4 : 1', sub: 'majority : minority' },
    after: { label: 'Status', value: 'Flagged', sub: 'SMOTE recommended' },
  },
  {
    id: 'balance',
    icon: '🔄',
    title: 'Data Balancing (SMOTE)',
    desc: 'Synthetic minority oversampling.',
    before: { label: 'Class Counts', value: '8,400 / 1,000', sub: 'majority / minority' },
    after: { label: 'After SMOTE', value: '8,400 / 7,560', sub: 'balanced to 90%' },
  },
];

/* ---- Graph list ---- */
function FeatureImportanceChart() {
  const data = [
    { name: 'hist_sales', value: 34 },
    { name: 'promo_flag', value: 28 },
    { name: 'season_idx', value: 18 },
    { name: 'price_elast', value: 12 },
    { name: 'competitor', value: 8 },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
        <Tooltip />
        <Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TimeSeriesChart() {
  const data = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    value: Math.floor(Math.random() * 2000 + 3000),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="var(--accent-purple)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---- Component ---- */
export default function ProcessDataTab({ process, dept }) {
  const dataInfo = DATA_INFO[process.id] || DEFAULT_DATA;

  const [customPath, setCustomPath] = useState('');
  const [activePath, setActivePath] = useState(dataInfo.path);
  const [opsRan, setOpsRan] = useState({});
  const [activeSection, setActiveSection] = useState('source');

  const colStats = useMemo(() => generateColumnStats(), []);
  const distrib = useMemo(() => generateDistribData(), []);
  const missingData = useMemo(() => generateMissingData(colStats), [colStats]);
  const corrMatrix = useMemo(() => generateCorrelation(), []);
  const summaryStats = useMemo(() => generateSummaryStats(colStats), [colStats]);
  const classDist = useMemo(() => generateClassDist(), []);

  function runOp(id) {
    setOpsRan((prev) => ({ ...prev, [id]: 'running' }));
    setTimeout(() => setOpsRan((prev) => ({ ...prev, [id]: 'done' })), 1200 + Math.random() * 600);
  }

  const handleSetPath = () => { if (customPath.trim()) setActivePath(customPath.trim()); };

  const sections = [
    { id: 'source', label: 'Data Source' },
    { id: 'eda', label: 'EDA' },
    { id: 'ops', label: 'Data Operations' },
    { id: 'types', label: 'Data Types' },
    { id: 'charts', label: 'Charts' },
  ];

  const corrCols = corrMatrix.map((r) => r.name);

  <TabShell
      tabName="data"
      title="Data · sources + schemas + samples + stats"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="data sources · schema · sample 10 rows · row counts · privacy class"
      operation="read-only · per-proc data refs pending"
      accent="#0ea5e9"
      todos={[]}
    >
      return (
    <div>
      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)',
              background: activeSection === s.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: activeSection === s.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ---- DATA SOURCE ---- */}
      {activeSection === 'source' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🗂️ Data Source Information</span>
            </div>
            <div className="kpi-row">
              {[
                { label: 'Data Size', value: dataInfo.size },
                { label: 'Total Rows', value: dataInfo.rows },
                { label: 'Columns', value: dataInfo.columns },
                { label: 'Format', value: dataInfo.format },
              ].map((k) => (
                <div key={k.label} className="kpi-mini">
                  <div className="kpi-mini-label">{k.label}</div>
                  <div className="kpi-mini-value">{k.value}</div>
                </div>
              ))}
            </div>
            <div className="table-wrapper" style={{ marginTop: 'var(--spacing-md)' }}>
              <table className="data-table">
                <thead><tr><th>Property</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td style={{ fontWeight: 500 }}>Data Type</td>
                    <td>{dataInfo.format.includes('JPG') ? 'Image' : dataInfo.format.includes('JSON') ? 'Text / Structured' : 'Structured (Tabular)'}</td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Active Data Path</td>
                    <td><code style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4, fontSize: 'var(--font-size-xs)' }}>{activePath}</code></td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Default Kaggle Path</td>
                    <td><code style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4, fontSize: 'var(--font-size-xs)' }}>{dataInfo.path}</code></td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Department</td><td>{dept?.name || 'N/A'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📂 Use Your Own Data</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter path to your data file (e.g., /home/user/my_sales_data.csv)"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSetPath}>Set Path</button>
              <button className="btn btn-secondary" onClick={() => { setCustomPath(''); setActivePath(dataInfo.path); }}>Reset</button>
            </div>
            {activePath !== dataInfo.path && (
              <div style={{ marginTop: 'var(--spacing-sm)', padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)' }}>
                Using custom data path: <strong>{activePath}</strong>
              </div>
            )}
          </div>

          <div className="before-after-grid">
            <div className="before-after-card before-card">
              <div className="before-after-header">⚠️ Data State: Before</div>
              <div className="before-after-body">
                {BEFORE_ROWS.map((r, i) => (
                  <div key={i} className="ba-metric-row">
                    <span className="ba-metric-label">{r.field}</span>
                    <span className="ba-metric-value" style={{ fontSize: 'var(--font-size-xs)', maxWidth: 200, textAlign: 'right' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="before-after-card after-card">
              <div className="before-after-header">✅ Data State: After</div>
              <div className="before-after-body">
                {AFTER_ROWS.map((r, i) => (
                  <div key={i} className="ba-metric-row">
                    <span className="ba-metric-label">{r.field}</span>
                    <span className="ba-metric-value" style={{ fontSize: 'var(--font-size-xs)', maxWidth: 200, textAlign: 'right' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📋 Process Inputs</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>#</th><th>Input Data</th><th>Source</th><th>Frequency</th></tr></thead>
                <tbody>
                  {process.inputs.split(',').map((inp, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{inp.trim()}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>ERP / Data Lake</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Daily</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- EDA ---- */}
      {activeSection === 'eda' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📐 Dataset Shape</span>
            </div>
            <div className="kpi-row">
              {[
                { label: 'Rows', value: dataInfo.rows },
                { label: 'Columns', value: dataInfo.columns },
                { label: 'Numeric', value: `${colStats.filter((c) => c.type === 'numeric').length}` },
                { label: 'Categorical', value: `${colStats.filter((c) => c.type === 'categorical').length}` },
                { label: 'Datetime', value: `${colStats.filter((c) => c.type === 'datetime').length}` },
              ].map((k) => (
                <div key={k.label} className="kpi-mini">
                  <div className="kpi-mini-label">{k.label}</div>
                  <div className="kpi-mini-value">{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📋 Column Types & Missing Values</span>
            </div>
            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Column</th><th>Type</th><th>Missing %</th><th>Unique</th><th>Mean</th><th>Std</th>
                  </tr>
                </thead>
                <tbody>
                  {colStats.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <span style={{
                          padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          background: c.type === 'numeric' ? 'rgba(59,130,246,0.1)' : c.type === 'categorical' ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)',
                          color: c.type === 'numeric' ? 'var(--accent-primary)' : c.type === 'categorical' ? 'var(--accent-purple)' : 'var(--accent-success)',
                        }}>
                          {c.type}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: c.missing > 5 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                          {c.missing}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.unique ?? '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.mean ?? '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.std ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <div className="content-section" style={{ margin: 0 }}>
              <div className="content-section-header">
                <span className="content-section-title">📉 Missing Values per Column</span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="missing" fill="var(--accent-danger)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="content-section" style={{ margin: 0 }}>
              <div className="content-section-header">
                <span className="content-section-title">📊 Target Variable Distribution</span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distrib} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="bin" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🔗 Correlation Matrix</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <td style={{ width: 60 }} />
                    {corrCols.map((c) => (
                      <td key={c} style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', color: 'var(--text-muted)', padding: '0 4px', textTransform: 'uppercase' }}>{c}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrMatrix.map((row) => (
                    <tr key={row.name}>
                      <td style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingRight: 4 }}>{row.name}</td>
                      {corrCols.map((col) => {
                        const v = row[col];
                        return (
                          <td key={col}>
                            <div className="corr-cell" style={{ background: corrBg(v), color: corrColor(v), width: 52, height: 36 }}>
                              {v.toFixed(2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📋 Summary Statistics</span>
            </div>
            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Column</th><th>Mean</th><th>Std</th><th>Min</th><th>Median</th><th>Max</th><th>Skewness</th><th>Kurtosis</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.column}</td>
                      <td>{s.mean}</td>
                      <td>{s.std}</td>
                      <td>{s.min}</td>
                      <td>{s.median}</td>
                      <td>{s.max}</td>
                      <td style={{ color: Math.abs(parseFloat(s.skewness)) > 0.5 ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>{s.skewness}</td>
                      <td>{s.kurtosis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- DATA OPERATIONS ---- */}
      {activeSection === 'ops' && (
        <div>
          <div style={{ marginBottom: 'var(--spacing-md)', padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.15)' }}>
            Run each operation individually to see before/after transformation. Operations are applied to the active dataset path.
          </div>
          <div className="op-grid">
            {DATA_OPS.map((op) => {
              const state = opsRan[op.id];
              return (
                <div key={op.id} className="op-card">
                  <div className="op-card-header">
                    <div className="op-card-title">
                      <span>{op.icon}</span> {op.title}
                    </div>
                    <button
                      className="op-card-run-btn"
                      disabled={state === 'running'}
                      onClick={() => runOp(op.id)}
                      style={state === 'done' ? { background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)' } : {}}
                    >
                      {state === 'running' ? '⏳ Running…' : state === 'done' ? '✓ Done' : '▶ Run'}
                    </button>
                  </div>
                  <div className="op-card-body">
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 8 }}>{op.desc}</p>
                    {state && (
                      <div className="op-compare">
                        <div className="op-compare-col before">
                          <div className="op-compare-label">Before</div>
                          <div className="op-compare-value">{op.before.value}</div>
                          <div className="op-compare-sub">{op.before.sub}</div>
                        </div>
                        <div className="op-compare-col after">
                          <div className="op-compare-label">After</div>
                          <div className="op-compare-value">{state === 'running' ? '…' : op.after.value}</div>
                          <div className="op-compare-sub">{state === 'running' ? 'processing' : op.after.sub}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- DATA TYPES ---- */}
      {activeSection === 'types' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <div className="content-section" style={{ margin: 0 }}>
              <div className="content-section-header">
                <span className="content-section-title">📋 Structured Data</span>
              </div>
              <div className="table-wrapper">
                <table className="stats-table">
                  <thead><tr><th>Column</th><th>Type</th><th>Sample</th></tr></thead>
                  <tbody>
                    {colStats.slice(0, 6).map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 700 }}>{c.type}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {c.type === 'numeric' ? (Math.random() * 100).toFixed(1) : c.type === 'datetime' ? '2024-01-15' : `CAT_${Math.floor(Math.random() * 9 + 1)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="content-section" style={{ margin: 0 }}>
              <div className="content-section-header">
                <span className="content-section-title">🥧 Class Distribution</span>
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={classDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {classDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🖼️ Data Type Summary</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              {[
                { type: 'Structured', icon: '📋', desc: 'Tabular data with rows and columns. Supports all numeric, categorical, and datetime types.', count: colStats.filter((c) => c.type !== 'image').length },
                { type: 'Unstructured', icon: '🖼️', desc: 'Text, images, or audio data. Requires NLP/CV preprocessing before modeling.', count: dataInfo.format.includes('JPG') ? 1 : 0 },
                { type: 'Time Series', icon: '📈', desc: 'Datetime-indexed data with trend and seasonality components.', count: colStats.filter((c) => c.type === 'datetime').length },
              ].map((t) => (
                <div key={t.type} style={{ flex: 1, padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>{t.type}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.desc}</div>
                  <div style={{ marginTop: 8, fontWeight: 700, color: t.count > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{t.count} columns</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- CHARTS GRID ---- */}
      {activeSection === 'charts' && (
        <div>
          <div className="eda-grid">
            <div className="eda-card">
              <div className="eda-card-title">Target Variable Distribution</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distrib.slice(0, 8)} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="bin" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--accent-primary)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Missing Values Heatmap</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingData} margin={{ top: 5, right: 5, left: -20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="missing" fill="var(--accent-danger)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Class Distribution</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={classDist} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {classDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Feature Importance Preview</div>
              <div className="eda-card-chart">
                <FeatureImportanceChart />
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Time Series Trend</div>
              <div className="eda-card-chart">
                <TimeSeriesChart />
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Outlier Box Plot (Simulated)</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Q1', value: 28, fill: '#3b82f6' },
                    { name: 'Median', value: 55, fill: '#10b981' },
                    { name: 'Q3', value: 80, fill: '#3b82f6' },
                    { name: 'Max', value: 96, fill: '#f59e0b' },
                    { name: 'Outliers', value: 12, fill: '#ef4444' },
                  ]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {[
                        { fill: '#3b82f6' }, { fill: '#10b981' }, { fill: '#3b82f6' }, { fill: '#f59e0b' }, { fill: '#ef4444' }
                      ].map((c, i) => <Cell key={i} fill={c.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Feature Correlations (Top)</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={corrMatrix.slice(0, 5).map((r) => ({ name: r.name, corr: Math.abs(r['sales'] ?? 0) }))} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={50} />
                    <Tooltip />
                    <Bar dataKey="corr" fill="var(--accent-purple)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="eda-card">
              <div className="eda-card-title">Scatter Plot (Sales vs Price)</div>
              <div className="eda-card-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" dataKey="x" name="price" tick={{ fontSize: 9 }} />
                    <YAxis type="number" dataKey="y" name="sales" tick={{ fontSize: 9 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter
                      data={Array.from({ length: 40 }, () => ({ x: Math.random() * 100 + 10, y: Math.random() * 500 + 50 }))}
                      fill="var(--accent-primary)"
                      opacity={0.6}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </TabShell>
  );
}
