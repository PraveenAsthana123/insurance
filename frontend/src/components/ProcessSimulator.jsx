/**
 * ProcessSimulator — per-dept simulation tab per §64.34.
 *
 * Renders side-by-side Manual vs Auto comparison for any process with a
 * defined reference simulation in backend/ml/reference/simulation_engine.py.
 *
 * Endpoints:
 *   GET  /api/v1/insur/sim/reference-processes
 *   POST /api/v1/insur/sim/{dept}/{process}/run    { n_inputs, seed }
 *   GET  /api/v1/insur/sim/{dept}/{process}/runs
 *   GET  /api/v1/insur/sim/{dept}/{process}/runs/{sim_id}/manifest
 *   GET  /api/v1/insur/sim/{dept}/{process}/runs/{sim_id}/events?layer=...
 */
import { useEffect, useState } from 'react';

const API_BASE = '/api/v1/insur/sim';
const LAYERS = ['all', 'backend', 'process', 'data', 'accuracy', 'reporting'];

export default function ProcessSimulator({ dept }) {
  const [refs, setRefs] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [events, setEvents] = useState([]);
  const [layer, setLayer] = useState('all');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [nInputs, setNInputs] = useState(15);

  // Load reference processes for this dept on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/reference-processes`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const forDept = (data.reference_processes || []).filter((p) => p.dept === dept);
        setRefs(forDept);
        if (forDept[0]) setSelectedProcess(forDept[0].process);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [dept]);

  // Load latest existing run when process changes
  useEffect(() => {
    if (!selectedProcess) return;
    let cancelled = false;
    fetch(`${API_BASE}/${dept}/${selectedProcess}/runs`)
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled || !data.runs?.length) return;
        const simId = data.runs[0].sim_id;
        const [m, e] = await Promise.all([
          fetch(`${API_BASE}/${dept}/${selectedProcess}/runs/${simId}/manifest`).then((r) => r.json()),
          fetch(`${API_BASE}/${dept}/${selectedProcess}/runs/${simId}/events`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setManifest(m);
        setEvents(e.events || []);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [dept, selectedProcess]);

  async function runSimulation() {
    if (!selectedProcess) return;
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/${dept}/${selectedProcess}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n_inputs: nInputs, seed: 42 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const m = await r.json();
      setManifest(m);
      // fetch the events for the new sim_id
      const ev = await fetch(
        `${API_BASE}/${dept}/${selectedProcess}/runs/${m.sim_id}/events`
      ).then((x) => x.json());
      setEvents(ev.events || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  if (!refs.length) {
    return (
      <div style={s.empty}>
        <strong>No reference process for {dept} yet.</strong>
        <div style={s.hint}>
          Define one in <code>backend/ml/reference/simulation_engine.py</code>
          {' '}→ <code>REFERENCE_PROCESSES[("{dept}", "...")]</code>
        </div>
      </div>
    );
  }

  const filteredEvents = layer === 'all' ? events : events.filter((e) => e.layer === layer);
  const manualEvents = filteredEvents.filter((e) => e.run_mode === 'manual');
  const autoEvents = filteredEvents.filter((e) => e.run_mode === 'auto');

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>🎬 Process Simulator — {dept}</strong>
        <span style={s.subhead}>
          Manual vs Automatic, side-by-side, all 5 layers
        </span>
      </div>

      <div style={s.controls}>
        <label style={s.label}>
          Process:
          <select
            value={selectedProcess || ''}
            onChange={(e) => setSelectedProcess(e.target.value)}
            style={s.select}
          >
            {refs.map((r) => (
              <option key={r.process} value={r.process}>
                {r.process} ({r.n_steps} steps)
              </option>
            ))}
          </select>
        </label>
        <label style={s.label}>
          Inputs:
          <input
            type="number"
            min={1}
            max={100}
            value={nInputs}
            onChange={(e) => setNInputs(parseInt(e.target.value) || 15)}
            style={s.input}
          />
        </label>
        <button onClick={runSimulation} disabled={running} style={s.runBtn}>
          {running ? '⏳ Running…' : '▶ Run Simulation'}
        </button>
      </div>

      {error && <div style={s.error}>Error: {error}</div>}

      {manifest && manifest.comparison && (
        <div style={s.comparisonStrip}>
          <div style={s.compCard}>
            <div style={s.compLabel}>Time saved</div>
            <div style={s.compValue}>
              {manifest.comparison.time_saved_seconds.toFixed(0)}s
              <span style={s.compPct}>({manifest.comparison.time_saved_pct.toFixed(0)}%)</span>
            </div>
          </div>
          <div style={s.compCard}>
            <div style={s.compLabel}>Cost saved</div>
            <div style={s.compValue}>
              ${manifest.comparison.cost_saved_usd.toFixed(2)}
              <span style={s.compPct}>({manifest.comparison.cost_saved_pct.toFixed(0)}%)</span>
            </div>
          </div>
          <div style={s.compCard}>
            <div style={s.compLabel}>Errors avoided</div>
            <div style={s.compValue}>{manifest.comparison.errors_avoided}</div>
          </div>
          <div style={s.compCard}>
            <div style={s.compLabel}>Escalations avoided</div>
            <div style={s.compValue}>{manifest.comparison.escalations_avoided}</div>
          </div>
          <div style={s.compCard}>
            <div style={s.compLabel}>Δ Accuracy</div>
            <div style={s.compValue}>
              {manifest.comparison.accuracy_delta_pct > 0 ? '+' : ''}
              {manifest.comparison.accuracy_delta_pct.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {manifest && (
        <div style={s.modeGrid}>
          <ModeSummary mode="manual" summary={manifest.manual} title="🧑 Manual (AS-IS)" />
          <ModeSummary mode="auto" summary={manifest.auto} title="🤖 Automatic (TO-BE)" />
        </div>
      )}

      {events.length > 0 && (
        <>
          <div style={s.eventHeader}>
            <strong>Events ({events.length})</strong>
            <div style={s.layerChips}>
              {LAYERS.map((L) => (
                <button
                  key={L}
                  onClick={() => setLayer(L)}
                  style={{
                    ...s.layerChip,
                    ...(layer === L ? s.layerChipActive : {}),
                  }}
                >
                  {L}
                </button>
              ))}
            </div>
          </div>

          <div style={s.eventsGrid}>
            <EventColumn title="Manual events" events={manualEvents} color="#d62728" />
            <EventColumn title="Auto events" events={autoEvents} color="#2ca02c" />
          </div>
        </>
      )}

      {manifest && (
        <div style={s.footer}>
          sim_id: <code>{manifest.sim_id}</code> ·
          wall: {manifest.duration_seconds_wall}s ·
          seed: {manifest.seed} ·
          {events.length} events
        </div>
      )}
    </div>
  );
}

function ModeSummary({ mode, summary, title }) {
  if (!summary) return null;
  const color = mode === 'manual' ? '#fff5f5' : '#f0fdf4';
  const border = mode === 'manual' ? '#fca5a5' : '#86efac';
  return (
    <div style={{ ...s.modePanel, background: color, borderColor: border }}>
      <div style={s.modeTitle}>{title}</div>
      <table style={s.modeTable}>
        <tbody>
          <tr><td>Duration</td><td><b>{summary.total_duration_seconds}s</b></td></tr>
          <tr><td>Cost</td><td><b>${summary.total_cost_usd.toFixed(4)}</b></td></tr>
          <tr><td>Steps run</td><td>{summary.n_steps}</td></tr>
          <tr><td>Errors</td><td style={{ color: summary.n_errors ? '#c00' : 'inherit' }}>{summary.n_errors}</td></tr>
          <tr><td>Escalations</td><td style={{ color: summary.n_escalations ? '#c00' : 'inherit' }}>{summary.n_escalations}</td></tr>
          <tr><td>Mean confidence</td><td>{summary.mean_confidence}</td></tr>
          <tr><td>Accuracy estimate</td><td>{summary.accuracy_estimate}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function EventColumn({ title, events, color }) {
  return (
    <div style={s.eventCol}>
      <div style={{ ...s.eventColHeader, color }}>{title} ({events.length})</div>
      <div style={s.eventList}>
        {events.slice(0, 50).map((ev, i) => (
          <div key={i} style={{ ...s.eventRow, borderLeftColor: color }}>
            <span style={s.evLayer}>[{ev.layer}]</span>
            <span style={s.evStep}>{ev.step_name}</span>
            <span style={s.evActor}>{ev.actor}</span>
            <span style={s.evMsg}>{ev.message.slice(0, 80)}</span>
            {ev.status !== 'ok' && <span style={s.evStatus}>{ev.status}</span>}
          </div>
        ))}
        {events.length > 50 && <div style={s.muted}>… {events.length - 50} more</div>}
      </div>
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  subhead: { fontSize: 11, color: '#888' },
  controls: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: 8, background: '#f9fafb', borderRadius: 4 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  select: { padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' },
  input: { padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', width: 60 },
  runBtn: { padding: '6px 14px', background: '#1f77b4', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  empty: { padding: 16, background: '#fafafa', borderRadius: 4, color: '#555', marginTop: 16 },
  hint: { fontSize: 11, marginTop: 6, color: '#888' },
  error: { color: '#c00', padding: 12, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  comparisonStrip: { display: 'flex', gap: 8, marginBottom: 12 },
  compCard: { flex: 1, padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 },
  compLabel: { fontSize: 10, color: '#1e40af', textTransform: 'uppercase', fontWeight: 600 },
  compValue: { fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginTop: 4 },
  compPct: { fontSize: 11, color: '#3b82f6', marginLeft: 4 },
  modeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  modePanel: { padding: 12, borderRadius: 6, border: '2px solid' },
  modeTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  modeTable: { width: '100%', fontSize: 12 },
  eventHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 12 },
  layerChips: { display: 'flex', gap: 4 },
  layerChip: { padding: '2px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 12, cursor: 'pointer', fontSize: 10, textTransform: 'uppercase' },
  layerChipActive: { background: '#1f77b4', color: '#fff', borderColor: '#1f77b4' },
  eventsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  eventCol: { background: '#fafafa', borderRadius: 4, padding: 6 },
  eventColHeader: { fontWeight: 700, fontSize: 12, marginBottom: 6, padding: 4 },
  eventList: { maxHeight: 360, overflowY: 'auto' },
  eventRow: { padding: '4px 6px', borderLeft: '3px solid', marginBottom: 2, fontSize: 11, background: '#fff', display: 'flex', gap: 6, alignItems: 'baseline' },
  evLayer: { fontFamily: 'monospace', color: '#666', fontSize: 9, minWidth: 70 },
  evStep: { fontWeight: 600, minWidth: 80 },
  evActor: { color: '#666', minWidth: 110, fontSize: 10 },
  evMsg: { flex: 1, color: '#444' },
  evStatus: { color: '#c00', fontWeight: 600, fontSize: 10 },
  muted: { color: '#888', padding: 4, textAlign: 'center', fontSize: 10 },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 8 },
};
