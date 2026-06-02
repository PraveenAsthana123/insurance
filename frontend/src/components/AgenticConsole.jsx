/**
 * AgenticConsole — operator UI for the 10-layer agentic execution stack
 * per §64.40.5.
 *
 * - Goal input box + dept context + scope-grant chips
 * - "Execute" triggers POST /api/v1/insur/agentic/execute (synchronous; returns full run)
 * - Per-layer trace: layer 1-10 with status badges
 * - Task list with policy decisions + cost estimates + reversibility flags
 * - Run history (list past runs for this dept) — clickable to revisit
 *
 * Endpoints:
 *   POST /api/v1/insur/agentic/execute  {goal, dept, granted_scopes?, budget_usd?}
 *   GET  /api/v1/insur/agentic/runs?dept=
 *   GET  /api/v1/insur/agentic/runs/{request_id}
 */
import { useEffect, useState } from 'react';

const API = '/api/v1/insur/agentic';

// Per §64.40.1 — the canonical 10 layers in order
const LAYER_ORDER = [
  'layer_1_user_goal',
  'layer_2_council',
  'layer_3_planner',
  'layer_4_decomposition',
  'layer_5_policy',
  'layer_6_cua',
  'layer_7_stagehand',
  'layer_8_playwright',
  'layer_9_runtime',
  'layer_10_enterprise',
];

const POLICY_COLOR = {
  allow: '#10b981',
  deny: '#ef4444',
  require_human_approval: '#f59e0b',
};

