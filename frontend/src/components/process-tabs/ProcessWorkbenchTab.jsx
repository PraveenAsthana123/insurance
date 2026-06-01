import { useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

/* ─── SAMPLE DATA GENERATORS ─── */
const SAMPLE_ROWS = [
  { store_id: 'S001', item_id: 'I042', date: '2015-09-15', sales: 4320, price: 12.5, promo: 1, category: 'Dairy', region: 'North', channel: 'Store', holiday: 0 },
  { store_id: 'S002', item_id: 'I017', date: '2015-09-15', sales: 1870, price: 8.99, promo: 0, category: 'Bakery', region: 'South', channel: 'Online', holiday: 0 },
  { store_id: 'S001', item_id: 'I091', date: '2015-09-16', sales: 6540, price: 24.0, promo: 1, category: 'Beverages', region: 'North', channel: 'Store', holiday: 0 },
  { store_id: 'S003', item_id: 'I055', date: '2015-09-16', sales: 2100, price: 5.75, promo: 0, category: 'Snacks', region: 'East', channel: 'Store', holiday: 0 },
  { store_id: 'S002', item_id: 'I033', date: '2015-09-17', sales: 980,  price: 3.20, promo: 1, category: 'Dairy', region: 'South', channel: 'Store', holiday: 0 },
];

const MISSING_DATA = [
  { col: 'sales', missing: 0.4 }, { col: 'price', missing: 1.2 }, { col: 'promo', missing: 3.1 },
  { col: 'category', missing: 0.8 }, { col: 'region', missing: 5.3 }, { col: 'channel', missing: 0.0 },
  { col: 'holiday', missing: 2.7 }, { col: 'store_id', missing: 0.0 }, { col: 'item_id', missing: 0.1 }, { col: 'date', missing: 0.0 },
];

const genDistribution = (col) => {
  const base = { sales: [320,580,920,1400,1820,2300,1760,980,540,220], price: [60,180,340,480,620,540,380,220,120,60] };
  const vals = base[col] || Array.from({ length: 10 }, (_, i) => Math.round(80 + Math.random() * 600));
  return vals.map((v, i) => ({ bin: `B${i + 1}`, count: v }));
};

const genLossCurve = () =>
  Array.from({ length: 50 }, (_, i) => ({
    epoch: i + 1,
    train: +(0.85 * Math.exp(-i * 0.07) + 0.04 + Math.random() * 0.01).toFixed(4),
    val: +(0.88 * Math.exp(-i * 0.065) + 0.07 + Math.random() * 0.015).toFixed(4),
  }));

const genGradient = () =>
  Array.from({ length: 50 }, (_, i) => ({
    iter: i + 1,
    grad: +(1.2 * Math.exp(-i * 0.08) + 0.02 + Math.random() * 0.02).toFixed(4),
  }));

const genActualVsPred = () =>
  Array.from({ length: 30 }, (_, i) => {
    const actual = 2000 + Math.round(Math.sin(i * 0.4) * 800 + Math.random() * 400);
    return { t: `D${i + 1}`, actual, predicted: Math.round(actual * (0.9 + Math.random() * 0.2)) };
  });

const genForecast = () =>
  Array.from({ length: 30 }, (_, i) => {
    const val = 2500 + Math.round(Math.sin(i * 0.35) * 600 + i * 20);
    return { t: `D${i + 1}`, forecast: val, lower: Math.round(val * 0.88), upper: Math.round(val * 1.12) };
  });

const genFeatureImportance = () => [
  { feature: 'lag_7', importance: 0.28 }, { feature: 'lag_1', importance: 0.22 },
  { feature: 'rolling_mean_7d', importance: 0.15 }, { feature: 'promo', importance: 0.12 },
  { feature: 'day_of_week', importance: 0.09 }, { feature: 'month', importance: 0.07 },
  { feature: 'price', importance: 0.05 }, { feature: 'is_holiday', importance: 0.02 },
];

/* ─── STEP STATUS BADGE ─── */
function StatusBadge({ status }) {
  const cfg = {
    pending: { bg: '#f3f4f6', color: '#6b7280', label: 'Pending' },
    running: { bg: '#fef3c7', color: '#d97706', label: '● Running' },
    complete: { bg: '#d1fae5', color: '#059669', label: '✓ Complete' },
  }[status] || { bg: '#f3f4f6', color: '#6b7280', label: 'Pending' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
      {cfg.label}
    </span>
  );
}

/* ─── SLIDER INPUT ─── */
function SliderInput({ label, min, max, step, value, onChange, suffix = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#374151' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#3b82f6' }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  );
}

/* ─── SECTION HEADER ─── */
function SectionHeader({ label }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8, marginTop: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>
      {label}
    </div>
  );
}

/* ─── STEP WRAPPER ─── */
function StepAccordion({ stepNum, title, icon, status, open, onToggle, children }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 12, overflow: 'hidden', boxShadow: open ? '0 2px 12px rgba(59,130,246,0.08)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: open ? '#eff6ff' : '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: open ? '1px solid #dbeafe' : 'none' }}
      >
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: open ? '#3b82f6' : '#e5e7eb', color: open ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {stepNum}
        </span>
        <span style={{ fontSize: 15, marginRight: 4 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: '#111827' }}>{title}</span>
        <StatusBadge status={status} />
        <span style={{ fontSize: 18, color: '#6b7280', marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '20px', background: '#ffffff' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── TWO-COLUMN LAYOUT ─── */
function TwoCol({ left, right }) {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ width: '40%', flexShrink: 0 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          {left}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {right}
      </div>
    </div>
  );
}

/* ─── OUTPUT BOX ─── */
function OutputBox({ lines }) {
  return (
    <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 16px', marginTop: 10, fontFamily: 'monospace', fontSize: 12 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.startsWith('✓') ? '#34d399' : l.startsWith('⚠') ? '#fbbf24' : '#94a3b8', marginBottom: 2 }}>{l}</div>
      ))}
    </div>
  );
}

