import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend, ResponsiveContainer,
} from 'recharts';
import { listStores, getForecast } from '../../../services/salesApi';
import ExplainDrawer from '../../common/ExplainDrawer';

export default function ForecastTab() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(1);
  const [horizon, setHorizon] = useState(56);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listStores()
      .then((s) => { if (!cancelled) setStores(s); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const f = await getForecast(storeId, horizon);
      setForecast(f);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!forecast) return [];
    const act = forecast.actual.map((p) => ({ date: p.date, actual: p.value }));
    const fc  = forecast.forecast.map((p) => ({
      date: p.date,
      forecast: p.value,
      lower: p.lower,
      upper: p.upper,
    }));
    return [...act, ...fc];
  }, [forecast]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 20, flexWrap: 'wrap' }}>
        <label>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Store</div>
          <select
            value={storeId}
            onChange={(e) => setStoreId(parseInt(e.target.value, 10))}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          >
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                Store {s.store_id} — type {s.store_type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Horizon (days)</div>
          <input
            type="number" min={7} max={180} value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value, 10) || 56)}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width: 80 }}
          />
        </label>
        <button
          onClick={run} disabled={loading}
          style={{
            padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none',
            borderRadius: 6, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Running…' : 'Generate forecast'}
        </button>
        {forecast && (
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

      {forecast && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <Stat label="Backtest MAPE" value={`${(forecast.mape * 100).toFixed(1)}%`} />
            <Stat label="Fit time" value={`${forecast.fit_time_ms} ms`} />
            <Stat label="Predict time" value={`${forecast.predict_time_ms} ms`} />
            <Stat label="Forecast horizon" value={`${forecast.horizon_days} days`} />
          </div>
          <div style={{ width: '100%', height: 380, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area dataKey="upper" fill="#bfdbfe" stroke="none" />
                <Area dataKey="lower" fill="#ffffff" stroke="none" />
                <Line dataKey="actual" stroke="#0f172a" dot={false} strokeWidth={1.5} />
                <Line dataKey="forecast" stroke="#3b82f6" dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ExplainDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        context={forecast && { screen: 'ForecastTab', store_id: storeId, horizon_days: horizon, mape: forecast.mape }}
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
