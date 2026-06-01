import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getRolesForDept } from '../../data/roles';
import { seededRng, randFloat, sparkline } from '../../utils/seed';

function deriveKpis(deptId, roles) {
  const rng = seededRng(`kpi-${deptId}`);
  // Prefer the manager KPIs if seeded, else use a generic set.
  const managerKpis = (roles.manager && roles.manager.kpis) || [];
  const base = managerKpis.length >= 4 ? managerKpis.slice(0, 6) : [
    'SLA compliance %', 'Throughput', 'Cost per unit',
    'Model accuracy %', 'On-time %', 'Incident count',
  ];
  const padded = [...base];
  while (padded.length < 6) padded.push('Quality score');
  return padded.slice(0, 6).map((name, i) => {
    const direction = rng() > 0.4 ? 'up' : 'down';
    const pct = randFloat(rng, 0.5, 12, 1);
    let valueLabel;
    const n = name.toLowerCase();
    if (n.includes('%') || n.includes('accuracy') || n.includes('rate')) {
      valueLabel = `${randFloat(rng, 72, 97, 1)}%`;
    } else if (n.includes('revenue') || n.includes('$') || n.includes('cost')) {
      valueLabel = `$${randFloat(rng, 1.2, 18.0, 1)}M`;
    } else if (n.includes('days') || n.includes('cycle')) {
      valueLabel = `${randFloat(rng, 12, 48, 0)} d`;
    } else if (n.includes('count') || n.includes('shipped') || n.includes('handled')) {
      valueLabel = `${randFloat(rng, 120, 980, 0)}`;
    } else {
      valueLabel = `${randFloat(rng, 45, 92, 1)}`;
    }
    return {
      id: `${deptId}-kpi-${i}`,
      name,
      value: valueLabel,
      direction,
      delta: pct,
      sparkline: sparkline(rng, 14, 30, 90),
    };
  });
}

export default function KPIDashboardTab({ dept }) {
  const deptId = dept?.id || '';
  const roles = getRolesForDept(deptId);
  const kpis = useMemo(() => deriveKpis(deptId, roles), [deptId, roles]);
  const color = dept?.color || '#3b82f6';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        6-KPI executive view for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Values trend over the last 14 days.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {kpis.map((k) => {
          const upColor = '#059669';
          const downColor = '#dc2626';
          const arrow = k.direction === 'up' ? '▲' : '▼';
          const deltaColor = k.direction === 'up' ? upColor : downColor;
          return (
            <div key={k.id} style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 14,
              background: '#fff',
            }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: 0.2 }}>
                {k.name}
              </div>
              <div style={{
                display: 'flex', alignItems: 'baseline',
                justifyContent: 'space-between', marginTop: 6,
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: deltaColor }}>
                  {arrow} {k.delta}%
                </div>
              </div>
              <div style={{ height: 40, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={k.sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`g-${k.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={color}
                      strokeWidth={1.5}
                      fill={`url(#g-${k.id})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
