// MonitoringSection.jsx — 4 synthetic health tiles: API uptime, p95
// latency, model drift %, SLA compliance. Deterministic per dept.

import SectionCard from './SectionCard';
import { hashString, mulberry32 } from '../../utils/seed';

function tileColor(metric, value) {
  // Green/amber/red thresholds per metric
  if (metric === 'uptime') {
    if (value >= 99.5) return { fg: '#059669', bg: 'rgba(16,185,129,0.1)' };
    if (value >= 98) return { fg: '#b45309', bg: 'rgba(245,158,11,0.12)' };
    return { fg: '#b91c1c', bg: 'rgba(239,68,68,0.1)' };
  }
  if (metric === 'latency') {
    if (value <= 200) return { fg: '#059669', bg: 'rgba(16,185,129,0.1)' };
    if (value <= 400) return { fg: '#b45309', bg: 'rgba(245,158,11,0.12)' };
    return { fg: '#b91c1c', bg: 'rgba(239,68,68,0.1)' };
  }
  if (metric === 'drift') {
    if (value <= 3) return { fg: '#059669', bg: 'rgba(16,185,129,0.1)' };
    if (value <= 6) return { fg: '#b45309', bg: 'rgba(245,158,11,0.12)' };
    return { fg: '#b91c1c', bg: 'rgba(239,68,68,0.1)' };
  }
  if (metric === 'sla') {
    if (value >= 97) return { fg: '#059669', bg: 'rgba(16,185,129,0.1)' };
    if (value >= 92) return { fg: '#b45309', bg: 'rgba(245,158,11,0.12)' };
    return { fg: '#b91c1c', bg: 'rgba(239,68,68,0.1)' };
  }
  return { fg: '#475569', bg: 'rgba(148,163,184,0.15)' };
}

export default function MonitoringSection({ dept }) {
  const rng = mulberry32(hashString(`${dept.id}-monitor`));
  const uptime = +(98.2 + rng() * 1.7).toFixed(2); // 98.20 – 99.90
  const latency = Math.round(120 + rng() * 380); // 120 – 500
  const drift = +(0.8 + rng() * 6.5).toFixed(1); // 0.8 – 7.3
  const sla = +(91 + rng() * 8).toFixed(1); // 91.0 – 99.0

  const tiles = [
    { key: 'uptime', label: 'API uptime (30d)', value: `${uptime}%`, raw: uptime, suffix: '' },
    { key: 'latency', label: 'p95 latency', value: `${latency} ms`, raw: latency, suffix: 'ms' },
    { key: 'drift', label: 'Model drift (PSI)', value: `${drift}%`, raw: drift, suffix: '%' },
    { key: 'sla', label: 'SLA compliance', value: `${sla}%`, raw: sla, suffix: '%' },
  ];

  return (
    <SectionCard
      id="monitoring"
      icon="📡"
      title="Monitoring snapshot"
      subtitle="4 health indicators · synthetic"
      footer="Thresholds per-metric: uptime >99.5 green · p95 <200ms green · drift <3 green · SLA >97 green. Real data flows through Phase 3b observability stack."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
        }}
      >
        {tiles.map((t) => {
          const c = tileColor(t.key, t.raw);
          return (
            <div
              key={t.key}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: c.bg,
                border: `1px solid ${c.fg}20`,
                color: c.fg,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  marginBottom: 6,
                  opacity: 0.85,
                }}
              >
                {t.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{t.value}</div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
