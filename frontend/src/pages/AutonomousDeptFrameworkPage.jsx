// AutonomousDeptFrameworkPage — Autonomous Enterprise AI Department reference.
//
// Per operator brief 2026-06-08 · captures 10-level maturity · 14 governance
// gates · 13 MCP categories · 10 hybrid use cases · marketing/contact-center/
// browser stacks · HITL risk tiers. Read-only explorer.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const TABS = [
  { id: 'maturity',     name: '🪜 Maturity',     color: '#1e40af' },
  { id: 'governance',   name: '⚖️ Governance',   color: '#dc2626' },
  { id: 'mcp',          name: '🔌 MCP Catalog',  color: '#9333ea' },
  { id: 'hybrids',      name: '🧬 Hybrids',      color: '#16a34a' },
  { id: 'stacks',       name: '🧰 Stacks',       color: '#0ea5e9' },
];

const STATUS_COLOR = {
  used:       '#16a34a',
  scaffolded: '#d97706',
  partial:    '#d97706',
  planned:    '#94a3b8',
};

export default function AutonomousDeptFrameworkPage() {
  const [tab, setTab] = useState('maturity');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({});
  const [selectedStack, setSelectedStack] = useState('marketing-stack');
  const [error, setError] = useState(null);

  const fetchJSON = async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  useEffect(() => {
    (async () => {
      try {
        setStats(await fetchJSON('/api/v1/autonomous-dept/stats'));
      } catch (e) { setError(`stats: ${e.message}`); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const endpoints = {
          maturity:    '/api/v1/autonomous-dept/maturity',
          governance:  '/api/v1/autonomous-dept/governance',
          mcp:         '/api/v1/autonomous-dept/mcp-categories',
          hybrids:     '/api/v1/autonomous-dept/hybrids',
        };
        if (endpoints[tab] && !data[tab]) {
          setData((d) => ({ ...d, [tab]: undefined }));
          const r = await fetchJSON(endpoints[tab]);
          setData((d) => ({ ...d, [tab]: r }));
        }
        if (tab === 'stacks' && !data[selectedStack]) {
          const r = await fetchJSON(`/api/v1/autonomous-dept/${selectedStack}`);
          setData((d) => ({ ...d, [selectedStack]: r }));
        }
      } catch (e) { setError(`${tab}: ${e.message}`); }
    })();
  }, [tab, selectedStack]);

  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const small = { fontSize: 11, color: '#64748b' };

  const StatusBadge = ({ status }) => (
    <span style={{
      background: STATUS_COLOR[status] || '#94a3b8',
      color: '#fff', padding: '2px 6px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    }}>{status}</span>
  );

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>
        🏛 Autonomous Enterprise AI Department
      </h1>
      <div style={small}>
        10-level maturity · 14 governance gates · 13 MCP categories · 10 hybrids ·
        OSS stacks · per §38 · §47 · §52 · §57.7 · §76 · §80 · §91
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
          <Tile label="LEVELS"     value={stats.total_maturity_levels}  accent="#1e40af" />
          <Tile label="USED"       value={stats.by_status.used}          accent="#16a34a" />
          <Tile label="SCAFFOLDED" value={stats.by_status.scaffolded}    accent="#d97706" />
          <Tile label="PLANNED"    value={stats.by_status.planned}       accent="#94a3b8" />
          <Tile label="GATES"      value={stats.total_governance_gates}  accent="#dc2626" />
          <Tile label="MCP CATS"   value={stats.total_mcp_categories}    accent="#9333ea" />
          <Tile label="HYBRIDS"    value={stats.total_hybrids}           accent="#16a34a" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    background: tab === t.id ? t.color : '#fff',
                    color: tab === t.id ? '#fff' : '#475569',
                    border: `2px solid ${tab === t.id ? t.color : '#e2e8f0'}`,
                    borderRadius: 4, cursor: 'pointer',
                  }}>{t.name}</button>
        ))}
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626' }}>{error}</div>
      )}

      {tab === 'maturity' && data.maturity && (
        <div>
          {data.maturity.levels.map((l) => (
            <div key={l.level} style={{...card, padding: 10}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>
                  {l.level} · {l.name}
                </strong>
                <StatusBadge status={l.this_project_status} />
              </div>
              <div style={{...small, marginTop: 2}}>{l.question}</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                <strong>Tech:</strong> {l.tech.join(' · ')}
              </div>
              <div style={{...small, marginTop: 4}}>
                <strong>This project:</strong> {l.this_project}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'governance' && data.governance && (
        <div>
          {data.governance.gates.map((g) => (
            <div key={g.id} style={{...card, padding: 10}}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 13 }}>{g.id}. {g.name}</strong>
                <StatusBadge status={g.this_project_status} />
              </div>
              {g.this_project && (
                <div style={small}>This project: {g.this_project}</div>
              )}
              {g.rules && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Rules: {Object.entries(g.rules).map(([k, v]) =>
                    `${k}: ${v}`).join(' · ')}
                </div>
              )}
              {g.examples && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Examples: {g.examples.join(' · ')}
                </div>
              )}
              {g.weights && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Weights: {Object.entries(g.weights).map(([k, v]) =>
                    `${k}=${(v * 100).toFixed(0)}%`).join(' · ')}
                </div>
              )}
              {g.tools && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Tools: {g.tools.join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'mcp' && data.mcp && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
            MCP Categories for Marketing · sorted by priority
          </h3>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 6 }}>Priority</th>
                <th style={{ padding: 6 }}>Area</th>
                <th style={{ padding: 6 }}>MCPs</th>
                <th style={{ padding: 6 }}>Use Case</th>
              </tr>
            </thead>
            <tbody>
              {[...data.mcp.mcp_categories]
                .sort((a, b) => a.priority - b.priority)
                .map((m, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}>
                    <strong style={{ color: m.priority <= 3 ? '#dc2626' : '#64748b' }}>
                      {m.priority}
                    </strong>
                  </td>
                  <td style={{ padding: 6 }}><strong>{m.area}</strong></td>
                  <td style={{ padding: 6, fontSize: 11 }}>{m.mcps.join(' · ')}</td>
                  <td style={{ padding: 6, ...small }}>{m.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hybrids' && data.hybrids && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {data.hybrids.hybrids.map((h) => (
            <div key={h.id} style={{...card, padding: 10}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>{h.domain}</strong>
                <span style={{
                  background: h.value === 'highest' ? '#dc2626'
                            : h.value === 'very_high' ? '#d97706'
                            : '#1e40af',
                  color: '#fff', padding: '2px 6px', borderRadius: 4,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                }}>{h.value.replace('_', ' ')}</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                <code>{h.level}</code>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#475569' }}>
                {h.techniques.join(' + ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'stacks' && (
        <div>
          <div style={{...card, padding: 10}}>
            <strong style={{ fontSize: 13, marginRight: 8 }}>Stack:</strong>
            {[
              {id: 'marketing-stack', label: '📧 Marketing'},
              {id: 'contact-center',  label: '📞 Contact Center'},
              {id: 'browser-stack',   label: '🖥 Browser/Computer Use'},
              {id: 'hitl-tiers',      label: '✋ HITL Risk Tiers'},
            ].map((s) => (
              <button key={s.id} onClick={() => setSelectedStack(s.id)}
                      style={{
                        padding: '4px 10px', fontSize: 12,
                        background: selectedStack === s.id ? '#0ea5e9' : '#fff',
                        color: selectedStack === s.id ? '#fff' : '#475569',
                        border: `1px solid ${selectedStack === s.id ? '#0ea5e9' : '#cbd5e1'}`,
                        borderRadius: 4, marginRight: 4, cursor: 'pointer',
                      }}>{s.label}</button>
            ))}
          </div>
          {data[selectedStack] && (
            <div style={card}>
              {selectedStack === 'hitl-tiers' ? (
                <table style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: 6 }}>Tier</th>
                      <th style={{ padding: 6 }}>Examples</th>
                      <th style={{ padding: 6 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[selectedStack].tiers.map((t, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 6 }}>
                          <span style={{
                            background: t.tier === 'high' ? '#dc2626'
                                      : t.tier === 'medium' ? '#d97706'
                                      : '#16a34a',
                            color: '#fff', padding: '2px 8px', borderRadius: 4,
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          }}>{t.tier}</span>
                        </td>
                        <td style={{ padding: 6 }}>{t.examples.join(' · ')}</td>
                        <td style={{ padding: 6 }}><code>{t.action}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: 6 }}>Tool</th>
                      <th style={{ padding: 6 }}>{selectedStack === 'marketing-stack' ? 'Category' : 'Layer'}</th>
                      <th style={{ padding: 6 }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[selectedStack].tools.map((t, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 6 }}><strong>{t.tool}</strong></td>
                        <td style={{ padding: 6, ...small }}>{t.category || t.layer}</td>
                        <td style={{ padding: 6 }}>
                          {t.score != null ? (
                            <span style={{
                              fontWeight: 600,
                              color: t.score >= 9.5 ? '#16a34a'
                                   : t.score >= 8 ? '#d97706'
                                   : '#64748b',
                            }}>{t.score.toFixed(1)}</span>
                          ) : <em style={small}>—</em>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, accent = '#1e40af' }) {
  return (
    <div style={{
      flex: 1, padding: 8, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
    </div>
  );
}
