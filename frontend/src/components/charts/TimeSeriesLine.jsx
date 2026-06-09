// TimeSeriesLine · P0 #8 · line chart for time-series drift.

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts';

export default function TimeSeriesLine({
  data,                // [{day, date_offset, score}]
  color = '#3b82f6',
  baseline = null,
  height = 160,
  yMin = 0,
  yMax = 1,
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return <em style={{ fontSize: 10, color: '#94a3b8' }}>no time-series data</em>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="day"
          type="number"
          domain={['auto', 'auto']}
          tick={{ fontSize: 9 }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 9 }}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: 6 }}
          formatter={(v) => `${(v * 100).toFixed(1)}%`}
          labelFormatter={(d) => `Day ${d}`}
        />
        {baseline != null && (
          <ReferenceLine y={baseline} stroke="#94a3b8" strokeDasharray="3 3"
            label={{ value: `baseline ${(baseline * 100).toFixed(0)}%`, fontSize: 9, fill: '#94a3b8' }} />
        )}
        <Line
          type="monotone"
          dataKey="score"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
