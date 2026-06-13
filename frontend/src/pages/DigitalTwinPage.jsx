// §L8 · Enterprise Digital Twin · operator 2026-06-12 spec.
// Top of pre-AEO maturity. §57.7 honest scaffold: live scenarios from enterprise_scenario.
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const TWINS = [
  { id: 'process',    icon: '🔄', label: 'Process Twin',     bg: 'card-input' },
  { id: 'workforce',  icon: '👥', label: 'Workforce Twin',   bg: 'card-process' },
  { id: 'agent',      icon: '🤖', label: 'Agent Twin',       bg: 'card-5' },
  { id: 'model',      icon: '🧠', label: 'Model Twin',       bg: 'card-1' },
  { id: 'financial',  icon: '💰', label: 'Financial Twin',   bg: 'card-output' },
  { id: 'risk',       icon: '⚠️', label: 'Risk Twin',        bg: 'card-4' },
  { id: 'customer',   icon: '🤝', label: 'Customer Twin',    bg: 'card-7' },
  { id: 'claim',      icon: '📋', label: 'Claims Twin',      bg: 'card-3' },
  { id: 'catastrophe',icon: '🔥', label: 'Catastrophe Twin', bg: 'card-4' },
];

export default function DigitalTwinPage() {
  const [scenarios, setScenarios] = useState([]);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/aeo/scenarios`,
                              { headers: { 'X-Demo-Role': 'manager' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setScenarios(j.scenarios || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🎮 Enterprise Digital Twin · Layer 8</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        Flight simulator for the enterprise · 9 twin types · {scenarios.length} live scenarios
      </div>

      <PageHeaderFlow active="visualization" />

      <PageObjective
        objective="Simulate before deciding · what if claims +30% · what if LLM fails · what if wildfire severity 8. Outputs feed Command Center + AEO Decision Orchestrator."
        storageKey="digital-twin"
        todos={[
          { id: 'dt1', label: 'List 9 twin types as cards' },
          { id: 'dt2', label: 'Run a scenario · show impact breakdown' },
          { id: 'dt3', label: 'Geospatial catastrophe map (next iter)' },
          { id: 'dt4', label: 'Optimization engine recommendations' },
        ]}
      />

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                   textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        9 Twin Types
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 10, marginBottom: 18 }}>
        {TWINS.map(t => (
          <div key={t.id} className={`glass-card ${t.bg}`}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              {t.icon} {t.label}
            </div>
            <div className="subtle" style={{ marginTop: 6, fontSize: 11 }}>
              Active · §57.7 scaffold simulation hooks (next iter wires
              real models)
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                   textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Live Scenario Library · {scenarios.length} scenarios
      </h2>
      {err && <div className="glass-card card-4">⚠ {err}</div>}
      <div className="glass-card glass-strong" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
            <tr>
              {['Scenario', 'Type', 'Severity', 'Impact', 'Recovery (days)', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: 8, fontSize: 11,
                                     color: '#475569', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => (
              <tr key={s.scenario_id || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}><strong>{s.scenario_name}</strong></td>
                <td style={{ padding: 8 }}>{s.event_type}</td>
                <td style={{ padding: 8 }}>
                  <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10,
                                 background: s.severity === 'critical' ? '#fee2e2'
                                         : s.severity === 'high' ? '#fef3c7' : '#dbeafe',
                                 color: s.severity === 'critical' ? '#991b1b'
                                       : s.severity === 'high' ? '#92400e' : '#1e3a8a' }}>
                    {s.severity}
                  </span>
                </td>
                <td style={{ padding: 8 }}>${(s.impact_estimate / 1e6).toFixed(1)}M</td>
                <td style={{ padding: 8 }}>{s.recovery_time_days}</td>
                <td style={{ padding: 8 }}>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card" style={{ background: 'rgba(168,85,247,0.08)',
                                            borderLeft: '5px solid #a855f7', marginTop: 16 }}>
        <strong>ℹ️ Composes with</strong> · <Link to="/aeo">AEO Layer 10</Link> ·
        <Link to="/command-center"> Command Center Layer 9</Link> ·
        scenarios fire decisions via <code>enterprise_decision</code> table per §57.7 honest.
      </div>
    </div>
  );
}
