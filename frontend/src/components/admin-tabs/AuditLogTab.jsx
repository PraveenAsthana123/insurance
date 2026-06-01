import { useMemo, useState } from 'react';
import { seededRng, randInt, pick } from '../../utils/seed';

const ACTIONS = [
  { verb: 'deployed',  target: 'ML model',      severity: 'info' },
  { verb: 'promoted',  target: 'challenger model', severity: 'info' },
  { verb: 'rolled back', target: 'model version', severity: 'warn' },
  { verb: 'created',   target: 'scheduled job',  severity: 'info' },
  { verb: 'disabled',  target: 'scheduled job',  severity: 'warn' },
  { verb: 'edited',    target: 'alert threshold', severity: 'info' },
  { verb: 'granted',   target: 'role', severity: 'info' },
  { verb: 'revoked',   target: 'role', severity: 'warn' },
  { verb: 'exported',  target: 'dataset', severity: 'info' },
  { verb: 'accessed',  target: 'PII record', severity: 'warn' },
  { verb: 'approved',  target: 'policy change', severity: 'info' },
  { verb: 'flagged',   target: 'anomaly', severity: 'warn' },
  { verb: 'ran',       target: 'simulation', severity: 'info' },
  { verb: 'updated',   target: 'workflow', severity: 'info' },
];

const USERS = [
  'priya.patel', 'arjun.kumar', 'mei.chen', 'david.okafor',
  'sofia.silva', 'omar.hassan', 'elena.park', 'hiroshi.rossi',
  'fatima.nguyen', 'marcus.kim', 'amara.garcia', 'jin.ito',
];

const RESULTS = ['success', 'success', 'success', 'success', 'success', 'denied', 'error'];

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function AuditLogTab({ dept }) {
  const [filter, setFilter] = useState('all');
  const deptId = dept?.id || '';

  const events = useMemo(() => {
    const rng = seededRng(`audit-${deptId}`);
    const now = Date.now();
    const rows = [];
    for (let i = 0; i < 20; i += 1) {
      const a = pick(rng, ACTIONS);
      const user = pick(rng, USERS);
      const result = pick(rng, RESULTS);
      const minutesAgo = randInt(rng, 5, 30 * 24 * 60); // up to 30 days
      const when = new Date(now - minutesAgo * 60 * 1000);
      rows.push({
        id: `${deptId}-audit-${i}`,
        when,
        user,
        verb: a.verb,
        target: a.target,
        severity: a.severity,
        result,
      });
    }
    return rows.sort((x, y) => y.when - x.when);
  }, [deptId]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.severity === filter);
  const warnCount = events.filter((e) => e.severity === 'warn').length;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'info', 'warn'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{
                padding: '6px 12px', fontSize: 13, borderRadius: 999,
                border: filter === f ? '1px solid #1e3a5f' : '1px solid #e2e8f0',
                background: filter === f ? 'rgba(30,58,95,0.1)' : '#fff',
                color: filter === f ? '#1e3a5f' : '#64748b',
                cursor: 'pointer', fontWeight: filter === f ? 600 : 500,
                textTransform: 'uppercase',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          <strong style={{ color: '#0f172a' }}>{events.length}</strong> events over 30 days · {' '}
          <strong style={{ color: '#b45309' }}>{warnCount}</strong> warnings
        </div>
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 140 }}>Timestamp</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 140 }}>User</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Action</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Target</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Severity</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, color: '#64748b', fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {formatDate(e.when)}
                </td>
                <td style={{ padding: 10, color: '#0f172a', fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {e.user}
                </td>
                <td style={{ padding: 10, color: '#0f172a', fontWeight: 500 }}>{e.verb}</td>
                <td style={{ padding: 10, color: '#64748b' }}>{e.target}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: e.severity === 'warn' ? 'rgba(234,179,8,0.12)' : 'rgba(59,130,246,0.12)',
                    color: e.severity === 'warn' ? '#b45309' : '#2563eb',
                    textTransform: 'uppercase',
                  }}>
                    {e.severity}
                  </span>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: e.result === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: e.result === 'success' ? '#059669' : '#dc2626',
                  }}>
                    {e.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
