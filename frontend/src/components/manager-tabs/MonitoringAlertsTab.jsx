import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { seededRng, randInt, pick, sparkline } from '../../utils/seed';

const ALERT_TEMPLATES = [
  { severity: 'critical', text: 'API p95 latency breach on prediction service' },
  { severity: 'critical', text: 'Model drift exceeded 5% threshold' },
  { severity: 'warn',     text: 'Scheduled job ran over SLA window' },
  { severity: 'warn',     text: 'Data freshness stale on upstream feed' },
  { severity: 'warn',     text: 'Anomaly spike in volume metric' },
  { severity: 'info',     text: 'New model version promoted to production' },
  { severity: 'info',     text: 'Nightly ETL completed with warnings' },
  { severity: 'warn',     text: 'Rate limit near quota for MCP server' },
  { severity: 'critical', text: 'Pipeline failure in feature extractor' },
  { severity: 'info',     text: 'Role change approved for compliance user' },
  { severity: 'warn',     text: 'Cache hit rate dropped below 60%' },
  { severity: 'info',     text: 'Dashboard widget latency improved 15%' },
];

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.12)', fg: '#dc2626' },
  warn: { bg: 'rgba(234,179,8,0.12)', fg: '#b45309' },
  info: { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
};

export default function MonitoringAlertsTab({ dept }) {
  const deptId = dept?.id || '';
  const rng = useMemo(() => seededRng(`alerts-${deptId}`), [deptId]);

  const alerts = useMemo(() => {
    const r = seededRng(`alerts-list-${deptId}`);
    const now = Date.now();
    return Array.from({ length: 8 }, (_, i) => {
      const tpl = pick(r, ALERT_TEMPLATES);
      const minutesAgo = randInt(r, 2, 24 * 60);
      return {
        id: `${deptId}-alert-${i}`,
        severity: tpl.severity,
        text: tpl.text,
        when: new Date(now - minutesAgo * 60 * 1000),
        minutesAgo,
      };
    }).sort((a, b) => a.minutesAgo - b.minutesAgo);
  }, [deptId]);

  const volumeSeries = useMemo(() => {
    const r = seededRng(`alerts-vol-${deptId}`);
    return sparkline(r, 24, 0, 12).map((p, i) => ({ i, hour: `-${24 - i}h`, v: Math.round(p.v) }));
  }, [deptId]);

  const color = dept?.color || '#3b82f6';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Alert stream for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Feed is deterministic per dept for demo.
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, background: '#fff', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
          Alert volume · last 24h
        </div>
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeSeries} margin={{ top: 2, right: 4, bottom: 16, left: 0 }}>
              <defs>
                <linearGradient id={`alerts-g-${deptId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" hide />
              <Tooltip
                formatter={(v) => [`${v} alerts`, 'volume']}
                labelFormatter={(l) => `t=${l}`}
                contentStyle={{ fontSize: 12, padding: 6 }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#alerts-g-${deptId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 110 }}>When</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, width: 110 }}>Severity</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Alert</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const c = SEVERITY_COLORS[a.severity];
              return (
                <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>
                    {a.minutesAgo < 60
                      ? `${a.minutesAgo} min ago`
                      : `${Math.round(a.minutesAgo / 60)} h ago`}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: c.bg, color: c.fg, textTransform: 'uppercase',
                    }}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{a.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
