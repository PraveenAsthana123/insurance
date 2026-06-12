// ChatGroup operator-2026-06-12 · multi-actor (human + agent) group chat.
// Per §149 UI consistency · 3-column layout · 13px font · light cards.
import React, { useEffect, useState, useCallback } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';
const HEADERS = { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' };

export default function ChatGroupPage() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/chatgroup/groups`, { headers: HEADERS });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setGroups(j.groups || []);
      if (j.groups?.length && !selected) setSelected(j.groups[0].group_id);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const loadGroup = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      const [gr, mr] = await Promise.all([
        fetch(`${API}/api/v1/chatgroup/groups/${groupId}/messages?limit=50`, { headers: HEADERS }),
        fetch(`${API}/api/v1/chatgroup/groups/${groupId}`, { headers: HEADERS }),
      ]);
      const gj = await gr.json();
      const mj = await mr.json();
      setMessages((gj.messages || []).slice().reverse());
      setMembers(mj.members || []);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { if (selected) loadGroup(selected); }, [selected, loadGroup]);

  const send = async () => {
    if (!draft.trim() || !selected) return;
    try {
      await fetch(`${API}/api/v1/chatgroup/groups/${selected}/messages`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          content: draft,
          sender_id: 'operator',
          sender_kind: 'human',
        }),
      });
      setDraft('');
      await loadGroup(selected);
      await loadGroups();
    } catch (e) {
      setErr(e.message);
    }
  };

  const FS = 13;

  return (
    <div style={{ padding: 20, fontSize: FS, color: '#1f2937', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>💬 ChatGroup</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          Multi-actor group chat · humans + AI agents · 3 demo rooms seeded
        </div>
      </header>

      {err && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444',
                      color: '#991b1b', padding: 10, borderRadius: 4, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, minHeight: 600 }}>
        {/* LEFT · group list */}
        <div style={{ background: '#f8fafc', borderRight: '1px solid #e5e7eb',
                      borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Groups ({groups.length})
          </div>
          {loading && <div style={{ fontSize: 11, color: '#94a3b8' }}>Loading…</div>}
          {groups.map((g) => (
            <button key={g.group_id} onClick={() => setSelected(g.group_id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: g.group_id === selected ? '#ecfdf5' : 'transparent',
              borderLeft: `4px solid ${g.group_id === selected ? '#10b981' : 'transparent'}`,
              border: 'none', padding: '8px 10px', cursor: 'pointer',
              borderRadius: 4, marginBottom: 4, fontSize: 12, color: '#1f2937',
            }}>
              <div style={{ fontWeight: 600 }}>{g.group_name}</div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                {g.n_members} members · {g.n_messages} msgs
              </div>
            </button>
          ))}
        </div>

        {/* MIDDLE · messages */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {selected || '(no group selected)'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 400, maxHeight: 500,
                        background: '#fafbfc', borderRadius: 4, padding: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 12 }}>No messages yet</div>
            )}
            {messages.map((m) => (
              <div key={m.message_id} style={{
                marginBottom: 10, padding: 8,
                background: m.sender_kind === 'agent' ? '#faf5ff' :
                            m.sender_kind === 'system' ? '#f1f5f9' : '#ecfdf5',
                borderLeft: `3px solid ${
                  m.sender_kind === 'agent' ? '#a855f7' :
                  m.sender_kind === 'system' ? '#64748b' : '#10b981'
                }`,
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>
                  <strong>{m.sender_id}</strong> · {m.sender_kind} ·
                  {new Date(m.created_at).toLocaleString('en-CA', { timeZone: 'America/Edmonton' })}
                </div>
                <div style={{ fontSize: 12, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                   placeholder="Type a message and press Enter..."
                   style={{ flex: 1, padding: '8px 12px', fontSize: 12,
                            border: '1px solid #cbd5e1', borderRadius: 4 }} />
            <button onClick={send} disabled={!draft.trim() || !selected} style={{
              background: '#10b981', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              opacity: !draft.trim() || !selected ? 0.5 : 1,
            }}>Send →</button>
          </div>
        </div>

        {/* RIGHT · members */}
        <div style={{ background: '#f8fafc', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Members ({members.length})
          </div>
          {members.map((m) => (
            <div key={m.member_id} style={{
              padding: 8, marginBottom: 4, borderRadius: 4, fontSize: 12,
              background: m.member_kind === 'agent' ? '#faf5ff' : '#fff',
              borderLeft: `3px solid ${m.member_kind === 'agent' ? '#a855f7' : '#10b981'}`,
            }}>
              <div style={{ fontWeight: 600 }}>{m.member_id}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                {m.member_kind} · {m.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 10, fontSize: 11, color: '#6b7280',
                    background: '#faf5ff', borderLeft: '4px solid #a855f7', borderRadius: 4 }}>
        ℹ️ Demo seed · 3 rooms · 7 members · auto-loaded. To create a new group:
        <code style={{ marginLeft: 6 }}>POST /api/v1/chatgroup/groups</code>
      </div>
    </div>
  );
}
