// AIToolLandscapePage — Enterprise AI Tool Landscape Explorer.
//
// Per operator brief 2026-06-08 · 140+ tools across 26 categories.
// 4 tabs: Top Stack · Browse · Search · Stats.
// Status flags honest per §57.7: used / scaffolded / planned / reference

import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const TABS = [
  { id: 'top-stack', name: '🏆 Top Stack',  color: '#dc2626' },
  { id: 'browse',    name: '🗂 Browse',     color: '#1e40af' },
  { id: 'search',    name: '🔍 Search',     color: '#9333ea' },
  { id: 'stats',     name: '📈 Stats',      color: '#16a34a' },
];

const STATUS_COLOR = {
  used:       '#16a34a',  // green · in this project
  scaffolded: '#3b82f6',  // blue · partial wiring
  planned:    '#d97706',  // amber · roadmap
  reference:  '#94a3b8',  // gray · interview-only
};

const PRIORITY_COLOR = {
  top:    '#dc2626',
  common: '#94a3b8',
};

export default function AIToolLandscapePage() {
  const [tab, setTab] = useState('top-stack');
  const [stats, setStats] = useState(null);
  const [topStack, setTopStack] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchJSON = async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  useEffect(() => {
    (async () => {
      try {
        const [s, c, ts] = await Promise.all([
          fetchJSON('/api/v1/ai-tools/stats'),
          fetchJSON('/api/v1/ai-tools/categories'),
          fetchJSON('/api/v1/ai-tools/top-stack'),
        ]);
        setStats(s);
        setCategories(c.categories);
        setTopStack(ts.top_stack);
      } catch (e) { setError(`load: ${e.message}`); }
    })();
  }, []);

  useEffect(() => {
    if (tab !== 'browse' && tab !== 'search') return;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.set('category', selectedCategory);
        if (selectedPriority) params.set('priority', selectedPriority);
        if (selectedStatus) params.set('status', selectedStatus);
        if (query.trim()) params.set('q', query.trim());
        const d = await fetchJSON(`/api/v1/ai-tools/tools?${params}`);
        setTools(d.tools);
      } catch (e) { setError(`tools: ${e.message}`); }
    })();
  }, [tab, selectedCategory, selectedStatus, selectedPriority, query]);

  // Group by phase for browse
  const phases = useMemo(() => {
    const m = {};
    categories.forEach((c) => { (m[c.phase] = m[c.phase] || []).push(c); });
    return m;
  }, [categories]);

  const Badge = ({ value, type }) => (
    <span style={{
      background: (type === 'status' ? STATUS_COLOR : PRIORITY_COLOR)[value] || '#94a3b8',
      color: '#fff', padding: '2px 6px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    }}>{value}</span>
  );

  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const small = { fontSize: 11, color: '#64748b' };

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>
        🧰 Enterprise AI Tool Landscape
      </h1>
      <div style={small}>
        Top 1% architect interview reference · 140+ tools · 26 categories ·
        per §38 · §47 · §52 · §57.7 · §91 · §92
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
          <Tile label="TOOLS"      value={stats.total_tools}        accent="#1e40af" />
          <Tile label="USED"       value={stats.by_status.used}      accent="#16a34a" />
          <Tile label="SCAFFOLDED" value={stats.by_status.scaffolded} accent="#3b82f6" />
          <Tile label="PLANNED"    value={stats.by_status.planned}    accent="#d97706" />
          <Tile label="REFERENCE"  value={stats.by_status.reference}  accent="#94a3b8" />
          <Tile label="TOP"        value={stats.by_priority.top}      accent="#dc2626" />
          <Tile label="CATEGORIES" value={stats.total_categories}     accent="#9333ea" />
        </div>
      )}

      {/* Tab bar */}
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

      {tab === 'top-stack' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
            Top 1% Enterprise AI Architect Stack · per operator brief
          </h3>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 6 }}>Layer</th>
                <th style={{ padding: 6 }}>Preferred Tool(s)</th>
              </tr>
            </thead>
            <tbody>
              {topStack.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6, fontWeight: 600 }}>{s.layer}</td>
                  <td style={{ padding: 6 }}>{s.preferred}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ ...small, marginTop: 8 }}>
            This is the set that typically appears in OpenAI · Anthropic · Databricks ·
            NVIDIA · AWS · Microsoft · Google AI architecture interviews.
          </div>
        </div>
      )}

      {tab === 'browse' && (
        <div>
          <div style={card}>
            <select value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ padding: 6, fontSize: 12, marginRight: 8 }}>
              <option value="">All 26 categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phase}</option>
              ))}
            </select>
            <select value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ padding: 6, fontSize: 12, marginRight: 8 }}>
              <option value="">Any status</option>
              <option value="used">used (this project)</option>
              <option value="scaffolded">scaffolded</option>
              <option value="planned">planned</option>
              <option value="reference">reference-only</option>
            </select>
            <select value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    style={{ padding: 6, fontSize: 12, marginRight: 8 }}>
              <option value="">Any priority</option>
              <option value="top">TOP (architect default)</option>
              <option value="common">common</option>
            </select>
            <span style={small}>{tools.length} tools</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {tools.map((t) => (
              <div key={t.id} style={{
                padding: 10, background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 4, fontSize: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{t.name}</strong>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Badge value={t.priority} type="priority" />
                    <Badge value={t.this_project_status} type="status" />
                  </div>
                </div>
                <div style={small}><code>{t.id}</code> · {t.category}</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  <strong>Role:</strong> {t.role}
                </div>
                <div style={{ marginTop: 2, ...small }}>
                  {t.notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div>
          <div style={card}>
            <input type="text" value={query}
                   onChange={(e) => setQuery(e.target.value)}
                   placeholder="Search by name or notes (e.g. 'langfuse', 'reranker', 'vLLM', 'OSS')..."
                   style={{
                     width: '100%', padding: 8, fontSize: 14,
                     border: '1px solid #cbd5e1', borderRadius: 4,
                   }} />
            <div style={{ ...small, marginTop: 4 }}>
              {tools.length} results · case-insensitive name + notes match
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {tools.map((t) => (
              <div key={t.id} style={{
                padding: 10, background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 4, fontSize: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{t.name}</strong>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Badge value={t.priority} type="priority" />
                    <Badge value={t.this_project_status} type="status" />
                  </div>
                </div>
                <div style={small}>{t.category} · {t.role}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#475569' }}>{t.notes}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'stats' && stats && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Phase-grouped category counts</h3>
          {Object.entries(phases).map(([phase, cats]) => (
            <div key={phase} style={{ marginBottom: 12 }}>
              <h4 style={{ margin: '4px 0', fontSize: 13, color: '#1e40af' }}>
                {phase.toUpperCase()} ({cats.length} categories)
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {cats.map((c) => (
                  <li key={c.id}><code>{c.id}</code> · {c.name}</li>
                ))}
              </ul>
            </div>
          ))}
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
