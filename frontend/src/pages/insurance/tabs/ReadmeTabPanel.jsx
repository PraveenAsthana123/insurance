import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IPOSection, SubTabGrid, TransactionalHistory, OutputEvaluation,
  InfoCard, JourneyFlow, TodoList,
} from './IPOLayout';

// Per §73.3c (extended 2026-06-09 per operator request to add AS-IS · TO-BE · ROI · KPI):
// 22 sub-sections grouped into 4 phases. ALL CARDS ARE CLICKABLE (light-tinted).
// Per-slug rich default skeleton ensures each sub-tab renders DIFFERENTIATED content
// (operator 2026-06-09: "when I click frd,brd,hld all look same · not change").
const README_SUBS = [
  // Phase 1 · Discovery + framing (4)
  { slug: 'brd',         label: 'BRD',              icon: '📋', phase: 'Discovery',  desc: 'Business Requirements Document',  color: '#3b82f6' },
  { slug: 'as-is',       label: 'AS-IS',            icon: '📍', phase: 'Discovery',  desc: 'Current-state process (manual)', color: '#3b82f6' },
  { slug: 'to-be',       label: 'TO-BE',            icon: '🎯', phase: 'Discovery',  desc: 'Target-state process (automated)', color: '#3b82f6' },
  { slug: 'roi',         label: 'ROI',              icon: '💵', phase: 'Discovery',  desc: 'Return on Investment · payback period', color: '#3b82f6' },
  // Phase 2 · Design (6)
  { slug: 'frd',         label: 'FRD',              icon: '✅', phase: 'Design',     desc: 'Functional Requirements Document', color: '#6366f1' },
  { slug: 'hld',         label: 'HLD',              icon: '🏛️', phase: 'Design',     desc: 'High-Level Design',                color: '#6366f1' },
  { slug: 'lld',         label: 'LLD',              icon: '🔧', phase: 'Design',     desc: 'Low-Level Design',                 color: '#6366f1' },
  { slug: 'sad',         label: 'SAD',              icon: '📘', phase: 'Design',     desc: 'System Architecture Document',     color: '#8b5cf6' },
  { slug: 'c4',          label: 'C4 model',         icon: '🧱', phase: 'Design',     desc: 'Context · Container · Component · Code', color: '#8b5cf6' },
  { slug: 'adr',         label: 'ADR',              icon: '📜', phase: 'Design',     desc: 'Architecture Decision Records',    color: '#8b5cf6' },
  // Phase 3 · Build (6)
  { slug: 'sequence',    label: 'Sequence',         icon: '🔁', phase: 'Build',      desc: 'Per-flow sequence diagrams',       color: '#a855f7' },
  { slug: 'network',     label: 'Network',          icon: '🌐', phase: 'Build',      desc: 'Topology · subnets · ingress',     color: '#a855f7' },
  { slug: 'api',         label: 'API',              icon: '🔌', phase: 'Build',      desc: 'Endpoint catalog · OpenAPI',       color: '#0ea5e9' },
  { slug: 'db-schema',   label: 'DB schema',        icon: '🗄️', phase: 'Build',      desc: 'Tables · ERD · migrations',        color: '#0ea5e9' },
  { slug: 'runbook',     label: 'Runbook',          icon: '🚨', phase: 'Build',      desc: 'On-call runbook · IR playbook',    color: '#ef4444' },
  { slug: 'kpi',         label: 'KPI',              icon: '📈', phase: 'Build',      desc: 'KPIs measured · targets · drift',  color: '#0ea5e9' },
  // Phase 4 · Operate + grow (6)
  { slug: 'capacity',    label: 'Capacity',         icon: '📊', phase: 'Operate',    desc: 'Capacity planning · scaling',      color: '#06b6d4' },
  { slug: 'roadmap',     label: 'Roadmap',          icon: '🗺️', phase: 'Operate',    desc: 'Quarterly · annual roadmap',       color: '#10b981' },
  { slug: 'stakeholders', label: 'Stakeholders',    icon: '👥', phase: 'Operate',    desc: 'RACI · sponsor · consumer matrix', color: '#10b981' },
  { slug: 'executive-summary', label: 'Exec Summary', icon: '📊', phase: 'Operate',  desc: 'One-pager for C-suite',            color: '#f59e0b' },
  { slug: 'ai-strategy', label: 'AI Strategy',      icon: '🧠', phase: 'Operate',    desc: '4P (People · Process · Profit · Tech)', color: '#8b5cf6' },
  { slug: 'cost-analysis', label: 'Cost Analysis',  icon: '💰', phase: 'Operate',    desc: 'TCO · break-even',                 color: '#10b981' },
];

