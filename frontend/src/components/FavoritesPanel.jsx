// FavoritesPanel · Iter 24 · star processes + recently viewed.
// Persisted in localStorage · drop-in panel.

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const KEY_FAVS = 'insur.favorites';
const KEY_RECENT = 'insur.recentlyViewed';

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(KEY_FAVS) || '[]'); }
  catch { return []; }
}
export function toggleFavorite(path, label) {
  const cur = getFavorites();
  const idx = cur.findIndex((f) => f.path === path);
  let next;
  if (idx >= 0) next = cur.filter((_, i) => i !== idx);
  else next = [{ path, label, addedAt: new Date().toISOString() }, ...cur].slice(0, 20);
  try { localStorage.setItem(KEY_FAVS, JSON.stringify(next)); }
  catch { /* noop */ }
  window.dispatchEvent(new Event('insur-favs-changed'));
  return next;
}

function pushRecent(path, label) {
  if (!path || path === '/') return;
  let cur = [];
  try { cur = JSON.parse(localStorage.getItem(KEY_RECENT) || '[]'); }
  catch { /* noop */ }
  const filtered = cur.filter((r) => r.path !== path);
  filtered.unshift({ path, label, viewedAt: new Date().toISOString() });
  try { localStorage.setItem(KEY_RECENT, JSON.stringify(filtered.slice(0, 10))); }
  catch { /* noop */ }
}

export function useTrackRecent(label) {
  const location = useLocation();
  useEffect(() => {
    pushRecent(location.pathname, label || location.pathname);
  }, [location.pathname, label]);
}

export default function FavoritesPanel({ accent = '#0ea5e9' }) {
  const [favs, setFavs] = useState(getFavorites());
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    function refresh() {
      setFavs(getFavorites());
      try { setRecent(JSON.parse(localStorage.getItem(KEY_RECENT) || '[]')); }
      catch { setRecent([]); }
    }
    refresh();
    window.addEventListener('insur-favs-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('insur-favs-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>⭐</span>
        <strong style={{ fontSize: 13, color: accent }}>Iter 24 · Favorites + Recently viewed</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FavList title="⭐ Favorites" rows={favs} empty="Star a process to add (click ☆ next to title)" />
        <FavList title="🕘 Recently viewed" rows={recent} empty="Browse processes to populate" stamp="viewedAt" />
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Persisted in localStorage · cleared on browser data wipe · Iter 24
      </div>
    </div>
  );
}

function FavList({ title, rows, empty, stamp = 'addedAt' }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{title}</div>
      {rows.length === 0 ? (
        <em style={{ fontSize: 10, color: '#94a3b8' }}>{empty}</em>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rows.map((r) => (
            <li key={r.path} style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', fontSize: 11 }}>
              <Link to={r.path} style={{ color: '#1e40af', textDecoration: 'none' }}>{r.label || r.path}</Link>
              <span style={{ marginLeft: 6, fontSize: 9, color: '#94a3b8' }}>
                {r[stamp]?.slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Star button · drop on a process detail card title row.
export function FavoriteStar({ path, label }) {
  const [on, setOn] = useState(() => getFavorites().some((f) => f.path === path));
  function flip() {
    toggleFavorite(path, label);
    setOn((v) => !v);
  }
  return (
    <button onClick={flip}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      title={on ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 14, color: on ? '#f59e0b' : '#cbd5e1',
        padding: 0, lineHeight: 1,
      }}>
      {on ? '★' : '☆'}
    </button>
  );
}
