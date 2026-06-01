import { useMemo, useState } from 'react';
import { hashString, seededRng, randInt, randFloat } from '../../utils/seed';

const SUITES = ['unit', 'integration', 'e2e', 'regression', 'smoke'];
const STATUSES = ['passed', 'failed', 'flaky'];
const TRIGGERS = ['schedule', 'pr-merge', 'manual', 'release-train', 'nightly'];

function buildRuns(deptId, n = 15) {
  const rng = seededRng(`${deptId}-tester-runs`);
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const h = hashString(`${deptId}-tester-run-${i}`);
    const statusIdx = h % 100;
    // Skew toward passed, occasional fail/flaky.
    let status;
    if (statusIdx < 68) status = 'passed';
    else if (statusIdx < 87) status = 'flaky';
    else status = 'failed';
    const suite = SUITES[(h >> 5) % SUITES.length];
    const trigger = TRIGGERS[(h >> 9) % TRIGGERS.length];
    const durationMin = suite === 'unit'
      ? randFloat(rng, 0.3, 2.8, 1)
      : suite === 'smoke'
      ? randFloat(rng, 0.8, 3.5, 1)
      : suite === 'integration'
      ? randFloat(rng, 3, 12, 1)
      : suite === 'e2e'
      ? randFloat(rng, 8, 28, 1)
      : randFloat(rng, 14, 42, 1); // regression
    const hoursAgo = randInt(rng, 1, 96);
    return {
      id: `RUN-${deptId.toUpperCase().slice(0, 3)}-${String(2400 - i * 7).padStart(5, '0')}`,
      suite,
      dept: deptId,
      status,
      duration: `${durationMin} min`,
      triggered_by: trigger,
      started_at: new Date(now - hoursAgo * 3600_000).toISOString().slice(0, 16).replace('T', ' '),
      _hoursAgo: hoursAgo,
    };
  }).sort((a, b) => a._hoursAgo - b._hoursAgo);
}

const STATUS_STYLES = {
  passed: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  failed: { bg: 'rgba(220,38,38,0.12)',  fg: '#dc2626' },
  flaky:  { bg: 'rgba(234,179,8,0.14)',  fg: '#a16207' },
};

const SUITE_STYLES = {
  unit:        { bg: '#eef2ff', fg: '#4338ca' },
  integration: { bg: '#ecfdf5', fg: '#047857' },
  e2e:         { bg: '#fef3c7', fg: '#92400e' },
  regression:  { bg: '#fae8ff', fg: '#86198f' },
  smoke:       { bg: '#e0f2fe', fg: '#075985' },
};

export default function TesterRunsTab({ dept }) {
  const deptId = dept?.id || '';
  const runs = useMemo(() => buildRuns(deptId), [deptId]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [suiteFilter, setSuiteFilter] = useState('all');

  const filtered = runs.filter(
    (r) => (statusFilter === 'all' || r.status === statusFilter)
        && (suiteFilter === 'all' || r.suite === suiteFilter),
  );

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        15 most recent runs for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Rerun links are stubbed — this view is read-only in the pilot.
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          Suite
          <select
            value={suiteFilter}
            onChange={(e) => setSuiteFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          >
            <option value="all">All</option>
            {SUITES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
          <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> of {runs.length} shown
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Run ID', 'Suite', 'Status', 'Duration', 'Triggered by', 'Started', ''].map((h) => (
                <th key={h} style={{
                  padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  No runs match the current filters.
                </td>
              </tr>
            ) : filtered.map((r) => {
              const st = STATUS_STYLES[r.status];
              const su = SUITE_STYLES[r.suite];
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#0f172a' }}>
                    {r.id}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: su.bg, color: su.fg,
                    }}>
                      {r.suite}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: st.bg, color: st.fg, textTransform: 'uppercase',
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{r.duration}</td>
                  <td style={{ padding: 10, color: '#64748b' }}>{r.triggered_by}</td>
                  <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>{r.started_at}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      style={{
                        padding: '4px 10px', fontSize: 12, borderRadius: 6,
                        border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a',
                        cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      Rerun
                    </button>
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
