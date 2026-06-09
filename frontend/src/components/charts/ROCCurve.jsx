// ROCCurve · Iteration 2 P0 #4 · recharts line plot of ROC curve + AUC.

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts';

export default function ROCCurve({ points = [], auc = null, height = 240 }) {
  if (!Array.isArray(points) || points.length === 0) {
    return <em style={{ fontSize: 10, color: '#94a3b8' }}>no ROC data</em>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={points}
          margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 10 }}
            label={{ value: 'False Positive Rate', position: 'bottom', offset: 0, fontSize: 10 }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 10 }}
            label={{ value: 'TPR', angle: -90, position: 'insideLeft', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: 6 }}
            formatter={(v) => v?.toFixed?.(3) ?? v}
          />
          {/* Diagonal · random classifier */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="#94a3b8" strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="tpr"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {auc != null && (
        <div style={{
          textAlign: 'center', fontSize: 11, marginTop: 4,
          color: auc >= 0.85 ? '#16a34a' : auc >= 0.70 ? '#d97706' : '#dc2626',
          fontWeight: 700,
        }}>
          AUC = {auc.toFixed(3)}
        </div>
      )}
    </div>
  );
}
