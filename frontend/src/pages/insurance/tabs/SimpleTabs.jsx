import { useMemo, useState } from 'react';
import {
  IPOSection, TransactionalHistory, OutputEvaluation, DerivedBadge,
  InfoCard, JourneyFlow, TodoList, TabShell,
} from './IPOLayout';
import CorrectionsPanel from '../../../components/CorrectionsPanel';
import AuditPanel from '../../../components/AuditPanel';
import HITLPanel from '../../../components/HITLPanel';
import FeedbackPanel from '../../../components/FeedbackPanel';
import ResponsibleAIPanel from '../../../components/ResponsibleAIPanel';
import ModelCardPanel from '../../../components/ModelCardPanel';
import CounterfactualPanel from '../../../components/CounterfactualPanel';
import CohortFairnessPanel from '../../../components/CohortFairnessPanel';
import TestStatusTier12Panel from '../../../components/TestStatusTier12Panel';
import RegulatoryMappingPanel from '../../../components/RegulatoryMappingPanel';
import RoleViewSelector from '../../../components/RoleViewSelector';
import ProcessComparePanel from '../../../components/ProcessComparePanel';
import ErrorBoundary from '../../../components/ErrorBoundary';
import ActivityLogPanel from '../../../components/ActivityLogPanel';
import PermalinkShare from '../../../components/PermalinkShare';
import DataPipelinePanel from '../../../components/DataPipelinePanel';
import ModelRegistryPanel from '../../../components/ModelRegistryPanel';
import ShapPanel from '../../../components/ShapPanel';
import { useInputEvent } from '../../../hooks/useInputEvent';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

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

