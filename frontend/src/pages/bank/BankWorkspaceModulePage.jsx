import { Link, useSearchParams } from 'react-router-dom';

const MODULES = {
  'eai-os': {
    title: 'Enterprise AI OS',
    section: 'Platform module',
    objective: 'Review the nine-layer enterprise AI operating system without leaving the bank workspace shell.',
    rows: ['Layer map', 'Governance checkpoints', 'Operating model actions'],
  },
  itsm: {
    title: 'ITSM',
    section: 'Platform module',
    objective: 'Track incidents, L2 RCA, priority events, and support workflows in the workspace pane.',
    rows: ['Incident queue', 'RCA status', 'P1 response controls'],
  },
  prompts: {
    title: 'Conversation log',
    section: 'Platform module',
    objective: 'Review prompt history, operator inputs, and response trace context from one fixed workspace.',
    rows: ['Prompt timeline', 'Saved input policy', 'Trace review'],
  },
  platform: {
    title: 'Platform Explorer',
    section: 'Platform module',
    objective: 'Inspect API, model, tool, and workflow inventory without replacing the main and sub menu.',
    rows: ['API inventory', 'Tool coverage', 'Workflow catalog'],
  },
  'ai-types': {
    title: 'AI Types catalog',
    section: 'AI catalog',
    objective: 'Review AI type coverage by domain while keeping navigation and submenu context fixed.',
    rows: ['B2C AI types', 'B2B AI types', 'B2E AI types'],
  },
  processes: {
    title: 'Process Resilience',
    section: 'Platform module',
    objective: 'Monitor live process health, threshold states, and resilience controls inside the content pane.',
    rows: ['Process health', 'Threshold status', 'Recovery actions'],
  },
  chatgroup: {
    title: 'ChatGroup',
    section: 'Collaboration module',
    objective: 'Coordinate human and agent room activity from the bank workspace.',
    rows: ['Room status', 'Agent handoff', 'Action history'],
  },
  'control-tower': {
    title: 'AI Control Tower',
    section: 'Monitoring module',
    objective: 'Review the command dashboards, risk indicators, and control tasks without shell navigation changes.',
    rows: ['Dashboard status', 'Risk queue', 'Control checklist'],
  },
  stt: {
    title: 'Speech-to-Text',
    section: 'AI service',
    objective: 'Review audio/video transcription intake and output checks from the workspace.',
    rows: ['Input source', 'Transcription job', 'Output quality'],
  },
  tts: {
    title: 'Text-to-Speech',
    section: 'AI service',
    objective: 'Review speech generation setup, run state, and output review in one row-based workspace.',
    rows: ['Text input', 'Voice settings', 'Generated output'],
  },
  notifications: {
    title: 'Notification Center',
    section: 'Operations module',
    objective: 'Track notification rules, delivery status, and retry actions inside the bank shell.',
    rows: ['Rule inventory', 'Delivery status', 'Retry action'],
  },
  'feature-flags': {
    title: 'Feature Flags',
    section: 'Release module',
    objective: 'Review feature rollout state, owner, and activation controls without leaving the bank workspace.',
    rows: ['Flag list', 'Rollout state', 'Activation control'],
  },
  'workspace-demo': {
    title: 'Layout Demo',
    section: 'UX module',
    objective: 'Check drag, glass, flow, and row layout behavior within the fixed workspace contract.',
    rows: ['Resize handles', 'Flow strip', 'Component row'],
  },
  'eaos-dept': {
    title: 'EAOS Department',
    section: 'Department module',
    objective: 'Review department-level EAOS tabs and responsibilities in a fixed shell.',
    rows: ['Sub-menu map', 'Department tabs', 'Action checklist'],
  },
  eaos: {
    title: 'EAOS Top-10 Scoreboard',
    section: 'Scoreboard module',
    objective: 'Compare top enterprise AI operating scores while keeping menu context stable.',
    rows: ['Score ranking', 'Gap analysis', 'Improvement action'],
  },
  'command-center': {
    title: 'Enterprise AI Command Center',
    section: 'Command module',
    objective: 'Review command-center tasks, agent status, and escalation controls in workspace rows.',
    rows: ['Command queue', 'Agent status', 'Escalation action'],
  },
  promptops: {
    title: 'PromptOps',
    section: 'Operations module',
    objective: 'Govern prompt lifecycle, tests, and release readiness from the fixed workspace.',
    rows: ['Prompt inventory', 'Eval result', 'Release action'],
  },
  evalops: {
    title: 'EvaluationOps',
    section: 'Evaluation module',
    objective: 'Review model, RAG, safety, and regression evaluations in one row per component.',
    rows: ['Evaluation suite', 'Benchmark status', 'Remediation task'],
  },
  'governance-om': {
    title: 'Governance Operating Model',
    section: 'Governance module',
    objective: 'Check policy, controls, owner, and evidence state from the bank workspace.',
    rows: ['Policy control', 'Owner evidence', 'Approval state'],
  },
  'agent-lifecycle': {
    title: 'Agent Lifecycle',
    section: 'Agent module',
    objective: 'Review agent design, testing, deployment, monitoring, and retirement states.',
    rows: ['Lifecycle stage', 'Test gate', 'Monitoring action'],
  },
  'audit-explorer': {
    title: 'Audit Log Explorer',
    section: 'Audit module',
    objective: 'Inspect audit events, filters, and trace evidence without changing the shell.',
    rows: ['Event filter', 'Trace evidence', 'Export action'],
  },
  cost: {
    title: 'Cost Optimizer',
    section: 'Finance module',
    objective: 'Review spend, optimization levers, and owner tasks in row-based components.',
    rows: ['Cost signal', 'Optimization lever', 'Savings action'],
  },
  drift: {
    title: 'Drift Monitor',
    section: 'Model monitoring',
    objective: 'Track data drift, model drift, threshold breach, and response status inside the workspace.',
    rows: ['Drift metric', 'Threshold breach', 'Retraining action'],
  },
  'prompt-playground': {
    title: 'Prompt Playground',
    section: 'Experiment module',
    objective: 'Run prompt experiments, compare outputs, and capture next actions without shell changes.',
    rows: ['Prompt input', 'Model response', 'Action note'],
  },
  'model-compare': {
    title: 'Model Comparison',
    section: 'Model module',
    objective: 'Compare model performance, quality, cost, and risk in workspace rows.',
    rows: ['Model metric', 'Benchmark result', 'Selection action'],
  },
  datasets: {
    title: 'Datasets',
    section: 'Data module',
    objective: 'Review dataset upload, schema, quality, and lineage status in the fixed pane.',
    rows: ['Dataset input', 'Quality check', 'Lineage output'],
  },
  finetune: {
    title: 'Fine-tune Jobs',
    section: 'Training module',
    objective: 'Track fine-tune job setup, training state, and evaluation output without replacing navigation.',
    rows: ['Training input', 'Job status', 'Evaluation output'],
  },
  'webhook-debug': {
    title: 'Webhook Debug',
    section: 'Integration module',
    objective: 'Inspect webhook request, response, retry, and error history in row format.',
    rows: ['Request event', 'Response status', 'Retry action'],
  },
  'sse-stream': {
    title: 'SSE Stream',
    section: 'Realtime module',
    objective: 'Review realtime stream health, event history, and reconnect status inside the workspace.',
    rows: ['Stream status', 'Event history', 'Reconnect action'],
  },
  aeo: {
    title: 'Autonomous Enterprise Orchestrator',
    section: 'Autonomous AI module',
    objective: 'Review autonomous orchestration state, controls, and approval boundaries in the content pane.',
    rows: ['Autonomy scope', 'Control gate', 'Execution state'],
  },
  'digital-twin': {
    title: 'Digital Twin',
    section: 'Simulation module',
    objective: 'Review twin scenarios, simulation output, and decision tasks without shell navigation changes.',
    rows: ['Scenario input', 'Simulation output', 'Decision action'],
  },
  'investment-portfolio': {
    title: 'Investment Portfolio',
    section: 'Portfolio module',
    objective: 'Review investment signals, value impact, and portfolio actions inside the workspace.',
    rows: ['Investment signal', 'Value impact', 'Portfolio action'],
  },
  'cost-portfolio': {
    title: 'Cost Portfolio',
    section: 'Portfolio module',
    objective: 'Inspect cost portfolio movement, efficiency opportunities, and savings tasks.',
    rows: ['Cost area', 'Efficiency score', 'Savings task'],
  },
  'risk-portfolio': {
    title: 'Risk Portfolio',
    section: 'Risk module',
    objective: 'Review risk exposure, mitigation state, and decision support without leaving the bank shell.',
    rows: ['Risk exposure', 'Mitigation state', 'Decision support'],
  },
  'model-portfolio': {
    title: 'Model Portfolio',
    section: 'Model module',
    objective: 'Review model inventory, quality, ownership, and lifecycle state in one row per component.',
    rows: ['Model inventory', 'Quality status', 'Lifecycle task'],
  },
  translate: {
    title: 'Translation',
    section: 'AI service',
    objective: 'Review translation inputs, language settings, and quality checks from the workspace.',
    rows: ['Source input', 'Translation output', 'Quality check'],
  },
  ocr: {
    title: 'Functional OCR',
    section: 'AI service',
    objective: 'Review document input, extraction output, and validation tasks in component rows.',
    rows: ['Document input', 'OCR extraction', 'Validation task'],
  },
  embeddings: {
    title: 'Embedding Playground',
    section: 'Vector AI module',
    objective: 'Review embedding input, vector output, and similarity checks without changing the shell.',
    rows: ['Text input', 'Vector output', 'Similarity check'],
  },
  vectors: {
    title: 'Vector DB Browser',
    section: 'Vector AI module',
    objective: 'Inspect vector collections, search results, and trace context inside the workspace.',
    rows: ['Collection list', 'Search result', 'Trace detail'],
  },
};

