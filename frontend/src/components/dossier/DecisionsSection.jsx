// DecisionsSection.jsx — synthetic last-5 simulation results for the dept.
// Deterministic via hashString(\`\${dept.id}-decision-\${i}\`). Will be wired
// to real sim-run logs in Phase 3b.

import SectionCard, { EmptySection } from './SectionCard';
import { hashString, mulberry32 } from '../../utils/seed';

function genDecisions(deptId, n = 5) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i += 1) {
    const seed = hashString(`${deptId}-decision-${i}`);
    const rng = mulberry32(seed);
    const storeIdx = Math.floor(rng() * 1115) + 1; // Rossmann 1..1115
    const discount = Math.round(rng() * 40); // 0..40 %
    const duration = 7 + Math.floor(rng() * 21); // 7..28 days
    const baseline = 12 + rng() * 45; // €12–57 k baseline
    const uplift = discount * (0.6 + rng() * 1.8); // €k
    const cost = discount * (0.3 + rng() * 0.9);
    const net = +(uplift - cost).toFixed(1);
    const ago = Math.floor(rng() * 72); // hours
    out.push({
      id: `sim-${deptId}-${i}`,
      ts: new Date(now - ago * 3600_000).toISOString(),
      store: `Store ${storeIdx}`,
      discount,
      duration,
      baseline: +baseline.toFixed(1),
      net,
      status: net > 0 ? 'approved' : 'rejected',
    });
  }
  return out;
}

export default function DecisionsSection({ dept }) {
  const rows = genDecisions(dept.id, 5);

  if (rows.length === 0) {
    return (
      <SectionCard id="decisions" icon="🎯" title="Recent decisions">
        <EmptySection />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="decisions"
      icon="🎯"
      title="Recent decisions (simulation runs)"
      subtitle="last 5 · synthetic — deterministic seed"
      footer="Wired to real sim-run logs in Phase 3b. Until then, values are stable via hashString."
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>When</th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Store</th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                Discount
              </th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Dur.</th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                Baseline
              </th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                Net impact
              </th>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px', color: '#64748b' }}>
                  {new Date(r.ts).toLocaleString()}
                </td>
                <td style={{ padding: '6px 10px', fontWeight: 500 }}>{r.store}</td>
                <td style={{ padding: '6px 10px' }}>{r.discount}%</td>
                <td style={{ padding: '6px 10px' }}>{r.duration}d</td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>€{r.baseline}k</td>
                <td
                  style={{
                    padding: '6px 10px',
                    color: r.net > 0 ? '#059669' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {r.net > 0 ? '+' : ''}
                  €{r.net}k
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: r.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                      color: r.status === 'approved' ? '#047857' : '#b91c1c',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
