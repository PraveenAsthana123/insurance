// FeedbackPanel — Tier 7 gate #4 · explicit + implicit feedback.
// Wired to /api/v1/feedback/* (gate #4 backend shipped this commit).
//
// Injects into ProcessFeedbackTab + GovernanceAITab.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const VALUE_TONE = {
  good:      { bg: '#dcfce7', fg: '#166534', label: '✓ good' },
  bad:       { bg: '#fee2e2', fg: '#991b1b', label: '✗ bad' },
  correct:   { bg: '#dbeafe', fg: '#1e40af', label: '✓ correct' },
  incorrect: { bg: '#fee2e2', fg: '#991b1b', label: '✗ incorrect' },
  accepted:  { bg: '#dcfce7', fg: '#166534', label: '✓ accepted' },
  modified:  { bg: '#fef3c7', fg: '#92400e', label: '⚲ modified' },
  rejected:  { bg: '#fee2e2', fg: '#991b1b', label: '✗ rejected' },
  ignored:   { bg: '#f1f5f9', fg: '#475569', label: '○ ignored' },
};

export default function FeedbackPanel({ accent = '#8b5cf6', limit = 10 }) {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const [s, list] = await Promise.all([
          fetch(`${API_BASE}/api/v1/feedback/stats/summary`).then(r => r.json()),
          fetch(`${API_BASE}/api/v1/feedback?limit=${limit}`).then(r => r.json()),
        ]);
        if (!cancelled) {
          setStats(s);
          setItems(list || []);
        }
      } catch (e) {
        if (!cancelled) setError(`Feedback wire failed: ${e.message}`);
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

  if (busy) return <div style={card}><em style={{ fontSize: 11, color: '#94a3b8' }}>Loading feedback…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>Feedback wire unavailable.</strong> {error}
        </div>
      </div>
    );
  }
  const explicit = stats?.explicit || {};
  const implicit = stats?.implicit || {};

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📝</span>
        <strong style={{ fontSize: 13, color: accent }}>Tier 7 · Gate #4 · Decision feedback</strong>
        <span style={{
          marginLeft: 'auto', background: '#10b981', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>LIVE BACKEND</span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="TOTAL" value={stats?.total || 0} accent={accent} />
        <Tile label="GOOD" value={(explicit.good || 0) + (explicit.correct || 0)} accent="#16a34a" />
        <Tile label="BAD" value={(explicit.bad || 0) + (explicit.incorrect || 0)} accent="#dc2626" />
        <Tile label="ACCEPTED" value={implicit.accepted || 0} accent="#16a34a" />
        <Tile label="REJECTED" value={(implicit.rejected || 0) + (implicit.ignored || 0)} accent="#dc2626" />
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          No feedback recorded yet. (Honest empty per §57.7.)
          <br />
          POST to <code>/api/v1/feedback</code> with {`{run_ref, decision_iter, decision_action,
          feedback_kind, feedback_value, reviewer}`} to record.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Ref</th>
              <th style={{ padding: 4 }}>Run</th>
              <th style={{ padding: 4 }}>Action</th>
              <th style={{ padding: 4 }}>Kind</th>
              <th style={{ padding: 4 }}>Value</th>
              <th style={{ padding: 4 }}>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, limit).map((f) => {
              const tone = VALUE_TONE[f.feedback_value] || VALUE_TONE.ignored;
              return (
                <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, fontFamily: 'monospace', fontSize: 10 }}>{f.feedback_ref}</td>
                  <td style={{ padding: 4, fontFamily: 'monospace', fontSize: 10 }}>{f.run_ref?.slice(0, 10)}…</td>
                  <td style={{ padding: 4 }}>{f.decision_action}</td>
                  <td style={{ padding: 4 }}>
                    <span style={{
                      background: f.feedback_kind === 'explicit' ? '#dbeafe' : '#f1f5f9',
                      color: f.feedback_kind === 'explicit' ? '#1e40af' : '#475569',
                      padding: '1px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 700,
                    }}>{f.feedback_kind}</span>
                  </td>
                  <td style={{ padding: 4 }}>
                    <span style={{
                      background: tone.bg, color: tone.fg,
                      padding: '1px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 700,
                    }}>{tone.label}</span>
                  </td>
                  <td style={{ padding: 4 }}>{f.reviewer}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/feedback · §38.3 + Tier 7 gate #4 · companion to T7.10 corrections (gate #5)
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
      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
