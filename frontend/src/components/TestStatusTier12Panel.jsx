// TestStatusTier12Panel · P1 #12 · 12-tier test status per §64.30.
// Wired to /api/v1/test-status/{process_id}.

import { useEffect, useState } from 'react';
import TimeSeriesLine from './charts/TimeSeriesLine';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const STATUS_TONE = {
  pass:     { bg: '#dcfce7', fg: '#166534', dot: '#16a34a' },
  partial:  { bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
  fail:     { bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626' },
  scaffold: { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
};

export default function TestStatusTier12Panel({ accent = '#0ea5e9', processId = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTier, setExpandedTier] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/test-status/${processId}`);
        if (!r.ok) throw new Error(`${r.status}`);
        if (!cancelled) setData(await r.json());
      } catch (e) { if (!cancelled) setError(e.message); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [processId]);

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading test status…</em></div>;
  if (error || !data) return <div style={{...cardStyle, borderLeftColor: '#dc2626', background: '#fef2f2'}}><div style={{fontSize: 11, color: '#991b1b'}}>{error || 'no data'}</div></div>;

  const tiers = data.tiers || [];
  const byStatus = data.by_status || {};

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🧪</span>
        <strong style={{ fontSize: 13, color: accent }}>§64.30 · 12-tier test status · {processId}</strong>
        <span style={{
          marginLeft: 'auto',
          background: data.overall_pass_rate >= 0.9 ? '#16a34a' : data.overall_pass_rate >= 0.7 ? '#d97706' : '#dc2626',
          color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>overall {(data.overall_pass_rate * 100).toFixed(1)}%</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="PASS" value={byStatus.pass || 0} accent="#16a34a" />
        <Tile label="PARTIAL" value={byStatus.partial || 0} accent="#d97706" />
        <Tile label="FAIL" value={byStatus.fail || 0} accent="#dc2626" />
        <Tile label="FLAKY" value={data.total_flaky || 0} accent="#0ea5e9" />
      </div>

      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: 4 }}>#</th>
            <th style={{ padding: 4 }}>Tier</th>
            <th style={{ padding: 4 }}>Pass rate</th>
            <th style={{ padding: 4 }}>Bar</th>
            <th style={{ padding: 4 }}>Pass / Total</th>
            <th style={{ padding: 4 }}>Flaky</th>
            <th style={{ padding: 4 }}>Agent</th>
            <th style={{ padding: 4 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => {
            const tone = STATUS_TONE[t.status] || STATUS_TONE.scaffold;
            const isOpen = expandedTier === t.id;
            return (
              <>
                <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setExpandedTier(isOpen ? null : t.id)}>
                  <td style={{ padding: 4, color: '#94a3b8' }}>{t.id}</td>
                  <td style={{ padding: 4 }}>{t.name}</td>
                  <td style={{ padding: 4, color: tone.dot, fontWeight: 600 }}>
                    {t.pass_rate != null ? `${(t.pass_rate * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: 4, width: '15%' }}>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 2 }}>
                      <div style={{ height: 6, width: `${(t.pass_rate || 0) * 100}%`, background: tone.dot, borderRadius: 2 }} />
                    </div>
                  </td>
                  <td style={{ padding: 4 }}>{t.n_pass}/{t.n_tests_run}</td>
                  <td style={{ padding: 4, color: t.flaky_count > 0 ? '#d97706' : '#94a3b8' }}>{t.flaky_count}</td>
                  <td style={{ padding: 4, fontSize: 9 }}>{t.agent}</td>
                  <td style={{ padding: 4 }}>
                    <span style={{ background: tone.bg, color: tone.fg, padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>{t.status}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr style={{ background: '#f9fafb' }}>
                    <td colSpan={8} style={{ padding: 8 }}>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>
                        <strong>Cadence:</strong> {t.cadence} · <strong>Last run:</strong> {t.last_run_minutes_ago}min ago
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>7-day trend:</div>
                      <TimeSeriesLine
                        data={t.trend_7d.map((s, i) => ({ day: i - 6, score: s }))}
                        color={tone.dot}
                        height={80}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/test-status/{processId} · §64.30 12-tier · P1 #12
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{ padding: 6, background: '#fff', border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
