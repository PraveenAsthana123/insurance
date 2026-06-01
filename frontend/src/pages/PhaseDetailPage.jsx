// PhaseDetailPage.jsx — Per-phase / per-framework detail page with
// three tabs: Visibility (the doc) · Dashboard (KPIs + charts) ·
// Report (audit-ready structured output).
//
// Routes:
//   /catalogs/ai_assurance/:code/:tab?
//   /catalogs/ml_methodology/:code/:tab?
//   /catalogs/digital_transformation/:code/:tab?

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  aiAssuranceFrameworks,
  aiAssuranceHorizontals,
  mlMethodologyPhases,
  digitalTransformationDocs,
} from '../data/catalogIndex';

const TABS = ['visibility', 'dashboard', 'report'];

const CATALOG_META = {
  ai_assurance:           { name: 'AI Assurance',           accent: '#3b82f6' },
  ml_methodology:         { name: 'ML Methodology',         accent: '#10b981' },
  digital_transformation: { name: 'Digital Transformation', accent: '#f59e0b' },
};

// Resolve the phase entry from URL :catalog + :code.
function resolvePhase(catalog, code) {
  if (catalog === 'ai_assurance') {
    return (
      aiAssuranceFrameworks.find((f) => f.code === code) ||
      aiAssuranceHorizontals.find((h) => h.code === code)
    );
  }
  if (catalog === 'ml_methodology') {
    return mlMethodologyPhases.find((p) => p.code === code);
  }
  if (catalog === 'digital_transformation') {
    return digitalTransformationDocs.find((d) => d.code === code);
  }
  return null;
}

async function fetchMarkdown(path) {
  try {
    const r = await fetch(`/api/v1/catalogs/raw?path=${encodeURIComponent(path)}`);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  try {
    const r = await fetch(`/${path}`);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  return `# ${path}\n\n_Could not load markdown — backend offline + dev passthrough unavailable._`;
}

// ── Deterministic mock data per phase (so dashboards stay stable across reloads) ──
function mockChartsForPhase(catalog, code) {
  // Simple hash → seed so each phase gets distinct-but-stable numbers
  const seed = [...(catalog + code)].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rng = (offset) => ((Math.sin(seed + offset) + 1) / 2);

  return {
    kpis: [
      { label: 'Coverage',            value: Math.round(60 + rng(1) * 35), unit: '%', target: 80, accent: '#3b82f6' },
      { label: 'Open Gaps',           value: Math.round(rng(2) * 18),       unit: '',  target: 0,  accent: '#ef4444' },
      { label: 'Last Audit (days)',   value: Math.round(rng(3) * 90),       unit: '',  target: 30, accent: '#f59e0b' },
      { label: 'Composite Score',     value: parseFloat((0.6 + rng(4) * 0.4).toFixed(2)), unit: '', target: 0.85, accent: '#10b981' },
    ],
    trend: Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
      coverage: Math.round(55 + rng(i + 10) * 35 + i * 1.2),
      target: 80,
    })),
    breakdown: [
      { name: 'Met',         value: 45 + Math.round(rng(20) * 30), color: '#10b981' },
      { name: 'Partial',     value: 15 + Math.round(rng(21) * 20), color: '#f59e0b' },
      { name: 'Gap',         value:  5 + Math.round(rng(22) * 15), color: '#ef4444' },
      { name: 'Not Started', value:  5 + Math.round(rng(23) * 10), color: '#94a3b8' },
    ],
    radar: [
      { axis: 'Data',         score: Math.round(60 + rng(30) * 35) },
      { axis: 'Model',        score: Math.round(60 + rng(31) * 35) },
      { axis: 'Process',      score: Math.round(60 + rng(32) * 35) },
      { axis: 'Governance',   score: Math.round(60 + rng(33) * 35) },
      { axis: 'Observability',score: Math.round(60 + rng(34) * 35) },
      { axis: 'Documentation',score: Math.round(60 + rng(35) * 35) },
    ],
  };
}

