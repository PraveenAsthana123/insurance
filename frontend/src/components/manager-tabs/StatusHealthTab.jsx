import { useMemo } from 'react';
import { seededRng, randFloat, randInt } from '../../utils/seed';

function tile({ label, value, status, note }) {
  const colors = {
    healthy: { bg: 'rgba(16,185,129,0.10)', fg: '#059669', border: '#a7f3d0' },
    watch:   { bg: 'rgba(234,179,8,0.10)',  fg: '#b45309', border: '#fde68a' },
    breach:  { bg: 'rgba(239,68,68,0.10)',  fg: '#dc2626', border: '#fecaca' },
  };
  const c = colors[status];
  return (
    <div style={{
      border: `1px solid ${c.border}`, background: c.bg,
      borderRadius: 8, padding: 16,
    }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: c.fg, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{note}</div>
    </div>
  );
}

export default function StatusHealthTab({ dept }) {
  const deptId = dept?.id || '';
  const metrics = useMemo(() => {
    const rng = seededRng(`status-${deptId}`);
    const apiUp = randFloat(rng, 98.5, 99.99, 2);
    const drift = randFloat(rng, 0.6, 6.4, 1);
    const slaPct = randFloat(rng, 91, 99.5, 1);
    const jobOk = randFloat(rng, 88, 99.5, 1);
    return { apiUp, drift, slaPct, jobOk,
             activeAlerts: randInt(rng, 0, 7),
             openIncidents: randInt(rng, 0, 3),
             p95LatencyMs: randInt(rng, 140, 620),
             lastDeployHours: randInt(rng, 2, 96),
           };
  }, [deptId]);

  const apiStatus = metrics.apiUp > 99.5 ? 'healthy' : metrics.apiUp > 99 ? 'watch' : 'breach';
  const driftStatus = metrics.drift < 2 ? 'healthy' : metrics.drift < 5 ? 'watch' : 'breach';
  const slaStatus = metrics.slaPct > 97 ? 'healthy' : metrics.slaPct > 93 ? 'watch' : 'breach';
  const jobStatus = metrics.jobOk > 97 ? 'healthy' : metrics.jobOk > 92 ? 'watch' : 'breach';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Status & health for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Thresholds: uptime &gt; 99.5%, drift &lt; 2%, SLA &gt; 97%, jobs &gt; 97%.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {tile({
          label: 'API Uptime (30d)',
          value: `${metrics.apiUp}%`,
          status: apiStatus,
          note: `p95 latency ${metrics.p95LatencyMs} ms`,
        })}
        {tile({
          label: 'Model drift (avg)',
          value: `${metrics.drift}%`,
          status: driftStatus,
          note: metrics.drift < 2 ? 'within tolerance' : 'retraining recommended',
        })}
        {tile({
          label: 'Pipeline SLA',
          value: `${metrics.slaPct}%`,
          status: slaStatus,
          note: `${metrics.openIncidents} open incidents`,
        })}
        {tile({
          label: 'Scheduled job success',
          value: `${metrics.jobOk}%`,
          status: jobStatus,
          note: `${metrics.activeAlerts} active alerts`,
        })}
      </div>

      <div style={{
        marginTop: 16, padding: 14, background: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
          Recent activity
        </div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          Last production deploy was <strong style={{ color: '#0f172a' }}>{metrics.lastDeployHours} hours ago</strong>. {' '}
          Drift monitor recalculated nightly. {' '}
          {metrics.openIncidents > 0
            ? `${metrics.openIncidents} incident(s) under investigation.`
            : 'No open incidents.'}
        </div>
      </div>
    </div>
  );
}
