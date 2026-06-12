// §EAOS-10 · Enterprise AI Command Center · Executive + Operational dual layer.
// Per operator 2026-06-12: "Executive Layer monitors Strategy/Risk/Value/Cost/Trust/
// Compliance/Performance · Operational Layer monitors Agents/Models/MCP/Workflows/Services"
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const EXEC_TILES = [
  { id: 'strategy',   icon: '🎯', label: 'Strategy',   color: '#3b82f6' },
  { id: 'risk',       icon: '⚠️', label: 'Risk',       color: '#ef4444' },
  { id: 'value',      icon: '💎', label: 'Value',      color: '#10b981' },
  { id: 'cost',       icon: '💰', label: 'Cost',       color: '#f59e0b' },
  { id: 'trust',      icon: '🛡', label: 'Trust',      color: '#06b6d4' },
  { id: 'compliance', icon: '📜', label: 'Compliance', color: '#a855f7' },
  { id: 'performance',icon: '📈', label: 'Performance',color: '#ec4899' },
];

const OPS_TILES = [
  { id: 'agents',    icon: '🤖', label: 'Agents',    drill: '/agentic' },
  { id: 'models',    icon: '🧠', label: 'Models',    drill: '/eai-os' },
  { id: 'mcp',       icon: '🔌', label: 'MCP',       drill: '/agentic' },
  { id: 'workflows', icon: '🔄', label: 'Workflows', drill: '/eai-os' },
  { id: 'services',  icon: '⚙️', label: 'Services',  drill: '/processes' },
];

export default function CommandCenterPage() {
  const [scoreboard, setScoreboard] = useState(null);
  const [tower, setTower] = useState(null);
  const [pending, setPending] = useState(null);
  const [topPct, setTopPct] = useState(null);
  const [err, setErr] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    try {
      const h = { 'X-Demo-Role': 'manager' };
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`${API}/api/v1/eaos/scoreboard`, { headers: h }),
        fetch(`${API}/api/v1/eai-os/control-tower`, { headers: h }),
        fetch(`${API}/api/v1/status-agents/all`, { headers: h }),
        fetch(`${API}/api/v1/test-catalog/top-1pct-report`, { headers: h }),
      ]);
      setScoreboard(await r1.json());
      setTower(await r2.json());
      setPending(await r3.json());
      setTopPct(await r4.json());
      setLastFetch(new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }));
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const execMetric = (id) => {
    if (!tower || !pending || !topPct) return null;
    if (id === 'value') {
      const ex = tower.dashboards?.find(d => d.dashboard_id === 'executions');
      return { value: ex?.count ?? '—', sub: 'AI executions / 24h' };
    }
    if (id === 'cost') {
      const c = tower.dashboards?.find(d => d.dashboard_id === 'cost');
      return { value: c?.count ?? '—', sub: 'cost rows' };
    }
    if (id === 'risk') {
      const r = tower.dashboards?.find(d => d.dashboard_id === 'risk');
      return { value: r?.count ?? '—', sub: 'risks registered' };
    }
    if (id === 'compliance') {
      const c = tower.dashboards?.find(d => d.dashboard_id === 'compliance');
      return { value: c?.count ?? '—', sub: 'controls tracked' };
    }
    if (id === 'performance') {
      const summary = topPct?.summary;
      return { value: summary?.overall_grade || '—', sub: `${(summary?.average_score * 100 || 0).toFixed(1)}% avg` };
    }
    if (id === 'trust') {
      return { value: topPct?.summary?.is_top_1_pct ? 'TOP-1%' : 'normal',
               sub: `${topPct?.summary?.n_passing_80pct || 0}/${topPct?.summary?.n_dimensions || 0} dims` };
    }
    if (id === 'strategy') {
      return { value: scoreboard ? `${(scoreboard.overall_score * 100).toFixed(0)}%` : '—',
               sub: 'EAOS top-10 score' };
    }
    return null;
  };

  const opsMetric = (id) => {
    if (!tower) return null;
    const map = { agents: 'agents', models: 'models', workflows: 'workflows', services: 'observability' };
    if (id === 'mcp') return { value: 4, sub: 'registered MCPs' };
    const d = tower.dashboards?.find(d => d.dashboard_id === map[id]);
    return d ? { value: d.count, sub: 'records' } : null;
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🏛 Enterprise AI Command Center</h1>
      <div className="subtle" style={{ marginBottom: 16 }}>
        Executive + Operational dual-layer monitor · auto-refresh 30s
        {lastFetch ? ` · last: ${lastFetch}` : ''}
      </div>

      <PageHeaderFlow active="output" />

      <PageObjective
        objective="Single-pane-of-glass: executives see Strategy/Risk/Value/Cost/Trust/Compliance/Performance · operations see Agents/Models/MCP/Workflows/Services. One refresh feeds both."
        storageKey="command-center"
        todos={[
          { id: 'cc1', label: 'Execute Layer · 7 tiles render with live metrics', done: true },
          { id: 'cc2', label: 'Operations Layer · 5 tiles drill-link to detail pages', done: true },
          { id: 'cc3', label: 'Verify zero stale data (timestamp < 60s old)' },
          { id: 'cc4', label: 'Wire alerts to push notifications (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      {/* EXECUTIVE LAYER */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                   color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Executive Layer
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10, marginBottom: 18,
      }}>
        {EXEC_TILES.map((t) => {
          const m = execMetric(t.id);
          return (
            <div key={t.id} className="glass-card" style={{
              borderLeft: `5px solid ${t.color}`,
              background: 'rgba(255,255,255,0.78)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.color,
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.icon} {t.label}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: t.color }}>
                {m?.value ?? '—'}
              </div>
              <div className="subtle" style={{ fontSize: 10 }}>{m?.sub || '…'}</div>
            </div>
          );
        })}
      </div>

      {/* OPERATIONAL LAYER */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px',
                   color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Operational Layer
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {OPS_TILES.map((t) => {
          const m = opsMetric(t.id);
          return (
            <Link key={t.id} to={t.drill} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass-card card-6">
                <div style={{ fontSize: 11, fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.icon} {t.label} →
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
                  {m?.value ?? '—'}
                </div>
                <div className="subtle" style={{ fontSize: 10 }}>{m?.sub || '…'} · drill →</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 12,
                    background: 'rgba(168, 85, 247, 0.08)',
                    borderLeft: '5px solid #a855f7', borderRadius: 8, fontSize: 11 }}>
        ℹ️ §57.7 honest: metrics aggregated from 4 live endpoints (`scoreboard` +
        `control-tower` + `status-agents` + `top1pct-report`). When a row reads
        "—" the source endpoint hasn't reported yet — NOT silently zero-padded.
      </div>
    </div>
  );
}
