import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, ResponsiveContainer,
} from 'recharts';
import { simulate } from '../../../services/salesApi';
import { useRole } from '../../../hooks/useRole';

export default function SimulationTab() {
  const [storeId, setStoreId] = useState(1);
  const [discount, setDiscount] = useState(15);
  const [duration, setDuration] = useState(7);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [role] = useRole();
  const canSimulate = role === 'manager';

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await simulate({ storeId, discountPct: discount, durationDays: duration });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Promotion Simulator</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Configure a price × promotion scenario. Backend applies constant elasticity
        (-2.0) + 30% baseline margin to Phase β&apos;s Prophet forecast.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 20, maxWidth: 640,
      }}>
        <Field label="Store ID" value={storeId} onChange={setStoreId} min={1} max={1115} />
        <Field label="Discount %" value={discount} onChange={setDiscount} min={0} max={50} suffix="%" />
        <Field label="Duration (days)" value={duration} onChange={setDuration} min={1} max={30} />
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

      <button
        onClick={run}
        disabled={loading || !canSimulate}
        title={canSimulate ? 'Run simulation' : 'Manager role required'}
        style={{
          padding: '10px 20px',
          background: (loading || !canSimulate) ? '#cbd5e1' : '#3b82f6',
          color: '#fff', border: 'none', borderRadius: 6,
          cursor: (loading || !canSimulate) ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {!canSimulate
          ? '🔒 Manager role required'
          : (loading ? 'Running…' : '▶ Run scenario')}
      </button>

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
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <Stat label="Baseline revenue"  value={`$${Math.round(result.baseline_revenue).toLocaleString()}`} />
            <Stat label="Promo revenue"     value={`$${Math.round(result.promo_revenue).toLocaleString()}`} />
            <Stat label="Uplift units ($)"  value={`$${Math.round(result.uplift_units).toLocaleString()}`} />
            <Stat label="Margin hit"        value={`$${Math.round(result.margin_hit).toLocaleString()}`} />
            <Stat
              label="Net margin impact"
              value={`$${Math.round(result.net_impact).toLocaleString()}`}
              color={result.net_impact >= 0 ? '#059669' : '#dc2626'}
            />
          </div>

          <div style={{ height: 300, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.waterfall}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Bar dataKey="cumulative" fill="#3b82f6">
                  {result.waterfall.map((step, i) => (
                    <Cell key={i} fill={step.delta >= 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Elasticity: {result.elasticity_used} · Margin factor: {result.margin_factor_used}
          </p>
        </div>
      )}
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
      borderRadius: 6, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}