function metricValue(seed, offset = 0, min = 20, range = 70) {
  const text = `${seed || 'process'}:${offset}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  }
  return min + (hash % range);
}

function ProcessChart({ title, data, color, type = 'bar' }) {
  return (
    <div style={{
      padding: 'var(--spacing-sm)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-sm)',
      background: 'var(--bg-card)',
    }}>
      <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function BeforeAfterDataVisualization({ proc }) {
  const dataProcess = proc.data_process || {};
  const asIsToBe = proc.as_is_to_be || {};
  const seed = proc.name;
  const before = [
    { name: 'Sources', value: (dataProcess.input || []).length || metricValue(seed, 1, 2, 6) },
    { name: 'Cleaning', value: (dataProcess.transform || []).length || metricValue(seed, 2, 2, 6) },
    { name: 'Outputs', value: (dataProcess.output || []).length || metricValue(seed, 3, 2, 6) },
    { name: 'Pain', value: (proc.issues || []).length || metricValue(seed, 4, 2, 8) },
  ];
  const after = [
    { name: 'Automation', value: (proc.automatic_process?.ai_workflow || []).length || metricValue(seed, 5, 3, 8) },
    { name: 'AI', value: (proc.ai || []).length || metricValue(seed, 6, 3, 8) },
    { name: 'KPI', value: (asIsToBe.deltas?.kpi_targets || []).length || metricValue(seed, 7, 2, 8) },
    { name: 'Artifacts', value: (proc.output?.artifacts || dataProcess.output || []).length || metricValue(seed, 8, 2, 8) },
  ];
  const trend = before.map((row, index) => ({
    name: row.name,
    before: row.value,
    after: after[index]?.value || row.value,
  }));
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-sm)' }}>
        <ProcessChart title="Before - AS-IS data load" data={before} color="#f59e0b" />
        <ProcessChart title="After - TO-BE AI-ready data" data={after} color="#10b981" />
      </div>
      <div style={{
        padding: 'var(--spacing-sm)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-sm)',
        background: 'var(--bg-card)',
      }}>
        <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-primary)' }}>
          Before vs After comparison
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
            <Line type="monotone" dataKey="before" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="after" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Values are derived from blueprint counts for sources, transform steps, outputs, issues, AI workflow, AI capabilities, KPI targets, and artifacts.
        </p>
      </div>
    </div>
  );
}


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function simulationBase(proc) {
  const seed = proc.name;
  const manualSteps = proc.manual_process?.steps?.length || proc.manual_process?.current_pain?.length || metricValue(seed, 21, 4, 9);
  const autoSteps = proc.automatic_process?.ai_workflow?.length || proc.ai?.length || metricValue(seed, 22, 3, 7);
  return {
    volume: metricValue(seed, 23, 120, 680),
    manualCycle: metricValue(seed, 24, 18, 90),
    autoCycle: metricValue(seed, 25, 4, 22),
    manualCost: metricValue(seed, 26, 18, 75),
    autoCost: metricValue(seed, 27, 5, 28),
    manualAccuracy: metricValue(seed, 28, 68, 18),
    autoAccuracy: metricValue(seed, 29, 86, 10),
    manualSteps,
    autoSteps,
  };
}

function runLocalSimulation(proc, params) {
  const base = simulationBase(proc);
  const volume = params.volume;
  const automation = params.automation / 100;
  const dataQuality = params.dataQuality / 100;
  const modelConfidence = params.modelConfidence / 100;
  const riskPressure = params.riskPressure / 100;
  const aiCoverage = clamp((proc.ai || []).length / 6, 0.35, 1.1);
  const qualityLift = 0.82 + dataQuality * 0.28;
  const confidenceLift = 0.8 + modelConfidence * 0.3;
  const riskDrag = 1 + riskPressure * 0.32;

  const beforeCycle = base.manualCycle * riskDrag;
  const afterCycle = base.autoCycle * (1.12 - automation * 0.42) / qualityLift;
  const beforeCost = base.manualCost * volume * riskDrag;
  const afterCost = base.autoCost * volume * (1.05 - automation * 0.34) / confidenceLift;
  const beforeAccuracy = clamp(base.manualAccuracy - riskPressure * 6, 50, 96);
  const afterAccuracy = clamp(base.autoAccuracy + dataQuality * 7 + modelConfidence * 5 + aiCoverage * 3 - riskPressure * 4, 65, 99);
  const beforeEscalations = Math.round(volume * (0.08 + riskPressure * 0.12));
  const afterEscalations = Math.round(beforeEscalations * (1 - automation * 0.52) * (1 - dataQuality * 0.2));
  const throughputBefore = Math.max(1, Math.round((480 / beforeCycle) * base.manualSteps));
  const throughputAfter = Math.max(1, Math.round((480 / afterCycle) * base.autoSteps * (1 + automation * 0.35)));

  return {
    kpis: [
      { name: 'Cycle min', before: Number(beforeCycle.toFixed(1)), after: Number(afterCycle.toFixed(1)) },
      { name: 'Cost $k', before: Number((beforeCost / 1000).toFixed(1)), after: Number((afterCost / 1000).toFixed(1)) },
      { name: 'Accuracy %', before: Number(beforeAccuracy.toFixed(1)), after: Number(afterAccuracy.toFixed(1)) },
      { name: 'Escalations', before: beforeEscalations, after: afterEscalations },
      { name: 'Throughput', before: throughputBefore, after: throughputAfter },
    ],
    summary: {
      volume,
      timeSavedPct: clamp(((beforeCycle - afterCycle) / beforeCycle) * 100, 0, 95),
      costSavedPct: clamp(((beforeCost - afterCost) / beforeCost) * 100, 0, 95),
      accuracyLift: afterAccuracy - beforeAccuracy,
      escalationReduction: beforeEscalations - afterEscalations,
      confidence: clamp((dataQuality * 0.38 + modelConfidence * 0.42 + automation * 0.2) * 100, 40, 99),
    },
    levers: [
      { name: 'Automation', value: params.automation },
      { name: 'Data quality', value: params.dataQuality },
      { name: 'Model confidence', value: params.modelConfidence },
      { name: 'Risk pressure', value: params.riskPressure },
    ],
  };
}

function SimulationChart({ title, data, bars = ['before', 'after'] }) {
  return (
    <div style={{
      padding: 'var(--spacing-sm)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-sm)',
      background: 'var(--bg-card)',
    }}>
      <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-primary)' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
          {bars.includes('before') && <Bar dataKey="before" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
          {bars.includes('after') && <Bar dataKey="after" fill="#10b981" radius={[4, 4, 0, 0]} />}
          {bars.includes('value') && <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimulationTab({ proc, dept }) {
  const [params, setParams] = useState({
    volume: simulationBase(proc).volume,
    automation: 72,
    dataQuality: 81,
    modelConfidence: 84,
    riskPressure: 38,
  });
  const result = useMemo(() => runLocalSimulation(proc, params), [proc, params]);

  // §51 GLOBAL_INPUT_PERSISTENCE_POLICY: capture meaningful simulation inputs.
  // Backend stamps tenant/actor/role/correlation; we send the user-visible state.
  const captureInput = useInputEvent({
    source_surface: 'insurance-process-tab',
    component_id: 'SimulationTab',
    department_id: dept?.id ? String(dept.id) : undefined,
    process_id: proc?.id || proc?.slug,
  });

  const update = (key, value) => {
    const next = { ...params, [key]: Number(value) };
    setParams(next);
    // Fire-and-forget · non-blocking · soft-fail per rule 9 (low-risk telemetry)
    captureInput({
      input_kind: 'simulation',
      input_name: key,
      payload: { ...next, changed: key, value: Number(value) },
      pii_classification: 'low',
      retention_class: 'transient',
      purpose: 'process_simulation_what_if',
    });
  };
  const asIsSteps = proc.manual_process?.steps || proc.manual_process?.current_pain || [];
  const toBeSteps = proc.automatic_process?.ai_workflow || [];
  const toBeDisplay = toBeSteps.length
    ? toBeSteps
    : (proc.ai || []).length
      ? (proc.ai || []).map((ai) => ai.ai_type)
      : ['AI intake', 'Model scoring', 'Policy guardrail check', 'Human approval'];

  const leverRows = result.levers.map((row) => ({ name: row.name, value: row.value }));

  return (
    <TabShell
      tabName="simulation"
      title="Simulation · interactive what-if + AS-IS vs TO-BE comparison"
      phase="Measure"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="scenario sliders · AS-IS steps · TO-BE AI steps · KPI lever strength · before/after metrics"
      operation="interactive · 5 sliders (volume · automation · data quality · model confidence · risk) · sends §51 input event per change"
      accent="#06b6d4"
      todos={[]}
    >
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Per-process simulation UI for <strong>{dept.name} / {proc.name}</strong>. It runs a deterministic local what-if model from the blueprint so every process has a usable simulator, even before backend reference engines are created.
      </p>

      <IPOSection number="1" kind="input" title="Input - Scenario controls" subtitle="Adjust process volume, automation, data quality, model confidence, and risk pressure.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Field label="Monthly cases">
            <input type="number" min="10" max="5000" value={params.volume} onChange={(e) => update('volume', e.target.value)} style={{ width: '100%' }} />
          </Field>
          {[
            ['automation', 'Automation %'],
            ['dataQuality', 'Data quality %'],
            ['modelConfidence', 'Model confidence %'],
            ['riskPressure', 'Risk pressure %'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="range" min="0" max="100" value={params[key]} onChange={(e) => update(key, e.target.value)} style={{ width: '100%' }} />
              <strong>{params[key]}%</strong>
            </Field>
          ))}
        </div>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process - Simulation model" subtitle="AS-IS manual flow compared with TO-BE AI-assisted flow.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Field label="AS-IS steps">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {(asIsSteps.length ? asIsSteps : ['Manual intake', 'Human review', 'Spreadsheet decision', 'Manager escalation']).slice(0, 6).map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </Field>
          <Field label="TO-BE AI steps">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {toBeDisplay.slice(0, 6).map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </Field>
        </div>
        <SimulationChart title="Scenario lever strength" data={leverRows} bars={['value']} />
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output - Simulation results" subtitle="Before/after KPI movement and decision evidence for this process.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          {[
            ['Time saved', `${result.summary.timeSavedPct.toFixed(1)}%`],
            ['Cost saved', `${result.summary.costSavedPct.toFixed(1)}%`],
            ['Accuracy lift', `+${result.summary.accuracyLift.toFixed(1)} pts`],
            ['Escalations avoided', result.summary.escalationReduction],
            ['Confidence', `${result.summary.confidence.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: 'var(--spacing-sm)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--accent-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
        <SimulationChart title="Before vs after KPI simulation" data={result.kpis} />
        <Field label="Decision recommendation">
          {result.summary.confidence >= 75 && result.summary.costSavedPct >= 20
            ? 'Proceed to controlled pilot with human approval gates and monitoring enabled.'
            : 'Hold for data-quality or model-confidence improvement before broad rollout.'}
        </Field>
      </IPOSection>

    </TabShell>
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
    <TabShell
      tabName="techstack"
      title="Tech stack · layer list + versions + chosen vs alternatives"
      phase="Orient"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="layers · versions · purpose · maturity · alternatives"
      operation="read-only · edit proc.tech_stack in blueprint.json"
      accent="#0ea5e9"
      todos={[]}
    >
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
    </TabShell>
  );}

