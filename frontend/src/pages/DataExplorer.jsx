// DataExplorer.jsx — Per-department sample-data preview + auto-rendered
// charts. Bridges 4 prior deliverables into one usable surface:
//   - fallbackDepartments (catalogIndex)
//   - data/samples/<dept>/<file>.csv (already on disk)
//   - chart vocabulary (Recharts — in initial bundle, no lazy-load needed)
//   - the §66 per-dept artefacts story
//
// Backend-independent: fetches CSV via Vite dev passthrough OR via
// /api/v1/insur/downloads/<...> if backend is up.

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fallbackDepartments } from '../data/catalogIndex';

// ── Catalog of available sample files per dept (mirrors `find data/samples -name '*.csv'`) ──
const DEPT_SAMPLES = {
  'customer-experience':  ['customer_experience_primary_sample.csv'],
  'customer-support':     ['customer_support_primary_sample.csv'],
  'digital-marketing':    ['digital_marketing_primary_sample.csv'],
  'e-commerce':           ['e_commerce_primary_sample.csv'],
  'engineering':          ['engineering_primary_sample.csv'],
  'executive-leadership': ['executive_leadership_primary_sample.csv'],
  'finance':              ['cash_flow_sample.csv', 'fraud_txn_sample.csv', 'gl_close_sample.csv'],
  'hr':                   ['hr_primary_sample.csv'],
  'it-operations':        ['it_operations_primary_sample.csv'],
  'legal':                ['legal_primary_sample.csv'],
  'manufacturing':        ['defect_inspection_sample.csv', 'oee_sample.csv', 'predictive_maint_sample.csv'],
  'marketing':            ['marketing_primary_sample.csv'],
  'operations':           ['operations_primary_sample.csv'],
  'procurement':          ['procurement_primary_sample.csv'],
  'product-rd':           ['product_rd_primary_sample.csv'],
  'retail-operations':    ['retail_operations_primary_sample.csv'],
  'sales':                ['churn_sample.csv', 'demand_forecast_sample.csv', 'lead_scoring_sample.csv'],
  'security-operations':  ['security_operations_primary_sample.csv'],
  'supply-chain':         ['supply_chain_primary_sample.csv'],
};

// Map fallbackDepartments codes → folder names on disk.
const DEPT_FOLDER_MAP = {
  marketing: 'marketing',
  hr: 'hr',
  sales: 'sales',
  finance: 'finance',
  operations: 'operations',
  legal: 'legal',
  procurement: 'procurement',
  customer_support: 'customer-support',
  engineering: 'engineering',
  security_operations: 'security-operations',
  supply_chain: 'supply-chain',
  customer_experience: 'customer-experience',
  it_operations: 'it-operations',
  digital_marketing: 'digital-marketing',
  e_commerce: 'e-commerce',
  manufacturing: 'manufacturing',
  retail_operations: 'retail-operations',
  product_rd: 'product-rd',
  executive_leadership: 'executive-leadership',
};

// Departments that have sample data on disk (drives the dropdown).
const DEPTS_WITH_DATA = fallbackDepartments.filter((d) => DEPT_FOLDER_MAP[d.code] && DEPT_SAMPLES[DEPT_FOLDER_MAP[d.code]]);

// ── CSV parser (small enough that papaparse isn't worth it) ──
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { columns: [], rows: [] };
  const columns = lines[0].split(',').map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = {};
    columns.forEach((col, i) => { row[col] = cells[i]; });
    return row;
  });
  return { columns, rows };
}

// ── Type inference per column ──
function inferTypes(columns, rows) {
  const types = {};
  columns.forEach((col) => {
    let nNum = 0, nDate = 0, nNonEmpty = 0;
    const distinct = new Set();
    rows.slice(0, 50).forEach((r) => {
      const v = r[col];
      if (v === undefined || v === '' || v === null) return;
      nNonEmpty += 1;
      distinct.add(v);
      if (!isNaN(Number(v)) && v !== '') nNum += 1;
      // ISO-8601 date detection (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) nDate += 1;
    });
    if (nDate > nNonEmpty * 0.7) types[col] = 'date';
    else if (nNum > nNonEmpty * 0.8) types[col] = 'numeric';
    else if (distinct.size <= Math.max(20, rows.length * 0.3)) types[col] = 'categorical';
    else types[col] = 'text';
  });
  return types;
}

