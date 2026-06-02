/**
 * TestingDashboard — operator UI for §65.8 test-tier dispatch system.
 *
 * - 8 tiers × N depts coverage matrix
 * - Dispatch button per (dept, tier)
 * - Live results feed via /testing/results
 * - Tier-to-agent-role legend
 *
 * Endpoints:
 *   GET  /api/v1/insur/testing/tiers
 *   POST /api/v1/insur/testing/dispatch  {dept, tier, timeout_seconds?}
 *   GET  /api/v1/insur/testing/results?tier=&dept=&limit=
 */
import { useEffect, useRef, useState } from 'react';

const API = '/api/v1/insur/testing';

const TIER_BG = {
  unit: '#dbeafe',
  integration: '#bfdbfe',
  api: '#bbf7d0',
  boundary: '#fef3c7',
  process: '#fde68a',
  perf: '#fed7aa',
  smoke: '#e9d5ff',
  security: '#fecaca',
};

const EXIT_COLOR = {
  0: '#10b981',    // pass
  1: '#ef4444',    // fail
  98: '#f59e0b',   // wrong-role-for-tier
  99: '#ef4444',   // unknown tier
  124: '#7c3aed',  // timeout
};

export default function TestingDashboard({ dept }) {
  const [tiers, setTiers] = useState([]);
  const [results, setResults] = useState([]);
  const [dispatching, setDispatching] = useState(null);  // tier name being dispatched
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  async function refresh() {
    try {
      const [t, r] = await Promise.all([
        fetch(`${API}/tiers`).then((x) => x.json()),
        fetch(`${API}/results?limit=20`).then((x) => x.json()),
      ]);
      setTiers(t.tiers || []);
      setResults(r.results || []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 3000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  async function dispatchTier(tier) {
    setDispatching(tier);
    setError(null);
    try {
      const r = await fetch(`${API}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept, tier, timeout_seconds: 300 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // immediate refresh
      setTimeout(refresh, 500);
    } catch (e) {
      setError(String(e));
    } finally {
      setDispatching(null);
    }
  }

  // Aggregate: per-tier pass/fail counts from recent results
  const tierStats = {};
  for (const r of results) {
    const tier = r.tier || 'unknown';
    if (!tierStats[tier]) tierStats[tier] = { pass: 0, fail: 0, total: 0 };
    tierStats[tier].total++;
    if (r.exit_code === 0) tierStats[tier].pass++;
    else tierStats[tier].fail++;
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>🧪 Testing Dashboard — §65.8 8-tier dispatch</strong>
        <span style={s.subhead}>{dept}</span>
      </div>

      {error && <div style={s.error}>Error: {error}</div>}

      {/* Tier × agent-role matrix */}
      <div style={s.sectionTitle}>Tiers × Agent roles ({tiers.length})</div>
      <div style={s.tierGrid}>
        {tiers.map((t) => {
          const stat = tierStats[t.tier] || { pass: 0, fail: 0, total: 0 };
          return (
            <div
              key={t.tier}
              style={{
                ...s.tierCard,
                background: TIER_BG[t.tier] || '#f5f5f5',
              }}
            >
              <div style={s.tierName}>{t.tier}</div>
              <div style={s.tierAgent}>{t.agent}</div>
              <div style={s.tierFramework}>{t.framework}</div>
              <div style={s.tierStats}>
                {stat.total > 0 ? (
                  <>
                    <span style={s.passCount}>{stat.pass} ✓</span>
                    {stat.fail > 0 && <span style={s.failCount}>{stat.fail} ✗</span>}
                  </>
                ) : (
                  <span style={s.muted}>no runs</span>
                )}
              </div>
              <button
                onClick={() => dispatchTier(t.tier)}
                disabled={dispatching === t.tier}
                style={s.dispatchBtn}
              >
                {dispatching === t.tier ? '⏳' : '▶ Dispatch'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent results feed */}
      <div style={s.sectionTitle}>Recent results ({results.length})</div>
      {results.length === 0 ? (
        <div style={s.muted}>
          No results yet. Start a test_agent fleet ({' '}
          <code>TIER_ROLE=pytest-agent docker compose up -d --scale test_agents=4</code>
          ) and dispatch a tier above.
        </div>
      ) : (
        <table style={s.resultsTable}>
          <thead>
            <tr>
              <th style={s.th}>Task</th>
              <th style={s.th}>Tier</th>
              <th style={s.th}>Dept</th>
              <th style={s.th}>Agent</th>
              <th style={s.th}>Exit</th>
              <th style={s.th}>Dur</th>
              <th style={s.th}>Output (tail)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td style={s.td}><code style={s.tinyMono}>{(r.task_id || '').slice(-12)}</code></td>
                <td style={s.td}><strong>{r.tier}</strong></td>
                <td style={s.td}>{r.dept}</td>
                <td style={s.td}><code style={s.tinyMono}>{(r.agent_id || '').slice(0, 12)}</code></td>
                <td style={s.td}>
                  <span style={{
                    ...s.exitBadge,
                    background: EXIT_COLOR[r.exit_code] || '#888',
                  }}>{r.exit_code}</span>
                </td>
                <td style={s.td}>{r.duration_seconds || 0}s</td>
                <td style={s.td}>
                  <code style={s.outputTail}>{(r.stdout_tail || '').slice(-120)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={s.footer}>
        Auto-refresh 3s · 8 tiers × {/* operator can dispatch any tier for current dept */}
        scale fleet: <code>TIER_ROLE=&lt;role&gt; docker compose up -d --scale test_agents=N</code>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  subhead: { fontSize: 11, color: '#888' },
  error: { color: '#c00', padding: 10, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6, marginTop: 12 },
  tierGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 },
  tierCard: { padding: 10, borderRadius: 6, border: '1px solid rgba(0,0,0,0.05)' },
  tierName: { fontSize: 14, fontWeight: 700, color: '#111', textTransform: 'uppercase' },
  tierAgent: { fontSize: 10, color: '#666', fontFamily: 'monospace', marginTop: 2 },
  tierFramework: { fontSize: 9, color: '#444', marginTop: 4, fontStyle: 'italic' },
  tierStats: { display: 'flex', gap: 6, marginTop: 6, fontSize: 11 },
  passCount: { color: '#10b981', fontWeight: 700 },
  failCount: { color: '#ef4444', fontWeight: 700 },
  muted: { color: '#888' },
  dispatchBtn: { width: '100%', padding: '5px 10px', marginTop: 6, background: '#1f77b4', color: '#fff', border: 0, borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  resultsTable: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '4px 6px', background: '#f6f8fa', borderBottom: '2px solid #e1e4e8', fontSize: 10 },
  td: { padding: '4px 6px', borderBottom: '1px solid #f0f0f0' },
  tinyMono: { fontFamily: 'monospace', fontSize: 10 },
  exitBadge: { padding: '1px 6px', color: '#fff', borderRadius: 3, fontSize: 10, fontWeight: 700 },
  outputTail: { fontSize: 9, color: '#666', wordBreak: 'break-all' },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 12 },
};
