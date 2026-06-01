import { useMemo, useState } from 'react';
import { hashString, seededRng, randInt } from '../../utils/seed';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const DEFECT_STATUSES = ['open', 'triaged', 'in-progress', 'resolved'];
const ASSIGNEES = [
  'A. Rahman', 'B. Chen', 'C. Okafor', 'D. Singh', 'E. Martinez',
  'F. Tanaka', 'G. O\'Neil', 'H. Patel',
];

const TITLE_TEMPLATES = [
  'Forecast endpoint returns 500 for empty store set',
  'Race condition on concurrent simulation writes',
  'RBAC: manager role can access team-member-only route',
  'Sidebar dept group collapses on navigation',
  'Explain drawer citations not rendering on slow networks',
  'Sparkline overflow on narrow viewports',
  'CSV export drops trailing newline on Windows',
  'MAPE calculation off-by-one when horizon = 1',
  'Dossier page fails to load when dept has zero processes',
  'Override logs: page-size param ignored above 200',
  'Flaky e2e: dept selector loses focus after click',
  'AI use-case table sort inconsistent between tabs',
];

function buildDefects(deptId, n = 12) {
  const rng = seededRng(`${deptId}-tester-defects`);
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const h = hashString(`${deptId}-tester-defect-${i}`);
    const sev = SEVERITIES[h % SEVERITIES.length];
    // Status distribution: tend to be in-progress or triaged
    const sIdx = (h >> 3) % 100;
    let status;
    if (sIdx < 22) status = 'open';
    else if (sIdx < 52) status = 'triaged';
    else if (sIdx < 82) status = 'in-progress';
    else status = 'resolved';
    const daysAgo = randInt(rng, 1, 42);
    const assignee = ASSIGNEES[(h >> 7) % ASSIGNEES.length];
    const title = TITLE_TEMPLATES[(h >> 11) % TITLE_TEMPLATES.length];
    const runIdx = (h >> 13) % 15;
    return {
      id: `BUG-${deptId.toUpperCase().slice(0, 3)}-${String(1800 - i * 11).padStart(5, '0')}`,
      title,
      severity: sev,
      status,
      opened_at: new Date(now - daysAgo * 86400_000).toISOString().slice(0, 10),
      assignee,
      related_run_id: `RUN-${deptId.toUpperCase().slice(0, 3)}-${String(2400 - runIdx * 7).padStart(5, '0')}`,
      _sort: daysAgo,
    };
  }).sort((a, b) => a._sort - b._sort);
}

const SEV_STYLES = {
  critical: { bg: 'rgba(220,38,38,0.14)',  fg: '#b91c1c' },
  high:     { bg: 'rgba(234,88,12,0.14)',  fg: '#c2410c' },
  medium:   { bg: 'rgba(234,179,8,0.14)',  fg: '#a16207' },
  low:      { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
};

const STATUS_STYLES = {
  open:          { bg: 'rgba(148,163,184,0.18)', fg: '#475569' },
  triaged:       { bg: 'rgba(59,130,246,0.12)',  fg: '#2563eb' },
  'in-progress': { bg: 'rgba(234,179,8,0.14)',   fg: '#a16207' },
  resolved:      { bg: 'rgba(16,185,129,0.12)',  fg: '#059669' },
};

export default function TesterDefectsTab({ dept }) {
  const deptId = dept?.id || '';
  const defects = useMemo(() => buildDefects(deptId), [deptId]);
  const [sevFilter, setSevFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = defects.filter(
    (d) => (sevFilter === 'all' || d.severity === sevFilter)
        && (statusFilter === 'all' || d.status === statusFilter),
  );

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        12 defects tracked against the <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong> test
        suites. Synthetic data for demo — wire to real tracker in Phase γ.
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          Severity
          <select
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          >
            <option value="all">All</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          >
            <option value="all">All</option>
            {DEFECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
          <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> of {defects.length} shown
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Defect ID', 'Title', 'Severity', 'Status', 'Opened', 'Assignee', 'Run'].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  No defects match the current filters.
                </td>
              </tr>
            ) : filtered.map((d) => {
              const sv = SEV_STYLES[d.severity];
              const st = STATUS_STYLES[d.status];
              return (
                <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#0f172a' }}>
                    {d.id}
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{d.title}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: sv.bg, color: sv.fg, textTransform: 'uppercase',
                    }}>
                      {d.severity}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: st.bg, color: st.fg,
                    }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>{d.opened_at}</td>
                  <td style={{ padding: 10, color: '#0f172a', fontSize: 12 }}>{d.assignee}</td>
                  <td style={{ padding: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#64748b' }}>
                    {d.related_run_id}
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
