// CatalogsPage.jsx — Surfaces the three sibling catalogs:
//   - AI Assurance (11 frameworks + 9 horizontal docs)
//   - ML Methodology (11 phases)
//   - Digital Transformation (2 DT checklists + 2 process catalogs)
// Markdown is fetched live from the repo via the dev-server static
// pass-through; production should mount /docs via Nginx + cache.

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  aiAssuranceFrameworks,
  aiAssuranceHorizontals,
  mlMethodologyPhases,
  digitalTransformationDocs,
} from '../data/catalogIndex';

const TABS = [
  { id: 'ai_assurance',     label: 'AI Assurance',          accent: '#3b82f6' },
  { id: 'ml_methodology',   label: 'ML Methodology',        accent: '#10b981' },
  { id: 'digital_transformation', label: 'Digital Transformation', accent: '#f59e0b' },
];

// Vite serves files from repo root in dev. Try the dev passthrough
// first; fall back to a graceful message if backend doesn't proxy.
async function fetchMarkdown(path) {
  // Try API endpoint first (production / via FastAPI static)
  try {
    const r = await fetch(`/api/v1/catalogs/raw?path=${encodeURIComponent(path)}`);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  // Dev fallback — try direct path
  try {
    const r = await fetch(`/${path}`);
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  return `# ${path}\n\n_Could not load markdown (backend offline + dev passthrough not configured)._\n\nFile exists on disk at \`${path}\`.`;
}

function ListColumn({ items, selectedId, onSelect, accent, getId, renderItem }) {
  return (
    <aside
      style={{
        width: 320,
        flex: '0 0 320px',
        borderRight: '1px solid #e2e8f0',
        background: '#f8fafc',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {items.map((it) => {
        const id = getId(it);
        const active = id === selectedId;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              border: 'none',
              borderLeft: active ? `3px solid ${accent}` : '3px solid transparent',
              background: active ? '#fff' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: active ? '#0f172a' : '#334155',
            }}
          >
            {renderItem(it, active)}
          </button>
        );
      })}
    </aside>
  );
}

function MarkdownPane({ path }) {
  const [md, setMd] = useState('Loading…');
  useEffect(() => {
    let cancelled = false;
    setMd('Loading…');
    fetchMarkdown(path).then((text) => {
      if (!cancelled) setMd(text);
    });
    return () => { cancelled = true; };
  }, [path]);

  return (
    <article
      style={{
        flex: 1,
        padding: '20px 32px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 200px)',
        background: '#fff',
        fontSize: 14,
        lineHeight: 1.65,
        color: '#1e293b',
      }}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 12 }}>{path}</div>
      <div className="markdown-render">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 style={{ fontSize: 24, fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, marginTop: 0 }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 24 }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 18 }}>{children}</h3>,
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th style={{ background: '#f1f5f9', padding: '6px 10px', textAlign: 'left', border: '1px solid #cbd5e1' }}>{children}</th>,
            td: ({ children }) => <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>{children}</td>,
            code: ({ inline, children }) => (
              <code
                style={{
                  background: inline ? '#f1f5f9' : '#0f172a',
                  color: inline ? '#0f172a' : '#e2e8f0',
                  padding: inline ? '2px 6px' : '12px',
                  borderRadius: 4,
                  fontSize: 12,
                  display: inline ? 'inline' : 'block',
                  overflowX: 'auto',
                }}
              >
                {children}
              </code>
            ),
            blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #f59e0b', padding: '6px 14px', background: '#fffbeb', margin: '12px 0' }}>{children}</blockquote>,
          }}
        >
          {md}
        </ReactMarkdown>
      </div>
    </article>
  );
}

// ---- per-tab renderers ----

function AIAssuranceView() {
  const [selected, setSelected] = useState(aiAssuranceFrameworks[0].file);
  const allItems = useMemo(
    () => [
      ...aiAssuranceFrameworks.map((f) => ({ ...f, _group: 'Frameworks' })),
      ...aiAssuranceHorizontals.map((h) => ({ ...h, _group: 'Horizontal Docs' })),
    ],
    []
  );

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ListColumn
        items={allItems}
        selectedId={selected}
        onSelect={setSelected}
        accent="#3b82f6"
        getId={(it) => it.file}
        renderItem={(it) => (
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {it._group} {it.id ? `· #${it.id}` : ''}
            </div>
            <div style={{ fontWeight: 500 }}>{it.name}</div>
            {it.owner && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{it.owner}</div>}
          </div>
        )}
      />
      <MarkdownPane path={selected} />
    </div>
  );
}

function MLMethodologyView() {
  const [selected, setSelected] = useState(mlMethodologyPhases[0].file);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ListColumn
        items={mlMethodologyPhases}
        selectedId={selected}
        onSelect={setSelected}
        accent="#10b981"
        getId={(it) => it.file}
        renderItem={(it) => (
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Phase #{it.id}
            </div>
            <div style={{ fontWeight: 500 }}>{it.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{it.owner}</div>
          </div>
        )}
      />
      <MarkdownPane path={selected} />
    </div>
  );
}

function DigitalTransformationView() {
  const [selected, setSelected] = useState(digitalTransformationDocs[0].file);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <ListColumn
        items={digitalTransformationDocs}
        selectedId={selected}
        onSelect={setSelected}
        accent="#f59e0b"
        getId={(it) => it.file}
        renderItem={(it) => (
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {it.kind === 'checklist' ? 'DT Checklist' : 'Process Catalog'} · {it.industry}
            </div>
            <div style={{ fontWeight: 500 }}>{it.name}</div>
          </div>
        )}
      />
      <MarkdownPane path={selected} />
    </div>
  );
}

// ---- main page ----

export default function CatalogsPage() {
  const [tab, setTab] = useState('ai_assurance');

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
          Catalogs
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748b' }}>
          Three sibling catalogs covering the AI rollout surface end-to-end.
          <strong> Verification</strong> (AI Assurance) ·
          <strong> Construction</strong> (ML Methodology) ·
          <strong> Organisational absorption</strong> (Digital Transformation).
        </p>
      </header>

      <nav style={{ marginBottom: 16, display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === t.id ? `3px solid ${t.accent}` : '3px solid transparent',
              color: tab === t.id ? '#0f172a' : '#64748b',
              fontWeight: tab === t.id ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          height: 'calc(100vh - 220px)',
        }}
      >
        {tab === 'ai_assurance' && <AIAssuranceView />}
        {tab === 'ml_methodology' && <MLMethodologyView />}
        {tab === 'digital_transformation' && <DigitalTransformationView />}
      </div>
    </div>
  );
}
