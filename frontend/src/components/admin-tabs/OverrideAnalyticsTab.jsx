// OverrideAnalyticsTab — 11th admin tab. Shared across every department.
//
// Phase 3a ships client-side mock data (see data/overrideEvents.js). The
// backend already emits structured events via emit_event('ai.feedback.*',
// 'rbac.*', 'decision.*') to stdout — a future Phase 3b ticket will route
// those to Postgres and wire this tab to a /api/v1/governance/events
// endpoint. Shape mirrors what we expect from that endpoint.

import { useMemo, useState } from 'react';
import {
  generateOverrideEvents,
  OVERRIDE_EVENT_TYPES,
  OVERRIDE_DEPTS,
} from '../../data/overrideEvents';
import { ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const TYPE_COLORS = {
  'rbac.denied':           { bg: 'rgba(239,68,68,0.12)',  fg: '#b91c1c' },
  'decision.overridden':   { bg: 'rgba(234,88,12,0.12)',  fg: '#c2410c' },
  'decision.rejected':     { bg: 'rgba(139,92,246,0.12)', fg: '#7c3aed' },
  'policy.violation':      { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
};

const TYPE_LABELS = {
  'rbac.denied':         'RBAC denied',
  'decision.overridden': 'Overridden',
  'decision.rejected':   'Rejected',
  'policy.violation':    'Policy violation',
};

function formatTimestamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function OverrideAnalyticsTab({ dept }) {
  const deptId = dept?.id || '';
  // Dataset is stable across renders — generated once per tab mount.
  const allEvents = useMemo(() => generateOverrideEvents(60), []);

  const [typeFilter, setTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState(
    OVERRIDE_DEPTS.includes(deptId) ? deptId : 'all'
  );
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const rows = allEvents.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (deptFilter !== 'all' && e.dept !== deptFilter) return false;
      return true;
    });
    return rows.sort((a, b) =>
      sortDesc
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    );
  }, [allEvents, typeFilter, deptFilter, sortDesc]);

  // Stat tiles — computed off the *unfiltered* corpus so the totals are
  // stable when you tweak filters.
  const stats = useMemo(() => {
    const totalOverrides = allEvents.filter((e) => e.type === 'decision.overridden').length;
    const rbacDenials = allEvents.filter((e) => e.type === 'rbac.denied').length;
    const policyViolations = allEvents.filter((e) => e.type === 'policy.violation').length;

    // Top dept by override count.
    const deptCounts = {};
    for (const e of allEvents) {
      if (e.type !== 'decision.overridden') continue;
      deptCounts[e.dept] = (deptCounts[e.dept] || 0) + 1;
    }
    const top = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];
    const topDept = top ? top[0] : '—';

    return { totalOverrides, rbacDenials, policyViolations, topDept };
  }, [allEvents]);

  const typePills = [
    { id: 'all', label: 'All events' },
    ...OVERRIDE_EVENT_TYPES.map((t) => ({ id: t, label: TYPE_LABELS[t] || t })),
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatTile label="Total overrides" value={stats.totalOverrides} color="#c2410c" />
        <StatTile label="RBAC denials" value={stats.rbacDenials} color="#b91c1c" />
        <StatTile label="Policy violations" value={stats.policyViolations} color="#2563eb" />
        <StatTile label="Top dept (overrides)" value={stats.topDept} color="#7c3aed" textual />
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div
          role="group"
          aria-label="Filter by event type"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        >
          {typePills.map((p) => {
            const isActive = typeFilter === p.id;
            const colors = p.id !== 'all' ? TYPE_COLORS[p.id] : null;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTypeFilter(p.id)}
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
                {p.label}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              fontWeight: 500,
            }}
          >
            Department
          </span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              background: '#fff',
              color: 'var(--text-primary, #0f172a)',
              outline: 'none',
            }}
          >
            <option value="all">All departments</option>
            {OVERRIDE_DEPTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setSortDesc((s) => !s)}
          aria-label="Toggle sort order"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            background: '#fff',
            color: 'var(--text-secondary, #64748b)',
            cursor: 'pointer',
          }}
        >
          {sortDesc ? '⬇ Newest first' : '⬆ Oldest first'}
        </button>
      </div>

      {/* Count summary */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, #64748b)',
          marginBottom: '10px',
        }}
      >
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{allEvents.length}</strong> events total
        {' · '}
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{filtered.length}</strong> shown
        {' · '}
        last 7 days (synthetic corpus — real log integration pending)
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
              <Th>Timestamp</Th>
              <Th>Dept</Th>
              <Th>Type</Th>
              <Th>Role</Th>
              <Th>Reason</Th>
              <Th>Correlation ID</Th>
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
                  No events match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const colors = TYPE_COLORS[e.type] || { bg: '#f1f5f9', fg: '#64748b' };
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                      {formatTimestamp(e.timestamp)}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary, #0f172a)' }}>
                      {e.dept}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: colors.bg,
                          color: colors.fg,
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {TYPE_LABELS[e.type] || e.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary, #0f172a)' }}>
                      <span aria-hidden="true">{ROLE_ICONS[e.role] || ''}</span>{' '}
                      {ROLE_LABELS[e.role] || e.role}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary, #0f172a)' }}>
                      {e.reason}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      {e.correlation_id}
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

function StatTile({ label, value, color, textual }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '8px',
        background: '#fff',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary, #64748b)',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: textual ? '20px' : '26px',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        padding: '10px',
        textAlign: 'left',
        color: 'var(--text-secondary, #64748b)',
        fontWeight: 600,
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </th>
  );
}