// ── Tab: Visibility (markdown render) ──
function VisibilityTab({ phase }) {
  const [md, setMd] = useState('Loading…');
  useEffect(() => {
    let cancelled = false;
    fetchMarkdown(phase.file).then((t) => !cancelled && setMd(t));
    return () => { cancelled = true; };
  }, [phase.file]);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '24px 32px', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 12 }}>{phase.file}</div>
      <div className="markdown-render">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginTop: 0 }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 22 }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 16 }}>{children}</h3>,
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th style={{ background: '#f1f5f9', padding: '6px 10px', textAlign: 'left', border: '1px solid #cbd5e1' }}>{children}</th>,
            td: ({ children }) => <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>{children}</td>,
            blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #f59e0b', padding: '6px 14px', background: '#fffbeb', margin: '12px 0' }}>{children}</blockquote>,
          }}
        >
          {md}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ── Tab: Dashboard (KPIs + charts) ──
function DashboardTab({ phase, catalog }) {
  const data = mockChartsForPhase(catalog, phase.code);
  return (
    <div>
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {data.kpis.map((k) => {
          const pct = k.target > 0 ? Math.min(100, (k.value / k.target) * 100) : 0;
          const onTarget = k.label.toLowerCase().includes('gap') || k.label.toLowerCase().includes('day')
            ? k.value <= k.target
            : k.value >= k.target;
          return (
            <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
                {k.value}{k.unit}
              </div>
              <div style={{ fontSize: 11, color: onTarget ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {onTarget ? '✓' : '✗'} Target: {k.target}{k.unit}
              </div>
              <div style={{ marginTop: 6, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: k.accent }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Coverage Trend (12 months)</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="coverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Target', fill: '#10b981', fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Gap Breakdown</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {data.breakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Maturity Across Dimensions</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={data.radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
              <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Maturity Bar</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.radar} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} fontSize={11} />
              <YAxis dataKey="axis" type="category" fontSize={11} width={90} />
              <Tooltip />
              <Bar dataKey="score" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// PDF export — dynamic import keeps jspdf+html2canvas out of initial bundle
async function exportReportToPDF(elementId, fileName) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const el = document.getElementById(elementId);
  if (!el) return;
  // Render the report as a canvas at 2x scale for crispness
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
  const imgData = canvas.toDataURL('image/png');
  // A4 portrait: 210 × 297 mm. Compute height-correct width.
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;          // 10mm margin each side
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }
  pdf.save(fileName);
}

// ── Tab: Report (audit-ready) ──
function ReportTab({ phase, catalog }) {
  const data = mockChartsForPhase(catalog, phase.code);
  const compositeScore = data.kpis.find((k) => k.label === 'Composite Score').value;
  const coverage = data.kpis.find((k) => k.label === 'Coverage').value;
  const openGaps = data.kpis.find((k) => k.label === 'Open Gaps').value;
  const passed = data.breakdown.find((b) => b.name === 'Met').value;
  const total = data.breakdown.reduce((s, b) => s + b.value, 0);
  const [exporting, setExporting] = useState(false);
  const reportId = `report-${catalog}-${phase.code}`;

  const handleExport = async () => {
    setExporting(true);
    try {
      const fileName = `${catalog}__${phase.code}__report__${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportReportToPDF(reportId, fileName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          position: 'absolute',
          top: -2,
          right: 0,
          zIndex: 5,
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 500,
          background: exporting ? '#cbd5e1' : '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: exporting ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {exporting ? '⏳ Generating…' : '⬇ Export PDF'}
      </button>
    <div id={reportId} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '28px 36px', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', fontSize: 14, lineHeight: 1.65 }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Audit Report · v1</div>
        <h1 style={{ margin: '6px 0 4px 0', fontSize: 22, fontWeight: 700 }}>{phase.name}</h1>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {CATALOG_META[catalog].name} · {phase.code} {phase.id ? `· id ${phase.id}` : ''}
        </div>
      </header>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>1. Executive Summary</h2>
        <p style={{ color: '#334155' }}>
          {phase.name} reached a <strong>composite score of {compositeScore}</strong> against a target of 0.85.
          Coverage stands at <strong>{coverage}%</strong> with <strong>{openGaps} open gaps</strong>.
          Of {total} assessable areas, <strong>{passed} are met</strong>,
          {' '}{data.breakdown[1].value} partial, {data.breakdown[2].value} gap, {data.breakdown[3].value} not started.
        </p>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>2. Coverage by Status</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Count</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e2e8f0' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {data.breakdown.map((b) => (
              <tr key={b.name}>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: b.color, borderRadius: 2, marginRight: 8 }} />
                  {b.name}
                </td>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{b.value}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{((b.value / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>3. Maturity Across Dimensions</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Dimension</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Score</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.radar.map((r) => (
              <tr key={r.axis}>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{r.axis}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{r.score} / 100</td>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, color: r.score >= 80 ? '#10b981' : r.score >= 60 ? '#f59e0b' : '#ef4444', background: (r.score >= 80 ? '#f0fdf4' : r.score >= 60 ? '#fffbeb' : '#fef2f2') }}>
                    {r.score >= 80 ? '✓ Meets target' : r.score >= 60 ? '⚠ Below target' : '✗ Gap'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>4. Recommendations</h2>
        <ul style={{ color: '#334155', paddingLeft: 22 }}>
          <li>Close {openGaps} open gaps within next quarter; prioritize by impact × likelihood matrix.</li>
          <li>Drive {data.radar.find((r) => r.score === Math.min(...data.radar.map(r => r.score))).axis} from {Math.min(...data.radar.map(r => r.score))} to ≥80 — weakest dimension.</li>
          <li>Schedule next audit in 30 days; current last-audit gap = {data.kpis[2].value} days.</li>
          <li>Tie {phase.name} ownership to a named accountable role per RACI (per §63 + §104 Accountable AI).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>5. Sign-off</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Role</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={td}>Owner</td><td style={td}>{phase.owner || '—'}</td><td style={td}>{new Date().toLocaleDateString()}</td><td style={td}>Reviewed</td></tr>
            <tr><td style={td}>RAI Office</td><td style={td}>—</td><td style={td}>Pending</td><td style={td}>Awaiting</td></tr>
            <tr><td style={td}>Compliance</td><td style={td}>—</td><td style={td}>Pending</td><td style={td}>Awaiting</td></tr>
          </tbody>
        </table>
      </section>

      <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 11, color: '#94a3b8' }}>
        Composes with §38.3 audit envelope, §47.11 pre-release gates, §51 forensic substrate, §53 maturity stack, §66 per-dept HOLY_BRD/FRD.
        Generated from <code>{phase.file}</code> on {new Date().toISOString()}.
      </footer>
    </div>
    </div>
  );
}

const td = { padding: '8px 12px', border: '1px solid #e2e8f0' };

// ── Main page ──
export default function PhaseDetailPage() {
  const { catalog, code, tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'visibility';
  const phase = resolvePhase(catalog, code);
  const catalogMeta = CATALOG_META[catalog];

  if (!phase || !catalogMeta) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, color: '#ef4444' }}>Not found</h1>
        <p>No phase found for <code>{catalog}/{code}</code>. <Link to="/catalogs">Back to Catalogs</Link></p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          <Link to="/catalogs" style={{ color: '#3b82f6' }}>Catalogs</Link> ·{' '}
          <span style={{ color: catalogMeta.accent }}>{catalogMeta.name}</span>
        </div>
        <h1 style={{ margin: '6px 0 4px 0', fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{phase.name}</h1>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {phase.code}{phase.id ? ` · #${phase.id}` : ''}{phase.owner ? ` · Owner: ${phase.owner}` : ''}
        </div>
      </header>

      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => navigate(`/catalogs/${catalog}/${code}/${t}`)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === t ? `3px solid ${catalogMeta.accent}` : '3px solid transparent',
              color: activeTab === t ? '#0f172a' : '#64748b',
              fontWeight: activeTab === t ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
              textTransform: 'capitalize',
            }}
          >
            {t === 'visibility' ? '📄 Visibility' : t === 'dashboard' ? '📊 Dashboard' : '📋 Report'}
          </button>
        ))}
      </nav>

      {activeTab === 'visibility' && <VisibilityTab phase={phase} />}
      {activeTab === 'dashboard' && <DashboardTab phase={phase} catalog={catalog} />}
      {activeTab === 'report' && <ReportTab phase={phase} catalog={catalog} />}
    </div>
  );
}
