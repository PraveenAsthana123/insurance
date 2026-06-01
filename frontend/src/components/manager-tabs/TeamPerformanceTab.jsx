import { useMemo } from 'react';
import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS, getRolesForDept } from '../../data/roles';
import { seededRng, randInt, randFloat } from '../../utils/seed';

const ROLE_COLORS = {
  manager: '#2563eb',
  'team-member': '#059669',
  compliance: '#7c3aed',
  'reporting-monitoring': '#c2410c',
  tester: '#a16207',
};

export default function TeamPerformanceTab({ dept }) {
  const deptId = dept?.id || '';
  const roles = getRolesForDept(deptId);

  const rows = useMemo(() => {
    const rng = seededRng(`team-${deptId}`);
    return ROLE_IDS.map((role) => {
      const title = (roles[role] && roles[role].title) || ROLE_LABELS[role];
      return {
        role,
        title,
        headcount: randInt(rng, 3, 14),
        tasksCompleted: randInt(rng, 120, 980),
        onTimePct: randFloat(rng, 82, 99, 1),
        csat: randFloat(rng, 3.6, 4.8, 2),
        utilization: randFloat(rng, 60, 92, 1),
      };
    });
  }, [deptId, roles]);

  const bar = (pct, color) => (
    <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Team performance by role for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Role</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Title</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Headcount</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Tasks / 30d</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 180 }}>On-time %</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>CSAT (5.0)</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 180 }}>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const roleColor = ROLE_COLORS[r.role];
              return (
                <tr key={r.role} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, color: roleColor, fontWeight: 600 }}>
                    {ROLE_ICONS[r.role]} {ROLE_LABELS[r.role]}
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{r.title}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{r.headcount}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{r.tasksCompleted}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>{bar(r.onTimePct, roleColor)}</div>
                      <span style={{ fontSize: 12, color: '#64748b', width: 36, textAlign: 'right' }}>{r.onTimePct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{r.csat}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>{bar(r.utilization, roleColor)}</div>
                      <span style={{ fontSize: 12, color: '#64748b', width: 36, textAlign: 'right' }}>{r.utilization}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
