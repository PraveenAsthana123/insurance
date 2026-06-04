import { useSearchParams } from 'react-router-dom';
import { IPOSection, SubTabGrid, TransactionalHistory, OutputEvaluation } from './IPOLayout';

// Per §73.3c (extended 2026-06-03 per operator "C" choice) — 18 sub-sections:
// 10 classic SDLC design docs + 8 banking-style operational/strategy docs.
const README_SUBS = [
  // Classic SDLC (10) — insurance original
  { slug: 'brd',         label: 'BRD',              icon: '📋', desc: 'Business Requirements Document',  color: '#3b82f6' },
  { slug: 'frd',         label: 'FRD',              icon: '✅', desc: 'Functional Requirements Document', color: '#3b82f6' },
  { slug: 'hld',         label: 'HLD',              icon: '🏛️', desc: 'High-Level Design',                color: '#6366f1' },
  { slug: 'lld',         label: 'LLD',              icon: '🔧', desc: 'Low-Level Design',                 color: '#6366f1' },
  { slug: 'sad',         label: 'SAD',              icon: '📘', desc: 'System Architecture Document',     color: '#8b5cf6' },
  { slug: 'c4',          label: 'C4 model',         icon: '🧱', desc: 'Context · Container · Component · Code', color: '#8b5cf6' },
  { slug: 'sequence',    label: 'Sequence diagram', icon: '🔁', desc: 'Per-flow sequence diagrams',       color: '#a855f7' },
  { slug: 'network',     label: 'Network diagram',  icon: '🌐', desc: 'Topology · subnets · ingress',     color: '#a855f7' },
  { slug: 'api',         label: 'API',              icon: '🔌', desc: 'Endpoint catalog · OpenAPI',       color: '#0ea5e9' },
  { slug: 'db-schema',   label: 'DB schema',        icon: '🗄️', desc: 'Tables · ERD · migrations',        color: '#0ea5e9' },
  // Banking additions (8) — operational/strategy
  { slug: 'adr',         label: 'ADR',              icon: '📜', desc: 'Architecture Decision Records',    color: '#f59e0b' },
  { slug: 'runbook',     label: 'Runbook',          icon: '🚨', desc: 'On-call runbook · IR playbook',    color: '#ef4444' },
  { slug: 'roadmap',     label: 'Roadmap',          icon: '🗺️', desc: 'Quarterly · annual roadmap',       color: '#10b981' },
  { slug: 'stakeholders', label: 'Stakeholders',    icon: '👥', desc: 'RACI · sponsor · consumer matrix', color: '#10b981' },
  { slug: 'executive-summary', label: 'Executive Summary', icon: '📊', desc: 'One-pager for C-suite',     color: '#f59e0b' },
  { slug: 'capacity',    label: 'Capacity',         icon: '📈', desc: 'Capacity planning · scaling',      color: '#06b6d4' },
  { slug: 'ai-strategy', label: 'AI Strategy',      icon: '🧠', desc: '4P (People · Process · Profit · Tech)', color: '#8b5cf6' },
  { slug: 'cost-analysis', label: 'Cost Analysis',  icon: '💰', desc: 'TCO · ROI · break-even',           color: '#10b981' },
];

function SubEmpty({ name, desc }) {
  return (
    <div className="insurance-empty-state">
      [operator: <strong>{name}</strong> ({desc}) pending content]
      <br />
      Edit <code>process.readme.{name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}</code> in
      <code> data/insurance/blueprint.json</code>.
    </div>
  );
}

function SubContent({ slug, sub, content }) {
  if (!content) return <SubEmpty name={sub?.label || slug} desc={sub?.desc || ''} />;
  if (typeof content === 'string') {
    return <pre style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)' }}>{content}</pre>;
  }
  const entries = Object.entries(content).filter(([k]) => !['derived', '_note'].includes(k));
  const isMermaid = content.format === 'mermaid';
  return (
    <div>
      {content.title && <h3 style={{ marginTop: 0 }}>{content.title}</h3>}
      <table className="insurance-matrix">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <th style={{ width: '25%' }}>{k.replace(/_/g, ' ')}</th>
              <td>
                {isMermaid && k.includes('l') ? (
                  <pre style={{
                    padding: 'var(--spacing-xs)',
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}><code>{v}</code></pre>
                ) : Array.isArray(v) ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>{v.map((x, i) => <li key={i}>{typeof x === 'object' ? JSON.stringify(x) : String(x)}</li>)}</ul>
                ) : typeof v === 'object' ? (
                  <code style={{ fontSize: 'var(--font-size-xs)' }}>{JSON.stringify(v)}</code>
                ) : String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        {content.derived ? 'Derived skeleton — operator should replace with specifics.' : 'Operator-confirmed content.'}
      </p>
    </div>
  );
}

