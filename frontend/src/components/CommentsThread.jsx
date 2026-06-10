// CommentsThread · P1 #18 · per-panel comment widget.
// Wired to /api/v1/comments/* (POST + GET).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function CommentsThread({ panelId, processId, accent = '#3b82f6', collapsedByDefault = true }) {
  const [open, setOpen] = useState(!collapsedByDefault);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const r = await fetch(`${API_BASE}/api/v1/comments/${panelId}/${processId}`);
      if (r.ok) setThread((await r.json()).comments || []);
    } catch { /* fallthrough */ }
  }

  useEffect(() => { if (open) load(); }, [open, panelId, processId]);

  async function post() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const author = (localStorage.getItem('insur.activeRole') || 'operator');
      const r = await fetch(`${API_BASE}/api/v1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panel_id: panelId, process_id: processId, author, body: draft, mentions: [] }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setDraft('');
      load();
    } catch (e) { setError(`post failed: ${e.message}`); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      marginTop: 8, background: '#fafbfd',
      border: `1px solid ${accent}30`, borderRadius: 4,
      padding: 8,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        fontSize: 11, fontWeight: 600, color: accent,
      }}>
        {open ? '▼' : '▶'} 💬 Comments {thread.length > 0 && `(${thread.length})`}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {thread.length === 0 ? (
            <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 }}>
              No comments yet · be the first to comment.
            </div>
          ) : (
            <div style={{ marginBottom: 6 }}>
              {thread.map((c) => (
                <div key={c.id} style={{
                  padding: 6, marginBottom: 4, background: '#fff',
                  border: '1px solid #e5e7eb', borderRadius: 3,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b' }}>
                    <strong style={{ color: accent }}>{c.author}</strong>
                    <span>{c.created_at?.slice(0, 19)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1e293b', marginTop: 2 }}>{c.body}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') post(); }}
              placeholder="Add comment · Enter to post"
              style={{
                flex: 1, padding: 4, fontSize: 11,
                border: '1px solid #cbd5e1', borderRadius: 3,
              }}
            />
            <button onClick={post} disabled={busy || !draft.trim()} style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 700,
              background: busy || !draft.trim() ? '#94a3b8' : accent,
              color: '#fff', border: 'none', borderRadius: 3,
              cursor: busy ? 'wait' : 'pointer',
            }}>Post</button>
          </div>
          {error && <div style={{ fontSize: 10, color: '#991b1b', marginTop: 4 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
