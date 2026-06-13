/**
 * RoleDashboard — per-(dept, role) dashboard + reports per §64.37.
 *
 * Role selector chips at top; tile grid + chart panel + reports list below.
 * Chart dispatch: recharts (default), plotly placeholder (renders JSON spec).
 *
 * Endpoints:
 *   GET  /api/v1/insur/roles
 *   GET  /api/v1/insur/dashboards/{dept}/{role}
 *   GET  /api/v1/insur/reports/{dept}/{role}
 *   POST /api/v1/insur/reports/{dept}/{role}/{report_id}/run
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from 'recharts';

const API = '/api/v1/insur';

const STATUS_COLOR = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };
const CHART_PALETTE = ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd', '#8c564b'];

export default function RoleDashboard({ dept }) {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('manager');
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runStatus, setRunStatus] = useState({});

  useEffect(() => {
    fetch(`${API}/roles`)
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!dept || !selectedRole) return;
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API}/dashboards/${dept}/${selectedRole}`, { signal: ac.signal }).then((r) => r.json()),
      fetch(`${API}/reports/${dept}/${selectedRole}`, { signal: ac.signal }).then((r) => r.json()),
    ])
      .then(([d, r]) => {
        if (cancelled) return;
        setDashboard(d);
        setReports(r);
      })
      .catch((e) => !cancelled && e.name !== 'AbortError' && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [dept, selectedRole]);

  async function runReport(reportId) {
    setRunStatus((s) => ({ ...s, [reportId]: 'running' }));
    try {
      const r = await fetch(`${API}/reports/${dept}/${selectedRole}/${reportId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: selectedRole, format: 'PDF' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRunStatus((s) => ({ ...s, [reportId]: `queued (${data.run_id})` }));
    } catch (e) {
      setRunStatus((s) => ({ ...s, [reportId]: `error: ${e}` }));
    }
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>📊 Role Dashboard — {dept}</strong>
        <span style={s.subhead}>15 roles per dept · per §64.37</span>
      </div>

      <div style={s.roleStrip}>
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRole(r)}
            style={{
              ...s.roleChip,
              ...(selectedRole === r ? s.roleChipActive : {}),
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {error && <div style={s.error}>Error: {error}</div>}
      {loading && <div style={s.muted}>Loading {selectedRole} dashboard…</div>}

      {dashboard && (
        <>
          <div style={s.summary}>
            <strong>{selectedRole.replace('-', ' ')}</strong> — {dashboard.summary}
          </div>

          <div style={s.tileGrid}>
            {dashboard.tiles.map((t) => (
              <div
                key={t.metric_id}
                style={{
                  ...s.tile,
                  borderLeftColor: STATUS_COLOR[t.status] || '#888',
                }}
              >
                <div style={s.tileLabel}>{t.label}</div>
                <div style={s.tileValue}>
                  {String(t.value)}
                  {t.unit && <span style={s.tileUnit}>{t.unit}</span>}
                </div>
                <div style={s.tileMeta}>
                  {t.target !== undefined && <span>target {t.target}</span>}
                  <span style={{ color: t.delta_pct >= 0 ? '#10b981' : '#ef4444' }}>
                    {t.delta_pct >= 0 ? '▲' : '▼'} {Math.abs(t.delta_pct)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={s.chartGrid}>
            {dashboard.charts.map((c) => (
              <ChartRender key={c.chart_id} chart={c} />
            ))}
          </div>
        </>
      )}

      {reports && (
        <div style={s.reportsSection}>
          <div style={s.sectionTitle}>📑 Standard reports for {selectedRole}</div>
          <table style={s.reportsTable}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Cadence</th>
                <th style={s.th}>Format</th>
                <th style={s.th}>Recipients</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.reports.map((r) => (
                <tr key={r.report_id}>
                  <td style={s.td}><strong>{r.name}</strong></td>
                  <td style={s.td}>{r.cadence}</td>
                  <td style={s.td}><code>{r.format}</code></td>
                  <td style={s.td}>{r.recipients}</td>
                  <td style={s.td}>
                    <button onClick={() => runReport(r.report_id)} style={s.runBtn}>
                      ▶ Run
                    </button>
                    {runStatus[r.report_id] && (
                      <span style={s.runStatus}>{runStatus[r.report_id]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dashboard && (
        <div style={s.footer}>
          Refreshed: {dashboard.refreshed_at} · 15 roles available · backend
          serves synthetic data until per-dept SQL queries are wired
        </div>
      )}
    </div>
  );
}

function ChartRender({ chart }) {
  const palette = CHART_PALETTE;

  // Recharts paths (most common)
  if (chart.library === 'recharts') {
    if (chart.type === 'line') {
      return (
        <ChartCard title={chart.title}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chart.data || []}>
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey={chart.x_axis} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
    if (chart.type === 'area') {
      return (
        <ChartCard title={chart.title}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chart.data || []}>
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey={chart.x_axis} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={palette[1]} fill={palette[1]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
    if (chart.type === 'bar') {
      return (
        <ChartCard title={chart.title}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart.data || []}>
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey={chart.x_axis || 'category'} fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="value" fill={palette[0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
    if (chart.type === 'pie') {
      return (
        <ChartCard title={chart.title}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chart.data || []} dataKey="value" nameKey="label" outerRadius={70} label>
                {(chart.data || []).map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      );
    }
  }

  // Plotly types — placeholder card with chart-type badge + raw spec
  // (full Plotly support deferred per §64.39 — needs `react-plotly.js` install)
  return (
    <ChartCard title={chart.title}>
      <div style={s.plotlyPlaceholder}>
        <div style={s.plotlyBadge}>{chart.library} / {chart.type}</div>
        <pre style={s.plotlyPre}>
          {JSON.stringify(chart.data || {}, null, 2).slice(0, 280)}
          {JSON.stringify(chart.data || {}).length > 280 ? '…' : ''}
        </pre>
        <div style={s.plotlyHint}>
          Install react-plotly.js to render natively (per §64.39 chart vocabulary)
        </div>
      </div>
    </ChartCard>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={s.chartCard}>
      <div style={s.chartTitle}>{title}</div>
      {children}
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  subhead: { fontSize: 11, color: '#888' },
  roleStrip: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12, padding: 8, background: '#f9fafb', borderRadius: 6 },
  roleChip: { padding: '4px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 14, cursor: 'pointer', fontSize: 11, color: '#374151' },
  roleChipActive: { background: '#1f77b4', color: '#fff', borderColor: '#1f77b4', fontWeight: 600 },
  error: { color: '#c00', padding: 12, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  muted: { color: '#888', padding: 16, textAlign: 'center' },
  summary: { padding: 10, background: '#eff6ff', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#1e3a8a', borderLeft: '4px solid #3b82f6' },
  tileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 },
  tile: { padding: 10, background: '#fafafa', borderRadius: 6, borderLeft: '4px solid', minHeight: 80 },
  tileLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', fontWeight: 600 },
  tileValue: { fontSize: 22, fontWeight: 700, color: '#111', marginTop: 4 },
  tileUnit: { fontSize: 13, color: '#666', marginLeft: 3, fontWeight: 400 },
  tileMeta: { fontSize: 10, color: '#666', marginTop: 4, display: 'flex', justifyContent: 'space-between' },
  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 },
  chartCard: { padding: 8, background: '#fafafa', borderRadius: 6, border: '1px solid #e8e8e8' },
  chartTitle: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  plotlyPlaceholder: { padding: 10, background: '#fff', borderRadius: 4, minHeight: 180, display: 'flex', flexDirection: 'column', gap: 6 },
  plotlyBadge: { alignSelf: 'flex-start', padding: '2px 8px', background: '#fef3c7', borderRadius: 10, fontSize: 9, fontWeight: 600, color: '#92400e' },
  plotlyPre: { background: '#f8fafc', color: '#475569', border: '1px solid #e5e7eb', padding: 6, borderRadius: 4, fontSize: 9, overflow: 'auto', maxHeight: 100 },
  plotlyHint: { fontSize: 9, color: '#888', fontStyle: 'italic' },
  reportsSection: { marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 },
  reportsTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 8px', background: '#f6f8fa', borderBottom: '2px solid #e1e4e8' },
  td: { padding: '6px 8px', borderBottom: '1px solid #f0f0f0' },
  runBtn: { padding: '3px 10px', background: '#1f77b4', color: '#fff', border: 0, borderRadius: 3, cursor: 'pointer', fontSize: 11 },
  runStatus: { marginLeft: 8, fontSize: 10, color: '#666' },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 8 },
};
