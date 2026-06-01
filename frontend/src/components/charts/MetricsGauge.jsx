import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import '../../styles/charts.css';

export default function MetricsGauge({
  value = 0,
  label = 'Accuracy',
  maxValue = 100,
  color = '#10b981',
  subtitle,
}) {
  const pct = Math.min(Math.max(value / maxValue, 0), 1);
  const filled = pct;
  const empty = 1 - pct;

  const data = [
    { value: filled, fill: color },
    { value: empty, fill: '#e5e7eb' },
  ];

  const displayValue = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className="chart-card" style={{ minWidth: 180, flex: 1 }}>
      <div className="chart-card-header">
        <div>
          <div className="chart-title">{label}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px 20px' }}>
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: color, lineHeight: 1 }}>
              {displayValue}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
              / {maxValue}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 8, fontWeight: 500, textAlign: 'center' }}>
          {label}
        </div>
      </div>
    </div>
  );
}
