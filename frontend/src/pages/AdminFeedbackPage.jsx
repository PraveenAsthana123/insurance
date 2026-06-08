// AdminFeedbackPage — operator view over /api/v1/admin/feedback rollup.
// Per GLOBAL_INPUT_PERSISTENCE_POLICY · tenant-scoped reads · soft-fail (rule 9).
//
// Reads:
//   GET /api/v1/admin/feedback/summary?days={n}
//   GET /api/v1/admin/feedback/comments?rating={up|down}&limit=50

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

function useFeedbackSummary(days) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/api/v1/admin/feedback/summary?days=${days}`, {
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => { if (!cancelled) { setData(d); setError(null); }})
      .catch((e) => {
        if (cancelled || e.name === 'AbortError') return;
        setError(e.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [days]);

  return { data, loading, error };
}

function useFeedbackComments(rating) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const url = rating
      ? `${API_BASE}/api/v1/admin/feedback/comments?rating=${rating}&limit=50`
      : `${API_BASE}/api/v1/admin/feedback/comments?limit=50`;
    fetch(url, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => { if (!cancelled) { setData(Array.isArray(d) ? d : []); setError(null); }})
      .catch((e) => {
        if (cancelled || e.name === 'AbortError') return;
        setError(e.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [rating]);

  return { data, loading, error };
}

function StatCard({ label, value, color = '#1e40af' }) {
  return (
    <div style={{
      flex: 1, minWidth: 160, padding: '14px 18px',
      border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff',
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [days, setDays] = useState(7);
  const [ratingFilter, setRatingFilter] = useState('');

  const { data: summary, loading: sLoading, error: sError } = useFeedbackSummary(days);
  const { data: comments, loading: cLoading } = useFeedbackComments(ratingFilter);

  const byTabRows = useMemo(() => {
    if (!summary?.by_tab) return [];
    return Object.entries(summary.by_tab).map(([tab, counts]) => ({
      tab, ...counts,
    }));
  }, [summary]);

  const byDayRows = useMemo(() => summary?.by_day || [], [summary]);

  return (
    <div style={{
      maxWidth: 1200, margin: '0 auto', padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Operator Feedback Rollup</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
          Aggregated feedback from process tabs · tenant-scoped · live read from{' '}
          <code>/api/v1/admin/feedback</code> (per GLOBAL_INPUT_PERSISTENCE_POLICY)
        </p>
      </header>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Window:&nbsp;
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '4px 8px', fontSize: 13 }}
          >
            <option value={1}>Last 1 day</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Comment filter:&nbsp;
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 13 }}
          >
            <option value="">All</option>
            <option value="up">Helpful only</option>
            <option value="down">Needs work only</option>
          </select>
        </label>
        {(sLoading || cLoading) && <span style={{ color: '#64748b', fontSize: 12 }}>Loading…</span>}
        {sError && <span style={{ color: '#dc2626', fontSize: 12 }}>Error: {sError}</span>}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total feedback" value={summary?.total_count ?? '—'} color="#1e40af" />
        <StatCard label="👍 Helpful" value={summary?.up_count ?? '—'} color="#16a34a" />
        <StatCard label="👎 Needs work" value={summary?.down_count ?? '—'} color="#dc2626" />
        <StatCard label="No rating" value={summary?.no_rating ?? '—'} color="#64748b" />
      </div>

      {/* By tab chart */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Feedback by tab</h2>
        {byTabRows.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>No data yet · interact with the feedback widget on any process tab.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byTabRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tab" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="up" stackId="a" fill="#16a34a" name="Helpful" />
              <Bar dataKey="down" stackId="a" fill="#dc2626" name="Needs work" />
              <Bar dataKey="no_rating" stackId="a" fill="#94a3b8" name="No rating" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* By day chart */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Feedback over time</h2>
        {byDayRows.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>No daily data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byDayRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#1e40af" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Top processes */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Top 10 processes by feedback volume</h2>
        {(summary?.by_process || []).length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>No process data yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Process</th>
                <th style={{ textAlign: 'right', padding: '8px 10px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_process.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px' }}>{row.process}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent comments */}
      <section>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>
          Recent comments
          {ratingFilter && ` (${ratingFilter === 'up' ? '👍 Helpful' : '👎 Needs work'} only)`}
        </h2>
        {comments.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>No comments yet · operators have not left written feedback.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={{
                padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: c.rating === 'up' ? '#f0fdf4' : c.rating === 'down' ? '#fef2f2' : '#fff',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4, fontSize: 12, color: '#64748b' }}>
                  <span>{c.rating === 'up' ? '👍' : '👎'}</span>
                  <strong>{c.process_name || '—'}</strong>
                  <span>· {c.department_name || '—'}</span>
                  <span>· tab: <code>{c.active_tab}</code></span>
                  <span style={{ marginLeft: 'auto' }}>{c.created_at}</span>
                </div>
                <div style={{ fontSize: 13, color: '#1f2937' }}>{c.comment}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
