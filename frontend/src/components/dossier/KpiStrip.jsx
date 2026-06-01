// KpiStrip.jsx — 6 headline KPI tiles. For Sales we also try to pull a
// live "active stores" count from /api/v1/sales/stores (non-blocking);
// for other depts we degrade to fully synthetic-but-stable values.

import { useEffect, useState } from 'react';
import { hashString, mulberry32 } from '../../utils/seed';
import { listStores } from '../../services/salesApi';
import SectionCard from './SectionCard';

function seededRng(key) {
  return mulberry32(hashString(key));
}

function synthMetric(dept, key, lo, hi, decimals = 0) {
  const rng = seededRng(`${dept.id}-kpi-${key}`);
  const v = rng() * (hi - lo) + lo;
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
}

export default function KpiStrip({ dept }) {
  const [liveStoreCount, setLiveStoreCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (dept.id !== 'sales') return undefined;
    listStores()
      .then((resp) => {
        if (cancelled) return;
        const count = Array.isArray(resp?.stores) ? resp.stores.length : null;
        if (count != null) setLiveStoreCount(count);
      })
      .catch(() => {
        // Non-fatal — stays synthetic.
      });
    return () => {
      cancelled = true;
    };
  }, [dept.id]);

  const revenue = synthMetric(dept, 'revenue', 180, 540); // $M
  const mape = synthMetric(dept, 'mape', 4.5, 9.5, 1); // %
  const skus = liveStoreCount != null ? liveStoreCount : synthMetric(dept, 'skus', 400, 1200);
  const accuracy = (100 - mape).toFixed(1); // %
  const simRuns = synthMetric(dept, 'simruns', 40, 380);
  const rbacDenials = synthMetric(dept, 'rbac', 2, 24);

  const tiles = [
    { label: 'Revenue tracked ($M/mo)', value: `$${revenue}M`, accent: '#10b981' },
    { label: 'Forecast MAPE', value: `${mape}%`, accent: '#3b82f6' },
    {
      label: dept.id === 'sales' ? 'Active stores (live)' : 'Active SKUs',
      value: `${skus}`,
      accent: '#8b5cf6',
      live: dept.id === 'sales' && liveStoreCount != null,
    },
    { label: 'Forecast accuracy', value: `${accuracy}%`, accent: '#f59e0b' },
    { label: 'Simulation runs / wk', value: `${simRuns}`, accent: '#ec4899' },
    { label: 'RBAC denials / wk', value: `${rbacDenials}`, accent: '#ef4444' },
  ];

  return (
    <SectionCard
      id="kpis"
      icon="📊"
      title="Headline KPIs"
      subtitle={`6 tiles · ${liveStoreCount != null ? 'live + synthetic' : 'synthetic (stable)'}`}
      footer="Synthetic values are deterministic via hashString — they stay stable across renders and screenshots."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: '#fff',
              borderTop: `3px solid ${t.accent}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                color: '#64748b',
                letterSpacing: '0.05em',
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {t.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{t.value}</div>
            {t.live && (
              <div
                style={{
                  fontSize: 10,
                  color: '#10b981',
                  marginTop: 2,
                  fontWeight: 600,
                }}
              >
                ● live
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
