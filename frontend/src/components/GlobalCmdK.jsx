// GlobalCmdK · P1 #20 · Cmd+K global search.
// Mount once in InsuranceLayout · indexes processes + departments + lenses.

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { departments } from '../data/insuranceCatalog';

export default function GlobalCmdK() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [typeFilter, setTypeFilter] = useState(null);  // Iter 23 · facet

  // Build index from catalog
  const index = useMemo(() => {
    const items = [];
    departments.forEach((d) => {
      items.push({
        type: 'dept',
        id: d.id,
        title: d.name,
        subtitle: `Department · ${d.processes?.length || 0} processes`,
        path: `/insurance/${d.id}`,
      });
      (d.processes || []).forEach((p) => {
        items.push({
          type: 'process',
          id: `${d.id}:${p.id}`,
          title: p.name,
          subtitle: `${d.name} · process`,
          path: `/insurance/${d.id}/B2C/${p.id}`,
        });
        (p.subProcesses || []).forEach((sp) => {
          items.push({
            type: 'subprocess',
            id: `${d.id}:${p.id}:${sp.id || sp.name}`,
            title: sp.name,
            subtitle: `${d.name} · ${p.name} · sub-process`,
            path: `/insurance/${d.id}/B2C/${p.id}`,
          });
        });
      });
    });
    // Lens shortcuts
    const lenses = [
      'fairness', 'explainable', 'ethical', 'governance',
      'recommendation', 'performance', 'portability', 'score',
    ];
    lenses.forEach((l) => items.push({
      type: 'lens',
      id: `lens:${l}`,
      title: `${l} AI lens`,
      subtitle: 'Responsible AI · 12-lens · drift timeseries',
      path: '/insurance',
    }));
    return items;
  }, []);

  const results = useMemo(() => {
    let pool = index;
    // Iter 23 · faceted filter by type
    if (typeFilter) pool = pool.filter((i) => i.type === typeFilter);
    if (!query.trim()) return pool.slice(0, 12);
    const q = query.toLowerCase();
    return pool
      .filter((i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, typeFilter, index]);

  // Per-type counts (Iter 23 · facet badges)
  const typeCounts = useMemo(() => {
    const c = { dept: 0, process: 0, subprocess: 0, lens: 0 };
    index.forEach((i) => { if (c[i.type] != null) c[i.type]++; });
    return c;
  }, [index]);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setActiveIdx(0);
      } else if (open && e.key === 'Escape') {
        setOpen(false);
      } else if (open && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(results.length - 1, i + 1));
      } else if (open && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (open && e.key === 'Enter' && results[activeIdx]) {
        e.preventDefault();
        navigate(results[activeIdx].path);
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, activeIdx, navigate]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '600px', maxWidth: '90vw',
          background: '#fff', borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}>
        <div style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="🔍 Search departments · processes · sub-processes · lenses…"
            aria-label="Search command palette"
            style={{
              width: '100%', padding: 8, fontSize: 13,
              border: '1px solid #cbd5e1', borderRadius: 4,
              outline: 'none',
            }}
          />
          {/* Iter 23 · faceted filter chips */}
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            <FacetChip active={!typeFilter} onClick={() => setTypeFilter(null)} label="ALL" count={index.length} />
            <FacetChip active={typeFilter === 'dept'} onClick={() => setTypeFilter(typeFilter === 'dept' ? null : 'dept')} label="DEPT" count={typeCounts.dept} color="#1e40af" />
            <FacetChip active={typeFilter === 'process'} onClick={() => setTypeFilter(typeFilter === 'process' ? null : 'process')} label="PROCESS" count={typeCounts.process} color="#166534" />
            <FacetChip active={typeFilter === 'subprocess'} onClick={() => setTypeFilter(typeFilter === 'subprocess' ? null : 'subprocess')} label="SUB" count={typeCounts.subprocess} color="#92400e" />
            <FacetChip active={typeFilter === 'lens'} onClick={() => setTypeFilter(typeFilter === 'lens' ? null : 'lens')} label="LENS" count={typeCounts.lens} color="#991b1b" />
          </div>
        </div>
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              No matches for "{query}"
            </div>
          ) : results.map((r, i) => (
            <div
              key={r.id}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => { navigate(r.path); setOpen(false); }}
              style={{
                padding: 8, cursor: 'pointer',
                background: i === activeIdx ? '#dbeafe' : 'transparent',
                borderBottom: '1px solid #f1f5f9',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                  background: TYPE_TONE[r.type]?.bg || '#f1f5f9',
                  color: TYPE_TONE[r.type]?.fg || '#475569',
                }}>{r.type.toUpperCase()}</span>
                <strong style={{ fontSize: 12 }}>{r.title}</strong>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{r.subtitle}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 6, background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: 9, color: '#64748b' }}>
          <kbd>↑↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>Esc</kbd> close · <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K</kbd> reopen · {results.length} results
        </div>
      </div>
    </div>
  );
}

const TYPE_TONE = {
  dept:       { bg: '#dbeafe', fg: '#1e40af' },
  process:    { bg: '#dcfce7', fg: '#166534' },
  subprocess: { bg: '#fef3c7', fg: '#92400e' },
  lens:       { bg: '#fee2e2', fg: '#991b1b' },
};

function FacetChip({ active, onClick, label, count, color = '#475569' }) {
  return (
    <button onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
        background: active ? color : '#fff',
        color: active ? '#fff' : color,
        border: `1px solid ${color}`, borderRadius: 3,
      }}>
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );
}
