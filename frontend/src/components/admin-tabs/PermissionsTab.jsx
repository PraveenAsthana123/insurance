import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

// 10 actions x N roles matrix — modeled on backend/core/rbac_middleware.py
// (simulate is manager-only; reads are open to all roles; testers get read-only).
const ACTIONS = [
  { id: 'view-dashboard',    label: 'View dashboards / KPIs',        grants: ['manager', 'team-member', 'compliance', 'reporting-monitoring', 'tester'] },
  { id: 'view-reports',      label: 'View reports',                   grants: ['manager', 'team-member', 'compliance', 'reporting-monitoring', 'tester'] },
  { id: 'run-forecast',      label: 'Run forecast / model scoring',   grants: ['manager', 'team-member', 'reporting-monitoring'] },
  { id: 'run-simulation',    label: 'Run simulation (what-if)',       grants: ['manager'] },
  { id: 'approve-model',     label: 'Approve model deploy',           grants: ['manager'] },
  { id: 'edit-thresholds',   label: 'Edit alert thresholds',          grants: ['manager', 'reporting-monitoring'] },
  { id: 'view-pii',          label: 'View PII / customer data',       grants: ['compliance', 'manager'] },
  { id: 'audit-trail',       label: 'Read audit trail',               grants: ['compliance', 'manager', 'tester'] },
  { id: 'manage-users',      label: 'Manage users & roles',           grants: ['manager'] },
  { id: 'export-data',       label: 'Export datasets / reports',      grants: ['manager', 'reporting-monitoring', 'compliance'] },
];

const ROLE_COLORS = {
  manager: '#2563eb',
  'team-member': '#059669',
  compliance: '#7c3aed',
  'reporting-monitoring': '#c2410c',
  tester: '#a16207',
};

export default function PermissionsTab({ dept }) {
  const deptId = dept?.id || '';
  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        RBAC matrix for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Demo-mode policy mirrors <code>backend/core/rbac_middleware.py</code> — manager-only for
        simulate/approve/user-mgmt; read access broad.
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Action</th>
              {ROLE_IDS.map((r) => (
                <th key={r} style={{
                  padding: 10, textAlign: 'center', color: ROLE_COLORS[r], fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{a.label}</td>
                {ROLE_IDS.map((r) => {
                  const allowed = a.grants.includes(r);
                  return (
                    <td key={r} style={{
                      padding: 10, textAlign: 'center',
                      color: allowed ? '#059669' : '#cbd5e1',
                      fontSize: 16, fontWeight: 700,
                    }}>
                      {allowed ? '✓' : '×'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
        ✓ allowed · × denied. Edit via <code>backend/core/rbac_middleware.py</code> PERMS_MATRIX.
      </div>
    </div>
  );
}
