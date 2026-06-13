// §149.2 · reusable list-page template consuming any GET endpoint that
// returns a JSON array (or an object with a known array key). Built so
// many "consume existing backend · render list" pages can ship as one-liners.

import React, { useEffect, useState, useCallback } from 'react';
import PageHeaderFlow from './PageHeaderFlow';
import PageObjective from './PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const HEADERS = { 'X-Demo-Role': 'manager' };

export default function SimpleListPage({
  title, icon, subtitle, endpoint,
  arrayKeys = ['items', 'data', 'rows', 'results', 'records'],
  flowActive = 'output',
  objective, todos = [], storageKey,
  rowKey = (r, i) => r.id || r.name || r.key || i,
  columns,
  refreshMs = 30_000,
  emptyHint = 'Empty list',
  cardKind = 'card-info',  // §149.2 palette
}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}${endpoint}`, { headers: HEADERS, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      let extracted = Array.isArray(j) ? j : null;
      if (!extracted) {
        for (const k of arrayKeys) {
          if (Array.isArray(j[k])) { extracted = j[k]; break; }
        }
      }
      if (!extracted) extracted = [];
      setRows(extracted);
      setMeta({ count: j.count, total: j.total, ...j });
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
      setErr(null);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [endpoint, arrayKeys]);

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  const filtered = filter
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">{icon} {title}</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        {subtitle} {lastFetch ? ` · last: ${lastFetch}` : ''}
        {meta?.count !== undefined && ` · ${meta.count} rows`}
      </div>

      <PageHeaderFlow active={flowActive} />

      {objective && (
        <PageObjective objective={objective} todos={todos} storageKey={storageKey || endpoint} />
      )}

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input type="search" placeholder="Filter rows…" value={filter}
               onChange={e => setFilter(e.target.value)}
               className="btn-glass"
               style={{ padding: '8px 12px', width: 320, background: '#fff' }} />
        <span style={{ alignSelf: 'center', fontSize: 11, color: '#6b7280' }}>
          {filtered.length} of {rows.length}
        </span>
        <button onClick={load} className="btn-glass" style={{ marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {loading && <div>Loading…</div>}
      {err && (
        <div className="glass-card card-4">
          ⚠ {err}
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
            Endpoint <code>{endpoint}</code> · sometimes this means the
            backend module is wired but the response shape differs from the
            expected array keys. Check OpenAPI: <code>/openapi.json</code>.
          </div>
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
          {emptyHint}
        </div>
      )}

      {columns ? (
        <div className="glass-card glass-strong" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(241, 245, 249, 0.7)' }}>
              <tr>
                {columns.map(c => (
                  <th key={c.key} style={{ textAlign: 'left', padding: 8, fontSize: 11,
                                             color: '#475569', textTransform: 'uppercase',
                                             letterSpacing: '0.05em' }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={rowKey(row, i)} style={{ borderTop: '1px solid #f1f5f9' }}>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: 8, verticalAlign: 'top' }}>
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-rotate" style={{ display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                gap: 8 }}>
          {filtered.map((row, i) => {
            const summary = row.summary || row.description || row.purpose
              || row.label || row.title || JSON.stringify(row).slice(0, 120);
            return (
              <div key={rowKey(row, i)}>
                <strong style={{ fontSize: 12 }}>
                  {row.name || row.id || row.label || row.key || `Row ${i + 1}`}
                </strong>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{summary}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
