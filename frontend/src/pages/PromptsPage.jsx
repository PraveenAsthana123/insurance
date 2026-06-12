/**
 * §145 MANDATORY · Conversation tracker UI
 * Shows BOTH operator prompts AND assistant responses with timestamps.
 * Same view as terminal output.
 */
import { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

export default function PromptsPage() {
  const [health, setHealth] = useState(null);
  const [items, setItems] = useState([]);
  const [byDay, setByDay] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [hours, setHours] = useState(48);

  const reload = () => {
    fetch(`${API}/api/v1/prompts/conversation/health`).then(r => r.json()).then(setHealth);
    fetch(`${API}/api/v1/prompts/conversation/by-day`).then(r => r.json()).then(setByDay);
    fetch(`${API}/api/v1/prompts/conversation/recent?limit=500&hours=${hours}`)
      .then(r => r.json()).then(d => setItems(d.items || []));
  };

  useEffect(reload, [hours]);

  const search = () => {
    if (!q) { reload(); return; }
    const role = roleFilter === 'all' ? '' : roleFilter;
    fetch(`${API}/api/v1/prompts/conversation/search?q=${encodeURIComponent(q)}&role=${role}&limit=300`)
      .then(r => r.json()).then(d => setItems(d.items || []));
  };

  const filtered = items.filter(it => roleFilter === 'all' || it.role === roleFilter);

  return (
    <div style={{ padding: 20, background: '#f3f4f6', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📜 Conversation Log · §145 mandatory</h1>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Both operator prompts + assistant responses · with timestamp · same view as terminal
        </div>
      </div>

      {/* Health KPIs */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <Stat label="Total turns"      value={health.total?.toLocaleString()} />
          <Stat label="Operator turns"   value={health.user_turns?.toLocaleString()} color="#10b981" />
          <Stat label="Claude responses" value={health.assistant_turns?.toLocaleString()} color="#6366f1" />
          <Stat label="Last 24h"          value={health.last_24h?.toLocaleString()} color="#f59e0b" />
        </div>
      )}

      {/* Day-by-day chart */}
      {byDay?.items && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Last 7 days</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {byDay.items.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
                <div style={{ color: '#6b7280' }}>{d.date.substring(5)}</div>
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
                    {d.user}
                  </span>
                  <span style={{ background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
                    {d.assistant}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Search prompts + responses…"
                style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, minWidth: 200 }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="all">Both sides</option>
          <option value="user">Operator only</option>
          <option value="assistant">Claude only</option>
        </select>
        <select value={hours} onChange={e => setHours(+e.target.value)}
                style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="24">Last 24h</option>
          <option value="48">Last 48h</option>
          <option value="168">Last 7 days</option>
          <option value="720">Last 30 days</option>
        </select>
        <button onClick={search} style={{
          padding: '8px 16px', background: '#4f46e5', color: '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>Search</button>
        <button onClick={reload} style={{
          padding: '8px 16px', background: '#fff', color: '#4f46e5',
          border: '1px solid #4f46e5', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>Refresh</button>
      </div>

      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Showing {filtered.length} turns
      </div>

      {/* Conversation list · vertical · one component per row */}
      {filtered.map((it, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 8, padding: 12, marginBottom: 8,
          borderLeft: `4px solid ${it.role === 'user' ? '#10b981' : '#6366f1'}`,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12,
                            color: it.role === 'user' ? '#065f46' : '#3730a3' }}>
              {it.role === 'user' ? '🟢 OPERATOR' : '🤖 CLAUDE'}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
              {it.ts?.substring(0, 19)}  ·  session {it.session_id?.substring(0, 8)}…
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#1f2937', whiteSpace: 'pre-wrap',
                          maxHeight: 200, overflowY: 'auto', fontFamily: 'inherit' }}>
            {it.text?.substring(0, 4000)}
            {(it.text?.length || 0) > 4000 ? ' …' : ''}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          No conversation turns match the filter.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = '#1f2937' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value || '—'}</div>
    </div>
  );
}
