// RegulatoryMappingPanel · P1 #16 · EU AI Act + SOC2 + GDPR per process.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const STATUS_TONE = {
  compliant:      { bg: '#dcfce7', fg: '#166534', label: '✓ COMPLIANT' },
  partial:        { bg: '#fef3c7', fg: '#92400e', label: '◐ PARTIAL' },
  non_compliant:  { bg: '#fee2e2', fg: '#991b1b', label: '✗ NON-COMPLIANT' },
  not_applicable: { bg: '#f1f5f9', fg: '#475569', label: '— N/A' },
};

const FRAMEWORK_COLOR = {
  'EU AI Act': '#dc2626',
  'SOC2': '#3b82f6',
  'GDPR': '#10b981',
};

export default function RegulatoryMappingPanel({ accent = '#dc2626', processId = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState(null); // framework filter

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/v1/regulatory/${processId}`);
        if (!r.ok) throw new Error(`${r.status}`);
        if (!cancelled) setData(await r.json());
      } catch (e) { /* fallthrough */ }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [processId]);

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading regulatory mapping…</em></div>;
  if (!data) return null;

  const articles = (data.articles || []).filter((a) => !filter || a.category === filter);
  const byStatus = data.by_status || {};
  const byFw = data.by_framework_status || {};

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📜</span>
        <strong style={{ fontSize: 13, color: accent }}>P1 #16 · Regulatory mapping · {processId}</strong>
        <span style={{
          marginLeft: 'auto',
          background: data.compliance_pct >= 80 ? '#16a34a' : data.compliance_pct >= 50 ? '#d97706' : '#dc2626',
          color: '#fff', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>{data.compliance_pct}% compliant</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="COMPLIANT" value={byStatus.compliant || 0} accent="#16a34a" />
        <Tile label="PARTIAL" value={byStatus.partial || 0} accent="#d97706" />
        <Tile label="NON-COMPL" value={byStatus.non_compliant || 0} accent="#dc2626" />
        <Tile label="N/A" value={byStatus.not_applicable || 0} accent="#94a3b8" />
      </div>

      {/* Framework filter chips */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <FrameworkChip label="ALL" active={!filter} onClick={() => setFilter(null)} color="#475569" />
        {Object.entries(byFw).map(([fw, counts]) => (
          <FrameworkChip
            key={fw}
            label={`${fw} (${counts.compliant}/${counts.compliant + counts.partial + counts.non_compliant + counts.not_applicable})`}
            active={filter === fw}
            onClick={() => setFilter(filter === fw ? null : fw)}
            color={FRAMEWORK_COLOR[fw] || '#475569'}
          />
        ))}
      </div>

      <table style={{ width: '100%', fontSize: 11 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: 4 }}>Framework</th>
            <th style={{ padding: 4 }}>Article</th>
            <th style={{ padding: 4 }}>Title</th>
            <th style={{ padding: 4 }}>Status</th>
            <th style={{ padding: 4 }}>Last Review</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => {
            const tone = STATUS_TONE[a.status] || STATUS_TONE.not_applicable;
            return (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}>
                  <span style={{
                    background: `${FRAMEWORK_COLOR[a.category]}20`,
                    color: FRAMEWORK_COLOR[a.category],
                    padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                  }}>{a.category}</span>
                </td>
                <td style={{ padding: 4, fontFamily: 'monospace' }}>{a.article}</td>
                <td style={{ padding: 4 }}>{a.title}</td>
                <td style={{ padding: 4 }}>
                  <span style={{
                    background: tone.bg, color: tone.fg,
                    padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                  }}>{tone.label}</span>
                </td>
                <td style={{ padding: 4, color: '#64748b' }}>{a.last_review_days_ago}d ago</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/regulatory/{processId} · §84 ISO 42001 mapping · §38 governance audit
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{ padding: 6, background: '#fff', border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}

function FrameworkChip({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
      background: active ? color : '#fff',
      color: active ? '#fff' : color,
      border: `1px solid ${color}`, borderRadius: 4,
    }}>{label}</button>
  );
}