/* ─── INSTRUCTION BOX ─── */
function InstrBox({ title, desc, outcome }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 12 }}>{desc}</p>
      {outcome && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Expected Outcome</div>
          <div style={{ fontSize: 12, color: '#065f46' }}>{outcome}</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   STEP 1 — DATA LOADING
══════════════════════════════════════════ */
function Step1({ status, onRun, log }) {
  const [filePath, setFilePath] = useState('data/kaggle/sales/train.csv');
  const [delimiter, setDelimiter] = useState('comma');
  const [encoding, setEncoding] = useState('utf-8');
  const [hasHeader, setHasHeader] = useState(true);
  const done = status === 'complete';

  return (
    <TwoCol
      left={
        <InstrBox
          title="Load Your Dataset"
          desc="Select a file path or upload a CSV. Specify delimiter, encoding, and whether the first row contains headers. The workbench will load a sample preview and display shape, memory usage, and column names."
          outcome="Dataset loaded with rows × columns count, column types, and a 5-row preview."
        />
      }
      right={
        <div>
          <SectionHeader label="Configuration" />
          <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>File Path</label>
          <input value={filePath} onChange={e => setFilePath(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Delimiter</label>
              <select value={delimiter} onChange={e => setDelimiter(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                <option value="comma">Comma (,)</option>
                <option value="tab">Tab (\t)</option>
                <option value="semicolon">Semicolon (;)</option>
                <option value="pipe">Pipe (|)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Encoding</label>
              <select value={encoding} onChange={e => setEncoding(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                <option value="utf-8">UTF-8</option>
                <option value="latin-1">Latin-1</option>
                <option value="cp1252">CP1252</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
            First row contains headers
          </label>

          <button onClick={() => onRun(1)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Load Data
          </button>

          {done && (
            <>
              <SectionHeader label="Data Preview (5 rows)" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {Object.keys(SAMPLE_ROWS[0]).map(k => (
                        <th key={k} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ padding: '5px 8px', border: '1px solid #e5e7eb', fontSize: 11 }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <OutputBox lines={[
                '✓ Loaded 3,000,000 rows × 10 columns in 1.8s',
                '✓ Delimiter: comma | Encoding: utf-8 | Header: yes',
                '✓ Date range: 2013-01-01 → 2015-10-31',
                '✓ Memory usage: 228.9 MB',
              ]} />
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 2 — EDA
══════════════════════════════════════════ */
function Step2({ status, onRun }) {
  const [selectedCol, setSelectedCol] = useState('sales');
  const done = status === 'complete';
  const distData = genDistribution(selectedCol);

  const statsRows = [
    { col: 'store_id', type: 'category', miss: '0.0%', unique: 54, mean: '-', std: '-', min: 'S001', max: 'S054' },
    { col: 'item_id',  type: 'category', miss: '0.1%', unique: 3991, mean: '-', std: '-', min: 'I001', max: 'I999' },
    { col: 'date',     type: 'datetime', miss: '0.0%', unique: 1017, mean: '-', std: '-', min: '2013-01-01', max: '2015-10-31' },
    { col: 'sales',    type: 'float64',  miss: '0.4%', unique: 1362, mean: '2204.3', std: '1841.2', min: '0', max: '22080' },
    { col: 'price',    type: 'float64',  miss: '1.2%', unique: 287, mean: '12.47', std: '8.93', min: '0.5', max: '89.9' },
    { col: 'promo',    type: 'int64',    miss: '3.1%', unique: 2, mean: '0.31', std: '0.46', min: '0', max: '1' },
    { col: 'category', type: 'category', miss: '0.8%', unique: 7, mean: '-', std: '-', min: '-', max: '-' },
    { col: 'region',   type: 'category', miss: '5.3%', unique: 4, mean: '-', std: '-', min: '-', max: '-' },
    { col: 'channel',  type: 'category', miss: '0.0%', unique: 3, mean: '-', std: '-', min: '-', max: '-' },
    { col: 'holiday',  type: 'int64',    miss: '2.7%', unique: 2, mean: '0.07', std: '0.25', min: '0', max: '1' },
  ];

  const corrMatrix = [
    { col: 'sales', sales: 1.00, price: -0.42, promo: 0.63, holiday: 0.18 },
    { col: 'price', sales: -0.42, price: 1.00, promo: -0.28, holiday: 0.05 },
    { col: 'promo', sales: 0.63, price: -0.28, promo: 1.00, holiday: -0.12 },
    { col: 'holiday', sales: 0.18, price: 0.05, promo: -0.12, holiday: 1.00 },
  ];

  function corrColor(v) {
    if (v === 1) return '#1e3a5f';
    if (v > 0.6) return '#1d4ed8';
    if (v > 0.3) return '#3b82f6';
    if (v > 0) return '#93c5fd';
    if (v > -0.3) return '#fca5a5';
    if (v > -0.6) return '#ef4444';
    return '#991b1b';
  }

  return (
    <TwoCol
      left={
        <InstrBox
          title="Exploratory Data Analysis"
          desc="Analyze your data — distributions, missing values, correlations, and outliers. This step builds intuition about data quality and feature relationships before any modeling."
          outcome="Summary statistics table, missing value chart, distribution histogram, correlation matrix, and outlier count per column."
        />
      }
      right={
        <div>
          <button onClick={() => onRun(2)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            ▶ Run EDA
          </button>

          {done && (
            <>
              <SectionHeader label="Summary Statistics" />
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {['Column','Type','Missing%','Unique','Mean','Std','Min','Max'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statsRows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                        {[r.col, r.type, r.miss, r.unique, r.mean, r.std, r.min, r.max].map((v, j) => (
                          <td key={j} style={{ padding: '5px 8px', border: '1px solid #e5e7eb' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SectionHeader label="Missing Values (%)" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={MISSING_DATA} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="col" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={v => [`${v}%`, 'Missing']} />
                  <Bar dataKey="missing" radius={[4,4,0,0]}>
                    {MISSING_DATA.map((d, i) => (
                      <Cell key={i} fill={d.missing > 3 ? '#ef4444' : d.missing > 1 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <SectionHeader label="Distribution — Select Column" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <select value={selectedCol} onChange={e => setSelectedCol(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                  {['sales','price','promo','holiday'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={distData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <SectionHeader label="Correlation Matrix" />
              <div style={{ overflowX: 'auto', marginBottom: 8 }}>
                <table style={{ fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 10px', border: '1px solid #e5e7eb', background: '#f3f4f6' }}></th>
                      {['sales','price','promo','holiday'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', background: '#f3f4f6', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontWeight: 600, background: '#f3f4f6' }}>{row.col}</td>
                        {['sales','price','promo','holiday'].map(c => (
                          <td key={c} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', textAlign: 'center', background: corrColor(row[c]), color: '#fff', fontWeight: 600 }}>
                            {row[c].toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SectionHeader label="Outlier Summary" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['sales',247],['price',89],['promo',0],['holiday',0],['region',31]].map(([col, cnt]) => (
                  <div key={col} style={{ background: cnt > 100 ? '#fef2f2' : cnt > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${cnt > 100 ? '#fecaca' : cnt > 0 ? '#fde68a' : '#bbf7d0'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                    <strong>{col}</strong>: {cnt} outliers
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 3 — PREPROCESSING
══════════════════════════════════════════ */
function Step3({ status, onRun }) {
  const [missingStrat, setMissingStrat] = useState({ sales: 'median', price: 'median', promo: 'mode', region: 'mode', holiday: 'median' });
  const [outlierStrat, setOutlierStrat] = useState('iqr_cap');
  const [dupStrat, setDupStrat] = useState('remove');
  const done = status === 'complete';

  const beforeAfter = [
    { metric: 'Total Rows', before: 3000000, after: 2987153 },
    { metric: 'Null Count', before: 98430, after: 0 },
    { metric: 'Duplicates', before: 127, after: 0 },
    { metric: 'Outliers', before: 367, after: 0 },
  ];

  const baChart = [
    { name: 'Rows (k)', before: 3000, after: 2987 },
    { name: 'Nulls', before: 98430, after: 0 },
    { name: 'Duplicates', before: 127, after: 0 },
  ];

  const colOptions = ['sales', 'price', 'promo', 'region', 'holiday'];
  const stratOptions = ['mean', 'median', 'mode', 'drop', 'custom'];

  return (
    <TwoCol
      left={
        <InstrBox
          title="Data Preprocessing"
          desc="Clean your data before modeling. Choose how to handle missing values for each column, how to treat outliers, and what to do with duplicate rows. Each strategy has different trade-offs."
          outcome="Clean dataset with zero nulls, no duplicates, capped outliers. Before/after quality metrics and visualization."
        />
      }
      right={
        <div>
          <SectionHeader label="Missing Value Strategy (per column)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {colOptions.map(col => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#374151', width: 58 }}>{col}:</label>
                <select value={missingStrat[col] || 'median'} onChange={e => setMissingStrat(p => ({ ...p, [col]: e.target.value }))}
                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11 }}>
                  {stratOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>

          <SectionHeader label="Outlier Handling" />
          <select value={outlierStrat} onChange={e => setOutlierStrat(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            <option value="iqr_cap">IQR Cap (1.5×)</option>
            <option value="zscore_remove">Z-Score Remove (3σ)</option>
            <option value="keep">Keep All</option>
            <option value="winsorize">Winsorize (5%–95%)</option>
          </select>

          <SectionHeader label="Duplicate Handling" />
          <select value={dupStrat} onChange={e => setDupStrat(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            <option value="remove">Remove All Duplicates</option>
            <option value="keep_first">Keep First</option>
            <option value="keep_last">Keep Last</option>
          </select>

          <button onClick={() => onRun(3)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Run Preprocessing
          </button>

          {done && (
            <>
              <SectionHeader label="Before vs After Quality" />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {beforeAfter.map(m => (
                  <div key={m.metric} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{m.metric}</div>
                    <div style={{ color: '#6b7280' }}>Before: <strong>{m.before.toLocaleString()}</strong></div>
                    <div style={{ color: '#059669' }}>After: <strong>{m.after.toLocaleString()}</strong></div>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={baChart} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="before" fill="#ef4444" name="Before" radius={[4,4,0,0]} />
                  <Bar dataKey="after" fill="#10b981" name="After" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <OutputBox lines={[
                '✓ Nulls imputed: 98,430 values (median/mode strategy)',
                '✓ Duplicates removed: 127 rows',
                '✓ Outliers capped via IQR (367 values)',
                '✓ Final dataset: 2,987,153 rows × 10 columns',
                '✓ Processing time: 3.2s',
              ]} />
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 4 — FEATURE ENGINEERING
══════════════════════════════════════════ */
function Step4({ status, onRun }) {
  const [lags, setLags] = useState(true);
  const [lagDays, setLagDays] = useState('1,7,14,28');
  const [rolling, setRolling] = useState(true);
  const [rollingWin, setRollingWin] = useState(7);
  const [calendar, setCalendar] = useState(true);
  const [interactions, setInteractions] = useState(true);
  const [encoding, setEncoding] = useState(true);
  const done = status === 'complete';

  const newFeatures = [
    'lag_1','lag_7','lag_14','lag_28',
    'rolling_mean_7d','rolling_mean_14d','rolling_std_7d',
    'day_of_week','month','quarter','is_weekend','is_holiday',
    'promo_x_lag1','store_x_category',
    'cat_store_id','cat_region','cat_channel',
  ];

  return (
    <TwoCol
      left={
        <InstrBox
          title="Feature Engineering"
          desc="Create meaningful features from your raw data. Lag features capture historical patterns. Rolling windows smooth noise. Calendar features capture seasonality. Interaction terms reveal cross-variable effects."
          outcome="Feature count before/after, list of new features created, and feature matrix shape."
        />
      }
      right={
        <div>
          <SectionHeader label="Feature Groups" />

          {[
            { key: 'lags', label: 'Lag Features', state: lags, set: setLags, extra: (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' }}>Lag days (comma-separated)</label>
                <input value={lagDays} onChange={e => setLagDays(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, width: '100%' }} />
              </div>
            )},
            { key: 'rolling', label: 'Rolling Windows', state: rolling, set: setRolling, extra: (
              <div style={{ marginTop: 8 }}>
                <SliderInput label="Window size (days)" min={3} max={90} value={rollingWin} onChange={setRollingWin} suffix="d" />
              </div>
            )},
            { key: 'calendar', label: 'Calendar Features (day_of_week, month, quarter, is_weekend, is_holiday)', state: calendar, set: setCalendar },
            { key: 'interactions', label: 'Interaction Terms (promo × lag, store × category)', state: interactions, set: setInteractions },
            { key: 'encoding', label: 'One-Hot Encoding for categoricals', state: encoding, set: setEncoding },
          ].map(({ key, label, state, set, extra }) => (
            <div key={key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} style={{ accentColor: '#3b82f6', width: 16, height: 16 }} />
                <span style={{ fontWeight: state ? 600 : 400, color: state ? '#1e3a5f' : '#6b7280' }}>{label}</span>
              </label>
              {state && extra}
            </div>
          ))}

          <button onClick={() => onRun(4)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            ▶ Generate Features
          </button>

          {done && (
            <>
              <SectionHeader label="Feature Matrix" />
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Before</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>10</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>features</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 24 }}>→</div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>After</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>27</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>features</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {newFeatures.map(f => (
                  <span key={f} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{f}</span>
                ))}
              </div>
              <OutputBox lines={[
                '✓ Lag features generated: 4 (lag_1, lag_7, lag_14, lag_28)',
                '✓ Rolling features generated: 3 (mean_7d, mean_14d, std_7d)',
                '✓ Calendar features: 5',
                '✓ Interaction terms: 2',
                '✓ One-hot encoded: 3 columns → 13 columns',
                '✓ Final matrix: 2,987,153 × 27 | Time: 5.7s',
              ]} />
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 5 — MODEL SELECTION
══════════════════════════════════════════ */
const MODEL_CATALOG = [
  { id: 'xgboost', label: 'XGBoost', sub: 'Gradient Boosting', accuracy: '91%', time: '~45s', desc: 'Best for tabular data with complex feature interactions. Handles missing values natively.', color: '#3b82f6' },
  { id: 'lgbm', label: 'LightGBM', sub: 'Fast Gradient Boosting', accuracy: '90%', time: '~20s', desc: 'Faster than XGBoost on large datasets. Leaf-wise tree growth.', color: '#8b5cf6' },
  { id: 'rf', label: 'Random Forest', sub: 'Ensemble', accuracy: '87%', time: '~60s', desc: 'Robust to outliers. Good baseline. High interpretability via feature importance.', color: '#10b981' },
  { id: 'lstm', label: 'LSTM', sub: 'Deep Learning', accuracy: '89%', time: '~5min', desc: 'Captures long-range temporal dependencies. Best for pure time-series.', color: '#f59e0b' },
  { id: 'prophet', label: 'Prophet', sub: 'Time Series', accuracy: '84%', time: '~30s', desc: 'Facebook Prophet. Handles seasonality, holidays, trend changepoints.', color: '#ec4899' },
  { id: 'arima', label: 'ARIMA', sub: 'Statistical', accuracy: '79%', time: '~15s', desc: 'Classical statsmodels approach. Good for stationary univariate series.', color: '#6b7280' },
  { id: 'ridge', label: 'Ridge Regression', sub: 'Linear', accuracy: '74%', time: '~5s', desc: 'Simple linear baseline with L2 regularization. Very fast, interpretable.', color: '#14b8a6' },
  { id: 'ensemble', label: 'Ensemble', sub: 'Combine Selected', accuracy: '93%', time: '~8min', desc: 'Weighted averaging of selected models. Typically best overall accuracy.', color: '#f97316' },
];

function Step5({ status, onRun, selectedModels, setSelectedModels }) {
  const done = status === 'complete';
  const toggle = (id) => setSelectedModels(prev =>
    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
  );

  return (
    <TwoCol
      left={
        <InstrBox
          title="Model Selection"
          desc="Choose one or more models to train. Each has different strengths: XGBoost excels at tabular data, LSTM at sequential patterns, Prophet at seasonal decomposition. Select Ensemble to combine them."
          outcome="Selected model(s) pass to hyperparameter tuning. Compare typical accuracy and training time to make informed choices."
        />
      }
      right={
        <div>
          <SectionHeader label="Available Models" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {MODEL_CATALOG.map(m => {
              const sel = selectedModels.includes(m.id);
              return (
                <div key={m.id}
                  onClick={() => toggle(m.id)}
                  style={{ border: `2px solid ${sel ? m.color : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', background: sel ? `${m.color}10` : '#f9fafb', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${m.color}`, background: sel ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {sel && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: sel ? m.color : '#374151' }}>{m.label}</span>
                        <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 7px', borderRadius: 10 }}>{m.sub}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{m.accuracy}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.time}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => onRun(5)} disabled={selectedModels.length === 0}
            style={{ background: selectedModels.length ? '#3b82f6' : '#e5e7eb', color: selectedModels.length ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: selectedModels.length ? 'pointer' : 'not-allowed' }}>
            ▶ Confirm Selection ({selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''})
          </button>

          {done && (
            <OutputBox lines={[
              `✓ Selected: ${selectedModels.join(', ')}`,
              '✓ Proceeding to hyperparameter tuning',
              `✓ Estimated total training time: ${selectedModels.length * 45}s`,
            ]} />
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 6 — HYPERPARAMETER TUNING
══════════════════════════════════════════ */
function Step6({ status, onRun, selectedModels }) {
  const [xgb, setXgb] = useState({ n_estimators: 100, max_depth: 6, learning_rate: 0.1, min_child_weight: 1, subsample: 0.8, colsample_bytree: 0.8, reg_alpha: 0, reg_lambda: 1 });
  const [lstm, setLstm] = useState({ units: 128, dropout: 0.2, epochs: 50, batch_size: 32, learning_rate: 0.001 });
  const [rf, setRf] = useState({ n_estimators: 100, max_depth: 10, min_samples_split: 2, min_samples_leaf: 1 });
  const [optimizer, setOptimizer] = useState('Adam');
  const [batchSize, setBatchSize] = useState('32');
  const done = status === 'complete';

  const p = (obj, set, key) => (val) => set(prev => ({ ...prev, [key]: val }));

  return (
    <TwoCol
      left={
        <InstrBox
          title="Hyperparameter Tuning"
          desc="Each parameter controls a specific aspect of model behavior. Learning rate controls step size — too high causes overshooting, too low causes slow convergence. Depth controls model complexity and risk of overfitting."
          outcome="Updated parameter configuration saved. Parameters will be used for training in Step 7."
        />
      }
      right={
        <div>
          {(selectedModels.includes('xgboost') || selectedModels.length === 0) && (
            <>
              <SectionHeader label="XGBoost Parameters" />
              <SliderInput label="n_estimators (trees)" min={50} max={500} value={xgb.n_estimators} onChange={p(xgb, setXgb, 'n_estimators')} />
              <SliderInput label="max_depth" min={3} max={15} value={xgb.max_depth} onChange={p(xgb, setXgb, 'max_depth')} />
              <SliderInput label="learning_rate" min={0.01} max={0.3} step={0.01} value={xgb.learning_rate} onChange={p(xgb, setXgb, 'learning_rate')} />
              <SliderInput label="min_child_weight" min={1} max={10} value={xgb.min_child_weight} onChange={p(xgb, setXgb, 'min_child_weight')} />
              <SliderInput label="subsample" min={0.5} max={1.0} step={0.05} value={xgb.subsample} onChange={p(xgb, setXgb, 'subsample')} />
              <SliderInput label="colsample_bytree" min={0.5} max={1.0} step={0.05} value={xgb.colsample_bytree} onChange={p(xgb, setXgb, 'colsample_bytree')} />
              <SliderInput label="reg_alpha (L1)" min={0} max={10} step={0.1} value={xgb.reg_alpha} onChange={p(xgb, setXgb, 'reg_alpha')} />
              <SliderInput label="reg_lambda (L2)" min={0} max={10} step={0.1} value={xgb.reg_lambda} onChange={p(xgb, setXgb, 'reg_lambda')} />
            </>
          )}

          {selectedModels.includes('lstm') && (
            <>
              <SectionHeader label="LSTM Parameters" />
              <SliderInput label="units (hidden size)" min={32} max={256} step={16} value={lstm.units} onChange={p(lstm, setLstm, 'units')} />
              <SliderInput label="dropout" min={0} max={0.5} step={0.05} value={lstm.dropout} onChange={p(lstm, setLstm, 'dropout')} />
              <SliderInput label="epochs" min={10} max={200} step={5} value={lstm.epochs} onChange={p(lstm, setLstm, 'epochs')} />
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>batch_size</label>
                <select value={batchSize} onChange={e => setBatchSize(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                  {['16','32','64','128'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <SliderInput label="learning_rate" min={0.0001} max={0.01} step={0.0001} value={lstm.learning_rate} onChange={p(lstm, setLstm, 'learning_rate')} />
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>optimizer</label>
                <select value={optimizer} onChange={e => setOptimizer(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                  {['Adam','SGD','RMSprop'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </>
          )}

          {selectedModels.includes('rf') && (
            <>
              <SectionHeader label="Random Forest Parameters" />
              <SliderInput label="n_estimators" min={50} max={500} value={rf.n_estimators} onChange={p(rf, setRf, 'n_estimators')} />
              <SliderInput label="max_depth" min={3} max={30} value={rf.max_depth} onChange={p(rf, setRf, 'max_depth')} />
              <SliderInput label="min_samples_split" min={2} max={20} value={rf.min_samples_split} onChange={p(rf, setRf, 'min_samples_split')} />
              <SliderInput label="min_samples_leaf" min={1} max={10} value={rf.min_samples_leaf} onChange={p(rf, setRf, 'min_samples_leaf')} />
            </>
          )}

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
            <strong>Tip:</strong> Learning rate controls gradient descent step size. Too high → loss oscillates and diverges. Too low → slow convergence and may get stuck in local minima. Start at 0.1, halve if loss spikes.
          </div>

          <button onClick={() => onRun(6)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Apply & Save Parameters
          </button>

          {done && (
            <OutputBox lines={[
              '✓ XGBoost: n_estimators=' + xgb.n_estimators + ', max_depth=' + xgb.max_depth + ', lr=' + xgb.learning_rate,
              selectedModels.includes('lstm') ? '✓ LSTM: units=' + lstm.units + ', epochs=' + lstm.epochs + ', lr=' + lstm.learning_rate : '',
              selectedModels.includes('rf') ? '✓ RF: n_estimators=' + rf.n_estimators + ', max_depth=' + rf.max_depth : '',
              '✓ Parameters saved to config/hyperparams.json',
            ].filter(Boolean)} />
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 7 — TRAINING & EVALUATION
══════════════════════════════════════════ */
function Step7({ status, onRun }) {
  const [progress, setProgress] = useState(0);
  const [training, setTraining] = useState(false);
  const done = status === 'complete';

  const lossCurve = genLossCurve();
  const gradCurve = genGradient();
  const avpData = genActualVsPred();
  const featImp = genFeatureImportance();

  const metrics = [
    { name: 'MAPE', value: '7.82%', good: true },
    { name: 'RMSE', value: '184.3', good: true },
    { name: 'MAE', value: '127.6', good: true },
    { name: 'R²', value: '0.912', good: true },
    { name: 'Accuracy', value: '91.2%', good: true },
    { name: 'Precision', value: '0.889', good: true },
    { name: 'Recall', value: '0.903', good: true },
    { name: 'F1 Score', value: '0.896', good: true },
    { name: 'AUC-ROC', value: '0.947', good: true },
  ];

  const confusion = { tp: 1823, fp: 211, fn: 194, tn: 1772 };
  const benchmark = [
    { name: 'Your Model', mape: 7.82, color: '#10b981' },
    { name: 'Baseline', mape: 22.4, color: '#ef4444' },
    { name: 'Industry Avg', mape: 12.1, color: '#f59e0b' },
  ];

  const handleTrain = () => {
    setTraining(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) { p = 100; clearInterval(interval); setTraining(false); onRun(7); }
      setProgress(Math.min(Math.round(p), 100));
    }, 180);
  };

  return (
    <TwoCol
      left={
        <InstrBox
          title="Training & Evaluation"
          desc="Train your configured model on the preprocessed feature matrix. Watch the loss curve decrease over epochs — training loss (in-sample) and validation loss (holdout) should converge without a large gap. A large gap signals overfitting."
          outcome="Trained model weights, evaluation metrics (MAPE, RMSE, R², F1), confusion matrix, feature importance, actual vs predicted chart, and benchmark comparison."
        />
      }
      right={
        <div>
          <button onClick={handleTrain} disabled={training}
            style={{ background: training ? '#e5e7eb' : '#3b82f6', color: training ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: training ? 'not-allowed' : 'pointer', marginBottom: 16 }}>
            {training ? `Training… ${progress}%` : '▶ Start Training'}
          </button>

          {(training || done) && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Training progress</span><span style={{ fontWeight: 700 }}>{progress}%</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                <div style={{ background: '#3b82f6', height: '100%', width: `${progress}%`, borderRadius: 20, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {done && (
            <>
              <SectionHeader label="Loss Curves (Training vs Validation)" />
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={lossCurve} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 10 }} label={{ value: 'Epoch', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="train" stroke="#3b82f6" dot={false} strokeWidth={2} name="Train Loss" />
                  <Line type="monotone" dataKey="val" stroke="#ef4444" dot={false} strokeWidth={2} name="Val Loss" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>

              <SectionHeader label="Gradient Convergence" />
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={gradCurve} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="iter" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="grad" stroke="#8b5cf6" dot={false} strokeWidth={2} name="Gradient Magnitude" />
                </LineChart>
              </ResponsiveContainer>

              <SectionHeader label="Evaluation Metrics" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {metrics.map(m => (
                  <div key={m.name} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{m.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <SectionHeader label="Confusion Matrix" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 220, marginBottom: 16 }}>
                {[
                  { label: 'TP', val: confusion.tp, bg: '#d1fae5', c: '#065f46' },
                  { label: 'FP', val: confusion.fp, bg: '#fee2e2', c: '#991b1b' },
                  { label: 'FN', val: confusion.fn, bg: '#fee2e2', c: '#991b1b' },
                  { label: 'TN', val: confusion.tn, bg: '#d1fae5', c: '#065f46' },
                ].map(({ label, val, bg, c }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 6, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: c, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{val.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <SectionHeader label="Feature Importance" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={featImp} layout="vertical" margin={{ top: 4, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 10 }} width={58} />
                  <Tooltip formatter={v => [(v * 100).toFixed(1) + '%', 'Importance']} />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>

              <SectionHeader label="Actual vs Predicted" />
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={avpData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" stroke="#10b981" dot={false} strokeWidth={2} name="Actual" />
                  <Line type="monotone" dataKey="predicted" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="4 2" name="Predicted" />
                </LineChart>
              </ResponsiveContainer>

              <SectionHeader label="Benchmarking" />
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={benchmark} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={v => [v + '%', 'MAPE']} />
                  <Bar dataKey="mape" radius={[4,4,0,0]}>
                    {benchmark.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   STEP 8 — OUTPUT & EXPORT
══════════════════════════════════════════ */
function Step8({ status, onRun }) {
  const [horizon, setHorizon] = useState('30 days');
  const [formats, setFormats] = useState({ csv: true, json: false, pdf: true, api: false });
  const done = status === 'complete';
  const forecastData = genForecast();

  const toggleFmt = (k) => setFormats(p => ({ ...p, [k]: !p[k] }));

  return (
    <TwoCol
      left={
        <InstrBox
          title="Output & Export"
          desc="Generate future predictions using your trained model. Select the prediction horizon (how far ahead to forecast) and output formats. Confidence bands show the 80% prediction interval."
          outcome="Forecast chart with confidence bands, summary statistics, and downloadable files in selected formats."
        />
      }
      right={
        <div>
          <SectionHeader label="Prediction Settings" />
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Prediction Horizon</label>
              <select value={horizon} onChange={e => setHorizon(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                {['7 days','14 days','30 days','90 days'].map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Output Formats</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {Object.entries(formats).map(([k, v]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={v} onChange={() => toggleFmt(k)} style={{ accentColor: '#3b82f6' }} />
                    {k.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => onRun(8)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ▶ Generate Predictions
          </button>

          {done && (
            <>
              <SectionHeader label={`Forecast — Next ${horizon} with 80% Confidence Band`} />
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={forecastData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#bfdbfe" fillOpacity={0.6} name="Upper Band" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} name="Lower Band" />
                  <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} dot={false} name="Forecast" />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0' }}>
                {[['Total Predictions', '90'], ['Mean Forecast', '2,847'], ['Confidence Level', '80%'], ['Avg Accuracy', '92.2%']].map(([k, v]) => (
                  <div key={k} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{k}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1d4ed8' }}>{v}</div>
                  </div>
                ))}
              </div>

              <SectionHeader label="Download" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {formats.csv && (
                  <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📥 CSV
                  </button>
                )}
                {formats.pdf && (
                  <button style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📄 PDF Report
                  </button>
                )}
                {formats.json && (
                  <button style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {'{ }'} JSON
                  </button>
                )}
                {formats.api && (
                  <button style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🔗 API Endpoint
                  </button>
                )}
              </div>

              <OutputBox lines={[
                `✓ Generated ${horizon} forecast — 90 data points`,
                '✓ Mean predicted sales: 2,847 units/day',
                '✓ 80% prediction interval: ±12%',
                '✓ Files ready for download',
              ]} />
            </>
          )}
        </div>
      }
    />
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const STEPS = [
  { id: 1, title: 'Data Loading', icon: '📥' },
  { id: 2, title: 'Exploratory Data Analysis', icon: '🔍' },
  { id: 3, title: 'Data Preprocessing', icon: '🧹' },
  { id: 4, title: 'Feature Engineering', icon: '🛠️' },
  { id: 5, title: 'Model Selection', icon: '🧠' },
  { id: 6, title: 'Hyperparameter Tuning', icon: '⚙️' },
  { id: 7, title: 'Training & Evaluation', icon: '🏋️' },
  { id: 8, title: 'Output & Export', icon: '📤' },
];

export default function ProcessWorkbenchTab() {
  const [openStep, setOpenStep] = useState(1);
  const [statuses, setStatuses] = useState({});
  const [log, setLog] = useState([]);
  const [runningAll, setRunningAll] = useState(false);
  const [selectedModels, setSelectedModels] = useState(['xgboost']);
  const logRef = useRef(null);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  };

  const addLog = useCallback((stepId, action, result) => {
    const entry = `[${now()}] Step ${stepId} — ${action} — ${result}`;
    setLog(prev => [...prev, entry]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }, []);

  const runStep = useCallback((stepId) => {
    const step = STEPS.find(s => s.id === stepId);
    setStatuses(prev => ({ ...prev, [stepId]: 'running' }));
    addLog(stepId, step.title, 'Started');
    setTimeout(() => {
      setStatuses(prev => ({ ...prev, [stepId]: 'complete' }));
      addLog(stepId, step.title, 'Completed successfully');
    }, 1200);
  }, [addLog]);

  const runAll = useCallback(async () => {
    setRunningAll(true);
    for (const step of STEPS) {
      setOpenStep(step.id);
      setStatuses(prev => ({ ...prev, [step.id]: 'running' }));
      addLog(step.id, step.title, 'Started');
      await new Promise(r => setTimeout(r, 1500));
      setStatuses(prev => ({ ...prev, [step.id]: 'complete' }));
      addLog(step.id, step.title, 'Completed');
      await new Promise(r => setTimeout(r, 300));
    }
    setRunningAll(false);
  }, [addLog]);

  const resetAll = () => {
    setStatuses({});
    setLog([]);
    setOpenStep(1);
  };

  const completedCount = Object.values(statuses).filter(s => s === 'complete').length;

  const stepComponents = {
    1: <Step1 status={statuses[1] || 'pending'} onRun={runStep} />,
    2: <Step2 status={statuses[2] || 'pending'} onRun={runStep} />,
    3: <Step3 status={statuses[3] || 'pending'} onRun={runStep} />,
    4: <Step4 status={statuses[4] || 'pending'} onRun={runStep} />,
    5: <Step5 status={statuses[5] || 'pending'} onRun={runStep} selectedModels={selectedModels} setSelectedModels={setSelectedModels} />,
    6: <Step6 status={statuses[6] || 'pending'} onRun={runStep} selectedModels={selectedModels} />,
    7: <Step7 status={statuses[7] || 'pending'} onRun={runStep} />,
    8: <Step8 status={statuses[8] || 'pending'} onRun={runStep} />,
  };

  return (
    <div style={{ fontFamily: 'var(--font-family)', color: 'var(--text-primary)' }}>

      {/* ── GLOBAL CONTROLS ── */}
      <div style={{ background: '#1e3a5f', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 6 }}>
            Step {completedCount}/{STEPS.length} complete
          </div>
          <div style={{ background: '#0f2944', borderRadius: 20, height: 8, overflow: 'hidden', minWidth: 200 }}>
            <div style={{ background: '#3b82f6', height: '100%', width: `${(completedCount / STEPS.length) * 100}%`, borderRadius: 20, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <button onClick={runAll} disabled={runningAll}
          style={{ background: runningAll ? '#374151' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: runningAll ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {runningAll ? '⏳ Running All…' : '▶ Run All Steps'}
        </button>
        <button onClick={resetAll}
          style={{ background: '#374151', color: '#e5e7eb', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ⏹ Reset All
        </button>
      </div>

      {/* ── ACCORDION STEPS ── */}
      {STEPS.map(step => (
        <StepAccordion
          key={step.id}
          stepNum={step.id}
          title={step.title}
          icon={step.icon}
          status={statuses[step.id] || 'pending'}
          open={openStep === step.id}
          onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
        >
          {stepComponents[step.id]}
        </StepAccordion>
      ))}

      {/* ── TRANSACTION HISTORY ── */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            ■ Transaction History
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLog([])}
              style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
              Clear Log
            </button>
            <button onClick={() => {
              const blob = new Blob([log.join('\n')], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'workbench_log.txt'; a.click();
            }}
              style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
              Export Log
            </button>
          </div>
        </div>
        <div ref={logRef} style={{ height: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
          {log.length === 0 ? (
            <div style={{ color: '#475569', padding: '4px 0' }}>No events yet. Run a step to see logs here.</div>
          ) : log.map((entry, i) => (
            <div key={i} style={{ color: entry.includes('Completed') ? '#34d399' : entry.includes('Started') ? '#60a5fa' : '#94a3b8', padding: '2px 0', lineHeight: 1.5 }}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
