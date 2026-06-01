import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS, getRolesForDept } from '../../data/roles';
import { getReportById } from '../../data/reports';
import { getArchetypesForDept } from '../../data/managerArchetypes';

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.08)', fg: '#2563eb', border: '#bfdbfe' },
  'team-member': { bg: 'rgba(16,185,129,0.08)', fg: '#059669', border: '#a7f3d0' },
  compliance: { bg: 'rgba(139,92,246,0.08)', fg: '#7c3aed', border: '#ddd6fe' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.08)', fg: '#c2410c', border: '#fed7aa' },
  tester: { bg: 'rgba(202,138,4,0.08)', fg: '#a16207', border: '#fde68a' },
};

export default function RolesResponsibilitiesTab({ dept }) {
  const deptId = dept?.id || '';
  const roles = getRolesForDept(deptId);
  const archetypes = getArchetypesForDept(deptId);
  const [archetypesOpen, setArchetypesOpen] = useState(false);

  const seeded = ROLE_IDS.some((r) => roles[r] && roles[r].title);
  if (!seeded) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        Role catalog not yet populated for {dept?.name || deptId}. See docs/specs/ROLE_ENHANCEMENT_PROCESSES.md.
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {ROLE_IDS.length} canonical roles for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong> —
        each with responsibilities, KPIs, and owned reports.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {ROLE_IDS.map((role) => {
          const r = roles[role] || {};
          const c = ROLE_COLORS[role];
          return (
            <div key={role} style={{
              border: `1px solid ${c.border}`, background: c.bg,
              borderRadius: 8, padding: 14,
            }}>
              <div style={{ fontWeight: 700, color: c.fg, fontSize: 14, marginBottom: 4 }}>
                {ROLE_ICONS[role]} {ROLE_LABELS[role]}
              </div>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, marginBottom: 10 }}>
                {r.title || '—'}
              </div>

              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Responsibilities
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0f172a', lineHeight: 1.5 }}>
                {(r.responsibilities || []).map((t, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{t}</li>
                ))}
                {(!r.responsibilities || r.responsibilities.length === 0) && (
                  <li style={{ color: '#94a3b8', fontStyle: 'italic' }}>none catalogued</li>
                )}
              </ul>

              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                KPIs
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(r.kpis || []).map((k, i) => (
                  <span key={i} style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    background: '#fff', color: c.fg, fontWeight: 500,
                    border: `1px solid ${c.border}`,
                  }}>
                    {k}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                Reports
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(r.reports || []).map((rid) => {
                  const report = getReportById(rid);
                  return (
                    <span key={rid} style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: '#fff', color: '#334155',
                      border: '1px solid #e2e8f0',
                    }}>
                      {report ? report.name : rid}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {archetypes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            aria-expanded={archetypesOpen}
            onClick={() => setArchetypesOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', textAlign: 'left', cursor: 'pointer',
              padding: '10px 14px',
              background: ROLE_COLORS.manager.bg,
              border: `1px solid ${ROLE_COLORS.manager.border}`,
              borderRadius: 8,
              color: ROLE_COLORS.manager.fg,
              fontSize: 13, fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 14 }}>{archetypesOpen ? '▾' : '▸'}</span>
            <span>👔 Manager Archetypes</span>
            <span style={{
              padding: '1px 8px', borderRadius: 999, fontSize: 11,
              background: '#fff', color: ROLE_COLORS.manager.fg,
              border: `1px solid ${ROLE_COLORS.manager.border}`,
              fontWeight: 600,
            }}>
              {archetypes.length} applicable
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: '#64748b',
            }}>
              Sub-specializations of the Manager role
            </span>
          </button>

          {archetypesOpen && (
            <div style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 10,
            }}>
              {archetypes.map((a) => {
                const c = ROLE_COLORS.manager;
                const topResps = (a.responsibilities || []).slice(0, 2);
                const topKpis = (a.kpis || []).slice(0, 2);
                return (
                  <Link
                    key={a.id}
                    to={`/${deptId}/manager/archetype/${a.id}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                      border: `1px solid ${c.border}`,
                      background: '#fff',
                      borderRadius: 8,
                      padding: 12,
                      transition: 'transform 120ms ease, box-shadow 120ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: c.fg,
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginBottom: 4,
                    }}>
                      <span aria-hidden="true">{a.icon}</span>
                      <span>{a.label}</span>
                    </div>
                    <div style={{
                      fontSize: 11, color: '#475569', fontStyle: 'italic',
                      marginBottom: 8,
                    }}>
                      {a.focus}
                    </div>

                    <div style={{
                      fontSize: 10, color: '#64748b', fontWeight: 600,
                      textTransform: 'uppercase', marginBottom: 3,
                    }}>
                      Responsibilities
                    </div>
                    <ul style={{
                      margin: 0, paddingLeft: 16, fontSize: 11,
                      color: '#0f172a', lineHeight: 1.45,
                    }}>
                      {topResps.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>

                    <div style={{
                      fontSize: 10, color: '#64748b', fontWeight: 600,
                      textTransform: 'uppercase', marginTop: 8, marginBottom: 3,
                    }}>
                      KPIs
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {topKpis.map((k, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 10,
                            background: c.bg, color: c.fg, fontWeight: 500,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 10, fontWeight: 600, color: c.fg,
                    }}>
                      Open dashboard →
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
