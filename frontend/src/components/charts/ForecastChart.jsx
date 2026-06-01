import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import '../../styles/charts.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((entry) => {
        if (entry.name === 'confidence_band') return null;
        return (
          <div key={entry.name} className="tooltip-row">
            <span className="tooltip-key">
              <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
              {entry.name === 'actual' ? 'Actual' : entry.name === 'predicted' ? 'Predicted' : entry.name}
            </span>
            <span className="tooltip-value">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ForecastChart({ data = [], title = 'Demand Forecast', subtitle }) {
  const chartData = data.map((d) => ({
    ...d,
    confidence_band: [d.confidence_lower, d.confidence_upper],
  }));

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-body">
        <div className="chart-container lg">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => {
                  if (value === 'actual') return 'Actual';
                  if (value === 'predicted') return 'Predicted';
                  return value;
                }}
              />
              {/* Confidence band — rendered as an area between lower and upper */}
              <Area
                type="monotone"
                dataKey="confidence_upper"
                stroke="none"
                fill="#d1d5db"
                fillOpacity={0.4}
                name="Confidence Upper"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="confidence_lower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                name="Confidence Lower"
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="actual"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4 }}
                name="predicted"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Custom confidence legend */}
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ backgroundColor: '#3b82f6' }} />
            <span>Actual</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ backgroundColor: '#10b981', borderTop: '2px dashed #10b981', height: 0 }} />
            <span>Predicted</span>
          </div>
          <div className="legend-item">
            <span style={{ width: 16, height: 8, backgroundColor: '#d1d5db', borderRadius: 2, display: 'inline-block', opacity: 0.6 }} />
            <span>Confidence Band</span>
          </div>
        </div>
      </div>
    </div>
  );
}
