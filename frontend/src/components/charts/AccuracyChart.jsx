import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import '../../styles/charts.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="tooltip-row">
          <span className="tooltip-key">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="tooltip-value">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

function getBarColor(value, allValues, isLowerBetter = true) {
  const sorted = [...allValues].sort((a, b) => (isLowerBetter ? a - b : b - a));
  const rank = sorted.indexOf(value);
  if (rank === 0) return '#10b981'; // best — green
  if (rank === sorted.length - 1) return '#ef4444'; // worst — red
  return '#3b82f6'; // middle — blue
}

export default function AccuracyChart({ models = [], title = 'Model Accuracy Comparison', subtitle, metric = 'mape' }) {
  const metricLabel = {
    mape: 'MAPE (%)',
    rmse: 'RMSE',
    accuracy: 'Accuracy (%)',
    wape: 'WAPE (%)',
  }[metric] || metric.toUpperCase();

  const isLowerBetter = metric !== 'accuracy';
  const values = models.map((m) => m[metric] ?? 0);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-body">
        <div className="chart-container md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={models} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={metric} name={metricLabel} radius={[4, 4, 0, 0]}>
                {models.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry[metric] ?? 0, values, isLowerBetter)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
            <span>Best</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }} />
            <span>Mid</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
            <span>Worst</span>
          </div>
        </div>
      </div>
    </div>
  );
}