// ─── Per-slug skeleton content · differentiated per artifact ──────────
// Per operator 2026-06-09: each sub-tab must render DIFFERENT content
// even when blueprint data is missing. Each skeleton has its own TODO list
// + 5-section info structure + journey-flow position.
const SKELETONS = {
  brd: {
    why: "Why does this business need this artifact?",
    todos: ["Document business goal", "Identify primary stakeholders", "List measurable success criteria",
            "Quantify expected business value", "Define scope boundaries (in/out)"],
    sections: ["Business Goal", "Stakeholders", "Success Criteria", "Scope (in / out)", "Business Constraints"],
    next: "FRD · for functional decomposition",
  },
  "as-is": {
    why: "How does this process work TODAY · before AI/automation?",
    todos: ["Map current manual steps", "Capture pain points (time loss · errors · cost)",
            "Identify dependencies on people/tools", "Quantify current cycle time", "Note compliance pain points"],
    sections: ["Manual workflow steps", "Pain points", "Time spent (hrs/week)", "Cost impact ($/year)",
                "Tools currently used", "Compliance posture"],
    next: "TO-BE · target-state design",
  },
  "to-be": {
    why: "How will this process work AFTER AI/automation?",
    todos: ["Define automated workflow steps", "Specify human-in-the-loop touchpoints",
            "Set target cycle time reduction", "List AI/ML components needed", "Define rollback path"],
    sections: ["Automated workflow steps", "HITL approval points", "Target cycle time", "Expected savings",
                "AI components required", "Rollback strategy"],
    next: "ROI · expected payback period",
  },
  roi: {
    why: "What financial return justifies this investment?",
    todos: ["Estimate build cost", "Estimate run cost per month", "Quantify hard savings (manual hours saved)",
            "Quantify soft savings (errors avoided · churn reduced)", "Calculate payback period (months)"],
    sections: ["Build cost ($)", "Run cost ($/month)", "Hard savings ($/year)", "Soft savings ($/year)",
                "Payback period (months)", "Net Present Value (3-year)"],
    next: "Implementation handoff → FRD/HLD",
  },
  frd: {
    why: "What FUNCTIONS does the system need to perform?",
    todos: ["List user stories", "Define acceptance criteria (Given/When/Then)",
            "Document error handling expectations", "Specify non-functional requirements (latency · throughput)",
            "Define data validation rules"],
    sections: ["User stories", "Acceptance criteria", "Functional flows", "Non-functional requirements",
                "Error handling", "Data validation"],
    next: "HLD · how the system is structured",
  },
  hld: {
    why: "What are the major components and how do they fit together?",
    todos: ["Draw C4 L1 (system context)", "Draw C4 L2 (containers)",
            "List external integrations", "Define data flow at high level",
            "Identify quality attributes (security · perf · availability)"],
    sections: ["System context diagram", "Container view", "External integrations",
                "Data flow (high level)", "Quality attributes", "Deployment topology"],
    next: "LLD · component internals",
  },
  lld: {
    why: "What are the internal details of each component?",
    todos: ["Define class diagrams per service", "Specify table schemas",
            "Document algorithms (ML model architecture · feature pipelines)",
            "Define API contracts per service", "Specify state machines"],
    sections: ["Class diagrams", "Table schemas", "Algorithms (ML models · features)",
                "API contracts", "State machines", "Configuration files"],
    next: "Sequence · runtime behavior",
  },
  sad: {
    why: "What's the overall system architecture?",
    todos: ["Document deployment topology", "Specify cross-cutting concerns",
            "Define security architecture", "Document observability strategy"],
    sections: ["Deployment topology", "Cross-cutting concerns", "Security architecture",
                "Observability strategy", "Rollback & DR"],
    next: "C4 model · structured drill-down",
  },
  c4: {
    why: "How does C4 4-level model describe this system?",
    todos: ["Draw L1 System Context (Mermaid)", "Draw L2 Containers (Mermaid)",
            "Draw L3 Components (Mermaid)", "Optionally draw L4 Code"],
    sections: ["L1 · System Context", "L2 · Containers", "L3 · Components", "L4 · Code (optional)"],
    next: "ADR · why we chose this architecture",
  },
  adr: {
    why: "Why did we make each architectural decision?",
    todos: ["Capture context for each decision", "Document options considered",
            "Document selected option + consequences", "Set immutable date + status"],
    sections: ["Decision record format", "Context", "Options considered",
                "Selected option", "Consequences"],
    next: "Sequence diagrams · runtime view",
  },
  sequence: {
    why: "How do components interact at runtime?",
    todos: ["Draw happy-path sequence", "Draw error-path sequence",
            "Draw async/event sequence", "Identify timeout/retry points"],
    sections: ["Happy-path flow", "Error-path flow", "Async/event flow",
                "Timeout/retry", "Idempotency points"],
    next: "Network · physical topology",
  },
  network: {
    why: "What's the physical network topology?",
    todos: ["Diagram subnets + VPC layout", "List ingress + egress rules",
            "Specify DNS + load balancing", "Document network observability"],
    sections: ["Subnets + VPC", "Ingress rules", "Egress rules", "DNS + LB",
                "Network observability"],
    next: "API · external contract",
  },
  api: {
    why: "What's the external API contract?",
    todos: ["Generate OpenAPI spec", "Document auth flow", "Specify rate limits",
            "Document error envelope", "Define versioning strategy"],
    sections: ["OpenAPI spec link", "Authentication", "Rate limits",
                "Error envelope", "Versioning"],
    next: "DB schema · persistent state",
  },
  "db-schema": {
    why: "What's the data model?",
    todos: ["Diagram ER model", "List indexes per table", "Document migration history",
            "Specify retention + partitioning"],
    sections: ["ER diagram", "Table definitions", "Indexes",
                "Migration history", "Retention + partitioning"],
    next: "Runbook · ops procedures",
  },
  runbook: {
    why: "What does on-call do during incidents?",
    todos: ["Document 5-question runbook (§57.5)", "Define paging conditions",
            "Document rollback procedure", "List recovery RTO/RPO"],
    sections: ["5-question runbook", "Paging conditions", "Rollback procedure",
                "RTO / RPO", "Incident review template"],
    next: "KPI · what we measure",
  },
  kpi: {
    why: "What KPIs measure success?",
    todos: ["List primary KPIs (target + threshold)", "List secondary KPIs",
            "Define drift detection thresholds", "Specify alerting rules"],
    sections: ["Primary KPIs (with targets)", "Secondary KPIs",
                "Drift thresholds", "Alerting rules", "Reporting cadence"],
    next: "Capacity · scaling plan",
  },
  capacity: {
    why: "How will this scale?",
    todos: ["Baseline current load", "Forecast 12-month load",
            "Identify bottlenecks", "Plan capacity headroom"],
    sections: ["Current baseline load", "12-month forecast", "Bottlenecks",
                "Headroom strategy", "Auto-scaling rules"],
    next: "Roadmap · what's next quarter",
  },
  roadmap: {
    why: "What's planned for next 4 quarters?",
    todos: ["List Q+1 items", "List Q+2 items", "List Q+3 items", "List Q+4 items",
            "Mark dependencies between items"],
    sections: ["Q+1", "Q+2", "Q+3", "Q+4", "Cross-quarter dependencies"],
    next: "Stakeholders · who decides",
  },
  stakeholders: {
    why: "Who are the people · what's their role?",
    todos: ["Document RACI matrix", "List sponsors",
            "List consumers", "List producers"],
    sections: ["RACI matrix", "Sponsors", "Consumers", "Producers", "Approval chain"],
    next: "Exec Summary · 1-page for C-suite",
  },
  "executive-summary": {
    why: "Can a C-level read this in 60 seconds?",
    todos: ["Write 3-bullet problem statement", "Write 3-bullet solution",
            "Write 3-bullet expected outcome", "Add 3-tile dashboard mockup"],
    sections: ["Problem (3 bullets)", "Solution (3 bullets)", "Outcome (3 bullets)",
                "Dashboard mockup", "Investment ask"],
    next: "AI Strategy · 4P framing",
  },
  "ai-strategy": {
    why: "How does this fit the 4P AI strategy?",
    todos: ["People · what changes for the team?", "Process · what changes in workflow?",
            "Profit · what's the $ impact?", "Tech · what's the build/buy story?"],
    sections: ["People impact", "Process impact", "Profit impact", "Tech impact"],
    next: "Cost Analysis · TCO + payback",
  },
  "cost-analysis": {
    why: "What's the total cost of ownership?",
    todos: ["Build cost breakdown", "Run cost (cloud · LLM · ops)",
            "Personnel cost (build team · run team)",
            "Calculate break-even point"],
    sections: ["Build cost", "Run cost", "Personnel cost",
                "Break-even point", "5-year TCO"],
    next: "Hand-off to engineering",
  },
};