export function DemoStoryTab({ proc, dept }) {
  const ds = proc.demo_story;
  if (!ds) return <EmptyState tabName="Demo story" />;
  return (
    <TabShell
      tabName="demostory"
      title="Demo story · stakeholder narrative + screenshots"
      phase="Orient"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="persona · scenario · walkthrough · pitch · screenshots"
      operation="read-only · edit proc.demo_story (separate from UserDemoTab)"
      accent="#d946ef"
      todos={[]}
    >
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
    </TabShell>
  );}

export function AsIsToBeTab({ proc, dept }) {
  const m = proc.manual_process;
  const a = proc.automatic_process;
  const delta = proc.as_is_to_be;
  if (!m && !a) return <EmptyState tabName="AS-IS → TO-BE" />;
  return (
    <TabShell
      tabName="asistobe"
      title="AS-IS / TO-BE · before vs after transformation"
      phase="Orient"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="actors freed · AI capabilities added · KPI targets · ROI"
      operation="read-only · edit proc.as_is_to_be in blueprint.json"
      accent="#3b82f6"
      todos={[]}
    >
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
    </TabShell>
  );}

// =========================================
// Phase 2: Understand
// =========================================

export function ProblemTab({ proc, dept }) {
  const issues = proc.issues || [];
  const anyDerived = issues.some((i) => i && i.derived);
  const highImpactCount = issues.filter((i) => (i.impact || '').toLowerCase().includes('high') || (i.impact || '').includes('cycle')).length;
  return (
    <TabShell
      tabName="problem"
      title="Problem statement · pain signals + triage + prioritized backlog"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship']}
      priority="P0"
      information="department mission · issue list · per-issue impact · high-impact count"
      operation="read-only · edit proc.issues in blueprint.json to add per-process pain points"
      accent="#ef4444"
      todos={[
        issues.length === 0 && 'Add ≥ 3 issues to proc.issues (issue + impact per row)',
        highImpactCount === 0 && issues.length > 0 && 'Mark at least one issue as high-impact',
        anyDerived && 'Replace derived issues with operator-confirmed ones',
      ].filter(Boolean)}
    >
      {issues.length === 0 ? (
        <InfoCard icon="📋" title="What this tab will contain (when populated)" accent="#ef4444">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><strong>Pain signals</strong>: operator/customer/regulator feedback per process</li>
            <li><strong>Issues table</strong>: # · issue text · impact (cycle time · accuracy · cost)</li>
            <li><strong>High-impact count</strong>: feeds AS-IS → TO-BE prioritization</li>
            <li><strong>Hand-off</strong>: AS-IS/TO-BE · Manual process · Data tabs</li>
          </ul>
        </InfoCard>
      ) : (
        <>
          <IPOSection number="1" kind="input" title="1. Input — Pain signals collected" subtitle="Mission + raw operator/customer/regulator feedback that surfaced these issues.">
            <Field label="Mission context">{dept.mission}</Field>
            <Field label={`Issues detected (${issues.length})`}>
              {issues.length} pain points captured. {anyDerived && <DerivedBadge derived={true} />}
            </Field>
          </IPOSection>

          <IPOSection number="2" kind="process" title="2. Process — Triage & impact analysis" subtitle="Each pain point ranked by business impact + linked to downstream tabs.">
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

          <IPOSection number="3" kind="output" title="3. Output — Prioritized backlog" subtitle="What feeds the AS-IS→TO-BE transformation plan.">
            <Field label={`High-impact items (${highImpactCount})`}>
              {highImpactCount > 0
                ? `${highImpactCount} of ${issues.length} flagged as cycle-time / accuracy / cost critical — drive the AS-IS→TO-BE TO-BE plan.`
                : 'No high-impact items detected — automation gain may be marginal.'}
            </Field>
            <Field label="Hand-off">
              Feeds: <strong>AS-IS → TO-BE</strong> (delta scoring) · <strong>Manual process</strong> (pain attribution) · <strong>Data</strong> (root-cause tracing).
            </Field>
          </IPOSection>
        </>
      )}
    </TabShell>
  );
}

export function DataTab({ proc, dept }) {
  const d = proc.data_process;
  if (!d) return <EmptyState tabName="Data" />;
  return (
    <TabShell
      tabName="data"
      title="Data · sources + schemas + sample rows + lineage"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="data sources · schema · sample rows · stats · lineage"
      operation="read-only · edit proc.data_process in blueprint.json"
      accent="#0ea5e9"
      todos={[]}
    >
      <ErrorBoundary label="DataPipelinePanel"><DataPipelinePanel accent="#0ea5e9" processId="fraud-ring-detection" /></ErrorBoundary>
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

      <IPOSection number="4" kind="output" title="Data visualization — Before vs After" subtitle="AS-IS data burden compared with TO-BE AI-ready outputs.">
        <BeforeAfterDataVisualization proc={proc} />
      </IPOSection>
    </TabShell>
  );}