export default function AgenticConsole({ dept }) {
  const [goal, setGoal] = useState('list the 5 most recent leads from CRM');
  const [scopes, setScopes] = useState(['public:read', `read:${dept}`]);
  const [budgetUsd, setBudgetUsd] = useState(0.10);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/runs?dept=${dept}&limit=10`)
      .then((r) => r.json())
      .then((d) => !cancelled && setHistory(d.runs || []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dept, run?.request_id]);

  // Refresh granted scopes when dept changes
  useEffect(() => {
    setScopes(['public:read', `read:${dept}`]);
  }, [dept]);

  async function execute() {
    if (!goal.trim()) {
      setError('goal is required');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(`${API}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          dept,
          granted_scopes: scopes,
          budget_usd: budgetUsd,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRun(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function loadHistorical(request_id) {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(`${API}/runs/${request_id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRun(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  function toggleScope(s) {
    setScopes((prev) => prev.includes(s)
      ? prev.filter((x) => x !== s)
      : [...prev, s]);
  }

  const scopeOptions = [
    'public:read',
    `read:${dept}`,
    `write:${dept}`,
    'admin:archive',
  ];

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>🤖 Agentic Console — 10-layer execution stack (§64.40)</strong>
        <span style={s.subhead}>{dept}</span>
      </div>

      {/* Goal + scope controls */}
      <div style={s.controls}>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. list the 10 highest-revenue customers"
          rows={2}
          style={s.goalInput}
        />
        <div style={s.controlsRow}>
          <span style={s.label}>Granted scopes:</span>
          {scopeOptions.map((sc) => (
            <button
              key={sc}
              onClick={() => toggleScope(sc)}
              style={{
                ...s.scopeChip,
                ...(scopes.includes(sc) ? s.scopeChipActive : {}),
              }}
            >
              {sc}
            </button>
          ))}
          <span style={s.label}>Budget: $</span>
          <input
            type="number"
            step="0.01"
            min={0.01}
            value={budgetUsd}
            onChange={(e) => setBudgetUsd(parseFloat(e.target.value) || 0.10)}
            style={s.budgetInput}
          />
          <button onClick={execute} disabled={running} style={s.runBtn}>
            {running ? '⏳ Executing…' : '▶ Execute'}
          </button>
        </div>
      </div>

      {error && <div style={s.error}>Error: {error}</div>}

      <div style={s.layout}>
        {/* Left: run history */}
        <div style={s.leftPane}>
          <div style={s.sectionTitle}>Past runs ({history.length})</div>
          {history.length === 0 && <div style={s.muted}>No runs for {dept} yet.</div>}
          {history.map((h) => (
            <button
              key={h.request_id}
              onClick={() => loadHistorical(h.request_id)}
              style={{
                ...s.historyRow,
                ...(run?.request_id === h.request_id ? s.historyRowActive : {}),
              }}
            >
              <div style={s.historyStatus}>{statusEmoji(h.final_status)} {h.final_status}</div>
              <div style={s.historyGoal}>{(h.goal || '').slice(0, 60)}</div>
              <div style={s.historyMeta}>
                {h.n_tasks} tasks · {h.n_denied} denied · {h.duration_seconds}s
              </div>
            </button>
          ))}
        </div>

        {/* Right: run detail */}
        <div style={s.rightPane}>
          {!run && <div style={s.empty}>Pick a run on the left, or execute a new goal.</div>}
          {run && (
            <>
              <div style={s.detailHeader}>
                <div>
                  <strong>{run.goal}</strong>
                  <div style={s.detailMeta}>
                    <code>{run.request_id}</code> · {run.duration_seconds}s ·
                    final: <strong>{run.final_status}</strong>
                  </div>
                </div>
                <div style={s.detailStats}>
                  <span>{run.tasks?.length || 0} tasks</span>
                  <span style={{ color: '#ef4444' }}>{run.n_denied || 0} denied</span>
                  <span style={{ color: '#f59e0b' }}>{run.n_human_approval || 0} HITL</span>
                  <span style={{ color: '#10b981' }}>{run.n_executed || 0} ok</span>
                </div>
              </div>

              {/* Layer trace */}
              <div style={s.sectionTitle}>10-layer trace</div>
              <div style={s.layerStrip}>
                {LAYER_ORDER.map((layer) => {
                  const traversed = (run.layers_traversed || []).includes(layer);
                  const skipReason = (run.layer_skips || {})[layer];
                  return (
                    <div
                      key={layer}
                      style={{
                        ...s.layerChip,
                        background: traversed ? '#10b981' : (skipReason ? '#fbbf24' : '#e5e7eb'),
                        color: traversed || skipReason ? '#fff' : '#666',
                      }}
                      title={skipReason || (traversed ? 'traversed' : 'not reached')}
                    >
                      {layer.replace('layer_', '').replace(/_/g, ' ')}
                    </div>
                  );
                })}
              </div>

              {/* Tasks list */}
              <div style={s.sectionTitle}>Tasks ({run.tasks?.length || 0})</div>
              {run.tasks && run.tasks.length > 0 ? (
                <table style={s.tasksTable}>
                  <thead>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Action</th>
                      <th style={s.th}>Target</th>
                      <th style={s.th}>Scope</th>
                      <th style={s.th}>Policy</th>
                      <th style={s.th}>Cost $</th>
                      <th style={s.th}>Rev?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.tasks.map((t, i) => (
                      <tr key={i}>
                        <td style={s.td}>{i + 1}</td>
                        <td style={s.td}><code>{t.action}</code></td>
                        <td style={s.td}>{(t.target || '').slice(0, 40)}</td>
                        <td style={s.td}><code>{t.scope_required}</code></td>
                        <td style={s.td}>
                          <span style={{
                            ...s.policyBadge,
                            background: POLICY_COLOR[t.policy_decision] || '#888',
                          }}>{t.policy_decision}</span>
                          {t.policy_reason && (
                            <div style={s.policyReason}>{t.policy_reason}</div>
                          )}
                        </td>
                        <td style={s.td}>{(t.est_cost_usd || 0).toFixed(4)}</td>
                        <td style={s.td}>{t.reversible ? '✓' : '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={s.muted}>No tasks (likely rejected at user-goal layer)</div>
              )}

              <div style={s.totalCost}>
                Total est. cost: <strong>${(run.total_cost_estimate_usd || 0).toFixed(4)}</strong>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={s.footer}>
        10 layers per §64.40.1 · backend: <code>/api/v1/insur/agentic/*</code> ·
        adapters: Stagehand + Playwright + OpenClaw (live) + Paperclip (live)
      </div>
    </div>
  );
}

function statusEmoji(status) {
  if (status === 'complete') return '✓';
  if (status === 'all_denied') return '⊘';
  if (status === 'rejected_empty_goal') return '✗';
  return '·';
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  subhead: { fontSize: 11, color: '#888' },
  controls: { padding: 10, background: '#f9fafb', borderRadius: 6, marginBottom: 12 },
  controlsRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  label: { fontSize: 11, color: '#666' },
  goalInput: { width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: 12, boxSizing: 'border-box' },
  scopeChip: { padding: '3px 8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' },
  scopeChipActive: { background: '#1e40af', color: '#fff', borderColor: '#1e40af' },
  budgetInput: { padding: '3px 6px', borderRadius: 4, border: '1px solid #d1d5db', width: 70 },
  runBtn: { padding: '6px 14px', background: '#1f77b4', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' },
  error: { color: '#c00', padding: 10, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  muted: { color: '#888', padding: 12 },
  empty: { color: '#888', padding: 16, textAlign: 'center' },
  layout: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, minHeight: 400 },
  leftPane: { background: '#fafafa', borderRadius: 4, padding: 6, maxHeight: 600, overflowY: 'auto' },
  rightPane: { background: '#fff', borderRadius: 4, padding: 8, border: '1px solid #e5e7eb' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 },
  historyRow: { display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', padding: 6, marginBottom: 4, borderRadius: 4, cursor: 'pointer' },
  historyRowActive: { borderColor: '#1f77b4', background: '#eff6ff' },
  historyStatus: { fontSize: 11, fontWeight: 600 },
  historyGoal: { fontSize: 10, color: '#333', marginTop: 2 },
  historyMeta: { fontSize: 9, color: '#888', marginTop: 2 },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  detailMeta: { fontSize: 10, color: '#666', marginTop: 4 },
  detailStats: { display: 'flex', gap: 8, fontSize: 11 },
  layerStrip: { display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' },
  layerChip: { padding: '4px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, textTransform: 'uppercase' },
  tasksTable: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '4px 6px', background: '#f6f8fa', borderBottom: '2px solid #e1e4e8', fontSize: 10 },
  td: { padding: '4px 6px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' },
  policyBadge: { padding: '1px 6px', color: '#fff', borderRadius: 3, fontSize: 9, fontWeight: 600, textTransform: 'uppercase' },
  policyReason: { fontSize: 9, color: '#666', marginTop: 2, fontStyle: 'italic' },
  totalCost: { textAlign: 'right', marginTop: 8, padding: 6, background: '#eff6ff', borderRadius: 4, fontSize: 12, color: '#1e40af' },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 12 },
};
