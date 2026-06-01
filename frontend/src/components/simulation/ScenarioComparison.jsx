import '../../styles/cards.css';
import '../../styles/tables.css';

const METRICS = [
  { key: 'demand', label: 'Demand (units)', higherIsBetter: true, format: (v) => v.toLocaleString() },
  { key: 'revenue', label: 'Revenue ($)', higherIsBetter: true, format: (v) => `$${v.toLocaleString()}` },
  { key: 'cost', label: 'Cost ($)', higherIsBetter: false, format: (v) => `$${v.toLocaleString()}` },
  { key: 'roi', label: 'ROI (%)', higherIsBetter: true, format: (v) => `${v}%` },
];

function DiffBadge({ diff, higherIsBetter }) {
  if (diff === 0) return <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>;
  const isGood = higherIsBetter ? diff > 0 : diff < 0;
  const color = isGood ? '#10b981' : '#ef4444';
  const bg = isGood ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const sign = diff > 0 ? '+' : '';
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color,
        background: bg,
        padding: '2px 8px',
        borderRadius: 10,
      }}
    >
      {sign}{typeof diff === 'number' && Math.abs(diff) > 100 ? diff.toLocaleString() : diff}
    </span>
  );
}

export default function ScenarioComparison({ scenarioA, scenarioB, labelA = 'Scenario A', labelB = 'Scenario B' }) {
  const empty = {
    demand: 0,
    revenue: 0,
    cost: 0,
    roi: 0,
  };
  const a = scenarioA || empty;
  const b = scenarioB || empty;
  const hasData = scenarioA && scenarioB;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <div className="card-title">Scenario Comparison</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>{labelA}</th>
              <th>{labelB}</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const valA = a[metric.key] ?? 0;
              const valB = b[metric.key] ?? 0;
              const diff = hasData ? valB - valA : 0;
              return (
                <tr key={metric.key}>
                  <td style={{ fontWeight: 500, color: '#6b7280' }}>{metric.label}</td>
                  <td style={{ fontWeight: 600 }}>
                    {hasData ? metric.format(valA) : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {hasData ? metric.format(valB) : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    {hasData ? (
                      <DiffBadge diff={diff} higherIsBetter={metric.higherIsBetter} />
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!hasData && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
          Run simulations for both scenarios to compare results.
        </div>
      )}
    </div>
  );
}