const ROW_COLORS = ['card-info', 'card-input', 'card-process', 'card-output', 'card-visualization', 'card-action'];

export function BankWorkspaceModulePage() {
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('module') || 'platform';
  const domain = searchParams.get('domain');
  const item = MODULES[moduleId] || MODULES.platform;
  const rows = domain ? [`${domain.toUpperCase()} catalog filter`, ...item.rows.slice(1)] : item.rows;

  return (
    <main className="workspace-fixed" style={{ minHeight: 'auto' }}>
      <section className="objective-block">
        <div className="objective-title">{item.section}</div>
        <h1 className="h-glass" style={{ fontSize: 24 }}>{item.title}</h1>
        <p className="objective-text" style={{ margin: '8px 0 0' }}>{item.objective}</p>
      </section>

      <div className="flow-strip" aria-label="Workspace component flow">
        {['Input', 'Process', 'Output', 'Visualization'].map((step, index) => (
          <div key={step} className={`flow-step active ${['input', 'process', 'output', 'visualization'][index]}`}>
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <section style={{ display: 'grid', gap: 12 }}>
        {rows.map((row, index) => (
          <article
            key={row}
            className={`glass-card ${ROW_COLORS[index % ROW_COLORS.length]}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 0.25fr) minmax(0, 1fr) auto',
              gap: 14,
              alignItems: 'center',
              minHeight: 86,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Component {index + 1}
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: 16 }}>{row}</h2>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: 13, lineHeight: 1.45 }}>
              One component on one row: purpose, current state, required action, and result area stay inside this workspace.
            </p>
            <Link
              to={`/bank/workspace?module=${moduleId}${domain ? `&domain=${domain}` : ''}`}
              className="btn-glass btn-glass-primary"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Active
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
