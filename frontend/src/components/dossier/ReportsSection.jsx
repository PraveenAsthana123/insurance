// ReportsSection.jsx — shows the 4 role-columns with the reports the seeded
// role has access to. Falls back to the global reports.js role-bucket
// listing when the dept has no role record.

import SectionCard, { EmptySection } from './SectionCard';
import { rolesByDept, ROLE_IDS, ROLE_LABELS, ROLE_ICONS } from '../../data/roles';
import { getReportById, getReportsByRole } from '../../data/reports';

const ROLE_ACCENTS = {
  manager: '#3b82f6',
  'team-member': '#10b981',
  compliance: '#8b5cf6',
  'reporting-monitoring': '#f59e0b',
};

export default function ReportsSection({ dept }) {
  const deptRoles = rolesByDept[dept.id];

  const columns = ROLE_IDS.map((rid) => {
    const seeded = deptRoles && deptRoles[rid];
    let reports = [];
    if (seeded && Array.isArray(seeded.reports) && seeded.reports.length) {
      reports = seeded.reports
        .map((id) => getReportById(id))
        .filter(Boolean);
    } else {
      // Fallback — role-level generic reports
      reports = getReportsByRole(rid);
    }
    return { role: rid, reports, seeded: !!seeded };
  });

  const totalCount = columns.reduce((acc, c) => acc + c.reports.length, 0);

  if (totalCount === 0) {
    return (
      <SectionCard id="reports" icon="📑" title="Reports">
        <EmptySection label="No reports catalogued." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="reports"
      icon="📑"
      title="Reports catalogued"
      subtitle={`${totalCount} report access-rights across 4 roles`}
      footer={
        <>
          Source: <code>reports.js</code> × <code>roles.js</code>. Per-role views live in{' '}
          <a href={`/${dept.id}/manager`} style={{ color: '#3b82f6' }}>
            Manager → Reports
          </a>
          .
        </>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.role}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#f8fafc',
              padding: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: `2px solid ${ROLE_ACCENTS[col.role]}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{ROLE_ICONS[col.role]}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                {ROLE_LABELS[col.role]}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                  marginLeft: 'auto',
                }}
              >
                {col.reports.length}
              </span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {col.reports.length === 0 ? (
                <li style={{ fontSize: 11, color: '#94a3b8' }}>(none)</li>
              ) : (
                col.reports.slice(0, 6).map((r) => (
                  <li
                    key={r.id}
                    style={{
                      fontSize: 11,
                      color: '#334155',
                      padding: '3px 0',
                      borderBottom: '1px dotted #e2e8f0',
                    }}
                    title={r.category}
                  >
                    {r.name}
                  </li>
                ))
              )}
            </ul>
            {!col.seeded && (
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 6 }}>
                generic role list (dept not seeded)
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
