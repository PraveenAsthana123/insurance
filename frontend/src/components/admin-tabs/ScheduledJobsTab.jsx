import { useMemo } from 'react';
import { getWorkflowsForDept } from '../../data/workflows';
import { ROLE_LABELS, ROLE_ICONS } from '../../data/roles';
import { seededRng, randInt, pick } from '../../utils/seed';

const SCHEDULE_KEYWORDS = /daily|hourly|weekly|monthly|nightly|quarterly|shift/i;

function nextRunLabel(trigger, rng) {
  const t = trigger.toLowerCase();
  if (t.includes('hourly') || t.includes('< 15') || t.includes('< 30')) {
    return `${randInt(rng, 5, 59)} min`;
  }
  if (t.includes('daily') || t.includes('nightly')) {
    return `${randInt(rng, 1, 23)} h`;
  }
  if (t.includes('weekly')) {
    return `${randInt(rng, 1, 7)} d`;
  }
  if (t.includes('monthly')) {
    return `${randInt(rng, 1, 30)} d`;
  }
  if (t.includes('quarterly')) {
    return `${randInt(rng, 20, 90)} d`;
  }
  if (t.includes('shift')) {
    return `${randInt(rng, 30, 480)} min`;
  }
  return `${randInt(rng, 1, 12)} h`;
}

const STATUSES = ['success', 'success', 'success', 'success', 'success', 'running', 'failed'];

export default function ScheduledJobsTab({ dept }) {
  const deptId = dept?.id || '';
  const rows = useMemo(() => {
    const all = getWorkflowsForDept(deptId);
    const scheduled = all.filter((w) => SCHEDULE_KEYWORDS.test(w.trigger));
    const rng = seededRng(`jobs-${deptId}`);
    return scheduled.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
      trigger: w.trigger,
      kpi: w.kpi,
      nextRunIn: nextRunLabel(w.trigger, rng),
      lastRunAgo: randInt(rng, 1, 48),
      status: pick(rng, STATUSES),
    }));
  }, [deptId]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        No scheduled jobs catalogued for {dept?.name || 'this department'} yet.
      </div>
    );
  }

  const successCount = rows.filter((r) => r.status === 'success').length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        <strong style={{ color: '#0f172a' }}>{rows.length}</strong> scheduled jobs {' · '}
        <strong style={{ color: '#059669' }}>{successCount}</strong> succeeded{' · '}
        <strong style={{ color: '#dc2626' }}>{failedCount}</strong> failed
        {' · '} last 24h
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Job</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Owner</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Trigger</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Next run</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Last run</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const statusColor = (
                r.status === 'success' ? { bg: 'rgba(16,185,129,0.12)', fg: '#059669' }
                : r.status === 'running' ? { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' }
                : { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626' }
              );
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                  <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>
                    {ROLE_ICONS[r.role]} {ROLE_LABELS[r.role]}
                  </td>
                  <td style={{
                    padding: 10, color: '#64748b', fontSize: 12,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}>
                    {r.trigger}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                    in {r.nextRunIn}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                    {r.lastRunAgo} h ago
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: statusColor.bg, color: statusColor.fg,
                    }}>
                      {r.status}
                    </span>
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
