// RoleSelector — demo-mode role dropdown for Phase η RBAC.
// Selected role is persisted in localStorage (cpg.role) and attached to
// every API call via apiFetch as X-Demo-Role. Backend RBACMiddleware
// enforces the permission matrix and returns 403 for unpermitted actions.

import { useRole, ROLES } from '../hooks/useRole';

const LABELS = {
  manager: 'Manager',
  'team-member': 'Team Member',
  compliance: 'Compliance',
  'reporting-monitoring': 'Reporting & Monitoring',
  tester: 'Tester',
};

const COLORS = {
  manager: '#2563eb',
  'team-member': '#059669',
  compliance: '#7c3aed',
  'reporting-monitoring': '#c2410c',
  tester: '#ca8a04',
};

export default function RoleSelector() {
  const [role, setRole] = useRole();
  const color = COLORS[role] || '#64748b';

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#cbd5e1' }}>Role</span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        aria-label="Demo role selector"
        style={{
          padding: '4px 8px',
          fontSize: 12,
          fontWeight: 600,
          border: `1px solid ${color}`,
          borderRadius: 4,
          color,
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
