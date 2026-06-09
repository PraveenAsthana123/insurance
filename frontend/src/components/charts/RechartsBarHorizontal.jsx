// RechartsBarHorizontal · shared horizontal bar chart for feature importance.
// Iteration 2 P0 #2 · used by ShapPanel + ResponsibleAIPanel.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer,
} from 'recharts';

export default function RechartsBarHorizontal({
  data,            // [{name, value, direction?, color?}]
  height = 280,
  positiveColor = '#16a34a',
  negativeColor = '#dc2626',
  defaultColor = '#3b82f6',
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return <em style={{ fontSize: 10, color: '#94a3b8' }}>no data to chart</em>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          width={140}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: 6 }}
          formatter={(v) => v?.toFixed?.(3) ?? v}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.color
                ?? (d.direction === 'positive' ? positiveColor
                  : d.direction === 'negative' ? negativeColor
                  : defaultColor)
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
