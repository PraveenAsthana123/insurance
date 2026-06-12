/**
 * §147 · Platform Explorer · ALL backend modules in ONE UI.
 *
 * Auto-discovers from OpenAPI spec at runtime.
 * Renders each module as a collapsible accordion · each endpoint as a row.
 * GET endpoints have inline "Try" button that fetches + displays response.
 * Generic table rendering for any {items: [...]} or array response.
 */
import { useEffect, useMemo, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

export default function PlatformExplorerPage() {
  const [spec, setSpec] = useState(null);
  const [err, setErr] = useState(null);
  const [openMod, setOpenMod] = useState(null);
  const [filter, setFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    fetch(`${API}/openapi.json`)
      .then(r => r.json()).then(setSpec)
      .catch(e => setErr(String(e)));
  }, []);

  const modules = useMemo(() => {
    if (!spec?.paths) return [];
    // Group by tag (first tag wins) OR by path prefix
    const groups = {};
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, def] of Object.entries(methods)) {
        if (!['get','post','put','delete','patch'].includes(method)) continue;
        const tag = (def.tags?.[0]) || path.split('/').slice(0, 4).join('/');
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push({ path, method: method.toUpperCase(), summary: def.summary || '' });
      }
    }
    return Object.entries(groups)
      .map(([tag, items]) => ({ tag, items, nGet: items.filter(i => i.method === 'GET').length, n: items.length }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [spec]);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return modules
      .map(m => ({
        ...m,
        items: m.items.filter(it =>
          (!f || it.path.toLowerCase().includes(f) || it.summary.toLowerCase().includes(f) || m.tag.toLowerCase().includes(f))
          && (methodFilter === 'all' || it.method === methodFilter)
        ),
      }))
      .filter(m => m.items.length > 0);
  }, [modules, filter, methodFilter]);

  if (err) return <div style={{ padding: 20, color: '#b91c1c' }}>Failed to load OpenAPI: {err}</div>;
  if (!spec) return <div style={{ padding: 20, color: '#6b7280' }}>Loading platform spec…</div>;

  const totalEps = modules.reduce((a, m) => a + m.n, 0);
  const visibleEps = filtered.reduce((a, m) => a + m.items.length, 0);

  return (
    <div style={{ padding: 20, background: '#f3f4f6', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🗺️ Platform Explorer · §147</h1>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          ALL backend modules · ALL endpoints · one page · auto-discovered from /openapi.json
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Stat label="Backend modules" value={modules.length} />
        <Stat label="Total endpoints"  value={totalEps} color="#6366f1" />
        <Stat label="Showing modules"  value={filtered.length} color="#10b981" />
        <Stat label="Showing endpoints" value={visibleEps} color="#f59e0b" />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Filter by path · tag · summary…"
                style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 200 }} />
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="all">All methods</option>
          <option value="GET">GET only</option>
          <option value="POST">POST only</option>
        </select>
        <button onClick={() => setOpenMod(filtered.map(m => m.tag))}
          style={{ padding: '8px 14px', background: '#4f46e5', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Expand all
        </button>
        <button onClick={() => setOpenMod([])}
          style={{ padding: '8px 14px', background: '#fff', color: '#4f46e5',
                    border: '1px solid #4f46e5', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Collapse all
        </button>
      </div>

      {/* Module accordion */}
      {filtered.map(m => {
        const isOpen = Array.isArray(openMod) ? openMod.includes(m.tag) : openMod === m.tag;
        return (
          <ModuleSection
            key={m.tag}
            module={m}
            isOpen={isOpen}
            onToggle={() => {
              if (Array.isArray(openMod)) {
                setOpenMod(isOpen ? openMod.filter(x => x !== m.tag) : [...openMod, m.tag]);
              } else {
                setOpenMod(isOpen ? null : m.tag);
              }
            }}
          />
        );
      })}
    </div>
  );
}


function ModuleSection({ module, isOpen, onToggle }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, marginBottom: 10,
                   border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: 14, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: isOpen ? '#eef2ff' : '#fff' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{module.tag}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {module.n} endpoints · {module.nGet} GET
          </div>
        </div>
        <div style={{ fontSize: 18, color: '#4338ca' }}>{isOpen ? '▾' : '▸'}</div>
      </div>
      {isOpen && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          {module.items.map((ep, i) => (
            <EndpointRow key={i} method={ep.method} path={ep.path} summary={ep.summary} />
          ))}
        </div>
      )}
    </div>
  );
}


function EndpointRow({ method, path, summary }) {
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const tryIt = async () => {
    if (method !== 'GET') return;
    if (path.includes('{')) {
      const filled = window.prompt(`Path has params · enter URL after host:\n${path}`, path);
      if (!filled) return;
      path = filled;
    }
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API}${path}`);
      const j = await r.json();
      setResp(j);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };

  const methodColors = {
    GET: '#10b981', POST: '#6366f1', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#8b5cf6',
  };

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ padding: '2px 8px', background: methodColors[method] || '#9ca3af',
                       color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700, minWidth: 50, textAlign: 'center' }}>
          {method}
        </span>
        <code style={{ fontSize: 12, color: '#374151', flex: 1 }}>{path}</code>
        {method === 'GET' && (
          <button onClick={tryIt} style={{
            padding: '4px 10px', fontSize: 11, cursor: 'pointer',
            border: '1px solid #4f46e5', background: '#fff', color: '#4f46e5', borderRadius: 4,
          }}>{loading ? '…' : 'Try'}</button>
        )}
      </div>
      {summary && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, marginLeft: 64 }}>{summary}</div>}
      {err && <div style={{ color: '#b91c1c', fontSize: 11, marginTop: 6 }}>error: {err}</div>}
      {resp && <ResponsePreview data={resp} />}
    </div>
  );
}


function ResponsePreview({ data }) {
  // Smart render: if there's an items array, table-render it
  const items = data?.items || (Array.isArray(data) ? data : null);
  if (items && items.length > 0 && typeof items[0] === 'object') {
    const cols = Object.keys(items[0]).slice(0, 6);
    return (
      <div style={{ marginTop: 8, marginLeft: 64, maxHeight: 240, overflow: 'auto',
                     background: '#f9fafb', borderRadius: 4, padding: 6 }}>
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
          {items.length} items · showing first 10
        </div>
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fff' }}>
              {cols.map(c => <th key={c} style={{ padding: 4, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                {cols.map(c => (
                  <td key={c} style={{ padding: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {String(it[c] ?? '—').substring(0, 60)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <pre style={{ marginTop: 8, marginLeft: 64, background: '#f9fafb', borderRadius: 4,
                   padding: 8, fontSize: 10, maxHeight: 200, overflow: 'auto', color: '#374151' }}>
      {JSON.stringify(data, null, 2).substring(0, 2000)}
    </pre>
  );
}

function Stat({ label, value, color = '#1f2937' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
