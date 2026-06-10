// Top header bar — Global Search · AI Search · Notifications · Tasks · Profile
// + Role Switcher + Environment Selector.
// Role + env persist to localStorage and dispatch storage events so the rest
// of the app (BankUseCasePage / role-aware Slot / etc.) re-renders.

import { useState, useEffect } from 'react';

const ROLES = [
  'Business User', 'Manager', 'Analyst',
  'Data Scientist', 'AI Engineer', 'Tester',
  'Security', 'Operations', 'Administrator',
];

const ENVS = ['Dev', 'Test', 'UAT', 'Prod'];

const ENV_COLOR = {
  Dev:  '#10b981',
  Test: '#0ea5e9',
  UAT:  '#f59e0b',
  Prod: '#dc2626',
};

function readPersisted(key, fallback) {
  try { return localStorage.getItem(key) || fallback; }
  catch (e) { return fallback; }
}

function writePersisted(key, value) {
  try {
    localStorage.setItem(key, value);
    // Notify same-window listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('insur:role-changed', { detail: { key, value } }));
  } catch (e) { /* localStorage blocked — ignore */ }
}

// Operator 2026-06-05: "save all input prompt and show on UI".
// Captures Topbar Global + AI search inputs to localStorage with timestamp +
// URL context. PromptHistorySection in BankUseCasePage reads from here.
function savePrompt(kind, text) {
  try {
    const url = new URL(window.location.href);
    const entry = {
      id: Date.now() + Math.random(),
      at: Date.now(),
      kind, // 'global' | 'ai'
      text,
      role: localStorage.getItem('insur.activeRole') || 'unknown',
      url: url.pathname + url.search,
    };
    const log = JSON.parse(localStorage.getItem('insur.prompts') || '[]');
    log.unshift(entry);
    localStorage.setItem('insur.prompts', JSON.stringify(log.slice(0, 200)));
    window.dispatchEvent(new CustomEvent('insur:prompt-saved', { detail: entry }));
  } catch (e) { /* ignore */ }
}

export function BankHeader() {
  const [role, setRole] = useState(() => readPersisted('insur.activeRole', 'Business User'));
  const [env, setEnv] = useState(() => readPersisted('insur.activeEnv', 'Dev'));
  const [search, setSearch] = useState('');
  const [aiSearch, setAiSearch] = useState('');

  // Persist on change
  useEffect(() => { writePersisted('insur.activeRole', role); }, [role]);
  useEffect(() => { writePersisted('insur.activeEnv', env); }, [env]);

  return (
    <header style={{
      height: 56, padding: '0 16px',
      background: '#0f172a', color: '#fff',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid #1e293b',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 240 }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <strong style={{ fontSize: 14 }}>Insurance AI Operating System</strong>
      </div>

      {/* Global search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) { savePrompt('global', search.trim()); setSearch(''); } }}
          placeholder="🔍 Global search — depts · processes · models · agents..."
          style={{
            width: '100%', padding: '6px 10px 6px 10px', fontSize: 12,
            background: '#1e293b', color: '#fff',
            border: '1px solid #334155', borderRadius: 6, outline: 'none',
          }}
        />
      </div>

      {/* Global AI search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <input
          type="search"
          value={aiSearch}
          onChange={(e) => setAiSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && aiSearch.trim()) { savePrompt('ai', aiSearch.trim()); setAiSearch(''); } }}
          placeholder="🧠 Ask AI — e.g. 'show top fraud cases in Claims this week'"
          style={{
            width: '100%', padding: '6px 10px', fontSize: 12,
            background: '#1e3a8a', color: '#fff',
            border: '1px solid #3b82f6', borderRadius: 6, outline: 'none',
          }}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Env selector */}
      <select
        value={env}
        onChange={(e) => setEnv(e.target.value)}
        style={{
          padding: '4px 8px', fontSize: 11, fontWeight: 700,
          background: ENV_COLOR[env], color: '#fff',
          border: 'none', borderRadius: 4, cursor: 'pointer',
        }}
        title="Environment"
      >
        {ENVS.map((e) => <option key={e} value={e}>{e.toUpperCase()}</option>)}
      </select>

      {/* Role switcher */}
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{
          padding: '4px 8px', fontSize: 11,
          background: '#1e293b', color: '#fff',
          border: '1px solid #334155', borderRadius: 4, cursor: 'pointer',
        }}
        title="Role"
      >
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Tasks */}
      <button title="Tasks" style={{
        padding: 6, fontSize: 14, background: 'transparent',
        border: 'none', color: '#cbd5e1', cursor: 'pointer', position: 'relative',
      }}>
        ✅
        <span style={{
          position: 'absolute', top: 2, right: 0, padding: '0 4px',
          fontSize: 9, background: '#f59e0b', color: '#fff', borderRadius: 6,
        }}>0</span>
      </button>

      {/* Notifications */}
      <button title="Notifications" style={{
        padding: 6, fontSize: 14, background: 'transparent',
        border: 'none', color: '#cbd5e1', cursor: 'pointer', position: 'relative',
      }}>
        🔔
        <span style={{
          position: 'absolute', top: 2, right: 0, padding: '0 4px',
          fontSize: 9, background: '#dc2626', color: '#fff', borderRadius: 6,
        }}>0</span>
      </button>

      {/* Profile */}
      <button title="Profile" style={{
        padding: '4px 10px', fontSize: 11, fontWeight: 600,
        background: '#3b82f6', color: '#fff',
        border: 'none', borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        👤 <span>demo-user</span>
      </button>
    </header>
  );
}
