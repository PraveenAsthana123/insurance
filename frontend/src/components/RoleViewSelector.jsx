// RoleViewSelector · P1 #17 · per-role view toggle persisted in localStorage.
// Other panels can read currentRole() to filter their content.

import { useEffect, useState } from 'react';

export const ROLES = [
  { id: 'all',      label: 'All',                color: '#475569', icon: '👁' },
  { id: 'cfo',      label: 'CFO',                color: '#16a34a', icon: '💰' },
  { id: 'ds',       label: 'Data Scientist',     color: '#3b82f6', icon: '🧠' },
  { id: 'sre',      label: 'SRE / Ops',          color: '#dc2626', icon: '🛠' },
  { id: 'auditor',  label: 'Auditor',            color: '#8b5cf6', icon: '📋' },
];

const STORAGE_KEY = 'insur.activeRole';
export function getActiveRole() {
  try { return localStorage.getItem(STORAGE_KEY) || 'all'; }
  catch { return 'all'; }
}

export function setActiveRole(role) {
  try { localStorage.setItem(STORAGE_KEY, role); }
  catch { /* noop */ }
}

// Hook for components that want to react to role change
export function useActiveRole() {
  const [role, setRole] = useState(getActiveRole());
  useEffect(() => {
    const onChange = () => setRole(getActiveRole());
    window.addEventListener('insur-role-changed', onChange);
    return () => window.removeEventListener('insur-role-changed', onChange);
  }, []);
  return role;
}

export default function RoleViewSelector({ accent = '#475569' }) {
  const [activeRole, setRole] = useState(getActiveRole());

  function changeRole(roleId) {
    setRole(roleId);
    setActiveRole(roleId);
    window.dispatchEvent(new Event('insur-role-changed'));
  }

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>👤 Viewing as:</span>
        {ROLES.map((r) => (
          <button key={r.id}
            onClick={() => changeRole(r.id)}
            style={{
              padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: activeRole === r.id ? r.color : '#fff',
              color: activeRole === r.id ? '#fff' : r.color,
              border: `1px solid ${r.color}`, borderRadius: 4,
            }}>
            {r.icon} {r.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
          P1 #17 · per-role views · persisted in localStorage
        </span>
      </div>
    </div>
  );
}

// Helper: panels can wrap sections with <RoleGate roles={['cfo']}>...</RoleGate>
export function RoleGate({ roles, children }) {
  const active = useActiveRole();
  if (active === 'all' || roles.includes(active)) return children;
  return null;
}
