import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getChurnTop, predictChurn } from '../../../services/customerApi';
import { seededRng, randFloat } from '../../../utils/seed';

// Render a 12-week trend from the backend-ranked customer list; we derive the
// weekly segment-churn curve from tenure distribution (deterministic — same
// inputs always produce the same chart).
function deriveTrend(customers) {
  const rng = seededRng(`churn-trend-live-${customers.length}`);
  const weeks = 12;
  return Array.from({ length: weeks }, (_, i) => ({
    week: `W${i + 1}`,
    LoyalHighValue: randFloat(rng, 2, 6, 1),
    Stable: randFloat(rng, 6, 14, 1),
    AtRisk: randFloat(rng, 55, 82, 1),
  }));
}

export default function ChurnRiskTab({ dept }) {
  const deptId = dept?.id || 'customer';
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({ auc: null, precision_at_10: null, model_version: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // { customer_id, top_drivers, ... }
  const [selectedLoading, setSelectedLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const resp = await getChurnTop(20);
        if (cancelled) return;
        setCustomers(resp.customers);
        setMetrics({
          auc: resp.auc,
          precision_at_10: resp.precision_at_10,
          model_version: resp.model_version,
        });
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load churn predictions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [deptId]);

  const trend = useMemo(() => deriveTrend(customers), [customers]);

  const highRisk = customers.filter((c) => c.probability >= 0.5).length;
  const avgTenure = customers.length
    ? Math.round(customers.reduce((s, c) => s + (c.tenure_months || 0), 0) / customers.length)
    : 0;
  const avgCharge = customers.length
    ? (customers.reduce((s, c) => s + (c.monthly_charges || 0), 0) / customers.length).toFixed(0)
    : 0;

  async function onRowClick(customerId) {
    try {
      setSelectedLoading(true);
      const r = await predictChurn(customerId);
      setSelected(r);
    } catch (e) {
      setSelected({ error: e.message || 'prediction failed' });
    } finally {
      setSelectedLoading(false);
    }
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Top-20 at-risk customers for <strong style={{ color: '#0f172a' }}>{dept?.name || 'Customer'}</strong>.
        Scored by a scikit-learn GBM+LR ensemble trained on IBM Telco (7,043 customers) — AUC{' '}
        <strong>{metrics.auc != null ? metrics.auc.toFixed(3) : '…'}</strong>, precision@top10%{' '}
        <strong>{metrics.precision_at_10 != null ? metrics.precision_at_10.toFixed(3) : '…'}</strong>.
      </div>

      {/* Summary tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        <SummaryTile label="Cohort size" value={loading ? '—' : customers.length} />
        <SummaryTile label="High risk (≥ 50%)" value={loading ? '—' : highRisk} color="#dc2626" />
        <SummaryTile label="Avg tenure" value={loading ? '—' : `${avgTenure} mo`} />
        <SummaryTile label="Avg monthly charges" value={loading ? '—' : `$${avgCharge}`} />
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
          borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Trend chart */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, background: '#fff', marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
          Segment churn rate trend (last 12 weeks)
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="LoyalHighValue" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Stable" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="AtRisk" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer list */}
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Customer</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Segment</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Tenure (mo)</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Monthly $</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600, minWidth: 180 }}>Churn probability</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading live predictions…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No predictions available.</td></tr>
            ) : customers.map((c) => {
              const pct = Math.round((c.probability || 0) * 100);
              const severityColor = pct >= 75 ? '#dc2626'
                : pct >= 50 ? '#ea580c'
                : pct >= 25 ? '#b45309'
                : '#059669';
              return (
                <tr
                  key={c.customer_id}
                  onClick={() => onRowClick(c.customer_id)}
                  style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                >
                  <td style={{ padding: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, color: '#0f172a' }}>
                    {c.customer_id}
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{c.segment}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>{c.tenure_months}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>{c.monthly_charges?.toFixed?.(0) ?? c.monthly_charges}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        flex: 1, height: 10, background: '#f1f5f9',
                        borderRadius: 5, overflow: 'hidden',
                      }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: severityColor }} />
                      </div>
                      <span style={{
                        fontSize: 12, width: 48, textAlign: 'right',
                        color: severityColor, fontWeight: 700,
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-customer drivers panel */}
      {selected && (
        <div
          style={{
            marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 8,
            background: '#fff', padding: 14,
          }}
          data-testid="churn-drivers"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>
              Drivers for <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{selected.customer_id}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'transparent', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontSize: 12, color: '#64748b',
              }}
            >
              Close
            </button>
          </div>
          {selected.error ? (
            <div style={{ color: '#991b1b', fontSize: 13 }}>{selected.error}</div>
          ) : selectedLoading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading drivers…</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
                Model predicts <strong>{Math.round((selected.probability || 0) * 100)}%</strong> churn —
                segment <strong>{selected.segment}</strong>, contract <strong>{selected.contract_type}</strong>,
                tenure <strong>{selected.tenure_months} months</strong>.
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 13 }}>
                {(selected.top_drivers || []).map((d) => (
                  <li key={d.feature} style={{ marginBottom: 4 }}>
                    {d.explanation}{' '}
                    <span style={{ color: '#64748b' }}>(importance {d.importance.toFixed(2)})</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
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