// ── Auto-build chart specs from inferred types ──
function buildChartSpecs(columns, rows, types) {
  const specs = [];
  const dateCols = columns.filter((c) => types[c] === 'date');
  const numCols  = columns.filter((c) => types[c] === 'numeric');
  const catCols  = columns.filter((c) => types[c] === 'categorical');

  // 1) Line/area chart if date + numeric pair available
  if (dateCols.length > 0 && numCols.length > 0) {
    const dCol = dateCols[0];
    const yCol = numCols[0];
    const ts = [...rows]
      .filter((r) => r[dCol] && !isNaN(Number(r[yCol])))
      .sort((a, b) => a[dCol].localeCompare(b[dCol]));
    // Aggregate by date if there are duplicates
    const aggregated = {};
    ts.forEach((r) => {
      const d = r[dCol].slice(0, 10);
      aggregated[d] = (aggregated[d] || 0) + Number(r[yCol]);
    });
    const data = Object.entries(aggregated).map(([d, v]) => ({ [dCol]: d, [yCol]: v }));
    specs.push({ kind: 'timeseries', title: `${yCol} over ${dCol}`, x: dCol, y: yCol, data });
  }

  // 2) Bar chart for first categorical column counts
  if (catCols.length > 0) {
    const col = catCols[0];
    const counts = {};
    rows.forEach((r) => { const k = r[col] || '(empty)'; counts[k] = (counts[k] || 0) + 1; });
    const data = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ name: k, count: v }));
    specs.push({ kind: 'bar', title: `Top ${col} values`, x: 'name', y: 'count', data });
  }

  // 3) Pie chart for a second categorical column (or status-like column)
  const statusLike = columns.find((c) => /status|state|category|class|type|priority/i.test(c) && types[c] === 'categorical');
  const secondCat = statusLike || catCols[1] || (catCols[0] && specs.length < 2 ? null : null);
  if (secondCat && secondCat !== (catCols[0] || null)) {
    const counts = {};
    rows.forEach((r) => { const k = r[secondCat] || '(empty)'; counts[k] = (counts[k] || 0) + 1; });
    const data = Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
    specs.push({ kind: 'pie', title: `${secondCat} distribution`, data });
  }

  // 4) Histogram (binned bar) for numeric column
  if (numCols.length > 0) {
    const col = numCols[numCols.length - 1];      // pick last numeric (avoids reusing the timeseries y)
    const values = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const nbins = Math.min(12, Math.max(4, Math.round(Math.sqrt(values.length))));
      const width = (max - min) / nbins || 1;
      const bins = Array.from({ length: nbins }, (_, i) => ({
        bucket: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
        count: 0,
      }));
      values.forEach((v) => {
        const idx = Math.min(nbins - 1, Math.floor((v - min) / width));
        bins[idx].count += 1;
      });
      specs.push({ kind: 'histogram', title: `${col} distribution`, x: 'bucket', y: 'count', data: bins });
    }
  }

  return specs;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];

