// HITLPanel — Human-in-the-Loop queue panel · Tier 7 gate #3.
// Wired to /api/v1/hitl/queue · /api/v1/hitl/stats.
//
// Injects into governance tabs to surface decisions awaiting human review.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const TIER_TONE = {
  human_approval:    { bg: '#fef3c7', fg: '#92400e', border: '#d97706', label: 'HUMAN APPROVAL' },
  manual_processing: { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626', label: 'MANUAL PROCESSING' },
};

export default function HITLPanel({ accent = '#d97706', limit = 10 }) {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const [q, s] = await Promise.all([
          fetch(`${API_BASE}/api/v1/hitl/queue?limit=${limit}`).then(r => r.json()),
          fetch(`${API_BASE}/api/v1/hitl/stats`).then(r => r.json()),
        ]);
        if (!cancelled) {
          setData(q);
          setStats(s);
        }
      } catch (e) {
        if (!cancelled) setError(`HITL wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={card}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading HITL queue…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>HITL wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }

  const runtime = data?.runtime_available;
  const queue = data?.queue || [];
  const byTier = data?.by_tier || {};

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>👤</span>
        <strong style={{ fontSize: 13, color: accent }}>Tier 7 · Gate #3 · HITL queue</strong>
        <span style={{
          marginLeft: 'auto',
          background: runtime ? '#10b981' : '#94a3b8',
          color: '#fff', padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontWeight: 700,
        }}>{runtime ? 'LIVE' : 'STUB'}</span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="QUEUE SIZE" value={queue.length} accent={accent} />
        <Tile label="HUMAN" value={byTier.human_approval || 0} accent="#d97706" />
        <Tile label="MANUAL" value={byTier.manual_processing || 0} accent="#dc2626" />
        <Tile label="TOTAL RUNS" value={stats?.total_runs || 0} accent="#3b82f6" />
      </div>

      {!runtime ? (
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <strong>HITL queue unavailable.</strong> Reason: <em>{data?.reason}</em>
        </div>
      ) : queue.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          No decisions awaiting human review. (Honest empty per §57.7.)
          <br />
          When confidence routing tier is human_approval (conf 70-85%) or
          manual_processing (&lt;70%), entries appear here · resolve via
          POST to <code>/api/v1/corrections</code>.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Run</th>
              <th style={{ padding: 4 }}>Iter</th>
              <th style={{ padding: 4 }}>Action</th>
              <th style={{ padding: 4 }}>Confidence</th>
              <th style={{ padding: 4 }}>Tier</th>
              <th style={{ padding: 4 }}>RAI</th>
            </tr>
          </thead>
          <tbody>
            {queue.slice(0, limit).map((p, i) => {
              const tone = TIER_TONE[p.routing] || TIER_TONE.human_approval;
              return (
                <tr key={`${p.run_ref}-${i}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, fontFamily: 'monospace', fontSize: 10 }}>{p.run_ref?.slice(0, 12)}…</td>
                  <td style={{ padding: 4 }}>{p.decision_iter}</td>
                  <td style={{ padding: 4 }}>{p.action}</td>
                  <td style={{ padding: 4 }}>{p.confidence?.toFixed(2) ?? '—'}</td>
                  <td style={{ padding: 4 }}>
                    <span style={{
                      background: tone.bg, color: tone.fg,
                      padding: '1px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 700,
                    }}>{tone.label}</span>
                  </td>
                  <td style={{ padding: 4 }}>
                    {p.rai_pass === true ? <span style={{color: '#16a34a'}}>✓</span>
                    : p.rai_pass === false ? <span style={{color: '#dc2626'}}>✗</span>
                    : <span style={{color: '#94a3b8'}}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/hitl/queue · §38.3 + T7.9 confidence routing + Tier 7 gate #3
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{
      padding: 6, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
