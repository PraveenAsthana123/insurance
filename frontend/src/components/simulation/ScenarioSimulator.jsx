import { useState } from 'react';
import '../../styles/forms.css';
import '../../styles/cards.css';

const DEFAULT_PARAMS = {
  priceChange: 0,
  promoDepth: 20,
  seasonFactor: 1.0,
  launchTiming: 6,
};

const BASELINE = {
  demand: 50000,
  revenue: 2500000,
  cost: 1800000,
};

function simulateDemand(params) {
  const priceEffect = 1 - params.priceChange / 100 * 1.5;
  const promoEffect = 1 + params.promoDepth / 100 * 0.4;
  const seasonEffect = params.seasonFactor;
  const timingEffect = params.launchTiming <= 3 ? 1.1 : params.launchTiming <= 6 ? 1.0 : 0.9;
  const demand = Math.round(BASELINE.demand * priceEffect * promoEffect * seasonEffect * timingEffect);
  const revenue = Math.round(demand * (50 + params.priceChange / 2));
  const cost = Math.round(demand * 36);
  const roi = cost > 0 ? (((revenue - cost) / cost) * 100).toFixed(1) : '0.0';
  const ciWidth = demand * 0.08;
  return {
    demand,
    revenue,
    cost,
    roi: parseFloat(roi),
    confidence_lower: Math.round(demand - ciWidth),
    confidence_upper: Math.round(demand + ciWidth),
  };
}

function SliderRow({ label, min, max, step, value, onChange, formatValue }) {
  return (
    <div className="form-group">
      <div className="form-range-wrapper">
        <div className="form-range-header">
          <span className="form-label">{label}</span>
          <span className="form-range-value">{formatValue ? formatValue(value) : value}</span>
        </div>
        <input
          className="form-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <div className="form-range-ticks">
          <span>{formatValue ? formatValue(min) : min}</span>
          <span>{formatValue ? formatValue(max) : max}</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, baselineValue, higherIsBetter = true }) {
  const diff = value - baselineValue;
  const pct = baselineValue !== 0 ? ((diff / baselineValue) * 100).toFixed(1) : '0.0';
  const isPositive = higherIsBetter ? diff >= 0 : diff <= 0;
  const diffColor = diff === 0 ? '#6b7280' : isPositive ? '#10b981' : '#ef4444';
  const sign = diff > 0 ? '+' : '';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.875rem',
      }}
    >
      <span style={{ color: '#6b7280' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
          {typeof value === 'number' && value > 10000
            ? value.toLocaleString()
            : typeof value === 'number'
            ? value.toFixed(value % 1 === 0 ? 0 : 1)
            : value}
        </span>
        {diff !== 0 && (
          <span style={{ fontSize: '0.75rem', color: diffColor, fontWeight: 500 }}>
            {sign}{pct}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function ScenarioSimulator() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  function setParam(key) {
    return (val) => setParams((p) => ({ ...p, [key]: val }));
  }

  function handleRun() {
    setRunning(true);
    setTimeout(() => {
      setResults(simulateDemand(params));
      setRunning(false);
    }, 600);
  }

  function handleReset() {
    setParams(DEFAULT_PARAMS);
    setResults(null);
  }

  const baselineResult = simulateDemand(DEFAULT_PARAMS);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Controls */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Scenario Parameters</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <SliderRow
            label="Price Change"
            min={-50}
            max={50}
            step={1}
            value={params.priceChange}
            onChange={setParam('priceChange')}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}%`}
          />
          <SliderRow
            label="Promo Depth"
            min={0}
            max={100}
            step={5}
            value={params.promoDepth}
            onChange={setParam('promoDepth')}
            formatValue={(v) => `${v}%`}
          />
          <SliderRow
            label="Season Factor"
            min={0.5}
            max={2.0}
            step={0.1}
            value={params.seasonFactor}
            onChange={setParam('seasonFactor')}
            formatValue={(v) => `${parseFloat(v).toFixed(1)}x`}
          />
          <SliderRow
            label="Launch Timing"
            min={1}
            max={12}
            step={1}
            value={params.launchTiming}
            onChange={setParam('launchTiming')}
            formatValue={(v) => `Month ${v}`}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleRun}
              disabled={running}
            >
              {running ? 'Running...' : 'Run Simulation'}
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Simulation Results</div>
          {results && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#10b981',
                background: 'rgba(16,185,129,0.08)',
                padding: '2px 10px',
                borderRadius: 12,
                fontWeight: 500,
              }}
            >
              Ready
            </span>
          )}
        </div>
        <div style={{ padding: '20px 24px' }}>
          {!results ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#9ca3af',
                fontSize: '0.875rem',
              }}
            >
              Set parameters and click &quot;Run Simulation&quot; to see results.
            </div>
          ) : (
            <>
              {/* Confidence Interval Banner */}
              <div
                style={{
                  background: 'rgba(59,130,246,0.06)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                  Predicted Demand
                </div>
                <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 700 }}>
                  {results.demand.toLocaleString()} units
                </div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>
                  95% CI: {results.confidence_lower.toLocaleString()} – {results.confidence_upper.toLocaleString()}
                </div>
              </div>

              <ResultRow
                label="Demand vs Baseline"
                value={results.demand}
                baselineValue={baselineResult.demand}
                higherIsBetter={true}
              />
              <ResultRow
                label="Revenue"
                value={results.revenue}
                baselineValue={baselineResult.revenue}
                higherIsBetter={true}
              />
              <ResultRow
                label="Cost"
                value={results.cost}
                baselineValue={baselineResult.cost}
                higherIsBetter={false}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ color: '#6b7280' }}>ROI</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: results.roi >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '1rem',
                  }}
                >
                  {results.roi}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
