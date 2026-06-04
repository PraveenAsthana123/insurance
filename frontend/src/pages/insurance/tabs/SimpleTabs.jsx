import { IPOSection, TransactionalHistory, OutputEvaluation, DerivedBadge } from './IPOLayout';

function EmptyState({ tabName }) {
  return (
    <div className="insurance-empty-state">
      [operator: <strong>{tabName}</strong> tab content pending]
      <br />
      Edit <code>data/insurance/blueprint.json</code> on the host to fill this in;
      run <code>scripts/insurance_enrich_processes.py</code> to seed structural defaults.
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      <h4 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </h4>
      {children}
    </div>
  );
}

// =========================================
// Phase 1: Orient
// =========================================

export function TechStackTab({ proc, dept }) {
  const ts = proc.tech_stack;
  if (!ts) return <EmptyState tabName="Tech stack" />;
  const cell = (label, items) => (
    <Field key={label} label={label}>
      {(items || []).length > 0
        ? <ul style={{ margin: 0, paddingLeft: 20 }}>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
        : <em>—</em>}
    </Field>
  );
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Stack inventory for <strong>{proc.name}</strong>. <DerivedBadge derived={!!ts.derived} />
      </p>

      <IPOSection number="1" kind="input" title="Input — Process requirements" subtitle="What this process needs from the runtime + which dept systems must integrate.">
        {cell('Process-specific systems', ts.process_specific_systems)}
        {cell('Data sources', ts.data)}
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Runtime stack" subtitle="UI + service + AI layers (per global §14 + §47).">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
          {cell('Frontend', ts.frontend)}
          {cell('Backend', ts.backend)}
          {cell('AI runtime', ts.ai_runtime)}
        </div>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Observability + ops" subtitle="Telemetry + monitoring surfaces produced by the stack.">
        {cell('Observability', ts.observability)}
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="tech-stack" />
      <OutputEvaluation metrics={{}} tabName="tech-stack" />
    </div>
  );
}

export function DemoStoryTab({ proc, dept }) {
  const ds = proc.demo_story;
  if (!ds) return <EmptyState tabName="Demo story" />;
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        30-second demo narrative for stakeholders. <DerivedBadge derived={!!ds.derived} />
      </p>

      <IPOSection number="1" kind="input" title="Input — Persona + scenario" subtitle="Who is this for and what business goal drives them.">
      <Field label="Persona">{ds.persona}</Field>
      <Field label="Scenario">{ds.scenario}</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Click-by-click walkthrough" subtitle="What the persona sees on screen, step by step.">
        <Field label="Walkthrough">
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {(ds.walkthrough || []).map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Pitch + demo URL" subtitle="What stakeholders walk away with.">
        <Field label="30-second pitch">{ds.pitch}</Field>
        <Field label="Demo URL pattern"><code>{ds.demo_url}</code></Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="demo-story" />
      <OutputEvaluation metrics={{}} tabName="demo-story" />
    </div>
  );
}

export function AsIsToBeTab({ proc, dept }) {
  const m = proc.manual_process;
  const a = proc.automatic_process;
  const delta = proc.as_is_to_be;
  if (!m && !a) return <EmptyState tabName="AS-IS → TO-BE" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — AS-IS (today)" subtitle="Manual workflow, actors, tools, pain points.">
        <div style={{ borderLeft: '4px solid var(--accent-warning)', paddingLeft: 'var(--spacing-md)' }}>
          <Field label="Summary">{m?.summary || '—'}</Field>
          <Field label="Actor archetypes">{(m?.actor_archetypes || []).join(' · ') || '—'}</Field>
          <Field label="Tools">{(m?.tools || []).join(' · ') || '—'}</Field>
          <Field label="Current pain">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(m?.current_pain || []).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Field>
        </div>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — TO-BE (with AI)" subtitle="AI agent chain replacing or augmenting the manual workflow.">
        <div style={{ borderLeft: '4px solid var(--accent-success)', paddingLeft: 'var(--spacing-md)' }}>
          <Field label="Summary">{a?.summary || '—'}</Field>
          <Field label="AI workflow">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {(a?.ai_workflow || []).map((ai, i) => <li key={i}>{ai}</li>)}
            </ol>
          </Field>
          <Field label="Human-in-the-loop">{a?.human_in_the_loop || '—'}</Field>
          <Field label="Scope grants">{a?.scope_grants || '—'}</Field>
        </div>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Delta + ROI" subtitle="What the transformation buys in actors freed + KPI gain + dollar ROI.">
        {delta ? (
          <>
            <Field label="Actors freed">{delta.deltas?.actors_freed || '—'}</Field>
            <Field label="AI capabilities added">{(delta.deltas?.ai_capabilities_added || []).join(' · ')}</Field>
            <Field label="KPI targets">{(delta.deltas?.kpi_targets || []).join(' · ')}</Field>
            <Field label="ROI estimate">{delta.roi_estimate}</Field>
            <DerivedBadge derived={!!delta.derived} />
          </>
        ) : <em>—</em>}
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="as-is-to-be" />
      <OutputEvaluation metrics={{}} tabName="as-is-to-be" />
    </div>
  );
}

