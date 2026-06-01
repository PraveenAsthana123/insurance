import { useEffect, useState } from 'react';
import { listSuppliers, simulate } from '../../../services/supplyChainApi';
import ExplainDrawer from '../../common/ExplainDrawer';
import { useRole } from '../../../hooks/useRole';

export default function NetworkSimTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [delayDays, setDelayDays] = useState(7);
  const [affectedSkuCount, setAffectedSkuCount] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [role] = useRole();
  const canSimulate = role === 'manager';

  useEffect(() => {
    let cancelled = false;
    listSuppliers()
      .then((s) => {
        if (cancelled) return;
        setSuppliers(s);
        if (s.length > 0) setSupplierId(s[0].supplier_id);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await simulate({ supplierId, delayDays, affectedSkuCount });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Supplier Delay / Network Simulator</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Pick a supplier and set a delay scenario. Backend computes the resulting
        stockout probability change, service level delta, and revenue at risk.
        POST <code>/api/v1/supply-chain/simulate</code>.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 20, maxWidth: 720,
      }}>
        <label>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Supplier</div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6,
              width: '100%', boxSizing: 'border-box',
            }}
          >
            {suppliers.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.supplier_name || s.supplier_id}
                {s.location ? ` — ${s.location}` : ''}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Delay (days)"
          value={delayDays}
          onChange={setDelayDays}
          min={0} max={30}
        />
        <Field
          label="Affected SKU count"
          value={affectedSkuCount}
          onChange={setAffectedSkuCount}
          min={1} max={100}
        />
      </div>

      {!canSimulate && (
        <div
          style={{
            padding: 8, marginBottom: 8,
            background: '#fef3c7', color: '#92400e',
            border: '1px solid #fde68a', borderRadius: 4, fontSize: 12,
            maxWidth: 640,
          }}
        >
          Current role: <strong>{role}</strong>. Switch to Manager in the top-bar
          role selector to run simulations.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={run}
          disabled={loading || !canSimulate || !supplierId}
          title={canSimulate ? 'Run simulation' : 'Manager role required'}
          style={{
            padding: '10px 20px',
            background: (loading || !canSimulate || !supplierId) ? '#cbd5e1' : '#3b82f6',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: (loading || !canSimulate || !supplierId) ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {!canSimulate
            ? '🔒 Manager role required'
            : (loading ? 'Running…' : '▶ Run scenario')}
        </button>
        {result && (
          <button
            onClick={() => setExplainOpen(true)}
            style={{
              padding: '10px 20px', background: '#fff', color: '#3b82f6',
              border: '1px solid #3b82f6', borderRadius: 6, cursor: 'pointer',
              fontWeight: 600,
            }}
          >🤖 Ask AI why</button>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: 12,
          background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
          borderRadius: 6,
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Stat
              label="Service level delta"
              value={`${result.service_level_delta_pct >= 0 ? '+' : ''}${result.service_level_delta_pct.toFixed(2)}%`}
              color={result.service_level_delta_pct >= 0 ? '#059669' : '#dc2626'}
            />
            <Stat
              label="Revenue at risk"
              value={`$${Math.round(result.revenue_at_risk).toLocaleString()}`}
              color="#dc2626"
            />
            <Stat
              label="Stockout prob. Δ"
              value={`${result.stockout_probability_change >= 0 ? '+' : ''}${result.stockout_probability_change.toFixed(3)}`}
              color={result.stockout_probability_change > 0 ? '#dc2626' : '#059669'}
            />
            <Stat label="Supplier" value={result.supplier_id} />
            <Stat label="Delay" value={`${result.delay_days} days`} />
            <Stat label="Affected SKUs" value={result.affected_sku_count} />
          </div>
        </div>
      )}

      <ExplainDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        context={result && {
          screen: 'NetworkSimTab',
          supplier_id: result.supplier_id,
          delay_days: result.delay_days,
          affected_sku_count: result.affected_sku_count,
          revenue_at_risk: result.revenue_at_risk,
        }}
      />
    </div>
  );
}

function Field({ label, value, onChange, min, max, suffix }) {
  return (
    <label>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          min={min} max={max}
          style={{
            padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6,
            width: '100%', boxSizing: 'border-box',
          }}
        />
        {suffix && <span style={{ color: '#64748b' }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 6, minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}