// ── Chart renderers ──
function ChartRender({ spec }) {
  if (spec.kind === 'timeseries') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.x} fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Area type="monotone" dataKey={spec.y} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (spec.kind === 'bar' || spec.kind === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.x} angle={spec.data.length > 6 ? -30 : 0} textAnchor={spec.data.length > 6 ? 'end' : 'middle'} height={70} fontSize={10} interval={0} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Bar dataKey={spec.y} fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (spec.kind === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={spec.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
            {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  return null;
}

// ── Data fetch (backend-first, dev-passthrough fallback, graceful failure) ──
async function fetchSampleCSV(deptFolder, filename) {
  const apiUrl = `/api/v1/insur/downloads/${deptFolder}/${filename}`;
  try {
    const r = await fetch(apiUrl);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  // Dev fallback: Vite serves repo root files
  try {
    const r = await fetch(`/data/samples/${deptFolder}/${filename}`);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  return null;
}

// ── Page ──
export default function DataExplorer() {
  const [selectedDept, setSelectedDept] = useState(DEPTS_WITH_DATA[0]?.code || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvText, setCsvText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('idle');

  const folder = DEPT_FOLDER_MAP[selectedDept];
  const files = folder ? (DEPT_SAMPLES[folder] || []) : [];

  // When dept changes, pick the first file
  useEffect(() => {
    if (files.length > 0) setSelectedFile(files[0]);
    else setSelectedFile(null);
  }, [selectedDept, files]);

  // When file changes, fetch it
  useEffect(() => {
    if (!folder || !selectedFile) return;
    let cancelled = false;
    setLoading(true);
    setCsvText(null);
    fetchSampleCSV(folder, selectedFile).then((text) => {
      if (cancelled) return;
      if (text) {
        setCsvText(text);
        setSource('loaded');
      } else {
        setCsvText(null);
        setSource('failed');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [folder, selectedFile]);

  const parsed = useMemo(() => (csvText ? parseCSV(csvText) : null), [csvText]);
  const types  = useMemo(() => (parsed ? inferTypes(parsed.columns, parsed.rows) : {}), [parsed]);
  const specs  = useMemo(() => (parsed ? buildChartSpecs(parsed.columns, parsed.rows, types) : []), [parsed, types]);

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
          Data Explorer
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748b' }}>
          Pick a department, choose a sample dataset, and the page auto-infers column types and renders relevant charts.
          {' '}Bridges <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>data/samples/&lt;dept&gt;/</code> with the §63 dept scaffold + Recharts vocabulary.
        </p>
      </header>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
        <label style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Department:</label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, minWidth: 220 }}
        >
          {DEPTS_WITH_DATA.map((d) => (
            <option key={d.code} value={d.code}>{d.display_name}</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: '#475569', fontWeight: 500, marginLeft: 16 }}>Dataset:</label>
        <select
          value={selectedFile || ''}
          onChange={(e) => setSelectedFile(e.target.value)}
          disabled={files.length === 0}
          style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, minWidth: 280 }}
        >
          {files.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: parsed ? '#10b981' : '#94a3b8' }}>
            {loading ? '⏳ Loading…' : parsed ? `✓ ${parsed.rows.length} rows · ${parsed.columns.length} cols` : source === 'failed' ? '✗ CSV unavailable' : '—'}
          </span>
        </div>
      </div>

      {/* Charts grid */}
      {parsed && specs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {specs.map((spec, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{spec.title}</div>
                <span style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{spec.kind}</span>
              </div>
              <ChartRender spec={spec} />
            </div>
          ))}
        </div>
      )}

      {/* Column inference */}
      {parsed && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Inferred column types</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {parsed.columns.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 4,
                  background: types[c] === 'numeric' ? '#dbeafe' : types[c] === 'date' ? '#fef3c7' : types[c] === 'categorical' ? '#d1fae5' : '#f1f5f9',
                  color: types[c] === 'numeric' ? '#1e40af' : types[c] === 'date' ? '#92400e' : types[c] === 'categorical' ? '#065f46' : '#475569',
                }}
              >
                <strong>{c}</strong> <span style={{ opacity: 0.6 }}>{types[c]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data preview */}
      {parsed && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
            Preview (first {Math.min(20, parsed.rows.length)} of {parsed.rows.length} rows)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {parsed.columns.map((c) => (
                    <th key={c} style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #e2e8f0', color: '#475569' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    {parsed.columns.map((c) => (
                      <td key={c} style={{ padding: '6px 10px', border: '1px solid #f1f5f9', color: '#1e293b' }}>{r[c] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!parsed && !loading && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 40, textAlign: 'center', color: '#64748b' }}>
          {source === 'failed'
            ? <>CSV file could not be loaded. Try a different file or check the dev server / backend.</>
            : <>Select a department + dataset above.</>}
        </div>
      )}

      <footer style={{ marginTop: 16, padding: 12, fontSize: 11, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <strong>Data source:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>data/samples/&lt;dept&gt;/&lt;file&gt;.csv</code> ·
        <strong> Fetch path:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>/api/v1/insur/downloads/*</code> (live) → <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>/data/samples/*</code> (Vite dev) → graceful fallback.
        Composes with §63 (dept scaffold), §66 (per-dept artefacts), §64.39 (chart vocab), §57.7 (graceful degradation).
      </footer>
    </div>
  );
}
