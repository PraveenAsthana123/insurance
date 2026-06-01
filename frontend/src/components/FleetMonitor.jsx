/**
 * FleetMonitor — live view of the 100-agent + 3-council + N-test fleet.
 *
 * Auto-refreshes every 2s. Shows queue depths + completed counts +
 * 'Fan Out N Tasks' button to give the 100 simple agents work that's
 * immediately visible in the throughput strip.
 *
 * Endpoints:
 *   GET  /api/v1/holy/fleet/stats
 *   GET  /api/v1/holy/fleet/recent-done?fleet=simple|council|test&limit=
 *   POST /api/v1/holy/fleet/fanout  {n?, prompt_template?, dept?}
 */
import { useEffect, useRef, useState } from 'react';

const API = '/api/v1/holy/fleet';

export default function FleetMonitor({ dept = 'sales' }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [fanningOut, setFanningOut] = useState(false);
  const [n, setN] = useState(20);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const timerRef = useRef(null);

  async function refresh() {
    try {
      const [s, r] = await Promise.all([
        fetch(`${API}/stats`).then((x) => x.json()),
        fetch(`${API}/recent-done?fleet=simple&limit=8`).then((x) => x.json()),
      ]);
      setStats(s);
      setRecent(r.items || []);
      setLastUpdate(Date.now());
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 2000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  async function fanout() {
    setFanningOut(true);
    setError(null);
    try {
      const r = await fetch(`${API}/fanout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n, dept }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Immediate refresh
      setTimeout(refresh, 200);
    } catch (e) {
      setError(String(e));
    } finally {
      setFanningOut(false);
    }
  }

  if (!stats) {
    return <div style={s.muted}>Loading fleet stats…</div>;
  }

  const sf = stats.simple_fleet;
  const cf = stats.council_fleet;
  const tf = stats.test_fleet;
  const ageSec = ((Date.now() - lastUpdate) / 1000).toFixed(1);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>🤖 Agent Fleet Monitor</strong>
        <span style={s.refreshNote}>
          auto-refresh 2s · last update {ageSec}s ago
        </span>
      </div>

      {error && <div style={s.error}>Error: {error}</div>}

      {/* Fleet cards */}
      <div style={s.cardGrid}>
        <FleetCard
          title="Simple Fleet"
          subtitle="100 containers · BRPOP `tasks`"
          queued={sf.queued}
          completed={sf.completed_total}
          color="#1f77b4"
        />
        <FleetCard
          title="Council Fleet"
          subtitle="3 containers · author→reviewer→chair"
          queued={cf.queued}
          completed={cf.completed_total}
          color="#2ca02c"
        />
        <FleetCard
          title="Test Fleet"
          subtitle="N test_agents · BRPOP `test_tasks`"
          queued={tf.queued}
          completed={tf.completed_total}
          color="#ff7f0e"
        />
      </div>

      {/* Fan-out controls */}
      <div style={s.fanoutBar}>
        <span style={s.fanoutLabel}>
          ▶ Make the 100-agent fleet work — enqueue N synthetic tasks to <code>tasks</code> queue:
        </span>
        <input
          type="number"
          min={1}
          max={200}
          value={n}
          onChange={(e) => setN(parseInt(e.target.value) || 20)}
          style={s.input}
        />
        <button onClick={fanout} disabled={fanningOut} style={s.runBtn}>
          {fanningOut ? '⏳' : '🚀 Fan-Out'}
        </button>
        <span style={s.fanoutHint}>
          dept: <code>{dept}</code> · agents pick up via BRPOP, call Ollama, push to <code>done</code>
        </span>
      </div>

      {/* Recent done feed */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          Recent simple-fleet completions ({recent.length})
        </div>
        {recent.length === 0 ? (
          <div style={s.muted}>No completed tasks yet — fan out some to see throughput.</div>
        ) : (
          <div style={s.recentList}>
            {recent.map((item, i) => (
              <div key={i} style={s.recentRow}>
                <span style={s.recentTaskId}>{item.task_id}</span>
                <span style={s.recentAgent}>{item.agent_id}</span>
                <span style={s.recentDept}>{item.department || '—'}</span>
                <span style={s.recentDuration}>
                  {item.duration_ms ? `${item.duration_ms}ms` : ''}
                </span>
                <span style={s.recentPrompt}>{(item.prompt || '').slice(0, 60)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={s.footer}>
        Snapshot at <code>{new Date((stats.snapshot_time || 0) * 1000).toLocaleTimeString()}</code>
        {' · '}backend: <code>backend/routers/holy.py</code> /fleet/*
        {' · '}docker: <code>docker ps | grep insur-agents-</code> = 100 containers
      </div>
    </div>
  );
}

function FleetCard({ title, subtitle, queued, completed, color }) {
  return (
    <div style={{ ...s.card, borderLeftColor: color }}>
      <div style={s.cardTitle}>{title}</div>
      <div style={s.cardSubtitle}>{subtitle}</div>
      <div style={s.cardStats}>
        <div style={s.statCol}>
          <div style={s.statLabel}>Queued</div>
          <div style={{ ...s.statValue, color: queued > 0 ? '#ef4444' : '#94a3b8' }}>
            {queued}
          </div>
        </div>
        <div style={s.statCol}>
          <div style={s.statLabel}>Completed (all time)</div>
          <div style={{ ...s.statValue, color }}>{completed}</div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  refreshNote: { fontSize: 10, color: '#888' },
  muted: { color: '#888', padding: 12 },
  error: { color: '#c00', padding: 12, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 12 },
  card: { padding: 10, background: '#fafafa', borderLeft: '4px solid', borderRadius: 4 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111' },
  cardSubtitle: { fontSize: 10, color: '#666', marginBottom: 6, fontFamily: 'monospace' },
  cardStats: { display: 'flex', gap: 12, marginTop: 4 },
  statCol: { flex: 1 },
  statLabel: { fontSize: 9, color: '#666', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: 700 },
  fanoutBar: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 12 },
  fanoutLabel: { fontSize: 12, color: '#1e40af' },
  fanoutHint: { fontSize: 10, color: '#666', marginLeft: 'auto' },
  input: { padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', width: 70 },
  runBtn: { padding: '6px 14px', background: '#1f77b4', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 },
  recentList: { maxHeight: 300, overflowY: 'auto' },
  recentRow: { display: 'flex', gap: 8, padding: 4, fontSize: 11, borderBottom: '1px solid #f0f0f0', alignItems: 'baseline' },
  recentTaskId: { fontFamily: 'monospace', color: '#666', minWidth: 140 },
  recentAgent: { color: '#888', minWidth: 100, fontSize: 10 },
  recentDept: { color: '#1e40af', minWidth: 80 },
  recentDuration: { color: '#2ca02c', minWidth: 60, fontFamily: 'monospace' },
  recentPrompt: { flex: 1, color: '#333' },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 12 },
};
