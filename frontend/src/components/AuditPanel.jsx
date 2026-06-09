// AuditPanel — shared live-data panel for §38.3 audit DB visibility.
// Wired to /api/v1/insur/audit/list (16 weekly audits · live).
//
// Injects into governance tabs to show real audit status alongside
// static dummy content. Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md
// backend-wire P0 closure (audit DB).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function AuditPanel({ accent = '#dc2626' }) {
  const [audits, setAudits] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/insur/audit/list`);
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setAudits(d.audits || []);
      } catch (e) {
        if (!cancelled) setError(`live audit wire failed: ${e.message}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        <em style={{ fontSize: 11, color: '#94a3b8' }}>Loading §38.3 audit registry…</em>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{ fontSize: 11, color: '#991b1b' }}>
          <strong>Audit DB wire unavailable.</strong> {error}
          <br /><span style={{ fontStyle: 'italic' }}>Backend reachable? GET /api/v1/insur/audit/list</span>
        </div>
      </div>
    );
  }
  // Group audits by spec prefix (§38 §47 §57 §73 §76 etc.)
  const bySpec = audits.reduce((acc, a) => {
    const m = (a.spec || '').match(/§\d+/);
    const key = m ? m[0] : 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🏛️</span>
        <strong style={{ fontSize: 13, color: accent }}>§38.3 · Live audit registry</strong>
        <span style={{
          marginLeft: 'auto',
          background: '#10b981', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>LIVE BACKEND</span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="AUDITS" value={audits.length} accent={accent} />
        <Tile label="§38/§47" value={(bySpec['§38'] || 0) + (bySpec['§47'] || 0)} accent="#3b82f6" />
        <Tile label="§57/§64" value={(bySpec['§57'] || 0) + (bySpec['§64'] || 0)} accent="#8b5cf6" />
        <Tile label="§73/§76" value={(bySpec['§73'] || 0) + (bySpec['§76'] || 0)} accent="#d97706" />
      </div>

      {/* Audit list */}
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: 4 }}>Audit kind</th>
            <th style={{ padding: 4 }}>Spec</th>
            <th style={{ padding: 4 }}>Latest</th>
            <th style={{ padding: 4 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {audits.slice(0, 16).map((a) => (
            <tr key={a.kind} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: 4, fontFamily: 'monospace' }}>{a.kind}</td>
              <td style={{ padding: 4, color: '#475569' }}>{a.spec || '—'}</td>
              <td style={{ padding: 4, color: '#64748b', fontSize: 10 }}>
                {a.latest_report ? a.latest_report.split('/').slice(-1)[0] : '—'}
              </td>
              <td style={{ padding: 4 }}>
                <span style={{
                  background: a.latest_report ? '#dcfce7' : '#fef3c7',
                  color: a.latest_report ? '#166534' : '#92400e',
                  padding: '1px 6px', borderRadius: 3,
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {a.latest_report ? 'has report' : 'pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/insur/audit/list · §38.3 audit DB · §70 cron audit pattern · 16 weekly audits
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
