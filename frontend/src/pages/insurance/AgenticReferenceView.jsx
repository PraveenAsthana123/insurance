import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const SCOPE_TONE = {
  backend:  { bg: 'var(--accent-primary)', label: 'backend' },
  frontend: { bg: 'var(--accent-purple)',  label: 'frontend' },
  both:     { bg: 'var(--accent-warning)', label: 'both' },
};

function ScopePill({ scope }) {
  const t = SCOPE_TONE[scope] || { bg: 'var(--text-muted)', label: scope || '—' };
  return (
    <span style={{
      padding: '1px 8px', borderRadius: 'var(--border-radius-sm)',
      background: t.bg, color: '#fff',
      fontSize: 'var(--font-size-xs)', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{t.label}</span>
  );
}

export function AgenticReferenceView() {
  const { bp } = useOutletContext();
  const [scopeFilter, setScopeFilter] = useState('backend');
  const aar = bp.agentic_ai_reference;

  if (!aar) {
    return <div className="insurance-empty-state">Agentic AI reference not present in blueprint.</div>;
  }

  const arch = aar.reference_architecture?.layers || [];
  const agents = aar.enterprise_agent_stack?.agents || [];
  const stack = aar.recommended_stack || [];
  const filterScope = (items) =>
    scopeFilter === 'all' ? items : items.filter((x) => x.scope === scopeFilter || x.scope === 'both');

  const visibleArch = filterScope(arch);
  const visibleAgents = filterScope(agents);
  const visibleStack = filterScope(stack);

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--spacing-xs)' }}>Agentic AI — reference architecture</h2>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Operator-provided architecture: 15 layers · 11 agents · 12 state types · MCP integration.
        Per global §73 + §64.40. Source: <code>blueprint.agentic_ai_reference</code>.
      </p>

      <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 'var(--font-size-sm)' }}>Filter scope:</strong>
        {['backend', 'frontend', 'both', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setScopeFilter(s)}
            className={`insurance-tab ${scopeFilter === s ? 'active' : ''}`}
            style={{ borderRadius: 'var(--border-radius-sm)' }}
          >
            {s === 'all' ? 'all (no filter)' : s}
          </button>
        ))}
      </div>

      {/* 15-layer architecture */}
      <section style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h3>{aar.reference_architecture?.title || '15-layer architecture'} · showing {visibleArch.length} of {arch.length}</h3>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th style={{ width: '20%' }}>Layer</th>
                <th>Purpose</th>
                <th style={{ width: 110 }}>Scope</th>
              </tr>
            </thead>
            <tbody>
              {visibleArch.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.id}</strong></td>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.purpose}</td>
                  <td><ScopePill scope={l.scope} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 11 agents */}
      <section style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h3>Enterprise agent stack · {visibleAgents.length} of {agents.length} agents</h3>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Purpose</th>
                <th>Mandatory</th>
                <th style={{ width: 110 }}>Scope</th>
              </tr>
            </thead>
            <tbody>
              {visibleAgents.map((a) => (
                <tr key={a.name}>
                  <td><strong>{a.name}</strong></td>
                  <td>{a.purpose}</td>
                  <td>{a.mandatory === true ? '✓ Yes' : String(a.mandatory)}</td>
                  <td><ScopePill scope={a.scope} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Core 8 mandatory agents: <code>{(aar.enterprise_agent_stack?.core_8_backend || []).join(' · ')}</code>
        </p>
      </section>

      {/* Recommended stack */}
      <section style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h3>Recommended stack · {visibleStack.length} of {stack.length} layers</h3>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Tools</th>
                <th style={{ width: 110 }}>Scope</th>
              </tr>
            </thead>
            <tbody>
              {visibleStack.map((s) => (
                <tr key={s.layer}>
                  <td><strong>{s.layer}</strong></td>
                  <td>{(s.tools || []).join(' · ')}</td>
                  <td><ScopePill scope={s.scope} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Looping prevention + state + HITL + scorecard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>Looping prevention · {aar.looping_prevention?.controls?.length} controls</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.looping_prevention?.controls || []).map((c) => <li key={c}>{c}</li>)}
          </ol>
          <p style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Production rule example:
          </p>
          <pre style={{ background: 'var(--bg-hover)', padding: 8, borderRadius: 4, fontSize: 11 }}>
            {JSON.stringify(aar.looping_prevention?.production_rule_example, null, 2)}
          </pre>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>12 state types (LangGraph)</h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.state_types || []).map((s) => <li key={s}><code>{s}</code></li>)}
          </ul>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>HITL risk gates</h4>
          <table className="insurance-matrix">
            <thead><tr><th>Risk</th><th>Action</th></tr></thead>
            <tbody>
              {(aar.hitl_gates || []).map((h) => (
                <tr key={h.risk}><td><strong>{h.risk}</strong></td><td>{h.action}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>Enterprise scorecard · 7 dimensions</h4>
          <table className="insurance-matrix">
            <thead><tr><th>Dimension</th><th>Weight</th></tr></thead>
            <tbody>
              {(aar.scorecard_dimensions || []).map((d) => (
                <tr key={d.dimension}>
                  <td>{d.dimension}</td>
                  <td><strong>{(d.weight * 100).toFixed(0)}%</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>Conflict resolution priority</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.conflict_resolution_priority || []).map((p) => <li key={p}>{p}</li>)}
          </ol>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>6 north-star metrics</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.north_star_metrics || []).map((m) => <li key={m}>{m}</li>)}
          </ol>
        </section>

        <section className="insurance-card">
          <h4 style={{ marginTop: 0 }}>MCP integration · build vs SDK</h4>
          <strong>Build (you):</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.mcp_integration?.components_to_build || []).map((c) => <li key={c}>{c}</li>)}
          </ul>
          <strong style={{ marginTop: 8, display: 'block' }}>Provided by SDK:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {(aar.mcp_integration?.provided_by_sdk || []).map((c) => <li key={c} style={{ color: 'var(--text-muted)' }}>{c}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
