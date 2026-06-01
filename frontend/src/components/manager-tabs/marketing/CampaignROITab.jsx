import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { getUseCasesForDept } from '../../../data/aiUseCases';
import { seededRng, hashString, randInt, randFloat } from '../../../utils/seed';

const CAMPAIGN_CATEGORIES = new Set([
  'Campaign', 'Email Marketing', 'Digital Marketing', 'Generative Marketing',
  'SEO Content', 'Funnel Optimization',
]);

function deriveMetrics(useCase) {
  const rng = seededRng(`campaign-${useCase.id}`);
  // Use the hashed id so the baseline volume is deterministic.
  const base = 1000 + (hashString(useCase.id) % 40000);
  const impressions = base * randInt(rng, 8, 32);
  const ctrPct = randFloat(rng, 0.4, 6.2, 2);
  const clicks = Math.round((impressions * ctrPct) / 100);
  const convPct = randFloat(rng, 0.8, 7.5, 2);
  const conversions = Math.round((clicks * convPct) / 100);
  const spend = randInt(rng, 2000, 42000);
  const revenue = Math.round(conversions * randInt(rng, 35, 320));
  const roiPct = ((revenue - spend) / Math.max(spend, 1)) * 100;
  return {
    impressions, clicks, conversions,
    spend, revenue,
    roi: Math.round(roiPct),
  };
}

export default function CampaignROITab({ dept }) {
  const rows = useMemo(() => {
    const raw = getUseCasesForDept(dept?.id || 'marketing')
      .filter((u) => CAMPAIGN_CATEGORIES.has(u.category));
    return raw.map((u) => ({ ...u, metrics: deriveMetrics(u) }));
  }, [dept]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        No active marketing campaigns catalogued.
      </div>
    );
  }

  const totalSpend = rows.reduce((s, r) => s + r.metrics.spend, 0);
  const totalRev = rows.reduce((s, r) => s + r.metrics.revenue, 0);
  const portfolioRoi = Math.round(((totalRev - totalSpend) / Math.max(totalSpend, 1)) * 100);

  const chartData = rows.map((r) => ({
    name: r.name.length > 24 ? `${r.name.slice(0, 22)}…` : r.name,
    roi: r.metrics.roi,
    fill: r.metrics.roi >= 0 ? '#059669' : '#dc2626',
  }));

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Portfolio of {rows.length} active/pilot campaigns for
        {' '}<strong style={{ color: '#0f172a' }}>{dept?.name || 'Marketing'}</strong>.
        Metrics deterministic per campaign id.
      </div>

      {/* Summary tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        <SummaryTile label="Total spend" value={`$${(totalSpend / 1000).toFixed(1)}k`} />
        <SummaryTile label="Total revenue" value={`$${(totalRev / 1000).toFixed(1)}k`} />
        <SummaryTile
          label="Portfolio ROI"
          value={`${portfolioRoi}%`}
          color={portfolioRoi >= 0 ? '#059669' : '#dc2626'}
        />
        <SummaryTile
          label="Avg conversion"
          value={`${(rows.reduce((s, r) => s + (r.metrics.clicks > 0 ? (r.metrics.conversions / r.metrics.clicks) : 0), 0) / rows.length * 100).toFixed(2)}%`}
        />
      </div>

      {/* ROI bar chart */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, background: '#fff', marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
          ROI % per campaign
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'ROI']} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="roi" isAnimationActive={false}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Campaign</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Category</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Impressions</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Clicks</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Conversions</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Spend</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Revenue</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>ROI %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>{r.category}</td>
                <td style={{ padding: 10, textAlign: 'right', color: '#0f172a' }}>
                  {r.metrics.impressions.toLocaleString()}
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#0f172a' }}>
                  {r.metrics.clicks.toLocaleString()}
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#0f172a' }}>
                  {r.metrics.conversions.toLocaleString()}
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>
                  ${r.metrics.spend.toLocaleString()}
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                  ${r.metrics.revenue.toLocaleString()}
                </td>
                <td style={{
                  padding: 10, textAlign: 'right', fontWeight: 700,
                  color: r.metrics.roi >= 0 ? '#059669' : '#dc2626',
                }}>
                  {r.metrics.roi}%
                </td>
              </tr>
            ))}
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
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