function SubSkeleton({ slug, sub }) {
  const sk = SKELETONS[slug] || {};
  return (
    <div>
      <InfoCard icon="💡" title={`What is ${sub?.label}?`} accent={sub?.color || '#3b82f6'}>
        <p style={{ margin: 0 }}>{sub?.desc}</p>
        <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>{sk.why}</p>
      </InfoCard>

      <InfoCard icon="📋" title="What this artifact will contain" accent={sub?.color || '#3b82f6'}>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {(sk.sections || []).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </InfoCard>

      <InfoCard icon="🔗" title="Hand-off" accent={sub?.color || '#3b82f6'}>
        <p style={{ margin: 0 }}>Next artifact: <strong>{sk.next || '—'}</strong></p>
      </InfoCard>

      <InfoCard icon="✏️" title="How to populate" accent="#94a3b8">
        <p style={{ margin: 0 }}>
          Edit <code>process.readme.{slug.replace(/-/g, '_')}</code> in
          <code> data/insurance/blueprint.json</code> to replace this skeleton
          with operator-confirmed content. The skeleton above shows what's
          expected · the TODO list at top shows what's pending.
        </p>
      </InfoCard>
    </div>
  );
}

function SubContent({ slug, sub, content }) {
  if (!content) return <SubSkeleton slug={slug} sub={sub} />;
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

  // Per operator 2026-06-09 ("when I click some card · then control go top"):
  // explicit scroll-to-top when activeSub changes.
  useEffect(() => {
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [activeSub]);

  const setSub = (slug) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', 'readme');
    if (slug) p.set('readme', slug); else p.delete('readme');
    setSearchParams(p);
  };

  const readme = proc.readme || {};
  const sub = activeSub ? README_SUBS.find((s) => s.slug === activeSub) : null;
  const content = activeSub ? readme[activeSub.replace(/-/g, '_')] : null;
  const sk = activeSub ? (SKELETONS[activeSub] || {}) : {};

  // ── Landing: hub card grid (no sub selected) ──────────────────────
  if (!activeSub) {
    // Group by phase per operator request for "journey flow on top"
    const phases = ['Discovery', 'Design', 'Build', 'Operate'];
    return (
      <div>
        {/* Journey-flow strip at top · horizontal step view */}
        <JourneyFlow
          steps={phases.map((p) => ({ slug: p, label: p, color: '#3b82f6' }))}
          currentSlug={null}
        />

        <InfoCard icon="ℹ️" title={`Architecture hub for ${proc.name}`} accent="#6b7280">
          22 design artifacts grouped into 4 phases. <strong>Click any card below</strong> to
          drill into that artifact · skeletons render even when blueprint data is missing
          so each artifact is differentiated by its TODO list + sections + hand-off.
        </InfoCard>

        <InfoCard icon="🎨" title="Visual key" accent="#94a3b8">
          <strong>Light-colored cards</strong> with "Click to open →" footer are CLICKABLE
          (action). <strong>White cards</strong> with "info-only" badge in the top-right
          are INFORMATION (no interaction). Hover state on clickable cards shows lift +
          deeper tint.
        </InfoCard>

        {phases.map((phase) => {
          const items = README_SUBS.filter((s) => s.phase === phase);
          return (
            <IPOSection
              key={phase}
              number={phases.indexOf(phase) + 1}
              kind={phase === 'Discovery' ? 'input' : phase === 'Operate' ? 'output' : 'process'}
              title={`Phase ${phases.indexOf(phase) + 1} · ${phase}`}
              subtitle={`${items.length} artifacts in this phase · click any card to open`}
            >
              <SubTabGrid subtabs={items} onSelect={setSub} columns={Math.min(items.length, 4)} />
            </IPOSection>
          );
        })}

        <TransactionalHistory rows={[]} tabName="readme" />
        <OutputEvaluation metrics={{}} tabName="readme" />
      </div>
    );
  }

  // ── Sub-section view ─────────────────────────────────────────────
  const phases = ['Discovery', 'Design', 'Build', 'Operate'];
  return (
    <div>
      {/* Journey-flow strip at top · current phase highlighted */}
      <JourneyFlow
        steps={phases.map((p) => ({ slug: p, label: p, color: '#3b82f6' }))}
        currentSlug={sub?.phase}
      />

      {/* TODO list FIRST per operator "todo must be top" */}
      <TodoList items={sk.todos || []} title={`TODO · what's pending for ${sub?.label}`} />

      <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setSub(null)}
          style={{
            padding: '6px 12px', fontSize: 12, fontWeight: 600,
            background: '#eff6ff', border: '1px solid #3b82f6',
            borderRadius: 4, color: '#1e40af', cursor: 'pointer',
          }}
          title="Back to Architecture hub"
        >
          ← Back to Architecture hub
        </button>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{sub?.icon} {sub?.label}</h3>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {sub?.desc} · Phase {phases.indexOf(sub?.phase) + 1} · {sub?.phase}
          </p>
        </div>
      </div>

      {/* Sub-tab bar (compact · clickable) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--spacing-md)' }}>
        {README_SUBS.map((s) => (
          <button
            key={s.slug}
            onClick={() => setSub(s.slug)}
            title={`Click · ${s.desc}`}
            style={{
              padding: '4px 8px', fontSize: 11, fontWeight: 600,
              borderRadius: 4, cursor: 'pointer',
              background: activeSub === s.slug ? s.color : `${s.color}15`,
              color: activeSub === s.slug ? '#fff' : s.color,
              border: `1px solid ${s.color}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <IPOSection number="1" kind="input" title="Input — Source data"
                  subtitle={`Pulled from process.readme.${activeSub.replace(/-/g, '_')}`}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Source: <code>process.readme.{activeSub.replace(/-/g, '_')}</code> in blueprint.
        </p>
      </IPOSection>

      <IPOSection number="2" kind="process" title={`Process — ${sub?.label}`}
                  subtitle={sk.why || sub?.desc}>
        <SubContent slug={activeSub} sub={sub} content={content} />
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Hand-off"
                  subtitle={`Next artifact: ${sk.next || '—'}`}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
          Hand-off: <strong>Tech stack</strong> · <strong>Manual/Automatic process</strong> ·
          <strong> Tests</strong> · related arch docs in this hub.
        </p>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName={`readme:${activeSub}`} />
      <OutputEvaluation metrics={{}} tabName={`readme:${activeSub}`} />
    </div>
  );
}
