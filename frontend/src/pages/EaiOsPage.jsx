/**
 * §144 · Enterprise AI OS · 9-layer single-pane view
 *
 * One vertical layout per operator's "vertical · one component one row" demand.
 * Each layer = one section · expandable to row list.
 */
import { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

const LAYERS = [
  { id: 'pm',       name: 'L18 Process Mining',     color: '#0ea5e9',
    endpoints: ['pm/discoveries', 'pm/bottlenecks', 'pm/candidates',
                 'pm/scores', 'pm/tasks', 'pm/workforce', 'pm/autonomous-departments'] },
  { id: 'fabric',   name: 'L17 Data Fabric',        color: '#10b981',
    endpoints: ['fabric/domains', 'fabric/products', 'fabric/catalog',
                 'fabric/lineage', 'fabric/features', 'fabric/vector-assets', 'fabric/decisions'] },
  { id: 'os',       name: 'L16 AI OS',              color: '#f59e0b',
    endpoints: ['os/capabilities', 'os/workspaces', 'os/digital-workers',
                 'os/digital-teams', 'os/marketplace/agents', 'os/marketplace/prompts'] },
  { id: 'ct',       name: 'L15 Control Tower',      color: '#ef4444',
    endpoints: ['ct/inventory', 'ct/prompts', 'ct/workflows',
                 'ct/risks', 'ct/costs', 'ct/compliance'] },
  { id: 'exec',     name: 'L14 Execution Engine',   color: '#8b5cf6',
    endpoints: ['execution/plans', 'execution/validations', 'execution/rollbacks',
                 'execution/self-healing', 'execution/risk-matrix'] },
  { id: 'learning', name: 'L13 Learning Engine',    color: '#06b6d4',
    endpoints: ['learning/prompt-versions', 'learning/agent-versions',
                 'learning/workflow-learning', 'learning/feedback', 'learning/fine-tune-jobs'] },
  { id: 'eval',     name: 'L12 Evaluation',         color: '#84cc16',
    endpoints: ['eval/benchmarks', 'eval/golden-datasets',
                 'eval/experiments', 'eval/rag'] },
  { id: 'twin',     name: 'L10 Digital Twin',       color: '#ec4899',
    endpoints: ['os/departments'] },
  { id: 'pattern',  name: '§144 Pattern Library',   color: '#6366f1',
    endpoints: ['pattern/discover', 'pattern/enforce-roster'] },
];


export default function EaiOsPage() {
  const [score, setScore] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('pm');

  useEffect(() => {
    fetch(`${API}/api/v1/eai-os/score-card`).then(r => r.json()).then(setScore);
    fetch(`${API}/api/v1/eai-os/overview`).then(r => r.json()).then(setOverview);
  }, []);

  const active = LAYERS.find(l => l.id === tab);

  return (
    <div style={{ padding: 24, background: '#f3f4f6', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Enterprise AI OS · 9-layer unified surface</h1>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            §144 · Autonomous Incident Management · Pattern enforcement
          </div>
        </div>
        {score && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>
              {score.score} · {score.band}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {score.n_layers} layers · §122 brutal score
            </div>
          </div>
        )}
      </div>

      {/* Tab bar · vertical layout per operator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {LAYERS.map(l => (
          <button key={l.id} onClick={() => setTab(l.id)} style={{
            padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            borderBottom: tab === l.id ? `3px solid ${l.color}` : '3px solid transparent',
            color: tab === l.id ? '#1f2937' : '#6b7280',
          }}>
            {l.name}
          </button>
        ))}
      </div>

      {/* Each endpoint = ONE row · vertical scroll */}
      {active?.endpoints?.map(ep => (
        <EndpointSection key={ep} endpoint={ep} color={active.color} />
      ))}
    </div>
  );
}


function EndpointSection({ endpoint, color }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/eai-os/${endpoint}`)
      .then(r => r.json()).then(setData).catch(e => setErr(String(e)));
  }, [endpoint]);

  const items = data?.items || data?.canonical_pattern_excerpt ? (data?.items || [data]) : null;
  const nItems = data?.n_items ?? data?.items?.length ?? data?.n_patterns_discovered ?? 0;

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 12,
                   border: `1px solid #e5e7eb`, borderLeft: `4px solid ${color}` }}>
      <div onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>/{endpoint}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {err ? `error: ${err}` : `${nItems} items`}
          </div>
        </div>
        <div style={{ fontSize: 18, color }}>{expanded ? '▾' : '▸'}</div>
      </div>

      {expanded && data && (
        <div style={{ marginTop: 12 }}>
          {items && items.length > 0 ? (
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {Object.keys(items[0]).slice(0, 6).map(k => (
                    <th key={k} style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 15).map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {Object.keys(items[0]).slice(0, 6).map(k => (
                      <td key={k} style={{ padding: 6, color: '#374151',
                                             maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(it[k] ?? '—').substring(0, 60)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre style={{ fontSize: 11, background: '#f9fafb', padding: 8, borderRadius: 4, overflow: 'auto' }}>
              {JSON.stringify(data, null, 2).substring(0, 1500)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
