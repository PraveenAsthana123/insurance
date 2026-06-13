// §F08 · Vector DB Browser · operator 2026-06-12.
import React, { useEffect, useState, useCallback } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function VectorBrowserPage() {
  const [health, setHealth] = useState(null);
  const [cols, setCols] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/vector-browser/health`, { headers: { 'X-Demo-Role': 'manager' } })
      .then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/vector-browser/collections`,
                                { headers: { 'X-Demo-Role': 'manager' } });
      const j = await r.json();
      setCols(j.collections || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = async (name) => {
    setSelected(name);
    setDetail(null);
    try {
      const r = await fetch(`${API}/api/v1/vector-browser/collections/${encodeURIComponent(name)}`,
                                { headers: { 'X-Demo-Role': 'manager' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDetail(await r.json());
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🗄 Vector DB Browser</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F08 · live aggregator over Chroma + Qdrant · §57.7 honest scaffold otherwise
      </div>

      <PageHeaderFlow active="data" />

      <PageObjective
        objective="Browse every vector collection · sample 5 rows · debug embedding integrity."
        storageKey="vector-browser"
        todos={[
          { id: 'v1', label: 'Health check both backends', done: health?.chroma?.reachable || health?.qdrant?.reachable },
          { id: 'v2', label: 'List collections from both' },
          { id: 'v3', label: 'Drill any collection → 5 sample rows' },
          { id: 'v4', label: 'Search by similar vector (next iter)' },
        ]}
      />

      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div className="glass-card" style={{
            background: health.chroma.reachable ? '#ecfdf5' : '#fef3c7',
            borderLeft: `4px solid ${health.chroma.reachable ? '#10b981' : '#f59e0b'}`,
          }}>
            <strong>Chroma</strong> · {health.chroma.reachable ? '✓ reachable' : '⚠ unreachable'} ·
            <code>{health.chroma.host}:{health.chroma.port}</code>
          </div>
          <div className="glass-card" style={{
            background: health.qdrant.reachable ? '#ecfdf5' : '#fef3c7',
            borderLeft: `4px solid ${health.qdrant.reachable ? '#10b981' : '#f59e0b'}`,
          }}>
            <strong>Qdrant</strong> · {health.qdrant.reachable ? '✓ reachable' : '⚠ unreachable'} ·
            <code>{health.qdrant.host}:{health.qdrant.port}</code>
          </div>
        </div>
      )}

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <div>
          <strong style={{ fontSize: 12 }}>Collections · {cols.length}</strong>
          <div style={{ marginTop: 8 }}>
            {cols.map((c, i) => (
              <div key={i} onClick={() => c.scaffold ? null : loadDetail(c.name)}
                   className={`glass-card ${c.scaffold ? 'card-3' : selected === c.name ? 'card-2' : 'card-5'}`}
                   style={{ padding: 10, marginBottom: 6,
                              cursor: c.scaffold ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 12 }}>{c.name}</strong>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3,
                                    background: 'rgba(0,0,0,0.06)' }}>
                    {c.backend}
                  </span>
                </div>
                {(c.count != null || c.points_count != null) && (
                  <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                    {c.count || c.points_count} rows
                  </div>
                )}
                {c.scaffold && (
                  <div className="subtle" style={{ fontSize: 10, marginTop: 4 }}>
                    {c.hint || '§57.7 honest scaffold'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          {detail ? (
            <>
              <div className="glass-card glass-strong">
                <strong>{detail.name}</strong> · {detail.backend}
                <div className="subtle" style={{ marginTop: 6, fontSize: 11 }}>
                  {detail.count || detail.points_count} rows · showing first {detail.rows?.length || 0}
                </div>
              </div>
              <div className="glass-card glass-strong" style={{ marginTop: 8 }}>
                {detail.rows?.map((r, i) => (
                  <div key={i} style={{ padding: 8, marginBottom: 4,
                                          background: 'rgba(255,255,255,0.7)',
                                          borderLeft: '3px solid #06b6d4', borderRadius: 4 }}>
                    <strong style={{ fontSize: 11 }}>id: {String(r.id)}</strong>
                    {r.document && (
                      <pre style={{ fontSize: 11, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {r.document}
                      </pre>
                    )}
                    {(r.metadata || r.payload) && (
                      <pre style={{ fontSize: 10, marginTop: 4, color: '#475569',
                                      whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(r.metadata || r.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card subtle" style={{ padding: 30, textAlign: 'center' }}>
              ← Click any non-scaffold collection to inspect sample rows
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
