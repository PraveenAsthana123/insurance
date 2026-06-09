// CorrectionsPanel — shared live-data panel for T7.10 RLHF correction DB.
// Wired to /api/v1/corrections/* (backend ready since commit 6e490afc).
//
// Injects into: ProcessFeedbackTab, GovernanceAITab, ProcessGovernanceTab.
// Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md backend-wire P1 closure.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const SEVERITY_TONE = {
  critical: { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626' },
  major:    { bg: '#fef3c7', fg: '#92400e', border: '#d97706' },
  minor:    { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6' },
};

export default function CorrectionsPanel({ runRef, severity, limit = 10, accent = '#3b82f6' }) {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  const fetchJSON = async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const params = new URLSearchParams();
        if (runRef) params.set('run_ref', runRef);
        if (severity) params.set('severity', severity);
        params.set('limit', String(limit));
        const [s, list] = await Promise.all([
          fetchJSON('/api/v1/corrections/stats/summary'),
          fetchJSON(`/api/v1/corrections?${params.toString()}`),
        ]);
        if (!cancelled) {
          setStats(s);
          setItems(list || []);
        }
      } catch (e) {
        if (!cancelled) setError(`live T7.10 wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runRef, severity, limit]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) {
    return (
      <div style={card}>
        <em style={{ fontSize: 11, color: '#94a3b8' }}>Loading T7.10 corrections…</em>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>T7.10 backend wire unavailable.</strong> {error}
          <br /><span style={{ fontStyle: 'italic' }}>Backend reachable? GET /api/v1/corrections/stats/summary</span>
        </div>
      </div>
    );
  }
  const s = stats?.by_severity || {};
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🔁</span>
        <strong style={{ fontSize: 13, color: accent }}>T7.10 · Live RLHF correction DB</strong>
        <span style={{
          marginLeft: 'auto',
          background: '#10b981', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>LIVE BACKEND</span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="TOTAL" value={stats?.total_corrections || 0} accent={accent} />
        <Tile label="CRITICAL" value={s.critical || 0} accent="#dc2626" />
        <Tile label="MAJOR" value={s.major || 0} accent="#d97706" />
        <Tile label="MINOR" value={s.minor || 0} accent="#3b82f6" />
      </div>

      {/* Recent corrections */}
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          No corrections recorded yet for this scope.
          {runRef && <> Filter: <code>run_ref={runRef}</code></>}
          {severity && <> · severity={severity}</>}
          <br />
          POST to <code>/api/v1/corrections</code> with {`{ run_ref, decision_iter, decision_action,
          ai_decision, human_decision, reason, reviewer, severity }`} to record an override.
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: 4 }}>Ref</th>
              <th style={{ padding: 4 }}>Action</th>
              <th style={{ padding: 4 }}>Reviewer</th>
              <th style={{ padding: 4 }}>Severity</th>
              <th style={{ padding: 4 }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((c) => {
              const tone = SEVERITY_TONE[c.severity] || SEVERITY_TONE.minor;
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 4, fontFamily: 'monospace' }}>{c.correction_ref}</td>
                  <td style={{ padding: 4 }}>{c.decision_action}</td>
                  <td style={{ padding: 4 }}>{c.reviewer}</td>
                  <td style={{ padding: 4 }}>
                    <span style={{
                      background: tone.bg, color: tone.fg,
                      padding: '1px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    }}>{c.severity}</span>
                  </td>
                  <td style={{ padding: 4, color: '#475569', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/corrections · backend T7.10 · §38.3 audit row · governance gate #5 (per AUTONOMOUS_DEPARTMENT_FRAMEWORK)
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
