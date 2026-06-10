// AllAgentsNetworkPanel.jsx · Iter 43 · single table view of ALL 100 agents
// showing working · flow · network in one screen.

import { useState, useEffect, useCallback, useMemo } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

function Pill({ children, color = '#94a3b8' }) {
  return (
    <span style={{
      padding: '1px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      display: 'inline-block', marginRight: 2, marginBottom: 1,
    }}>{children}</span>
  );
}

const RISK_COLOR = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#991b1b' };

export default function AllAgentsNetworkPanel() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [filterDept, setFilterDept] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('department');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`${API}/api/v1/agentic/agents/all-blueprints`);
      const d = await r.json();
      setData(d);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.agents;
    if (filterDept !== 'all') rows = rows.filter(r => r.department === filterDept);
    if (filterRisk !== 'all') rows = rows.filter(r => r.risk_level === filterRisk);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.agent_id.toLowerCase().includes(q) ||
        r.agent_name.toLowerCase().includes(q) ||
        r.process_summary.toLowerCase().includes(q) ||
        r.mcp_servers.some(m => m.toLowerCase().includes(q)) ||
        r.rag_corpora.some(c => c.toLowerCase().includes(q))
      );
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '') || a.agent_id.localeCompare(b.agent_id);
      if (sortBy === 'risk') {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (order[a.risk_level] ?? 9) - (order[b.risk_level] ?? 9);
      }
      if (sortBy === 'n_skills') return (b.n_skills || 0) - (a.n_skills || 0);
      if (sortBy === 'mcp_count') return (b.mcp_servers?.length || 0) - (a.mcp_servers?.length || 0);
      return a.agent_id.localeCompare(b.agent_id);
    });
    return rows;
  }, [data, filterDept, filterRisk, search, sortBy]);

  const depts = useMemo(() => {
    if (!data?.stats?.by_department) return [];
    return Object.keys(data.stats.by_department).sort();
  }, [data]);

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: 12, background: '#fff', borderRadius: 6,
        border: '1px solid #e2e8f0', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <strong style={{ fontSize: 14 }}>All Agents · Working · Flow · Network</strong>
            <span style={{ marginLeft: 10, fontSize: 11, color: '#64748b' }}>
              {data ? `${filtered.length} / ${data.count} agents` : 'loading…'}
              {data && data.stats && (
                <span style={{ marginLeft: 10 }}>
                  · {data.stats.n_unique_mcps} unique MCP servers · {data.stats.n_unique_rag} RAG corpora
                </span>
              )}
            </span>
          </div>
          <button onClick={load} disabled={busy}
            style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              border: '1px solid #cbd5e1', borderRadius: 3, background: '#fff' }}>
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="search · id · summary · MCP · RAG"
            style={{ padding: '4px 8px', fontSize: 11, width: 240,
              border: '1px solid #cbd5e1', borderRadius: 3 }} />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            <option value="all">All departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            <option value="all">All risk</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 3 }}>
            <option value="department">Sort · department</option>
            <option value="risk">Sort · risk</option>
            <option value="n_skills">Sort · skill count</option>
            <option value="mcp_count">Sort · MCP count</option>
            <option value="agent_id">Sort · agent_id</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: 10, fontSize: 11, background: '#fee2e2', color: '#991b1b', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {/* Main table */}
      <div style={{ background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ fontSize: 10, width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f1f5f9', color: '#475569' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 6, width: 24 }}></th>
              <th style={{ textAlign: 'left', padding: 6 }}>AGENT</th>
              <th style={{ textAlign: 'left', padding: 6 }}>DEPT</th>
              <th style={{ textAlign: 'left', padding: 6 }}>RISK</th>
              <th style={{ textAlign: 'left', padding: 6 }}>WORKING (process)</th>
              <th style={{ textAlign: 'left', padding: 6 }}>FLOW (i→p→o)</th>
              <th style={{ textAlign: 'left', padding: 6 }}>NETWORK (MCP)</th>
              <th style={{ textAlign: 'left', padding: 6 }}>RAG</th>
              <th style={{ textAlign: 'left', padding: 6 }}>SKILLS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const isOpen = expanded === a.agent_id;
              return (
                <>
                  <tr key={a.agent_id} style={{
                    borderTop: '1px solid #f1f5f9',
                    background: isOpen ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                  }} onClick={() => setExpanded(isOpen ? null : a.agent_id)}>
                    <td style={{ padding: 4, color: '#94a3b8' }}>{isOpen ? '▼' : '▶'}</td>
                    <td style={{ padding: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 11 }}>{a.agent_name}</div>
                      <code style={{ fontSize: 9, color: '#94a3b8' }}>{a.agent_id}</code>
                    </td>
                    <td style={{ padding: 4 }}>
                      <Pill color="#3b82f6">{a.department}</Pill>
                    </td>
                    <td style={{ padding: 4 }}>
                      <Pill color={RISK_COLOR[a.risk_level] || '#94a3b8'}>{a.risk_level}</Pill>
                    </td>
                    <td style={{ padding: 4, maxWidth: 300, fontSize: 10 }}>
                      {a.process_summary.slice(0, 80)}{a.process_summary.length > 80 ? '…' : ''}
                    </td>
                    <td style={{ padding: 4, fontSize: 10 }}>
                      <code>{a.n_inputs}→{a.n_steps}→{a.n_outputs}</code>
                    </td>
                    <td style={{ padding: 4 }}>
                      {a.mcp_servers.slice(0, 3).map(m =>
                        <Pill key={m} color="#8b5cf6">{m.replace('-mcp', '')}</Pill>
                      )}
                      {a.mcp_servers.length > 3 && <Pill color="#94a3b8">+{a.mcp_servers.length - 3}</Pill>}
                    </td>
                    <td style={{ padding: 4 }}>
                      {a.rag_corpora.slice(0, 2).map(c =>
                        <Pill key={c} color="#0891b2">{c}</Pill>
                      )}
                      {a.rag_corpora.length > 2 && <Pill color="#94a3b8">+{a.rag_corpora.length - 2}</Pill>}
                    </td>
                    <td style={{ padding: 4, fontSize: 10, textAlign: 'center' }}>
                      <Pill color="#10b981">{a.n_skills}</Pill>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={9} style={{ padding: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 10 }}>
                          <div>
                            <strong style={{ fontSize: 10, color: '#475569' }}>FULL PROCESS</strong>
                            <p style={{ marginTop: 4, color: '#64748b' }}>{a.process_summary}</p>
                            <strong style={{ fontSize: 10, color: '#475569' }}>FLOW METRICS</strong>
                            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                              <li>Inputs: <code>{a.n_inputs}</code> · Steps: <code>{a.n_steps}</code> · Outputs: <code>{a.n_outputs}</code></li>
                              <li>Skills mapped: <code>{a.n_skills}</code></li>
                              <li>Autonomy: <code>{a.autonomy}</code> ({a.autonomy_marker})</li>
                              <li>Model: <code>{a.model}</code></li>
                              <li>Blueprint hash: <code>{a.blueprint_hash}</code></li>
                            </ul>
                          </div>
                          <div>
                            <strong style={{ fontSize: 10, color: '#475569' }}>MCP SERVERS ({a.mcp_servers.length})</strong>
                            <div style={{ marginTop: 4 }}>
                              {a.mcp_servers.map(m => <Pill key={m} color="#8b5cf6">{m}</Pill>)}
                            </div>
                            <strong style={{ fontSize: 10, color: '#475569', display: 'block', marginTop: 8 }}>RAG CORPORA ({a.rag_corpora.length})</strong>
                            <div style={{ marginTop: 4 }}>
                              {a.rag_corpora.map(c => <Pill key={c} color="#0891b2">{c}</Pill>)}
                            </div>
                            <strong style={{ fontSize: 10, color: '#475569', display: 'block', marginTop: 8 }}>TOOLS ({a.tools.length})</strong>
                            <div style={{ marginTop: 4 }}>
                              {a.tools.map(t => <Pill key={t} color="#0e7490">{t}</Pill>)}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      {data?.stats && (
        <div style={{ marginTop: 10, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 10 }}>
          <strong>Aggregate stats</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 6 }}>
            <div>
              <strong style={{ color: '#475569' }}>BY DEPARTMENT</strong>
              <ul style={{ marginTop: 4, paddingLeft: 14 }}>
                {Object.entries(data.stats.by_department).sort((a, b) => b[1] - a[1]).map(([d, n]) =>
                  <li key={d}>{d}: <code>{n}</code></li>
                )}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#475569' }}>BY RISK LEVEL</strong>
              <ul style={{ marginTop: 4, paddingLeft: 14 }}>
                {Object.entries(data.stats.by_risk_level).map(([r, n]) =>
                  <li key={r}>{r}: <code>{n}</code></li>
                )}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#475569' }}>UNIQUE MCP/RAG</strong>
              <div style={{ marginTop: 4 }}>
                {data.stats.unique_mcps.map(m => <Pill key={m} color="#8b5cf6">{m}</Pill>)}
              </div>
              <div style={{ marginTop: 4 }}>
                {data.stats.unique_rag_corpora.map(c => <Pill key={c} color="#0891b2">{c}</Pill>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