export function ModelTab({ proc, dept, bp }) {
  const aiRows = (proc.ai || []).map((entry) => {
    const catalog = (bp?.ai_opportunities || []).find((row) => row.ai_type === entry.ai_type) || {};
    return { ...entry, catalog };
  });
  if (aiRows.length === 0) return <EmptyState tabName="Model" />;
  const chartData = aiRows.slice(0, 8).map((entry, index) => ({
    name: entry.ai_type?.split(' ')[0] || `AI ${index + 1}`,
    value: metricValue(`${proc.name}:${entry.ai_type}`, index, 65, 30),
  }));
  return (
    <TabShell
      tabName="model"
      title="Model · ML model cards + accuracy + latency + cost"
      phase="Build"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="model name · version · accuracy · latency · cost · rollback"
      operation="wire to MLflow registry (P0.3) · read-only here"
      accent="#0ea5e9"
      todos={[]}
    >
      <ErrorBoundary label="ModelCardPanel"><ModelCardPanel accent="#8b5cf6" modelName="fraud-ring-detection-v1" /></ErrorBoundary>
      <CohortFairnessPanel accent="#16a34a" modelName="fraud-ring-detection" />
      <ModelRegistryPanel accent="#0ea5e9" />
      <IPOSection number="1" kind="input" title="Input — Model candidates" subtitle="AI capabilities and catalog model metadata for this process.">
        <table className="insurance-matrix">
          <thead><tr><th>AI capability</th><th>Scenario</th><th>Model binding</th></tr></thead>
          <tbody>
            {aiRows.map((entry, index) => (
              <tr key={`${entry.ai_type}-${index}`}>
                <td>{entry.ai_type}</td>
                <td>{entry.scenario || entry.catalog.scenario || '-'}</td>
                <td>{entry.catalog.model ? 'blueprint.ai_opportunities[].model' : 'operator-pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Training and selection" subtitle="Data split, model family, tuning, and evaluation flow.">
        {aiRows.map((entry, index) => (
          <Field key={`${entry.ai_type}-model`} label={entry.ai_type || `AI ${index + 1}`}>
            {entry.catalog.model ? (
              <table className="insurance-matrix">
                <tbody>
                  {Object.entries(entry.catalog.model).filter(([k]) => !['derived', '_note'].includes(k)).map(([k, v]) => (
                    <tr key={k}><th>{k.replace(/_/g, ' ')}</th><td>{Array.isArray(v) ? v.join(' · ') : String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <em>Operator-pending model spec. Fill blueprint.ai_opportunities[].model for {entry.ai_type}.</em>
            )}
          </Field>
        ))}
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Model evaluation visualization" subtitle="Readiness score derived from available model/catalog metadata.">
        <ProcessChart title="Model readiness by capability" data={chartData} color="#8b5cf6" />
      </IPOSection>
    </TabShell>
  );}

export function AnalysisTab({ proc, dept }) {
  const issues = proc.issues || [];
  const deltas = proc.as_is_to_be?.deltas || {};
  const kpis = deltas.kpi_targets || [];
  const analysisRows = [
    { name: 'Issues', value: issues.length || metricValue(proc.name, 11, 2, 8) },
    { name: 'AI adds', value: (deltas.ai_capabilities_added || []).length || metricValue(proc.name, 12, 2, 8) },
    { name: 'KPI targets', value: kpis.length || metricValue(proc.name, 13, 2, 8) },
    { name: 'Artifacts', value: (proc.output?.artifacts || []).length || metricValue(proc.name, 14, 2, 8) },
  ];
  return (
    <TabShell
      tabName="analysis"
      title="Analysis · feature importance + SHAP + counterfactual"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="feature importance · SHAP top-10 · counterfactual"
      operation="wire SHAP backend (P0.4 · EU AI Act Art. 86 blocker)"
      accent="#dc2626"
      todos={[]}
    >
      <ShapPanel accent="#dc2626" modelName="analysis-model" />
      <IPOSection number="1" kind="input" title="Input — Business signals" subtitle="Issues, department mission, data process, and KPI targets.">
        <Field label="Department mission">{dept.mission}</Field>
        <Field label={`Issues (${issues.length})`}>
          {issues.length > 0 ? <ul style={{ margin: 0, paddingLeft: 20 }}>{issues.map((i, idx) => <li key={idx}>{i.issue} - {i.impact || 'impact pending'}</li>)}</ul> : <em>No issues listed.</em>}
        </Field>
      </IPOSection>

      <IPOSection number="2" kind="process" title="Process — Before/after analysis" subtitle="Transformation deltas, KPI targets, and ROI estimate.">
        <Field label="Actors freed">{deltas.actors_freed || '-'}</Field>
        <Field label="AI capabilities added">{(deltas.ai_capabilities_added || []).join(' · ') || '-'}</Field>
        <Field label="KPI targets">{kpis.join(' · ') || '-'}</Field>
        <Field label="ROI estimate">{proc.as_is_to_be?.roi_estimate || '-'}</Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title="Output — Analysis visualization" subtitle="Summary chart for issues, capabilities, KPIs, and artifacts.">
        <ProcessChart title="Analysis coverage" data={analysisRows} color="#f59e0b" />
      </IPOSection>
    </TabShell>
  );}


// =========================================
// UserDemoTab — DEMO walkthrough (persona · scenario · click-by-click)
// Per operator 2026-06-09 fix · UserDemo is the EXPERIENCE preview · separate from UserStory.
// Reads proc.demo_story (canonical) · falls back to differentiated skeleton if missing.
// =========================================
export function UserDemoTab({ proc, dept }) {
  const demo = proc.demo_story;

  // Per-tab TODO list (always visible at top per operator 'todo must be top')
  const todos = [
    !demo?.persona && 'Define demo persona (named operator · their role · who they report to)',
    !demo?.scenario && 'Write 1-paragraph business scenario',
    (!demo?.walkthrough || demo.walkthrough.length === 0) && 'Add ≥ 5 walkthrough steps (click-by-click)',
    !demo?.pitch && 'Write 30-second elevator pitch',
    !demo?.demo_url && 'Set demo URL pattern (e.g. /:dept/:proc?demo=1)',
  ].filter(Boolean);

  const demoMetrics = [
    { name: 'Steps', value: (demo?.walkthrough || []).length || metricValue(proc.name, 21, 3, 8) },
    { name: 'Data', value: (proc.data_process?.input || []).length || metricValue(proc.name, 22, 2, 8) },
    { name: 'AI', value: (proc.ai || []).length || metricValue(proc.name, 23, 2, 8) },
    { name: 'Outputs', value: (proc.output?.artifacts || proc.data_process?.output || []).length || metricValue(proc.name, 24, 2, 8) },
  ];

  return (
    <div>
      {/* JourneyFlow horizontal · DEMO is in 'Orient' phase per §73 */}
      <JourneyFlow
        steps={[
          { slug: 'orient', label: 'Orient (Demo HERE)', color: '#d946ef' },
          { slug: 'understand', label: 'Understand', color: '#3b82f6' },
          { slug: 'describe', label: 'Describe', color: '#8b5cf6' },
          { slug: 'ship', label: 'Ship', color: '#10b981' },
        ]}
        currentSlug="orient"
      />

      {/* TODO at top */}
      <TodoList items={todos} title={`TODO · pending for ${proc.name} demo`} />

      {/* INFO card: what this tab IS for · clarity on info vs action */}
      <InfoCard icon="🎬" title="What this tab shows" accent="#d946ef">
        <strong>Customer experience preview.</strong> A click-by-click walkthrough of how a stakeholder
        would EXPERIENCE this process via the AI-augmented flow. Different from User Story (which is
        the As-a/I-want/So-that statement) and AS-IS/TO-BE (which are operational diagrams).
        <br /><br />
        <strong>Sequence</strong>: Orient → Understand → Describe → Ship · this tab is in Orient.
        <br />
        <strong>Priority</strong>: HIGH · customers cannot SEE the value without the demo.
        <br />
        <strong>Information</strong>: persona · scenario · walkthrough · pitch (all read-only here).
        <br />
        <strong>Operation</strong>: click any step number in walkthrough to jump to that screen (when wired).
      </InfoCard>

      {demo ? (
        <>
          <IPOSection number="1" kind="input" title={`1. Persona & Scenario for ${proc.name}`}
                      subtitle="Who is this demo for · what business situation does it cover">
            <Field label="Persona">{demo.persona || 'Operator persona pending'}</Field>
            <Field label="Department">{dept.name}</Field>
            <Field label="Scenario">{demo.scenario || '-'}</Field>
          </IPOSection>

          <IPOSection number="2" kind="process" title="2. Walkthrough — click-by-click"
                      subtitle="Each step is a screen / action the demo audience sees">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {(demo.walkthrough || []).map((step, index) => <li key={index}>{step}</li>)}
            </ol>
            {(demo.walkthrough || []).length === 0 && <em>Operator-pending walkthrough.</em>}
          </IPOSection>

          <IPOSection number="3" kind="output" title="3. Result — Pitch & demo URL"
                      subtitle="30-second elevator pitch + demo URL pattern + readiness chart">
            <Field label="30-second pitch">{demo.pitch || '-'}</Field>
            <Field label="Demo URL pattern"><code>{demo.demo_url || '-'}</code></Field>
            <ProcessChart title="Demo readiness" data={demoMetrics} color="#d946ef" />
            <DerivedBadge derived={!!demo.derived} />
          </IPOSection>
        </>
      ) : (
        <>
          <InfoCard icon="📋" title="What this artifact will contain (when populated)" accent="#d946ef">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><strong>Persona</strong>: named operator + their role (e.g. "Sarah · Claims Adjuster")</li>
              <li><strong>Scenario</strong>: business situation (e.g. "Auto claim · BI severity")</li>
              <li><strong>Walkthrough</strong>: 5-10 click steps (e.g. "1. Open claim. 2. AI surfaces fraud score. 3. ...")</li>
              <li><strong>30-second pitch</strong>: elevator narrative for board</li>
              <li><strong>Demo URL pattern</strong>: how to start the demo · /:dept/:proc?demo=1</li>
            </ul>
          </InfoCard>
          <InfoCard icon="✏️" title="How to populate" accent="#94a3b8">
            Edit <code>process.demo_story</code> in <code>data/insurance/blueprint.json</code>.
            Each process has its OWN demo. When the field is missing, this tab shows you
            the skeleton above so the operator knows what's expected.
          </InfoCard>
        </>
      )}

      <TransactionalHistory rows={[]} tabName="user-demo" />
      <OutputEvaluation metrics={{}} tabName="user-demo" />
    </div>
  );
}

// =========================================
// UserStoryTab — As-a / I-want / So-that statement + acceptance criteria
// Per operator 2026-06-09 fix · UserStory is the AGREEMENT (what + why) ·
// DIFFERENT from UserDemo (the experience preview).
// Reads proc.user_story (DEDICATED field · prevents content correlation bug).
// Falls back to demo_story persona if user_story missing (legacy).
// =========================================
export function UserStoryTab({ proc, dept }) {
  const story = proc.user_story || {};
  const legacyDemo = proc.demo_story || {};
  const manual = proc.manual_process || {};

  // Synthesize role/want/so_that from new field or legacy fallback
  const role = story.role || legacyDemo.persona || 'Operator';
  const wants = story.i_want || story.want || (manual.summary ? `to ${manual.summary.toLowerCase()}` : null);
  const so_that = story.so_that || story.so_that_we_can || null;

  // Per-tab TODO list at top
  const todos = [
    !story.role && 'Define "As a [role]" · who is the primary user',
    !story.i_want && 'Define "I want [outcome]" · what they need to accomplish',
    !story.so_that && 'Define "So that [value]" · WHY · business impact',
    (!story.acceptance_criteria || story.acceptance_criteria.length === 0) && 'Add Given/When/Then acceptance criteria (≥ 3)',
    !story.priority && 'Set priority (P0 / P1 / P2 / P3)',
    !story.estimate_points && 'Add story point estimate (1 · 2 · 3 · 5 · 8 · 13)',
  ].filter(Boolean);

  // Default acceptance criteria (derived if blueprint missing)
  const acceptance = story.acceptance_criteria || [
    `Given ${dept.name}, when the user starts ${proc.name}, then the system shows the current AS-IS process and pain points.`,
    'Given required data is present, when AI automation runs, then output artifacts and audit rows are produced.',
    'Given a decision is generated, when governance checks complete, then ResAI and ExpAI evidence is visible.',
  ];

  return (
    <div>
      <JourneyFlow
        steps={[
          { slug: 'orient', label: 'Orient', color: '#3b82f6' },
          { slug: 'understand', label: 'Understand (Story HERE)', color: '#8b5cf6' },
          { slug: 'describe', label: 'Describe', color: '#a855f7' },
          { slug: 'ship', label: 'Ship', color: '#10b981' },
        ]}
        currentSlug="understand"
      />

      <TodoList items={todos} title={`TODO · pending for ${proc.name} user story`} />

      <InfoCard icon="📝" title="What this tab shows" accent="#8b5cf6">
        <strong>The user-story AGREEMENT</strong> · the As-a/I-want/So-that statement +
        acceptance criteria the engineering team will deliver against. Different from
        User Demo (which is the click-by-click experience preview).
        <br /><br />
        <strong>Sequence</strong>: Discovery → Story → Build · this tab is in Discovery/Understand.
        <br />
        <strong>Priority</strong>: MUST · cannot ship without acceptance criteria.
        <br />
        <strong>Information</strong>: role · want · so-that · acceptance criteria · priority · estimate.
        <br />
        <strong>Operation</strong>: read-only here · edit in <code>data/insurance/blueprint.json</code>.
      </InfoCard>

      <IPOSection number="1" kind="input" title="1. As a [role]"
                  subtitle="WHO is the primary user of this process">
        <Field label="Role">{role}</Field>
        <Field label="Department">{dept.name}</Field>
        {story.persona && <Field label="Persona note">{story.persona}</Field>}
      </IPOSection>

      <IPOSection number="2" kind="process" title={`2. I want ${wants ? '...' : '[outcome]'}`}
                  subtitle="WHAT outcome the user needs to accomplish">
        <Field label="I want">
          {wants || <em>Operator-pending · add proc.user_story.i_want in blueprint.</em>}
        </Field>
        <Field label={`Acceptance criteria (${acceptance.length})`}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {acceptance.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </Field>
      </IPOSection>

      <IPOSection number="3" kind="output" title={`3. So that ${so_that ? '...' : '[business value]'}`}
                  subtitle="WHY · the business value · the WHY behind the WHAT">
        <Field label="So that">
          {so_that || <em>Operator-pending · add proc.user_story.so_that in blueprint.</em>}
        </Field>
        {story.priority && <Field label="Priority"><strong>{story.priority}</strong></Field>}
        {story.estimate_points && <Field label="Story points">{story.estimate_points}</Field>}
      </IPOSection>

      <TransactionalHistory rows={[]} tabName="user-story" />
      <OutputEvaluation metrics={{}} tabName="user-story" />
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
    <TabShell
      tabName="manualprocess"
      title="Manual process · AS-IS workflow + pain points"
      phase="Describe"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="actor archetypes · data sources · tools · current pain"
      operation="read-only · edit proc.manual_process in blueprint.json"
      accent="#a855f7"
      todos={[]}
    >
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
    </TabShell>
  );}

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
    <TabShell
      tabName="automaticprocess"
      title="Automatic process · TO-BE AI workflow + HITL points"
      phase="Describe"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="AI steps · HITL touchpoints · automation %"
      operation="read-only · edit proc.automatic_process in blueprint.json"
      accent="#10b981"
      todos={[]}
    >
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
    </TabShell>
  );}

// =========================================
// Phase 4: Ship
// =========================================

export function FlowDiagramTab({ proc, dept }) {
  const fd = proc.flow_diagram;
  if (!fd) return <EmptyState tabName="Flow diagram" />;
  return (
    <TabShell
      tabName="flowdiagram"
      title="Flow diagram · manual vs auto Mermaid side-by-side"
      phase="Ship"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="mermaid renderer · 2 diagrams (AS-IS + TO-BE)"
      operation="read-only · edit proc.flow_diagram_mermaid in blueprint.json"
      accent="#a855f7"
      todos={[]}
    >
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
    </TabShell>
  );}

export function OutputTab({ proc, dept }) {
  const out = proc.output;
  const fallback = proc.data_process?.output;
  if (!out && !fallback) return <EmptyState tabName="Output" />;
  const artifacts = out?.artifacts || fallback || [];
  const consumers = out?.downstream_consumers || [];
  const auditFields = out?.audit_row_fields || [];
  return (
    <TabShell
      tabName="output"
      title="Output · artifacts produced + downstream consumers"
      phase="Ship"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="artifact list · format · downstream services"
      operation="read-only · edit proc.output in blueprint.json"
      accent="#10b981"
      todos={[]}
    >
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
    </TabShell>
  );}

// =========================================
// Phase 5: Measure
// =========================================

export function VisualizationTab({ proc, dept }) {
  const v = proc.visualization;
  if (!v) return <EmptyState tabName="Visualization" />;
  return (
    <TabShell
      tabName="visualization"
      title="Visualization · per-process charts (4-7)"
      phase="Measure"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="recharts library · per-metric chart"
      operation="read-only · edit proc.charts in blueprint.json"
      accent="#06b6d4"
      todos={[]}
    >
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

      <IPOSection number="4" kind="output" title="Before/after visualization" subtitle="AS-IS data burden and TO-BE AI-ready data shown in chart form.">
        <BeforeAfterDataVisualization proc={proc} />
      </IPOSection>
    </TabShell>
  );}

export function DashboardTab({ proc, dept }) {
  const smart = proc.smart_kpi;
  if (!smart) return <EmptyState tabName="Dashboard" />;
  return (
    <TabShell
      tabName="dashboard"
      title="Dashboard · KPI tiles + target + baseline + delta"
      phase="Measure"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="KpiStrip · trend (12 weeks) · alert rules"
      operation="read-only · edit proc.dashboard in blueprint.json"
      accent="#0ea5e9"
      todos={[]}
    >
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
    </TabShell>
  );}

// =========================================
// Phase 6: Govern
// =========================================

export function ResAITab({ proc, dept }) {
  const r = proc.responsible_ai;
  return (
    <TabShell
      tabName="resai"
      title="Responsible AI · fairness + bias + privacy audit"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="global policy · fairness gate · equal-opportunity gap · bias audit · privacy class · audit-row schema"
      operation="read-only · edit proc.responsible_ai in blueprint.json · backend governance wire pending"
      accent="#dc2626"
      todos={[
        !r && 'Add proc.responsible_ai with shape {global_policy, fairness_gate, equal_opportunity_gap, bias_audit, privacy, audit_row_fields}',
        r && !r.fairness_gate && 'Specify fairness gate (e.g. disparate impact ≥ 0.8)',
        r && !r.bias_audit && 'Document bias audit method',
        r && !r.privacy && 'Set privacy class (PII · PHI · PCI · public)',
      ].filter(Boolean)}
    >
      {!r ? (
        <InfoCard icon="⚖️" title="What this tab will contain (when populated)" accent="#dc2626">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><strong>Global RAI policy</strong>: per §76 5-pillar framework</li>
            <li><strong>Fairness gate</strong>: disparate impact ≥ 0.8 · equal-opportunity gap &lt; 5%</li>
            <li><strong>Bias audit</strong>: per global §48.8</li>
            <li><strong>Privacy class</strong>: PII · PHI · PCI · public</li>
            <li><strong>Audit-row fields</strong>: what gets persisted per §38.3</li>
          </ul>
        </InfoCard>
      ) : (
        <>
          <IPOSection number="1" kind="input" title="1. Input — Predictions + protected attributes" subtitle="Decisions from the Automatic process feeding the fairness audit.">
            <Field label="Global policy">{r.global_policy}</Field>
          </IPOSection>

          <IPOSection number="2" kind="process" title="2. Process — Fairness + bias audit" subtitle="Disparate impact ≥ 0.8 · equal-opportunity gap < 5% (per global §38 + §48.8).">
            <Field label="Fairness gate">{r.fairness_gate}</Field>
            <Field label="Equal opportunity gap">{r.equal_opportunity_gap}</Field>
            <Field label="Bias audit">{r.bias_audit}</Field>
            <Field label="Privacy">{r.privacy}</Field>
          </IPOSection>

          <IPOSection number="3" kind="output" title="3. Output — ResAI score + audit row" subtitle="Pass/fail flag + persisted audit row schema.">
            <Field label="Audit-row fields">{(r.audit_row_fields || []).join(' · ')}</Field>
            <DerivedBadge derived={!!r.derived} />
          </IPOSection>
        </>
      )}
    </TabShell>
  );
}

export function ExpAITab({ proc, dept }) {
  const e = proc.explainable_ai;
  return (
    <TabShell
      tabName="expai"
      title="Explainable AI · SHAP · LIME · Integrated Gradients · counterfactual"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="explanation methods · per-prediction surface · decision audit field per §38.3 + §48.5"
      operation="read-only · edit proc.explainable_ai in blueprint.json · SHAP backend wire pending (EU AI Act Art. 86 blocker)"
      accent="#dc2626"
      todos={[
        !e && 'Add proc.explainable_ai with shape {global_policy, methods, surface, decision_audit_field}',
        e && (!e.methods || e.methods.length === 0) && 'List ≥ 2 explanation methods (SHAP · LIME · IG · counterfactual)',
        e && !e.surface && 'Specify where explanation surfaces (UI tile · audit row · API)',
        'Wire backend SHAP endpoint (P0.4 · EU AI Act Art. 86 requirement)',
      ].filter(Boolean)}
    >
      {!e ? (
        <InfoCard icon="🔍" title="What this tab will contain (when populated)" accent="#dc2626">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><strong>Explanation methods</strong>: SHAP global + local · LIME · IG · counterfactual</li>
            <li><strong>Surface</strong>: where explanations land (audit row · UI tile · API field)</li>
            <li><strong>Decision audit field</strong>: which §38.3 field this populates</li>
            <li><strong>EU AI Act Art. 86 compliance</strong>: right to explanation</li>
          </ul>
        </InfoCard>
      ) : (
        <>
          <IPOSection number="1" kind="input" title="1. Input — Per-prediction artifacts" subtitle="Output of Automatic process tab + feature vectors.">
            <Field label="Global policy">{e.global_policy}</Field>
          </IPOSection>

          <IPOSection number="2" kind="process" title="2. Process — Explanation methods" subtitle="SHAP · LIME · Integrated Gradients · counterfactual (per §48.2 + §64.21).">
            <Field label="Methods">
              <ul style={{ margin: 0, paddingLeft: 20 }}>{(e.methods || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
            </Field>
          </IPOSection>

          <IPOSection number="3" kind="output" title="3. Output — Surfaced explanations" subtitle="Where explanations land + which decision-audit field they populate.">
            <Field label="Surface">{e.surface}</Field>
            <Field label="Audit field">{e.decision_audit_field}</Field>
            <DerivedBadge derived={!!e.derived} />
          </IPOSection>
        </>
      )}
    </TabShell>
  );
}

export function GovernanceAITab({ proc, dept }) {
  const g = proc.governance_ai;
  return (
    <TabShell
      tabName="governance"
      title="Governance AI · rule + confidence routing + scope grants + rollback"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="decision layer · confidence tiers · scope grants · rollback procedure · audit row schema"
      operation="read-only · edit proc.governance_ai in blueprint.json · audit DB wire pending (SOC2 CC6.6 blocker)"
      accent="#dc2626"
      todos={[
        !g && 'Add proc.governance_ai with shape {global_policy, decision_layer, confidence_tiers, scope_grants, rollback}',
        g && !g.decision_layer && 'Document decision layer per §40 (rule + confidence + HITL)',
        g && (!g.confidence_tiers || Object.keys(g.confidence_tiers).length === 0) && 'Define ≥ 3 confidence tiers (auto · review · reject)',
        g && !g.rollback && 'Document rollback procedure for reversible decisions',
        'Wire backend audit-DB endpoint (P0 · SOC2 CC6.6 audit trail requirement)',
      ].filter(Boolean)}
    >
            <CorrectionsPanel accent="#dc2626" />
      
      <AuditPanel accent="#dc2626" />
      <ErrorBoundary label="HITLPanel"><HITLPanel accent="#d97706" /></ErrorBoundary>
      <FeedbackPanel accent="#8b5cf6" />
      <ErrorBoundary label="ResponsibleAIPanel"><ResponsibleAIPanel accent="#dc2626" processId="fraud-ring-detection" /></ErrorBoundary>{!g ? (
        <InfoCard icon="🏛️" title="What this tab will contain (when populated)" accent="#dc2626">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li><strong>Decision layer</strong>: per §40 (rule + confidence + HITL)</li>
            <li><strong>Confidence tiers</strong>: auto-execute · agent-review · human-approval · reject (per T7.9)</li>
            <li><strong>Scope grants</strong>: per §47.6 SOC2 CC6.2 RBAC</li>
            <li><strong>Rollback procedure</strong>: how to reverse a wrong decision</li>
            <li><strong>Audit row</strong>: §38.3 schema · what gets persisted per decision</li>
          </ul>
        </InfoCard>
      ) : (
        <>
          <IPOSection number="1" kind="input" title="1. Input — Decision + confidence" subtitle="Output of Automatic process tab carrying model score + scope token.">
            <Field label="Global policy">{g.global_policy}</Field>
          </IPOSection>

          <IPOSection number="2" kind="process" title="2. Process — Rule + confidence routing" subtitle="Per §40 decision system: auto / review / reject based on confidence tiers.">
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

          <IPOSection number="3" kind="output" title="3. Output — Audit row + rollback path" subtitle="Persistent decision record per §38.3 + reversal procedure.">
            <Field label="Rollback">{g.rollback}</Field>
            <DerivedBadge derived={!!g.derived} />
          </IPOSection>
        </>
      )}
    </TabShell>
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
    <TabShell
      tabName="tests"
      title="Tests · API · Frontend · Backend · Drills (§43)"
      phase="Verify"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="test surfaces · pytest · vitest · playwright runners"
      operation="read-only · wire §65.8 dispatcher to get real counts"
      accent="#f59e0b"
      todos={[]}
    >
      <RoleViewSelector accent="#475569" />
      <ErrorBoundary label="TestStatusTier12Panel"><TestStatusTier12Panel accent="#0ea5e9" processId="fraud-ring-detection" /></ErrorBoundary>
      <ErrorBoundary label="ResponsibleAIPanel"><ResponsibleAIPanel accent="#dc2626" processId="fraud-ring-detection" /></ErrorBoundary>
      <RegulatoryMappingPanel accent="#dc2626" processId="fraud-ring-detection" />
      <ActivityLogPanel accent="#475569" />
      <ProcessComparePanel accent="#8b5cf6" />
      <ShapPanel accent="#dc2626" modelName="expai-model" />
      <CounterfactualPanel accent="#dc2626" modelName="expai-model" />
      <ErrorBoundary label="ResponsibleAIPanel"><ResponsibleAIPanel accent="#dc2626" processId="fraud-ring-detection" /></ErrorBoundary>
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
    </TabShell>
  );}

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
    <TabShell
      tabName="security"
      title="Security · authorization + RBAC + threat model + auth audit"
      phase="Secure"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="caller identity · scope token · tenant ID · RBAC · STRIDE per container · auth audit row"
      operation="read-only · edit proc.security in blueprint.json · Presidio DLP wired (T6.10) · STRIDE pending"
      accent="#dc2626"
      todos={[
        !s.authorization && 'Document authorization scheme (Bearer + scope token)',
        !s.rbac && 'List RBAC roles + permissions',
        !s.threat_model && 'Add STRIDE threat model entries',
        !s.auth_audit && 'Define auth audit row schema',
      ].filter(Boolean)}
    >
      <IPOSection number="1" kind="input" title="1. Input — Incoming request" subtitle="Caller identity · scope token · tenant ID (per §57.6 canonical fields).">
        {panel('Authorization', s.authorization, 'var(--accent-primary)')}
      </IPOSection>

      <IPOSection number="2" kind="process" title="2. Process — RBAC + threat check" subtitle="Per §47.6 4-lens security: OWASP + STRIDE + DevSecOps + SOC2 CC6.2.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {panel('RBAC', s.rbac, 'var(--accent-warning)')}
          {panel('Threat model', s.threat_model, 'var(--accent-danger)')}
        </div>
      </IPOSection>

      <IPOSection number="3" kind="output" title="3. Output — Allow/deny + audit row" subtitle="Permission decision + auth event persisted per §38.3.">
        {panel('Auth audit', s.auth_audit, 'var(--accent-success)')}
        <DerivedBadge derived={!!s.derived} />
      </IPOSection>
    </TabShell>
  );
}