export function ReadmeTabPanel({ proc, dept }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSub = searchParams.get('readme'); // null → show card grid landing

  const setSub = (slug) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', 'readme');
    if (slug) p.set('readme', slug); else p.delete('readme');
    setSearchParams(p);
  };

  const readme = proc.readme || {};
  const sub = activeSub ? README_SUBS.find((s) => s.slug === activeSub) : null;
  const content = activeSub ? readme[activeSub.replace('-', '_')] : null;

  // Banking-style hub landing: card grid (no sub selected)
  if (!activeSub) {
    return (
      <div>
        <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Architecture hub for <strong>{proc.name}</strong> in dept {dept.id} ({dept.name}).
          18 sub-sections grouped into 4 themes per §73.3c.
        </p>

        <IPOSection number="1" kind="input" title="Input — Process metadata" subtitle="Mission · stakeholders · constraints feeding the design decisions.">
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
            Source: <code>process.readme</code> in blueprint. Mission: {dept.mission}.
          </p>
        </IPOSection>

        <IPOSection number="2" kind="process" title="Process — Pick a design doc" subtitle="Click any card to drill into that artifact.">
          <h4 style={{ margin: '0 0 8px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Classic SDLC (10)</h4>
          <SubTabGrid subtabs={README_SUBS.slice(0, 10)} onSelect={setSub} columns={5} />
          <h4 style={{ margin: '16px 0 8px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Operational + strategy (8)</h4>
          <SubTabGrid subtabs={README_SUBS.slice(10, 18)} onSelect={setSub} columns={4} />
        </IPOSection>

        <IPOSection number="3" kind="output" title="Output — Implementable spec" subtitle="Together these 18 docs describe what the engineering team builds.">
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
            Hand-off: feeds <strong>Tech stack</strong> tab (selected stack) · <strong>Manual/Automatic process</strong> tabs (executable workflows) · <strong>Tests</strong> tab (acceptance criteria).
          </p>
        </IPOSection>

        <TransactionalHistory rows={[]} tabName="readme" />
        <OutputEvaluation metrics={{}} tabName="readme" />
      </div>
    );
  }

  // Sub-section view: show banking-style back button + sub content
  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setSub(null)}
          className="insurance-tab"
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
        >
          ← Back to Architecture hub
        </button>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{sub?.icon} {sub?.label}</h3>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{sub?.desc}</p>
        </div>
      </div>

      {/* Sub-tab bar for quick switching */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--spacing-md)' }}>
        {README_SUBS.map((s) => (
          <button
            key={s.slug}
            onClick={() => setSub(s.slug)}
            className={`insurance-tab ${activeSub === s.slug ? 'active' : ''}`}
            title={s.desc}
            style={{
              borderRadius: 'var(--border-radius-sm)',
              background: activeSub === s.slug ? s.color : undefined,
              color: activeSub === s.slug ? '#fff' : undefined,
              fontWeight: activeSub === s.slug ? 700 : 500,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <IPOSection number="1" kind="input" title="Input — Source data" subtitle={`Pulled from process.readme.${activeSub.replace('-', '_')}`}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Source: <code>process.readme.{activeSub.replace('-', '_')}</code> in blueprint.
        </p>
      </IPOSection>

      <IPOSection number="2" kind="process" title={`Process — ${sub?.label}`} subtitle={sub?.desc}>
        <SubContent slug={activeSub} sub={sub} content={content} />
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Downstream artifacts" subtitle="Where this doc feeds into the engineering workflow.">
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
          Hand-off: <strong>Tech stack</strong> · <strong>Manual/Automatic process</strong> · <strong>Tests</strong> · related arch docs in this hub.
        </p>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName={`readme:${activeSub}`} />
      <OutputEvaluation metrics={{}} tabName={`readme:${activeSub}`} />
    </div>
  );
}
