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
  const [decisions, setDecisions] = useState({}); // `${runRef}-${iter}` → 'approved' | 'rejected'
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Iter 21 P0+ · bulk approve/reject
  const [selected, setSelected] = useState(new Set());
  async function bulkAct(action) {
    const sel = (data?.queue || []).filter((q) => selected.has(`${q.run_ref}-${q.decision_iter}`));
    if (sel.length === 0) return;
    setBusyKey('bulk');
    try {
      await fetch(`${API_BASE}/api/v1/alerts/hitl/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisions: sel.map((s) => ({ run_ref: s.run_ref, decision_iter: s.decision_iter })),
          action,
          actor: localStorage.getItem('insur.activeRole') || 'hitl-bulk',
        }),
      });
      const newDecisions = { ...decisions };
      sel.forEach((s) => {
        newDecisions[`${s.run_ref}-${s.decision_iter}`] = action === 'approve' ? 'approved' : 'rejected';
      });
      setDecisions(newDecisions);
      setSelected(new Set());
    } catch (e) { setActionError(`bulk ${action} failed: ${e.message}`); }
    finally { setBusyKey(null); }
  }
  function toggleSelect(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  }

  // Iteration 4 P0 #6 · operator-driven approve/reject via /corrections POST
  async function actOnDecision(p, kind) {
    const key = `${p.run_ref}-${p.decision_iter}`;
    setBusyKey(key);
    setActionError(null);
    try {
      const severity = kind === 'reject' ? 'major' : 'minor';
      const body = {
        run_ref: p.run_ref,
        decision_iter: p.decision_iter,
        decision_action: p.action,
        ai_decision: { action: p.action, confidence: p.confidence, routing: p.routing },
        human_decision: { action: kind === 'approve' ? p.action : 'reject', via: 'hitl-ui' },
        severity,
        reason: kind === 'approve'
          ? 'HITL operator approved via UI · §93+§94+gate#3'
          : 'HITL operator rejected via UI · escalation logged',
        reviewer: 'hitl-ui',
      };
      const r = await fetch(`${API_BASE}/api/v1/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${r.status} · ${txt.slice(0, 80)}`);
      }
      setDecisions((d) => ({ ...d, [key]: kind === 'approve' ? 'approved' : 'rejected' }));
    } catch (e) {
      setActionError(`HITL action failed: ${e.message}`);
    } finally {
      setBusyKey(null);
    }
  }

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
        <>
          {actionError && (
            <div style={{
              background: '#fee2e2', color: '#991b1b', padding: 6,
              borderRadius: 3, fontSize: 10, marginBottom: 6,
            }}>✗ {actionError}</div>
          )}
          {/* Iter 21 · bulk action toolbar */}
          {selected.size > 0 && (
            <div style={{
              padding: 6, marginBottom: 6, background: '#dbeafe',
              border: '1px solid #3b82f6', borderRadius: 3,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
            }}>
              <strong style={{ color: '#1e40af' }}>{selected.size} selected</strong>
              <span style={{ flex: 1 }} />
              <button onClick={() => bulkAct('approve')} disabled={busyKey === 'bulk'} style={hitlBtn('#16a34a', busyKey === 'bulk')}>
                ✓ Bulk approve
              </button>
              <button onClick={() => bulkAct('reject')} disabled={busyKey === 'bulk'} style={hitlBtn('#dc2626', busyKey === 'bulk')}>
                ✗ Bulk reject
              </button>
              <button onClick={() => setSelected(new Set())} style={hitlBtn('#94a3b8', false)}>
                Clear
              </button>
            </div>
          )}
          <table style={{ width: '100%', fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 4, width: 20 }}>
                  <input type="checkbox"
                    checked={(data?.queue || []).every((q) => selected.has(`${q.run_ref}-${q.decision_iter}`)) && (data?.queue?.length || 0) > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set((data?.queue || []).map((q) => `${q.run_ref}-${q.decision_iter}`)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th style={{ padding: 4 }}>Run</th>
                <th style={{ padding: 4 }}>Iter</th>
                <th style={{ padding: 4 }}>Action</th>
                <th style={{ padding: 4 }}>Conf</th>
                <th style={{ padding: 4 }}>Tier</th>
                <th style={{ padding: 4 }}>RAI</th>
                <th style={{ padding: 4 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.slice(0, limit).map((p, i) => {
                const tone = TIER_TONE[p.routing] || TIER_TONE.human_approval;
                const key = `${p.run_ref}-${p.decision_iter}`;
                const resolved = decisions[key];
                const isBusy = busyKey === key;
                return (
                  <tr key={`${p.run_ref}-${i}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 4 }}>
                      {!resolved && (
                        <input type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleSelect(key)}
                        />
                      )}
                    </td>
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
                    <td style={{ padding: 4 }}>
                      {resolved ? (
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                          background: resolved === 'approved' ? '#dcfce7' : '#fee2e2',
                          color: resolved === 'approved' ? '#166534' : '#991b1b',
                        }}>{resolved === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}</span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 3 }}>
                          <button
                            onClick={() => actOnDecision(p, 'approve')}
                            disabled={!!busyKey}
                            style={hitlBtn('#16a34a', isBusy)}
                          >{isBusy ? '…' : '✓'}</button>
                          <button
                            onClick={() => actOnDecision(p, 'reject')}
                            disabled={!!busyKey}
                            style={hitlBtn('#dc2626', isBusy)}
                          >{isBusy ? '…' : '✗'}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/hitl/queue · §38.3 + T7.9 confidence routing + Tier 7 gate #3 + #5 (corrections POST)
      </div>
    </div>
  );
}

function hitlBtn(color, isBusy) {
  return {
    padding: '2px 8px', fontSize: 11, fontWeight: 700,
    cursor: isBusy ? 'wait' : 'pointer',
    background: color, color: '#fff', border: 'none', borderRadius: 3,
  };
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
