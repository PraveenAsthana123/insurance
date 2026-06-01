import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { seededRng, randInt } from '../../../utils/seed';

const CATEGORIES = [
  { key: 'Revenue',    sign: +1, planK: 120000 },
  { key: 'COGS',       sign: -1, planK: 68000  },
  { key: 'OpEx',       sign: -1, planK: 24000  },
  { key: 'R&D',        sign: -1, planK: 9000   },
  { key: 'Marketing',  sign: -1, planK: 7000   },
  { key: 'Sales',      sign: -1, planK: 5800   },
  { key: 'G&A',        sign: -1, planK: 4200   },
  { key: 'Other',      sign: -1, planK: 1600   },
];

function genBudget(deptId) {
  const rng = seededRng(`budget-${deptId}`);
  return CATEGORIES.map((c) => {
    // Actual = plan ± 15%.
    const variancePct = (randInt(rng, -15, 15) / 100);
    const actualK = Math.round(c.planK * (1 + variancePct));
    // Signed impact on operating income: revenue positive on upside, cost positive on downside.
    const diff = actualK - c.planK;
    // Operating income delta — revenue upside is favorable, cost upside is unfavorable.
    const incomeDelta = c.sign === +1 ? diff : -diff;
    return {
      ...c,
      actualK,
      varianceK: diff,
      incomeDelta,
      variancePct: Math.round(variancePct * 1000) / 10,
    };
  });
}

export default function BudgetVarianceTab({ dept }) {
  const deptId = dept?.id || 'finance';
  const rows = useMemo(() => genBudget(deptId), [deptId]);

  const totalIncomeDelta = rows.reduce((s, r) => s + r.incomeDelta, 0);
  const plannedIncome = CATEGORIES.reduce((s, c) => s + c.sign * c.planK, 0);
  const actualIncome = rows.reduce((s, r) => s + r.sign * r.actualK, 0);

  const chartData = rows.map((r) => ({
    name: r.key,
    delta: r.incomeDelta,
    fill: r.incomeDelta >= 0 ? '#059669' : '#dc2626',
  }));

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Budget vs actual variance for <strong style={{ color: '#0f172a' }}>{dept?.name || 'Finance'}</strong>.
        Green bars = favorable to operating income; red = unfavorable.
      </div>

      {/* Summary tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        <SummaryTile label="Planned operating income" value={`$${plannedIncome.toLocaleString()}k`} />
        <SummaryTile label="Actual operating income" value={`$${actualIncome.toLocaleString()}k`} />
        <SummaryTile
          label="Total variance"
          value={`${totalIncomeDelta >= 0 ? '+' : ''}$${totalIncomeDelta.toLocaleString()}k`}
          color={totalIncomeDelta >= 0 ? '#059669' : '#dc2626'}
        />
        <SummaryTile
          label="Status"
          value={totalIncomeDelta >= 0 ? 'FAVORABLE' : 'UNFAVORABLE'}
          color={totalIncomeDelta >= 0 ? '#059669' : '#dc2626'}
        />
      </div>

      {/* Waterfall-style variance bar chart */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, background: '#fff', marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
          Variance contribution by category (k$ to operating income)
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="k" />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip
                formatter={(v) => [`$${v.toLocaleString()}k`, 'variance']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="delta" isAnimationActive={false}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Variance table */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Category</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Plan (k$)</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Actual (k$)</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Variance (k$)</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Variance %</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Income Δ (k$)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const incomeColor = r.incomeDelta >= 0 ? '#059669' : '#dc2626';
              return (
                <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>
                    {r.key}
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#64748b' }}>
                      ({r.sign === +1 ? 'revenue' : 'cost'})
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>
                    {r.planK.toLocaleString()}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                    {r.actualK.toLocaleString()}
                  </td>
                  <td style={{
                    padding: 10, textAlign: 'right',
                    color: r.varianceK >= 0 ? '#2563eb' : '#6b7280',
                  }}>
                    {r.varianceK >= 0 ? '+' : ''}{r.varianceK.toLocaleString()}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>
                    {r.variancePct >= 0 ? '+' : ''}{r.variancePct}%
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: incomeColor, fontWeight: 700 }}>
                    {r.incomeDelta >= 0 ? '+' : ''}{r.incomeDelta.toLocaleString()}
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

function SummaryTile({ label, value, color = '#0f172a' }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 14, background: '#fff',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
