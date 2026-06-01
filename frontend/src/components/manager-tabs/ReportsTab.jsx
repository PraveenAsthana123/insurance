import { reportTypes } from '../../data/reports';
import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.08)', fg: '#2563eb', border: '#bfdbfe' },
  'team-member': { bg: 'rgba(16,185,129,0.08)', fg: '#059669', border: '#a7f3d0' },
  compliance: { bg: 'rgba(139,92,246,0.08)', fg: '#7c3aed', border: '#ddd6fe' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.08)', fg: '#c2410c', border: '#fed7aa' },
  tester: { bg: 'rgba(202,138,4,0.08)', fg: '#a16207', border: '#fde68a' },
};

export default function ReportsTab({ dept }) {
  const deptId = dept?.id || '';
  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {reportTypes.length} report types grouped by role for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {ROLE_IDS.map((role) => {
          const reports = reportTypes.filter((r) => r.role === role);
          const c = ROLE_COLORS[role];
          return (
            <div key={role} style={{
              border: `1px solid ${c.border}`, background: c.bg,
              borderRadius: 8, padding: 14,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10,
              }}>
                <div style={{ fontWeight: 700, color: c.fg, fontSize: 14 }}>
                  {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: '#fff', color: c.fg,
                }}>
                  {reports.length}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {reports.map((r) => (
                  <li key={r.id} style={{
                    padding: '6px 0', borderTop: '1px dashed rgba(148,163,184,0.3)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 12,
                  }}>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{r.name}</span>
                    <button
                      type="button"
                      style={{
                        border: 'none', background: 'transparent',
                        color: c.fg, fontSize: 11, cursor: 'pointer',
                        padding: 0, fontWeight: 600, textDecoration: 'underline',
                      }}
                      onClick={(e) => e.preventDefault()}
                    >
                      (view)
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
