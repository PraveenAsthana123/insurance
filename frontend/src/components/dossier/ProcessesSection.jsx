// ProcessesSection.jsx — filters workflows.js by dept and renders the top 6
// as compact cards: name + role chip + trigger + KPI. Links to full admin
// Workflows tab for more.

import SectionCard, { EmptySection } from './SectionCard';
import { getWorkflowsForDept } from '../../data/workflows';
import { ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.12)', fg: '#1d4ed8' },
  'team-member': { bg: 'rgba(16,185,129,0.12)', fg: '#047857' },
  compliance: { bg: 'rgba(139,92,246,0.12)', fg: '#6d28d9' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.12)', fg: '#c2410c' },
};

export default function ProcessesSection({ dept }) {
  const items = getWorkflowsForDept(dept.id) || [];
  const top = items.slice(0, 6);

  return (
    <SectionCard
      id="processes"
      icon="⚙️"
      title="Processes & Workflows"
      subtitle={`${items.length} catalogued · showing top ${top.length}`}
      footer={
        <>
          Source: <code>workflows.js</code>. See full catalog in{' '}
          <a href={`/${dept.id}/admin`} style={{ color: '#3b82f6' }}>
            Admin → Workflows
          </a>
          .
        </>
      }
    >
      {top.length === 0 ? (
        <EmptySection label={`No workflows catalogued for ${dept.name} yet.`} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {top.map((w) => {
            const roleColor = ROLE_COLORS[w.role] || ROLE_COLORS.manager;
            return (
              <div
                key={w.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: roleColor.bg,
                      color: roleColor.fg,
                      borderRadius: 10,
                      fontWeight: 600,
                    }}
                  >
                    {ROLE_ICONS[w.role]} {ROLE_LABELS[w.role]}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{w.trigger}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, lineHeight: 1.4 }}>
                  {w.description}
                </div>
                <div style={{ fontSize: 11, color: '#334155' }}>
                  <strong>KPI:</strong> {w.kpi}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