// =========================================
// Phase 2: Understand
// =========================================

export function ProblemTab({ proc, dept }) {
  const issues = proc.issues || [];
  if (issues.length === 0) return <EmptyState tabName="Problem" />;
  const anyDerived = issues.some((i) => i && i.derived);
  const highImpactCount = issues.filter((i) => (i.impact || '').toLowerCase().includes('high') || (i.impact || '').includes('cycle')).length;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Pain signals collected" subtitle="Mission + raw operator/customer/regulator feedback that surfaced these issues.">
        <Field label="Mission context">{dept.mission}</Field>
        <Field label={`Issues detected (${issues.length})`}>
          {issues.length} pain points captured. {anyDerived && <DerivedBadge derived={true} />}
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Triage & impact analysis" subtitle="Each pain point ranked by business impact + linked to downstream tabs.">
        <table className="insurance-matrix">
          <thead><tr><th>#</th><th>Issue</th><th>Impact</th></tr></thead>
          <tbody>
            {issues.map((i, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{i.issue}{i.derived && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>(derived)</span>}</td>
                <td>{i.impact || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Prioritized backlog" subtitle="What feeds the AS-IS→TO-BE transformation plan.">
        <Field label={`High-impact items (${highImpactCount})`}>
          {highImpactCount > 0
            ? `${highImpactCount} of ${issues.length} flagged as cycle-time / accuracy / cost critical — drive the AS-IS→TO-BE TO-BE plan.`
            : 'No high-impact items detected — automation gain may be marginal.'}
        </Field>
        <Field label="Hand-off">
          Feeds: <strong>AS-IS → TO-BE</strong> (delta scoring) · <strong>Manual process</strong> (pain attribution) · <strong>Data</strong> (root-cause tracing).
        </Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="problem" />
      <OutputEvaluation metrics={{}} tabName="problem" />
    </div>
  );
}

export function DataTab({ proc, dept }) {
  const d = proc.data_process;
  if (!d) return <EmptyState tabName="Data" />;
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {d.summary} <DerivedBadge derived={!!d.derived} />
      </p>

      <IPOSection number="1" kind="input" title="Input — Data sources" subtitle="Producers · endpoints · formats · schema versions · SLAs (per §66.17).">
        <Field label={`Sources (${(d.input || []).length})`}>
          {(d.input || []).length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{d.input.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Source dept systems">
          {(dept.systems || []).slice(0, 5).join(' · ') || '—'}
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Transform" subtitle="Cleaning · feature engineering · encoding · validation (per §64.19 data-prep stack).">
        <Field label={`Transform steps (${(d.transform || []).length})`}>
          {(d.transform || []).length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{d.transform.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Refined datasets" subtitle="What downstream models / dashboards / agents consume.">
        <Field label={`Datasets produced (${(d.output || []).length})`}>
          {(d.output || []).length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{d.output.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Hand-off">
          Feeds: <strong>Manual process</strong> (human triage data) · <strong>Automatic process</strong> (AI features) · <strong>Output</strong> (downstream artifacts).
        </Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="data" />
      <OutputEvaluation metrics={{}} tabName="data" />
    </div>
  );
}

// =========================================
// Phase 3: Describe
// =========================================

export function ManualProcessTab({ proc, dept }) {
  const m = proc.manual_process;
  const dataIn = proc.data_process?.input || [];
  const dataOut = proc.data_process?.output || [];
  const issues = proc.issues || [];
  if (!m) return <EmptyState tabName="Manual process" />;
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {m.summary} <DerivedBadge derived={!!m.derived} />
      </p>

      <IPOSection number="1" kind="input" title="Input — Triggers & data sources" subtitle="What kicks off this manual workflow and what data the human starts with.">
        <Field label={`Actor archetypes (${(m.actor_archetypes || []).length})`}>
          {(m.actor_archetypes || []).join(' · ') || '—'}
        </Field>
        <Field label={`Data sources (${dataIn.length})`}>
          {dataIn.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{dataIn.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label={`Tools used (${(m.tools || []).length})`}>
          {(m.tools || []).join(' · ') || '—'}
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — How humans execute today" subtitle="Step-by-step AS-IS workflow with current pain points.">
        <Field label="Summary">{m.summary}</Field>
        <Field label={`Current pain (${(m.current_pain || []).length} item${(m.current_pain || []).length === 1 ? '' : 's'})`}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{(m.current_pain || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
        </Field>
        {issues.length > 0 && (
          <Field label={`Linked Problem-tab issues (${issues.length})`}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{issues.slice(0, 5).map((i, idx) => <li key={idx}>{i.issue}</li>)}</ul>
          </Field>
        )}
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Artifacts produced" subtitle="What lands downstream after the human completes a cycle.">
        <Field label={`Output artifacts (${dataOut.length})`}>
          {dataOut.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{dataOut.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Hand-off">
          Output flows into <strong>Automatic process</strong> tab (TO-BE AI orchestration) or into the next manual reviewer. See <strong>Output</strong> tab for downstream consumers.
        </Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="manual" />
      <OutputEvaluation metrics={{}} tabName="manual" />
    </div>
  );
}

function AILink({ aiType, baseHref }) {
  // baseHref like "/insurance/7/B2C/fnol-first-notice-of-loss"
  if (!baseHref) return <code>{aiType}</code>;
  return (
    <a
      href={`${baseHref}/ai/${encodeURIComponent(aiType)}?sub=data`}
      style={{
        color: 'var(--accent-primary)',
        textDecoration: 'none',
        fontWeight: 600,
      }}
      onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
      onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
    >
      {aiType}
    </a>
  );
}

export function AutomaticProcessTab({ proc, dept }) {
  const a = proc.automatic_process;
  const dataIn = proc.data_process?.input || [];
  const dataOut = proc.data_process?.output || [];
  if (!a) return <EmptyState tabName="Automatic process" />;
  const baseHref = typeof window !== 'undefined' ? window.location.pathname : null;
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {a.summary} <DerivedBadge derived={!!a.derived} />
      </p>

      <IPOSection number="1" kind="input" title="Input — Trigger & context" subtitle="Event source · upstream data · tenant context · scope token.">
        <Field label={`Data sources (${dataIn.length})`}>
          {dataIn.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{dataIn.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Scope grants">{a.scope_grants}</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — AI agent chain" subtitle="Per §64.40 10-layer agentic stack. Click any AI to drill into Data / Model / Accuracy / Benchmark / Stakeholder.">
        <Field label="Summary">{a.summary}</Field>
        <Field label={`AI workflow (${(a.ai_workflow || []).length} agents)`}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {(a.ai_workflow || []).map((ai, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <AILink aiType={ai} baseHref={baseHref} />
              </li>
            ))}
          </ol>
        </Field>
        <Field label="Human-in-the-loop">{a.human_in_the_loop}</Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Artifacts + audit row" subtitle="What the chain produces + the decision audit row written to §38.3 store.">
        <Field label={`Output artifacts (${dataOut.length})`}>
          {dataOut.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{dataOut.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Hand-off">
          Feeds: <strong>Output</strong> (downstream consumers) · <strong>Governance AI</strong> (decision audit) · <strong>ExpAI</strong> (per-prediction explanations).
        </Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="automatic" />
      <OutputEvaluation metrics={{}} tabName="automatic" />
    </div>
  );
}

// =========================================
// Phase 4: Ship
// =========================================

export function FlowDiagramTab({ proc, dept }) {
  const fd = proc.flow_diagram;
  if (!fd) return <EmptyState tabName="Flow diagram" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Process steps" subtitle="Linear sequence of actions feeding the diagram source.">
        <Field label="Format"><code>{fd.format || 'mermaid'}</code></Field>
        <Field label="Source steps">
          Pulled from <strong>Manual process</strong> + <strong>Automatic process</strong> tabs.
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Graph generation" subtitle="Mermaid diagram source (paste into mermaid.live to render).">
        <pre style={{
          padding: 'var(--spacing-sm)',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-xs)',
          overflow: 'auto',
          margin: 0,
        }}>
          <code>{fd.diagram || '—'}</code>
        </pre>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Rendered diagram" subtitle="Visual rendering surface (client-side renderer pending per global §47.1).">
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Paste source into <a href="https://mermaid.live" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>mermaid.live</a> to render.
        </p>
        <DerivedBadge derived={!!fd.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="flow-diagram" />
      <OutputEvaluation metrics={{}} tabName="flow-diagram" />
    </div>
  );
}

export function OutputTab({ proc, dept }) {
  const out = proc.output;
  const fallback = proc.data_process?.output;
  if (!out && !fallback) return <EmptyState tabName="Output" />;
  const artifacts = out?.artifacts || fallback || [];
  const consumers = out?.downstream_consumers || [];
  const auditFields = out?.audit_row_fields || [];
  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Process output catalog · downstream consumers · audit-row schema.
        {out && <DerivedBadge derived={!!out.derived} />}
      </p>

      <IPOSection number="1" kind="input" title="Input — Process result" subtitle="What the Manual or Automatic process tab produces internally.">
        <Field label="Source">
          From: <strong>Automatic process</strong> tab (AI chain output) OR <strong>Manual process</strong> tab (human-produced artifact).
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Packaging & distribution" subtitle="How artifacts are serialized + routed to consumers.">
        <Field label={`Artifacts (${artifacts.length})`}>
          {artifacts.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{artifacts.map((a, i) => <li key={i}>{a}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label={`Audit row schema (${auditFields.length} fields)`}>
          {auditFields.length > 0
            ? <code>{auditFields.join(', ')}</code>
            : <em>—</em>}
        </Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Downstream consumers" subtitle="Who picks this up next.">
        <Field label={`Consumers (${consumers.length})`}>
          {consumers.length > 0
            ? <ul style={{ margin: 0, paddingLeft: 20 }}>{consumers.map((c, i) => <li key={i}>{c}</li>)}</ul>
            : <em>—</em>}
        </Field>
        <Field label="Hand-off">
          Feeds: <strong>Visualization</strong> (chart-ready data) · <strong>Dashboard</strong> (KPI rollup) · external systems via API.
        </Field>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="output" />
      <OutputEvaluation metrics={{}} tabName="output" />
    </div>
  );
}

// =========================================
// Phase 5: Measure
// =========================================

export function VisualizationTab({ proc, dept }) {
  const v = proc.visualization;
  if (!v) return <EmptyState tabName="Visualization" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Metrics + dimensions" subtitle="What gets fed into the chart (axes + slicing).">
        <Field label="Axes">
          {v.axes ? (
            <table className="insurance-matrix">
              <tbody>
                {Object.entries(v.axes).map(([k, val]) => (
                  <tr key={k}><th>{k}</th><td>{val}</td></tr>
                ))}
              </tbody>
            </table>
          ) : '—'}
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Chart selection + rendering" subtitle="Per §64.39 chart vocabulary — right chart for right question.">
        <Field label="Primary chart">{v.primary_chart}</Field>
        <Field label="Chart library">{v.library}</Field>
        <Field label="Drill-down behaviour">{v.drill_down}</Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Visual surface" subtitle="Primary + supporting charts rendered to the operator.">
        <Field label={`Additional charts (${(v.additional_charts || []).length})`}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {(v.additional_charts || []).map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Field>
        <DerivedBadge derived={!!v.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="visualization" />
      <OutputEvaluation metrics={{}} tabName="visualization" />
    </div>
  );
}

export function DashboardTab({ proc, dept }) {
  const smart = proc.smart_kpi;
  if (!smart) return <EmptyState tabName="Dashboard" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — KPI streams" subtitle="Metrics collected from the Output + Visualization tabs.">
        <Field label="Source">
          Aggregated from <strong>Output</strong> tab artifacts + <strong>Visualization</strong> tab charts.
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — SMART scoring" subtitle="Specific · Measurable · Achievable · Relevant · Time-bound.">
        <table className="insurance-matrix">
          <tbody>
            <tr><th>Specific</th><td>{smart.specific}</td></tr>
            <tr><th>Measurable</th><td>{smart.measurable}</td></tr>
            <tr><th>Achievable</th><td>{smart.achievable}</td></tr>
            <tr><th>Relevant</th><td>{smart.relevant}</td></tr>
            <tr><th>Time-bound</th><td>{smart.time_bound}</td></tr>
          </tbody>
        </table>
        <DerivedBadge derived={!!smart.derived} />
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Dept KPI scorecard" subtitle="Rolled-up department KPIs this process contributes to.">
        <table className="insurance-matrix">
          <thead><tr><th>KPI</th><th>Expected improvement</th></tr></thead>
          <tbody>
            {(dept.kpi_improvements || []).map((k) => (
              <tr key={k.kpi}><td>{k.kpi}</td><td><strong>{k.improvement}</strong></td></tr>
            ))}
          </tbody>
        </table>
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="dashboard" />
      <OutputEvaluation metrics={{}} tabName="dashboard" />
    </div>
  );
}

// =========================================
// Phase 6: Govern
// =========================================

export function ResAITab({ proc, dept }) {
  const r = proc.responsible_ai;
  if (!r) return <EmptyState tabName="ResAI" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Predictions + protected attributes" subtitle="Decisions from the Automatic process feeding the fairness audit.">
        <Field label="Global policy">{r.global_policy}</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Fairness + bias audit" subtitle="Disparate impact ≥ 0.8 · equal-opportunity gap < 5% (per global §38 + §48.8).">
        <Field label="Fairness gate">{r.fairness_gate}</Field>
        <Field label="Equal opportunity gap">{r.equal_opportunity_gap}</Field>
        <Field label="Bias audit">{r.bias_audit}</Field>
        <Field label="Privacy">{r.privacy}</Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — ResAI score + audit row" subtitle="Pass/fail flag + persisted audit row schema.">
        <Field label="Audit-row fields">{(r.audit_row_fields || []).join(' · ')}</Field>
        <DerivedBadge derived={!!r.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="resai" />
      <OutputEvaluation metrics={{}} tabName="resai" />
    </div>
  );
}

export function ExpAITab({ proc, dept }) {
  const e = proc.explainable_ai;
  if (!e) return <EmptyState tabName="ExpAI" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Per-prediction artifacts" subtitle="Output of Automatic process tab + feature vectors.">
        <Field label="Global policy">{e.global_policy}</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Explanation methods" subtitle="SHAP · LIME · Integrated Gradients · counterfactual (per §48.2 + §64.21).">
        <Field label="Methods">
          <ul style={{ margin: 0, paddingLeft: 20 }}>{(e.methods || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Surfaced explanations" subtitle="Where explanations land + which decision-audit field they populate.">
        <Field label="Surface">{e.surface}</Field>
        <Field label="Audit field">{e.decision_audit_field}</Field>
        <DerivedBadge derived={!!e.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="expai" />
      <OutputEvaluation metrics={{}} tabName="expai" />
    </div>
  );
}

export function GovernanceAITab({ proc, dept }) {
  const g = proc.governance_ai;
  if (!g) return <EmptyState tabName="Governance AI" />;
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Decision + confidence" subtitle="Output of Automatic process tab carrying model score + scope token.">
        <Field label="Global policy">{g.global_policy}</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Rule + confidence routing" subtitle="Per §40 decision system: auto / review / reject based on confidence tiers.">
        <Field label="Decision layer">{g.decision_layer}</Field>
        <Field label="Confidence tiers">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(g.confidence_tiers || {}).map(([k, v]) => (
              <li key={k}><strong>{k.replace(/_/g, ' ')}</strong>: {v}</li>
            ))}
          </ul>
        </Field>
        <Field label="Scope grants">{g.scope_grants}</Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Audit row + rollback path" subtitle="Persistent decision record per §38.3 + reversal procedure.">
        <Field label="Rollback">{g.rollback}</Field>
        <DerivedBadge derived={!!g.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="governance" />
      <OutputEvaluation metrics={{}} tabName="governance" />
    </div>
  );
}

// =========================================
// Phase 7: Verify
// =========================================

export function TestsTab({ proc, dept }) {
  const t = proc.tests;
  if (!t) return <EmptyState tabName="Tests (API / Frontend / Backend)" />;
  const panel = (label, data) => (
    <div style={{
      padding: 'var(--spacing-sm)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-sm)',
      background: 'var(--bg-card)',
    }}>
      <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-primary)' }}>{label}</h4>
      <table className="insurance-matrix">
        <tbody>
          {Object.entries(data || {}).map(([k, v]) => (
            <tr key={k}>
              <th>{k.replace(/_/g, ' ')}</th>
              <td>{Array.isArray(v) ? v.join(' · ') : String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Test plan" subtitle="Per global §64.30 12-tier testing + §65.8 8-tier agent assignment.">
        <Field label="Test surfaces">API · Frontend · Backend · Drills (§43)</Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Test execution" subtitle="Pytest · Vitest · Playwright runners (wired via §65.8 dispatcher).">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {panel('API tests', t.api)}
          {panel('Frontend tests', t.frontend)}
          {panel('Backend tests', t.backend)}
        </div>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Pass/fail report" subtitle="Coverage % + failing tests + CI gate state.">
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Per global §73.11 + §64.30: counts are 0 by default. Wire to live test runners (pytest / vitest / playwright) to surface real numbers.
        </p>
        <DerivedBadge derived={!!t.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="tests" />
      <OutputEvaluation metrics={{}} tabName="tests" />
    </div>
  );
}

// =========================================
// Phase 8: Secure
// =========================================

export function SecurityTab({ proc, dept }) {
  const s = proc.security;
  if (!s) return <EmptyState tabName="Security (Authorization / RBAC / Threat model)" />;
  const panel = (label, data, tone) => (
    <div style={{
      padding: 'var(--spacing-sm)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-sm)',
      background: 'var(--bg-card)',
      borderLeft: `3px solid ${tone}`,
    }}>
      <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: tone }}>{label}</h4>
      <table className="insurance-matrix">
        <tbody>
          {Object.entries(data || {}).map(([k, v]) => (
            <tr key={k}>
              <th>{k.replace(/_/g, ' ')}</th>
              <td>{Array.isArray(v) ? v.join(' · ') : String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <IPOSection number="1" kind="input" title="Input — Incoming request" subtitle="Caller identity · scope token · tenant ID (per §57.6 canonical fields).">
        {panel('Authorization', s.authorization, 'var(--accent-primary)')}
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — RBAC + threat check" subtitle="Per §47.6 4-lens security: OWASP + STRIDE + DevSecOps + SOC2 CC6.2.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {panel('RBAC', s.rbac, 'var(--accent-warning)')}
          {panel('Threat model', s.threat_model, 'var(--accent-danger)')}
        </div>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Allow/deny + audit row" subtitle="Permission decision + auth event persisted per §38.3.">
        {panel('Auth audit', s.auth_audit, 'var(--accent-success)')}
        <DerivedBadge derived={!!s.derived} />
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="security" />
      <OutputEvaluation metrics={{}} tabName="security" />
    </div>
  );
}
