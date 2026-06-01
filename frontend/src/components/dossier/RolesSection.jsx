// RolesSection.jsx — renders up to 4 role cards for this dept with title,
// responsibility count preview, and first 3 KPIs. Pulls from rolesByDept.

import SectionCard, { EmptySection } from './SectionCard';
import { rolesByDept, ROLE_IDS, ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const ROLE_ACCENTS = {
  manager: '#3b82f6',
  'team-member': '#10b981',
  compliance: '#8b5cf6',
  'reporting-monitoring': '#f59e0b',
};

export default function RolesSection({ dept }) {
  const deptRoles = rolesByDept[dept.id];

  if (!deptRoles) {
    return (
      <SectionCard id="roles" icon="👥" title="Roles & Responsibilities" subtitle={dept.name}>
        <EmptySection
          label={`Roles not yet seeded for ${dept.name}. See roles.js rolesByDept.`}
        />
      </SectionCard>
    );
  }

  const roleCards = ROLE_IDS.filter((rid) => deptRoles[rid]).map((rid) => ({
    id: rid,
    ...deptRoles[rid],
  }));

  return (
    <SectionCard
      id="roles"
      icon="👥"
      title="Roles & Responsibilities"
      subtitle={`${roleCards.length} roles seeded`}
      footer={
        <>
          Source: <code>roles.js</code>. Full per-role responsibility workflows in{' '}
          <a href={`/${dept.id}/manager`} style={{ color: '#3b82f6' }}>
            Manager → Roles
          </a>
          .
        </>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {roleCards.map((r) => (
          <div
            key={r.id}
            style={{
              border: '1px solid #e2e8f0',
              borderLeft: `4px solid ${ROLE_ACCENTS[r.id]}`,
              borderRadius: 8,
              padding: 12,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{ROLE_ICONS[r.id]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{r.title}</div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                  {ROLE_LABELS[r.id]}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#475569',
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              <strong>{(r.responsibilities || []).length}</strong> responsibilities
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                {(r.responsibilities || []).slice(0, 2).map((resp, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>
                    {resp}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ fontSize: 10, color: '#334155' }}>
              <strong style={{ fontSize: 10, letterSpacing: '0.04em', color: '#64748b' }}>
                KPIs:
              </strong>{' '}
              {(r.kpis || []).slice(0, 3).join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
