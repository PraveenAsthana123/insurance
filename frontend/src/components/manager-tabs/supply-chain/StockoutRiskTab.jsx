import { useEffect, useState } from 'react';
import { listSkus, getStockoutRisk } from '../../../services/supplyChainApi';
import ExplainDrawer from '../../common/ExplainDrawer';

const BAND_STYLES = {
  high:   { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  medium: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  low:    { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
};

export default function StockoutRiskTab() {
  const [skus, setSkus] = useState([]);
  const [skuId, setSkuId] = useState('SKU0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [risk, setRisk] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSkus()
      .then((s) => { if (!cancelled) setSkus(s); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getStockoutRisk({ skuId });
      setRisk(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bandStyle = risk ? (BAND_STYLES[risk.risk_band] || BAND_STYLES.medium) : null;

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Stockout Risk Assessment</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Heuristic risk scoring from current stock levels, lead-time, and recent demand.
        Backend: POST <code>/api/v1/supply-chain/stockout-risk</code>.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 20, flexWrap: 'wrap' }}>
        <label>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>SKU</div>
          <select
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, minWidth: 200 }}
          >
            {skus.map((s) => (
              <option key={s.sku_id} value={s.sku_id}>
                {s.sku_id}{s.product_type ? ` — ${s.product_type}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={run} disabled={loading}
          style={{
            padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: 6, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Assessing…' : 'Assess risk'}
        </button>
        {risk && (
          <button
            onClick={() => setExplainOpen(true)}
            style={{
              padding: '8px 16px', background: '#fff', color: '#3b82f6',
              border: '1px solid #3b82f6', borderRadius: 6, cursor: 'pointer',
            }}
          >🤖 Ask AI why</button>
        )}
      </div>

      {error && (
        <div style={{
          padding: 12, background: '#fef2f2', color: '#991b1b',
          border: '1px solid #fecaca', borderRadius: 6, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {risk && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{
              padding: '14px 18px',
              background: bandStyle.bg,
              color: bandStyle.color,
              border: `1px solid ${bandStyle.border}`,
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.8 }}>Risk band</span>
              <span>{risk.risk_band.toUpperCase()}</span>
            </div>
            <Stat label="Risk score" value={risk.risk_score.toFixed(2)} />
            <Stat label="Days to stockout" value={`${risk.days_to_stockout} days`} />
            <Stat label="SKU" value={risk.sku_id} />
          </div>
          <div style={{
            padding: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            color: '#334155',
            lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Reason</div>
            {risk.reason}
          </div>
        </div>
      )}

      <ExplainDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        context={risk && {
          screen: 'StockoutRiskTab',
          sku_id: risk.sku_id,
          risk_score: risk.risk_score,
          risk_band: risk.risk_band,
        }}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 6, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
