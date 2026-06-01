import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MANAGER_ARCHETYPES } from '../../data/managerArchetypes';
import { departments } from '../../data/departments';

// Archetype card palette — aligned with the Manager role color family
// (blue) used in RolesResponsibilitiesTab so the archetypes are visually
// recognizable as "Manager sub-specializations".
const MGR_COLOR = { bg: 'rgba(59,130,246,0.08)', fg: '#2563eb', border: '#bfdbfe' };

function deptLabel(deptId) {
  const d = departments.find((x) => x.id === deptId);
  return d ? `${d.icon} ${d.name}` : deptId;
}

function typicalDeptPills(typicalDepts) {
  if (typicalDepts === 'all') return [{ id: 'all', label: 'All departments' }];
  return typicalDepts.split(',').map((s) => s.trim()).map((id) => ({
    id,
    label: deptLabel(id),
  }));
}

export default function ManagerArchetypesTab() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');

  const typicalDeptsSet = useMemo(() => {
    const s = new Set();
    MANAGER_ARCHETYPES.forEach((a) => {
      if (a.typicalDepts === 'all') return;
      a.typicalDepts.split(',').map((x) => x.trim()).forEach((d) => s.add(d));
    });
    return s;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MANAGER_ARCHETYPES.filter((a) => {
      // Dept filter
      if (deptFilter !== 'all') {
        if (a.typicalDepts === 'all') {
          // 'all' archetypes match any dept filter — keep them visible
        } else {
          const list = a.typicalDepts.split(',').map((x) => x.trim());
          if (!list.includes(deptFilter)) return false;
        }
      }
      if (!q) return true;
      const hay = [
        a.label,
        a.focus,
        ...(a.responsibilities || []),
        ...(a.kpis || []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deptFilter, search]);

  const filterPills = [
    { id: 'all', label: 'All' },
    ...Array.from(typicalDeptsSet).sort().map((id) => ({
      id,
      label: deptLabel(id),
    })),
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          👔 Manager Archetypes — 9 specializations of the Manager role
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Archetypes live <em>inside</em> the canonical Manager role — they do not
          expand the 5-role RBAC matrix (manager, team-member, compliance,
          reporting-monitoring, tester). Use these to pick the manager flavor
          most relevant for a department or engagement.
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        marginBottom: 14,
      }}>
        <div role="group" aria-label="Filter by typical department"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          {filterPills.map((p) => {
            const active = deptFilter === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setDeptFilter(p.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  borderRadius: 999,
                  border: active ? `1px solid ${MGR_COLOR.fg}` : '1px solid #e2e8f0',
                  background: active ? MGR_COLOR.bg : '#fff',
                  color: active ? MGR_COLOR.fg : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
            Search archetypes
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, focus, responsibility..."
            aria-label="Search manager archetypes"
            style={{
              padding: '6px 10px', fontSize: 13, borderRadius: 6,
              border: '1px solid #e2e8f0', minWidth: 240,
              background: '#fff', color: '#0f172a', outline: 'none',
            }}
          />
        </label>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
        <strong style={{ color: '#0f172a' }}>{MANAGER_ARCHETYPES.length}</strong> archetypes
        {' · '}
        <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> shown
      </div>

      {/* Archetype cards */}
      {filtered.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', color: '#64748b',
          fontStyle: 'italic', border: '1px dashed #e2e8f0', borderRadius: 8,
        }}>
          No manager archetypes match the current filters.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 12,
        }}>
          {filtered.map((a) => {
            const pills = typicalDeptPills(a.typicalDepts);
            // Pick a target dept for the archetype page link:
            //   - If the user filtered to a specific dept, use that.
            //   - Else if archetype is typicalDepts='all', default to 'sales' (flagship).
            //   - Else use the first listed typical dept.
            const targetDept =
              deptFilter !== 'all'
                ? deptFilter
                : a.typicalDepts === 'all'
                  ? 'sales'
                  : a.typicalDepts.split(',').map((s) => s.trim())[0];
            return (
              <Link
                key={a.id}
                to={`/${targetDept}/manager/archetype/${a.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  border: `1px solid ${MGR_COLOR.border}`,
                  background: MGR_COLOR.bg,
                  borderRadius: 8,
                  padding: 14,
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
                  fontWeight: 700, color: MGR_COLOR.fg, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 4,
                }}>
                  <span aria-hidden="true" style={{ fontSize: 18 }}>{a.icon}</span>
                  <span>{a.label}</span>
                </div>
                <div style={{
                  fontSize: 12, color: '#334155', fontStyle: 'italic',
                  marginBottom: 10,
                }}>
                  Focus: {a.focus}
                </div>

                <div style={{
                  fontSize: 11, color: '#64748b', fontWeight: 600,
                  textTransform: 'uppercase', marginBottom: 4,
                }}>
                  Responsibilities
                </div>
                <ul style={{
                  margin: 0, paddingLeft: 18, fontSize: 12,
                  color: '#0f172a', lineHeight: 1.5,
                }}>
                  {(a.responsibilities || []).map((r, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{r}</li>
                  ))}
                </ul>

                <div style={{
                  fontSize: 11, color: '#64748b', fontWeight: 600,
                  textTransform: 'uppercase', marginTop: 10, marginBottom: 4,
                }}>
                  KPIs
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(a.kpis || []).map((k, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11,
                        background: '#fff', color: MGR_COLOR.fg, fontWeight: 500,
                        border: `1px solid ${MGR_COLOR.border}`,
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>

                <div style={{
                  fontSize: 11, color: '#64748b', fontWeight: 600,
                  textTransform: 'uppercase', marginTop: 10, marginBottom: 4,
                }}>
                  Typical departments
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {pills.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        background: '#fff', color: '#334155',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
                <div style={{
                  marginTop: 10, fontSize: 11, color: MGR_COLOR.fg,
                  fontWeight: 600,
                }}>
                  Open {a.label} dashboard →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
