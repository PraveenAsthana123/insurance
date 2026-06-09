// ManualPipelinePanel · §93 Manual mode · NO pipeline · discrete user steps.
// 4 components × 4 sub-sections (Input · Process · Output · Visualization).
// Wired to /api/v1/pipeline/manual/* (backend shipped in d19e450e).

import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const COMPONENTS = [
  { id: 'data',      label: 'Data',      icon: '📦', color: '#0ea5e9' },
  { id: 'model',     label: 'Model',     icon: '🧠', color: '#8b5cf6' },
  { id: 'accuracy',  label: 'Accuracy',  icon: '🎯', color: '#f59e0b' },
  { id: 'reporting', label: 'Reporting', icon: '📊', color: '#10b981' },
];

const SUB_SECTIONS = ['Input', 'Process', 'Output', 'Visualization'];

const MODEL_OPTIONS = ['XGBoost', 'LightGBM', 'RandomForest', 'LogisticRegression', 'LSTM', 'Prophet'];

export default function ManualPipelinePanel({ accent = '#0ea5e9', processId = 'demo-process' }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [activeComponent, setActiveComponent] = useState('data');
  const [activeSub, setActiveSub] = useState('Input');

  // Form controls
  const [selectedModels, setSelectedModels] = useState(['XGBoost']);
  const [splitTrain, setSplitTrain] = useState(0.7);
  const [splitVal, setSplitVal] = useState(0.15);
  const [splitTest, setSplitTest] = useState(0.15);
  const [sigmoidTemp, setSigmoidTemp] = useState(1.0);
  const [learningRate, setLearningRate] = useState(0.05);

  const call = async (path, body) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${r.status}: ${txt}`);
      }
      const data = await r.json();
      setState(data.state || data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = () => call('/api/v1/pipeline/manual/start', {process_id: processId, dataset_name: 'demo'});
  const loadData = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/load-data`, {n_rows: 1000, n_features: 10});
  const splitData = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/split-data`, {train: splitTrain, val: splitVal, test: splitTest, random_state: 42});
  const selectModel = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/select-model`, {models: selectedModels});
  const setHyperparams = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/set-hyperparams`, {hyperparameters: {learning_rate: learningRate, n_estimators: 100}, sigmoid_temperature: sigmoidTemp});
  const train = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/train`, null);
  const inspectErrors = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/inspect-errors`, null);
  const visualize = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/visualize`, null);
  const generateReport = () => state && call(`/api/v1/pipeline/manual/${state.session_id}/generate-report`, null);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  const activeComp = COMPONENTS.find((c) => c.id === activeComponent);
  const compData = state?.components?.[activeComponent];
  const subData = compData?.[activeSub];

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🛠</span>
        <strong style={{ fontSize: 13, color: accent }}>§93 · Manual Process (NO pipeline · operator-driven)</strong>
        <span style={{
          marginLeft: 'auto', background: '#0ea5e9', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>4 COMPONENTS × 4 SUB-SECTIONS</span>
      </div>

      {!state ? (
        <button onClick={start} disabled={busy} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
          background: busy ? '#94a3b8' : accent, color: '#fff', border: 'none', borderRadius: 4,
        }}>
          {busy ? '⏳ starting…' : '▶ Start manual session'}
        </button>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Session: <code>{state.session_id}</code> · process: <code>{processId}</code>
          </div>

          {/* Component tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {COMPONENTS.map((c) => (
              <button key={c.id} onClick={() => setActiveComponent(c.id)} style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: activeComponent === c.id ? c.color : '#fff',
                color: activeComponent === c.id ? '#fff' : '#475569',
                border: `1px solid ${c.color}`, borderRadius: 4,
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Sub-section tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {SUB_SECTIONS.map((s) => (
              <button key={s} onClick={() => setActiveSub(s)} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                background: activeSub === s ? '#475569' : '#f8fafc',
                color: activeSub === s ? '#fff' : '#475569',
                border: '1px solid #cbd5e1', borderRadius: 3,
              }}>
                {s}
              </button>
            ))}
          </div>

          {/* Active cell content */}
          <div style={{ padding: 10, background: '#f9fafb', borderRadius: 4, marginBottom: 10, minHeight: 60 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              <strong>{activeComp?.icon} {activeComp?.label} · {activeSub}</strong>
              {subData && <span style={{
                marginLeft: 8, fontSize: 9, padding: '1px 6px', borderRadius: 3,
                background: subData.status === 'complete' ? '#dcfce7' : '#fef3c7',
                color: subData.status === 'complete' ? '#166534' : '#92400e',
              }}>{subData.status}</span>}
            </div>
            <pre style={{ fontSize: 10, color: '#475569', margin: 0, overflow: 'auto', maxHeight: 200 }}>
              {subData?.content ? JSON.stringify(subData.content, null, 2) : '(pending · advance a step to populate)'}
            </pre>
          </div>

          {/* Per-component controls */}
          {activeComponent === 'data' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={loadData} disabled={busy} style={btnStyle('#0ea5e9')}>📦 Load data</button>
              <label style={lblStyle}>Train: <input type="number" min="0" max="1" step="0.05" value={splitTrain} onChange={(e) => setSplitTrain(parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={lblStyle}>Val: <input type="number" min="0" max="1" step="0.05" value={splitVal} onChange={(e) => setSplitVal(parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={lblStyle}>Test: <input type="number" min="0" max="1" step="0.05" value={splitTest} onChange={(e) => setSplitTest(parseFloat(e.target.value))} style={inputStyle} /></label>
              <button onClick={splitData} disabled={busy} style={btnStyle('#0ea5e9')}>✂ Split</button>
            </div>
          )}

          {activeComponent === 'model' && (
            <div>
              <div style={{ fontSize: 11, marginBottom: 4 }}>Select 1 or multiple models:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {MODEL_OPTIONS.map((m) => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <input type="checkbox" checked={selectedModels.includes(m)} onChange={(e) => {
                      setSelectedModels(e.target.checked ? [...selectedModels, m] : selectedModels.filter((x) => x !== m));
                    }} />
                    {m}
                  </label>
                ))}
              </div>
              <button onClick={selectModel} disabled={busy} style={btnStyle('#8b5cf6')}>✓ Confirm selection</button>
            </div>
          )}

          {activeComponent === 'accuracy' && (
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                <label style={lblStyle}>Learning rate: <input type="number" min="0.001" max="1" step="0.005" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))} style={inputStyle} /></label>
                <label style={lblStyle}>Sigmoid temp: <input type="number" min="0.1" max="5" step="0.1" value={sigmoidTemp} onChange={(e) => setSigmoidTemp(parseFloat(e.target.value))} style={inputStyle} /></label>
                <button onClick={setHyperparams} disabled={busy} style={btnStyle('#f59e0b')}>⚙ Set hyperparams</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={train} disabled={busy} style={btnStyle('#f59e0b')}>🚂 Train</button>
                <button onClick={inspectErrors} disabled={busy} style={btnStyle('#dc2626')}>🔍 Inspect errors</button>
                <button onClick={visualize} disabled={busy} style={btnStyle('#9333ea')}>📈 Visualize</button>
              </div>
            </div>
          )}

          {activeComponent === 'reporting' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={generateReport} disabled={busy} style={btnStyle('#10b981')}>📊 Generate report</button>
              {state.report && (
                <span style={{ fontSize: 11, color: '#475569' }}>
                  Best model: <strong>{state.report.best_model}</strong>
                </span>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 6, borderRadius: 4, fontSize: 11, marginTop: 8 }}>
              ✗ {error}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · POST /api/v1/pipeline/manual/* · §93 · NO pipeline · discrete operator-driven steps
      </div>
    </div>
  );
}

const btnStyle = (color) => ({
  padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  background: color, color: '#fff', border: 'none', borderRadius: 3,
});

const lblStyle = { fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 };
const inputStyle = { width: 60, padding: 2, fontSize: 11 };
