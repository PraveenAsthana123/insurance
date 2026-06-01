import { useMemo, useState } from 'react';
import { getWorkflowsForDept } from '../../data/workflows';
import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const ROLE_SHORT = {
  manager: 'Mgr',
  'team-member': 'TM',
  compliance: 'Compl',
  'reporting-monitoring': 'R&M',
  tester: 'Test',
};

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb' },
  'team-member': { bg: 'rgba(16,185,129,0.1)', fg: '#059669' },
  compliance: { bg: 'rgba(139,92,246,0.1)', fg: '#7c3aed' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.1)', fg: '#c2410c' },
  tester: { bg: 'rgba(202,138,4,0.1)', fg: '#a16207' },
};

export default function WorkflowsTab({ dept }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const deptId = dept?.id || '';
  const all = useMemo(() => getWorkflowsForDept(deptId), [deptId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((w) => {
      if (roleFilter !== 'all' && w.role !== roleFilter) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.trigger.toLowerCase().includes(q) ||
        w.kpi.toLowerCase().includes(q)
      );
    });
  }, [all, roleFilter, search]);

  if (all.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-secondary, #64748b)',
          fontSize: '14px',
        }}
      >
        No workflows catalogued for {dept?.name || 'this department'} yet.
      </div>
    );
  }

  const counts = ROLE_IDS.reduce(
    (acc, r) => ({ ...acc, [r]: all.filter((w) => w.role === r).length }),
    {}
  );
  const countsSummary = ROLE_IDS.map((r) => `${counts[r]} ${ROLE_SHORT[r]}`).join(' / ');

  const filterPills = [
    { id: 'all', label: 'All', icon: '' },
    ...ROLE_IDS.map((r) => ({ id: r, label: ROLE_LABELS[r], icon: ROLE_ICONS[r] })),
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div role="group" aria-label="Filter by role" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {filterPills.map((p) => {
            const isActive = roleFilter === p.id;
            const colors = p.id !== 'all' ? ROLE_COLORS[p.id] : null;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setRoleFilter(p.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: '999px',
                  border: isActive
                    ? `1px solid ${colors ? colors.fg : '#1e3a5f'}`
                    : '1px solid var(--border-subtle, #e2e8f0)',
                  background: isActive
                    ? colors
                      ? colors.bg
                      : 'rgba(30,58,95,0.1)'
                    : '#fff',
                  color: isActive
                    ? colors
                      ? colors.fg
                      : '#1e3a5f'
                    : 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.icon ? `${p.icon} ` : ''}
                {p.label}
              </button>
            );
          })}
        </div>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
        >
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              fontWeight: 500,
            }}
          >
            Search workflows
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, trigger, KPI..."
            aria-label="Search workflows"
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              minWidth: '220px',
              background: '#fff',
              color: 'var(--text-primary, #0f172a)',
              outline: 'none',
            }}
          />
        </label>
      </div>

      {/* Stats line */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, #64748b)',
          marginBottom: '10px',
        }}
      >
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{all.length}</strong> workflows
        {' · '}
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{filtered.length}</strong> shown
        {' · '}
        {countsSummary}
      </div>

      {/* Table */}
      <div
        style={{
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '10px', textAlign: 'left', width: '40px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>#</th>
              <th style={{ padding: '10px', textAlign: 'left', width: '160px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Process</th>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Description</th>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Trigger</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>KPI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #64748b)',
                    fontStyle: 'italic',
                  }}
                >
                  No workflows match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((w, i) => {
                const colors = ROLE_COLORS[w.role] || { bg: '#f1f5f9', fg: '#64748b' };
                return (
                  <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: '10px', color: 'var(--text-secondary, #64748b)' }}>{i + 1}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: colors.bg,
                          color: colors.fg,
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span aria-hidden="true">{ROLE_ICONS[w.role]}</span>
                        {ROLE_SHORT[w.role]}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                      {w.name}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-primary, #0f172a)' }}>
                      {w.description}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #64748b)',
                      }}
                    >
                      {w.trigger}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #64748b)',
                        textAlign: 'right',
                      }}
                    >
                      {w.kpi}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
