// §EAOS-05 · Agent Lifecycle Management · operator 2026-06-12.
// Filters agent_registry by status (Draft / Active / Certified / Retired).
import React, { useEffect, useState, useCallback } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const STAGE_COLORS = {
  Draft:      { bg: '#fef3c7', bd: '#f59e0b', tx: '#92400e' },
  Active:     { bg: '#ecfdf5', bd: '#10b981', tx: '#065f46' },
  Certified:  { bg: '#dbeafe', bd: '#3b82f6', tx: '#1e3a8a' },
  Promoted:   { bg: '#faf5ff', bd: '#a855f7', tx: '#581c87' },
  Retired:    { bg: '#f1f5f9', bd: '#64748b', tx: '#334155' },
  Pending:    { bg: '#fee2e2', bd: '#ef4444', tx: '#991b1b' },
};

export default function AgentLifecyclePage() {
  const [agents, setAgents] = useState([]);
  const [stage, setStage] = useState('all');
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/agentic/agents?limit=500`,
                            { headers: { 'X-Demo-Role': 'manager' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setAgents(j.agents || j.items || j.data || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byStage = {};
  agents.forEach(a => {
    const st = a.status || a.lifecycle_stage || 'Unknown';
    byStage[st] = (byStage[st] || 0) + 1;
  });

  const visible = agents.filter(a => {
    if (stage !== 'all' && (a.status || a.lifecycle_stage) !== stage) return false;
    if (filter && !JSON.stringify(a).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🔁 Agent Lifecycle Management</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        Draft → Active → Certified → Promoted → Retired · {agents.length} agents total
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="Visualize every agent's lifecycle stage · promote certified · retire stale · zero ambiguity per §57.7."
        storageKey="agent-lifecycle"
        todos={[
          { id: 'a1', label: `${agents.length} agents in registry` },
          { id: 'a2', label: 'Filter by stage to see distribution' },
          { id: 'a3', label: 'Add promote/retire button (next iter)' },
          { id: 'a4', label: 'Auto-retire stale (no invocations 30d) per §106' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setStage('all')} className="btn-glass"
                style={{ background: stage === 'all' ? '#10b981' : '#fff',
                          color: stage === 'all' ? '#fff' : '#1f2937' }}>
          All ({agents.length})
        </button>
        {Object.entries(byStage).map(([st, n]) => (
          <button key={st} onClick={() => setStage(st)} className="btn-glass"
                  style={{ background: stage === st ? STAGE_COLORS[st]?.bd || '#64748b' : STAGE_COLORS[st]?.bg || '#fff',
                            color: stage === st ? '#fff' : STAGE_COLORS[st]?.tx || '#1f2937' }}>
            {st} ({n})
          </button>
        ))}
      </div>

      <input type="search" placeholder="Filter agents…" value={filter}
             onChange={e => setFilter(e.target.value)}
             className="btn-glass"
             style={{ padding: '8px 12px', width: 320, marginBottom: 12 }} />

      <div className="glass-card glass-strong" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(241, 245, 249, 0.7)' }}>
            <tr>
              {['Agent', 'Stage', 'Risk', 'Owner Team', 'Department', 'Created'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: 8, fontSize: 11,
                                     color: '#475569', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 100).map((a, i) => {
              const st = a.status || a.lifecycle_stage || 'Unknown';
              const c = STAGE_COLORS[st] || { bg: '#f1f5f9', bd: '#64748b', tx: '#334155' };
              return (
                <tr key={a.agent_id || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <strong style={{ fontSize: 12 }}>{a.agent_id || a.id}</strong>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.agent_name || a.name}</div>
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{ padding: '3px 8px', borderRadius: 3, fontSize: 10,
                                   fontWeight: 600,
                                   background: c.bg, color: c.tx, border: `1px solid ${c.bd}` }}>
                      {st}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>{a.risk_level || a.risk || '—'}</td>
                  <td style={{ padding: 8 }}>{a.owner_team || a.owner || '—'}</td>
                  <td style={{ padding: 8 }}>{a.department_id || a.department || '—'}</td>
                  <td style={{ padding: 8, fontSize: 10, color: '#94a3b8' }}>
                    {a.created_at?.slice?.(0, 10) || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length > 100 && (
        <div className="subtle" style={{ marginTop: 10, textAlign: 'center' }}>
          Showing 100 of {visible.length} matching agents · use filter to narrow.
        </div>
      )}
    </div>
  );
}
