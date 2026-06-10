// ThemeToggle · Iter 22 · dark mode toggle persisted in localStorage.
// Adds data-theme attribute to document for CSS-variable theming.

import { useEffect, useState } from 'react';

const KEY = 'insur.theme';
function getTheme() {
  try { return localStorage.getItem(KEY) || 'light'; }
  catch { return 'light'; }
}
function setStoredTheme(t) {
  try { localStorage.setItem(KEY, t); }
  catch { /* noop */ }
  document.documentElement.setAttribute('data-theme', t);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        padding: '4px 10px', fontSize: 14, cursor: 'pointer',
        background: theme === 'light' ? '#fef3c7' : '#1e293b',
        color: theme === 'light' ? '#92400e' : '#fef3c7',
        border: 'none', borderRadius: 4, fontWeight: 700,
      }}>
      {theme === 'light' ? '☀' : '🌙'}
    </button>
  );
}
