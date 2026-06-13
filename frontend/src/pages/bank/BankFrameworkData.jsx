// Top-1% Enterprise AI OS Framework — single source of truth.
// Operator 2026-06-05: "fix all" → ship Commits D + E + F.
//
// Encodes:
//   §75.2  15-level maturity (L1-L15)
//   §76    9 technical runtime layers
//   §77.6  16-stage SDLC
//   §77.7  12 delivery phases × 7 steps × deliverables × teams
//   §77.8  10-domain capability map
//   §77.9  Transformation roadmap (10 maturity stages × 7 phases)
//   §77.10 6-level implementation backlog
//   §77.11 4 foundation-layer failure modes
//   §77.5  15 top-1% ops domains (this file = canonical source)
//
// Reused by: /bank/sdlc · /bank/ops · /bank/build-order · /bank/control-tower
// + per-tab chips in TabHeaderRibbon + runtime layer ownership in §76 cards
// + WorkspaceWideAudit framework scoring.

// ─────────────────────────────────────────────────────────────────────
// 1. TOP-1% CAPABILITIES (operator 2026-06-05 — 20 rows × 8 domains)
// ─────────────────────────────────────────────────────────────────────
export const TOP1_CAPABILITIES = [
  { name: 'Meta-Reasoning',                    domain: 'Cognitive',  status: 'missing' },
  { name: 'Reflection',                        domain: 'Cognitive',  status: 'partial' },
  { name: 'Learning',                          domain: 'Cognitive',  status: 'missing' },
  { name: 'World Model',                       domain: 'Cognitive',  status: 'missing' },
  { name: 'Decision Intelligence',             domain: 'Cognitive',  status: 'partial' },
  { name: 'Skill Marketplace',                 domain: 'Agent',      status: 'missing' },
  { name: 'Collective Intelligence',           domain: 'Knowledge',  status: 'missing' },
  { name: 'Organizational Intelligence',       domain: 'Knowledge',  status: 'missing' },
  { name: 'Autonomous Governance',             domain: 'Governance', status: 'partial' },
  { name: 'AgentOps',                          domain: 'AI Platform', status: 'partial' },
  { name: 'DecisionOps',                       domain: 'Cognitive',  status: 'missing' },
  { name: 'KnowledgeOps',                      domain: 'Knowledge',  status: 'missing' },
  { name: 'CognitiveOps',                      domain: 'Cognitive',  status: 'missing' },
  { name: 'TrustOps',                          domain: 'Governance', status: 'partial' },
  { name: 'SimulationOps',                     domain: 'World Model', status: 'partial' },
  { name: 'Enterprise Digital Twin',           domain: 'World Model', status: 'missing' },
  { name: 'ValueOps',                          domain: 'Business',   status: 'partial' },
  { name: 'Policy-as-Code',                    domain: 'Governance', status: 'missing' },
  { name: 'Enterprise Brain',                  domain: 'Knowledge',  status: 'missing' },
  { name: 'Autonomous Enterprise Control Tower', domain: 'Strategy', status: 'partial' },
];

export const CAP_DOMAIN_COLOR = {
  'Cognitive':   '#8b5cf6',
  'Agent':       '#0ea5e9',
  'Knowledge':   '#0891b2',
  'Governance':  '#dc2626',
  'AI Platform': '#16a34a',
  'World Model': '#7c3aed',
  'Business':    '#f59e0b',
  'Strategy':    '#2563eb',
};

// ─────────────────────────────────────────────────────────────────────
// 2. 16-STAGE SDLC LIFECYCLE (§77.6 + operator 2026-06-05)
// ─────────────────────────────────────────────────────────────────────
export const SDLC_LIFECYCLE = [
  { id: 'idea',         label: 'Idea',         icon: '💡', color: '#94a3b8', present: true,  serves: ['tab_overview', 'tab_product_mgr'] },
  { id: 'strategy',     label: 'Strategy',     icon: '🎯', color: '#0ea5e9', present: true,  serves: ['tab_product_mgr', 'tab_biz_value'] },
  { id: 'usecase',      label: 'Use Case',     icon: '📋', color: '#0ea5e9', present: true,  serves: ['tab_user_story', 'tab_user_demo'] },
  { id: 'architecture', label: 'Architecture', icon: '🏛', color: '#7c3aed', present: true,  serves: ['tab_readme'] },
  { id: 'data',         label: 'Data',         icon: '📊', color: '#0891b2', present: true,  serves: ['tab_data', 'tab_analytics'] },
  { id: 'knowledge',    label: 'Knowledge',    icon: '🧠', color: '#0891b2', present: true,  serves: ['tab_data', 'tab_ai'] },
  { id: 'prompt',       label: 'Prompt',       icon: '✎',  color: '#8b5cf6', present: 'partial', serves: ['tab_ai'] },
  { id: 'skill',        label: 'Skill',        icon: '⚙', color: '#8b5cf6', present: false, serves: [] },
  { id: 'agent',        label: 'Agent',        icon: '🤖', color: '#8b5cf6', present: 'partial', serves: ['tab_ai', 'tab_job_ai'] },
  { id: 'workflow',     label: 'Workflow',     icon: '🔄', color: '#8b5cf6', present: 'partial', serves: ['tab_process'] },
  { id: 'testing',      label: 'Testing',      icon: '🧪', color: '#16a34a', present: true,  serves: ['tab_test_ai'] },
  { id: 'deployment',   label: 'Deployment',   icon: '🚀', color: '#16a34a', present: 'partial', serves: ['tab_operations'] },
  { id: 'monitoring',   label: 'Monitoring',   icon: '📈', color: '#f59e0b', present: 'partial', serves: ['tab_dashboard', 'tab_operations'] },
  { id: 'learning',     label: 'Learning',     icon: '🎓', color: '#7c3aed', present: false, serves: [] },
  { id: 'optimization', label: 'Optimization', icon: '⚡', color: '#7c3aed', present: false, serves: [] },
  { id: 'retirement',   label: 'Retirement',   icon: '🪦', color: '#94a3b8', present: false, serves: [] },
];

// ─────────────────────────────────────────────────────────────────────
// 3. 12 DELIVERY PHASES × 7 STEPS × DELIVERABLES × TEAMS (§77.7)
// ─────────────────────────────────────────────────────────────────────
export const DELIVERY_PHASES = [
  {
    id: 'p01', label: 'Strategy & Ideation', color: '#0ea5e9',
    teams: ['Business', 'Product', 'Enterprise Architecture', 'AI CoE'],
    steps: [
      { n: 1, activity: 'Business Problem',         deliverable: 'Problem Statement' },
      { n: 2, activity: 'Opportunity Assessment',   deliverable: 'Opportunity Report' },
      { n: 3, activity: 'ROI Analysis',             deliverable: 'Business Case' },
      { n: 4, activity: 'Stakeholder Analysis',     deliverable: 'Stakeholder Map' },
      { n: 5, activity: 'Prioritization',           deliverable: 'Roadmap' },
      { n: 6, activity: 'Funding Approval',         deliverable: 'Budget' },
      { n: 7, activity: 'Goal Definition',          deliverable: 'OKRs' },
    ],
  },
  {
    id: 'p02', label: 'Solution Design', color: '#7c3aed',
    teams: ['Architects', 'Security', 'AI Engineering'],
    steps: [
      { n: 1, activity: 'Architecture Design',  deliverable: 'Solution Architecture' },
      { n: 2, activity: 'Security Review',      deliverable: 'Security Design' },
      { n: 3, activity: 'Data Assessment',      deliverable: 'Data Sources' },
      { n: 4, activity: 'RAG Design',           deliverable: 'Retrieval Architecture' },
      { n: 5, activity: 'Agent Design',         deliverable: 'Agent Architecture' },
      { n: 6, activity: 'MCP Design',           deliverable: 'Tool Architecture' },
      { n: 7, activity: 'Governance Review',    deliverable: 'Approval' },
    ],
  },
  {
    id: 'p03', label: 'Knowledge Engineering', color: '#0891b2',
    teams: ['Data Engineering', 'RAG Team', 'Knowledge Team'],
    steps: [
      { n: 1, activity: 'Data Discovery',         deliverable: 'Data Inventory' },
      { n: 2, activity: 'Data Classification',    deliverable: 'Data Catalog' },
      { n: 3, activity: 'Chunking Design',        deliverable: 'Chunk Strategy' },
      { n: 4, activity: 'Embedding Design',       deliverable: 'Embedding Strategy' },
      { n: 5, activity: 'Knowledge Graph Design', deliverable: 'KG Design' },
      { n: 6, activity: 'Metadata Design',        deliverable: 'Metadata Schema' },
      { n: 7, activity: 'Retrieval Design',       deliverable: 'Retrieval Strategy' },
    ],
  },
  {
    id: 'p04', label: 'Prompt Engineering', color: '#8b5cf6',
    teams: ['PromptOps', 'AI Engineering'],
    steps: [
      { n: 1, activity: 'Persona Definition', deliverable: 'Agent Persona' },
      { n: 2, activity: 'System Prompt',      deliverable: 'System Prompt' },
      { n: 3, activity: 'Prompt Templates',   deliverable: 'Prompt Library' },
      { n: 4, activity: 'Guardrails',         deliverable: 'Prompt Policies' },
      { n: 5, activity: 'Evaluation',         deliverable: 'Prompt Scores' },
      { n: 6, activity: 'Optimization',       deliverable: 'Improved Prompt' },
      { n: 7, activity: 'Governance',         deliverable: 'Approved Prompt' },
    ],
  },
  {
    id: 'p05', label: 'Skill Engineering', color: '#8b5cf6',
    teams: ['SkillOps', 'Business SMEs'],
    steps: [
      { n: 1, activity: 'Skill Discovery',    deliverable: 'Skill Inventory' },
      { n: 2, activity: 'Skill Design',       deliverable: 'Skill Definition' },
      { n: 3, activity: 'Workflow Design',    deliverable: 'Workflow' },
      { n: 4, activity: 'Tool Mapping',       deliverable: 'Tool Requirements' },
      { n: 5, activity: 'Knowledge Mapping',  deliverable: 'Knowledge Sources' },
      { n: 6, activity: 'Testing',            deliverable: 'Certified Skill' },
      { n: 7, activity: 'Publication',        deliverable: 'Skill Registry' },
    ],
  },
  {
    id: 'p06', label: 'Agent Engineering', color: '#0ea5e9',
    teams: ['AgentOps', 'AI Engineering'],
    steps: [
      { n: 1, activity: 'Agent Definition',    deliverable: 'Agent Spec' },
      { n: 2, activity: 'Goal Definition',     deliverable: 'Goal Model' },
      { n: 3, activity: 'Planning Design',     deliverable: 'Planning Logic' },
      { n: 4, activity: 'Memory Design',       deliverable: 'Memory Strategy' },
      { n: 5, activity: 'Tool Integration',    deliverable: 'Tool Set' },
      { n: 6, activity: 'Skill Binding',       deliverable: 'Skill Mapping' },
      { n: 7, activity: 'Runtime Deployment',  deliverable: 'Agent Package' },
    ],
  },
  {
    id: 'p07', label: 'Multi-Agent Engineering', color: '#0ea5e9',
    teams: ['AgentOps', 'Platform Team'],
    steps: [
      { n: 1, activity: 'Agent Roles',           deliverable: 'Agent Catalog' },
      { n: 2, activity: 'Communication Design',  deliverable: 'Agent Protocol' },
      { n: 3, activity: 'Workflow Design',       deliverable: 'Coordination Flow' },
      { n: 4, activity: 'Consensus Design',      deliverable: 'Decision Logic' },
      { n: 5, activity: 'Escalation Design',     deliverable: 'Escalation Rules' },
      { n: 6, activity: 'Monitoring',            deliverable: 'Agent Telemetry' },
      { n: 7, activity: 'Governance',            deliverable: 'Certified Swarm' },
    ],
  },
  {
    id: 'p08', label: 'Testing & Evaluation', color: '#16a34a',
    teams: ['QA', 'Evaluation Team'],
    steps: [
      { n: 1, activity: 'Functional Testing',    deliverable: 'Test Results' },
      { n: 2, activity: 'Prompt Testing',        deliverable: 'Prompt Quality' },
      { n: 3, activity: 'Skill Testing',         deliverable: 'Skill Scores' },
      { n: 4, activity: 'Agent Testing',         deliverable: 'Agent Scores' },
      { n: 5, activity: 'RAG Testing',           deliverable: 'Retrieval Scores' },
      { n: 6, activity: 'Security Testing',      deliverable: 'Security Results' },
      { n: 7, activity: 'Performance Testing',   deliverable: 'Load Results' },
    ],
  },
  {
    id: 'p09', label: 'Governance & Compliance', color: '#dc2626',
    teams: ['Governance', 'Security', 'Legal'],
    steps: [
      { n: 1, activity: 'AI Risk Assessment',    deliverable: 'Risk Score' },
      { n: 2, activity: 'Privacy Review',        deliverable: 'Privacy Report' },
      { n: 3, activity: 'Security Review',       deliverable: 'Security Approval' },
      { n: 4, activity: 'Responsible AI Review', deliverable: 'AI Approval' },
      { n: 5, activity: 'Compliance Review',     deliverable: 'Compliance Approval' },
      { n: 6, activity: 'Audit Review',          deliverable: 'Audit Package' },
      { n: 7, activity: 'Production Approval',   deliverable: 'Go Live' },
    ],
  },
  {
    id: 'p10', label: 'Deployment', color: '#16a34a',
    teams: ['DevOps', 'Platform Engineering'],
    steps: [
      { n: 1, activity: 'CI/CD',               deliverable: 'Deployment' },
      { n: 2, activity: 'Agent Deployment',    deliverable: 'Active Agents' },
      { n: 3, activity: 'Model Deployment',    deliverable: 'Inference Endpoints' },
      { n: 4, activity: 'RAG Deployment',      deliverable: 'Retrieval Platform' },
      { n: 5, activity: 'MCP Deployment',      deliverable: 'MCP Servers' },
      { n: 6, activity: 'Monitoring Setup',    deliverable: 'Dashboards' },
      { n: 7, activity: 'Go Live',             deliverable: 'Production System' },
    ],
  },
  {
    id: 'p11', label: 'Operations', color: '#f59e0b',
    teams: ['SRE', 'PlatformOps'],
    steps: [
      { n: 1, activity: 'Monitoring',                deliverable: 'Health Metrics' },
      { n: 2, activity: 'Observability',             deliverable: 'Traces' },
      { n: 3, activity: 'Cost Monitoring',           deliverable: 'Cost Dashboard' },
      { n: 4, activity: 'Incident Management',       deliverable: 'Incident Reports' },
      { n: 5, activity: 'Performance Optimization',  deliverable: 'Tuning' },
      { n: 6, activity: 'Security Monitoring',       deliverable: 'Threat Reports' },
      { n: 7, activity: 'Governance Monitoring',     deliverable: 'Compliance Status' },
    ],
  },
  {
    id: 'p12', label: 'Continuous Improvement', color: '#7c3aed',
    teams: ['CognitiveOps', 'AgentOps', 'ValueOps'],
    steps: [
      { n: 1, activity: 'Reflection',                deliverable: 'Lessons Learned' },
      { n: 2, activity: 'Learning',                  deliverable: 'Improvement Signals' },
      { n: 3, activity: 'Skill Optimization',        deliverable: 'Better Skills' },
      { n: 4, activity: 'Prompt Optimization',       deliverable: 'Better Prompts' },
      { n: 5, activity: 'Agent Optimization',        deliverable: 'Better Agents' },
      { n: 6, activity: 'Architecture Optimization', deliverable: 'Better Architecture' },
      { n: 7, activity: 'Value Realization',         deliverable: 'ROI Dashboard' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// 4. BUILD ORDER PYRAMID (§77.4 — operator re-confirmed 2026-06-05)
//    5 tiers from Foundation to Autonomous Enterprise
// ─────────────────────────────────────────────────────────────────────
export const BUILD_ORDER = [
  {
    id: 'foundation', label: 'Foundation', tier: 1, color: '#0ea5e9',
    months: 'M0–3',
    components: [
      { name: 'User Layer',       present: 'partial' },
      { name: 'Frontend',         present: true },
      { name: 'IAM',              present: false },
      { name: 'Network',          present: 'partial' },
      { name: 'Platform',         present: 'partial' },
      { name: 'AI Infrastructure', present: 'partial' },
    ],
  },
  {
    id: 'intelligence', label: 'Intelligence', tier: 2, color: '#8b5cf6',
    months: 'M3–9',
    components: [
      { name: 'Model Serving',       present: 'partial' },
      { name: 'RAG',                 present: true },
      { name: 'Memory',              present: 'partial' },
      { name: 'Context Engineering', present: 'partial' },
      { name: 'MCP',                 present: 'partial' },
      { name: 'Tool Layer',          present: 'partial' },
      { name: 'Agent Runtime',       present: 'partial' },
    ],
  },
  {
    id: 'advanced', label: 'Advanced Intelligence', tier: 3, color: '#7c3aed',
    months: 'M9–18',
    components: [
      { name: 'Skills',       present: false },
      { name: 'Planning',     present: false },
      { name: 'Reflection',   present: false },
      { name: 'Learning',     present: false },
      { name: 'Multi-Agent',  present: 'partial' },
    ],
  },
  {
    id: 'enterprise', label: 'Enterprise Scale', tier: 4, color: '#dc2626',
    months: 'M18–24',
    components: [
      { name: 'Knowledge',      present: true },
      { name: 'Governance',     present: 'partial' },
      { name: 'Evaluation',     present: 'partial' },
      { name: 'Observability',  present: 'partial' },
      { name: 'Responsible AI', present: 'partial' },
    ],
  },
  {
    id: 'autonomous', label: 'Autonomous Enterprise', tier: 5, color: '#2563eb',
    months: '24+',
    components: [
      { name: 'World Model',                present: false },
      { name: 'Decision',                   present: false },
      { name: 'Action',                     present: false },
      { name: 'Self-Improvement',           present: false },
      { name: 'Collective Intelligence',    present: false },
      { name: 'Organizational Intelligence', present: false },
      { name: 'Autonomous Governance',      present: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// 5. 15 OPS DOMAINS (§77.5 — operator re-confirmed 2026-06-05)
// ─────────────────────────────────────────────────────────────────────
export const OPS_DOMAINS = [
  { id: 'agentops',      name: 'AgentOps',      scope: 'Agent lifecycle',                tier: 'AI Platform', kpis: ['Override rate', 'Cost per goal', 'Tool-call success %'],         status: 'partial', owns_layers: ['rt_multi_agent'] },
  { id: 'llmops',        name: 'LLMOps',        scope: 'Model lifecycle',                tier: 'AI Platform', kpis: ['Latency p95', '$ / 1k tok', 'Eval drift', 'Fallback rate'],     status: 'partial', owns_layers: ['rt_model_serving'] },
  { id: 'promptops',     name: 'PromptOps',     scope: 'Prompt lifecycle',               tier: 'Cognitive',   kpis: ['Prompt versions', 'Eval score', 'Hallucination rate'],          status: 'missing', owns_layers: ['rt_context_eng'] },
  { id: 'ragops',        name: 'RAGOps',        scope: 'Retrieval lifecycle',            tier: 'Knowledge',   kpis: ['P@k', 'Citation accuracy', 'Cache hit %', 'Re-embed cadence'],  status: 'partial', owns_layers: ['rt_rag'] },
  { id: 'knowledgeops',  name: 'KnowledgeOps',  scope: 'Knowledge lifecycle',            tier: 'Knowledge',   kpis: ['Doc freshness SLA', 'Coverage %', 'KG completeness'],           status: 'missing', owns_layers: ['rt_rag'] },
  { id: 'memoryops',     name: 'MemoryOps',     scope: 'Memory lifecycle',               tier: 'Cognitive',   kpis: ['Hit rate', 'Stale entries', 'Cross-tenant leak count = 0'],    status: 'missing', owns_layers: ['rt_memory'] },
  { id: 'skillops',      name: 'SkillOps',      scope: 'Skill lifecycle',                tier: 'Agent',       kpis: ['Skills published', 'Usage count', 'Skill eval score'],          status: 'missing', owns_layers: [] },
  { id: 'decisionops',   name: 'DecisionOps',   scope: 'Decision lifecycle',             tier: 'Cognitive',   kpis: ['Confidence calibration', 'HITL escalation %', 'Override %'],   status: 'missing', owns_layers: ['rt_eval'] },
  { id: 'policyops',     name: 'PolicyOps',     scope: 'Policy lifecycle',               tier: 'Governance',  kpis: ['Policies in code', 'Allow/Deny audit rows', 'Drift count'],    status: 'missing', owns_layers: [] },
  { id: 'governanceops', name: 'GovernanceOps', scope: 'Governance automation',          tier: 'Governance',  kpis: ['Auto-approvals %', 'Audit completeness', 'Compliance score'], status: 'partial', owns_layers: ['rt_eval'] },
  { id: 'trustops',      name: 'TrustOps',      scope: 'Trust management',               tier: 'Governance',  kpis: ['Trust score', 'Explainability density', 'Fairness drift'],     status: 'partial', owns_layers: ['rt_eval'] },
  { id: 'cognitiveops',  name: 'CognitiveOps',  scope: 'Planning/reasoning monitoring',  tier: 'Cognitive',   kpis: ['Reasoning quality', 'Plan revision rate', 'Reflection ROI'],  status: 'missing', owns_layers: ['rt_multi_agent'] },
  { id: 'simulationops', name: 'SimulationOps', scope: 'Digital twins',                  tier: 'World Model', kpis: ['Sim coverage %', 'Sim-to-real drift', 'What-if depth'],        status: 'partial', owns_layers: [] },
  { id: 'valueops',      name: 'ValueOps',      scope: 'ROI tracking',                   tier: 'Business',    kpis: ['Adoption %', 'Productivity Δ', 'ROI', '$ saved'],               status: 'partial', owns_layers: [] },
  { id: 'humanops',      name: 'HumanOps',      scope: 'Human-AI collaboration',         tier: 'Strategy',    kpis: ['HITL latency', 'Override quality', 'Operator NPS'],            status: 'missing', owns_layers: [] },
];

// ─────────────────────────────────────────────────────────────────────
// 6. FINAL TOP-1% MENTAL MODEL (operator 2026-06-05 — 9-layer chain)
// ─────────────────────────────────────────────────────────────────────
export const MENTAL_MODEL = [
  { id: 'strategyops',   label: 'StrategyOps',    color: '#2563eb', icon: '🎯', present: 'partial', why: 'Where the AI program is steered. OKRs, portfolio, value targets.' },
  { id: 'governanceops', label: 'GovernanceOps',  color: '#dc2626', icon: '⚖️', present: 'partial', why: 'Policies + risk + compliance + audit — automated, not manual.' },
  { id: 'knowledgeops',  label: 'KnowledgeOps',   color: '#0891b2', icon: '🧠', present: 'missing', why: 'Curate · classify · refresh · retire enterprise knowledge.' },
  { id: 'cognitiveops',  label: 'CognitiveOps',   color: '#8b5cf6', icon: '💭', present: 'missing', why: 'Monitor reasoning quality + planning depth + reflection ROI.' },
  { id: 'skillops',      label: 'SkillOps',       color: '#0ea5e9', icon: '⚙', present: 'missing', why: 'Skills registry + version + publish + retire.' },
  { id: 'agentops',      label: 'AgentOps',       color: '#0ea5e9', icon: '🤖', present: 'partial', why: 'Agent inventory + scope + telemetry + override rate.' },
  { id: 'llmops',        label: 'LLMOps',         color: '#16a34a', icon: '🧮', present: 'partial', why: 'Model registry + eval + cost + canary + rollback.' },
  { id: 'platformops',   label: 'PlatformOps',    color: '#f59e0b', icon: '🏗', present: 'partial', why: 'Compute + storage + network + SRE under the AI stack.' },
  { id: 'valueops',      label: 'ValueOps',       color: '#7c3aed', icon: '💰', present: 'partial', why: 'Usage → adoption → productivity → outcome → ROI.' },
];

// ─────────────────────────────────────────────────────────────────────
// 7. PER-TAB SDLC + OPS MAPPING (for the chip strip in TabHeaderRibbon)
//    Maps each /bank tab to: which SDLC stage it serves + which ops domains
//    touch it + which build-order tier it belongs to.
// ─────────────────────────────────────────────────────────────────────
export const TAB_FRAMEWORK_MAP = {
  tab_readme:      { sdlc: 'architecture', tier: 'foundation',   ops: ['governanceops'] },
  tab_overview:    { sdlc: 'idea',         tier: 'foundation',   ops: ['strategyops', 'valueops'] },
  tab_product_mgr: { sdlc: 'strategy',     tier: 'foundation',   ops: ['strategyops', 'valueops'] },
  tab_process:     { sdlc: 'workflow',     tier: 'enterprise',   ops: ['agentops', 'cognitiveops'] },
  tab_data:        { sdlc: 'data',         tier: 'intelligence', ops: ['knowledgeops', 'ragops'] },
  tab_analytics:   { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['valueops'] },
  tab_ai:          { sdlc: 'agent',        tier: 'intelligence', ops: ['agentops', 'llmops', 'promptops', 'ragops'] },
  tab_user_story:  { sdlc: 'usecase',      tier: 'foundation',   ops: ['strategyops'] },
  tab_user_demo:   { sdlc: 'usecase',      tier: 'foundation',   ops: ['humanops'] },
  tab_exp_ai:      { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['trustops', 'governanceops'] },
  tab_res_ai:      { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['trustops', 'governanceops'] },
  tab_gov_ai:      { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['governanceops', 'policyops'] },
  tab_comp_ai:     { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['governanceops'] },
  tab_inc_ai:      { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['agentops', 'humanops'] },
  tab_meet_ai:     { sdlc: 'usecase',      tier: 'intelligence', ops: ['humanops'] },
  tab_note_ai:     { sdlc: 'knowledge',    tier: 'intelligence', ops: ['knowledgeops'] },
  tab_test_ai:     { sdlc: 'testing',      tier: 'enterprise',   ops: ['governanceops', 'agentops'] },
  tab_job_ai:      { sdlc: 'deployment',   tier: 'enterprise',   ops: ['agentops', 'cognitiveops'] },
  tab_biz_value:   { sdlc: 'strategy',     tier: 'foundation',   ops: ['valueops', 'strategyops'] },
  tab_dashboard:   { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['valueops', 'agentops'] },
  tab_operations:  { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['platformops', 'agentops'] },
  tab_reports:     { sdlc: 'monitoring',   tier: 'enterprise',   ops: ['valueops'] },
};

// ─────────────────────────────────────────────────────────────────────
// 8. AGENT ARCHITECTURE PATTERNS — §64.43 15 + operator 2026-06-05 (4 new)
// ─────────────────────────────────────────────────────────────────────
export const AGENT_PATTERNS = [
  { id: 'hub_spoke',     name: 'Hub-and-Spoke',        family: 'orchestration', present: 'partial', relevance: 'USE',  best_for: 'Enterprise workflow fan-out',           failure: 'Single-point bottleneck + SPOF',          source: '§64.43 #1' },
  { id: 'council',       name: 'Council of Agents',    family: 'consensus',     present: 'partial', relevance: 'USE',  best_for: 'Governance + validation · underwriting consensus', failure: 'Group-think; correlated bias',  source: '§64.43 #2' },
  { id: 'swarm',         name: 'Swarm',                family: 'mesh',          present: false,     relevance: 'SKIP', best_for: 'Robotics / simulation',                 failure: 'Convergence + observability hard',        source: '§64.43 #3' },
  { id: 'hierarchical',  name: 'Hierarchical',         family: 'orchestration', present: 'partial', relevance: 'USE',  best_for: 'Claim triage → adjuster → SIU → settle', failure: 'Bottleneck at parent; over-decomp.',     source: '§64.43 #4' },
  { id: 'blackboard',    name: 'Blackboard',           family: 'memory',        present: false,     relevance: 'KNOW', best_for: 'Research agents · shared memory',       failure: 'Race conditions; stale reads',            source: '§64.43 #5' },
  { id: 'event_driven',  name: 'Event-Driven',         family: 'mesh',          present: 'partial', relevance: 'KNOW', best_for: 'Real-time systems',                     failure: 'Lost/dup events without idempotency',     source: '§64.43 #6' },
  { id: 'federated',     name: 'Federated',            family: 'tenant',        present: 'partial', relevance: 'USE',  best_for: 'Multi-tenant insurance SaaS',           failure: 'Tenant data leak via shared cache',       source: '§64.43 #7' },
  { id: 'dag_workflow',  name: 'DAG Workflow',         family: 'orchestration', present: false,     relevance: 'USE',  best_for: 'Underwriting decision trees',           failure: 'Cycle detection; partial-failure',        source: '§64.43 #8' },
  { id: 'debate',        name: 'Debate',               family: 'consensus',     present: false,     relevance: 'KNOW', best_for: 'Risk validation · agents challenge',    failure: 'Endless loops; cost explosion',           source: '§64.43 #9' },
  { id: 'reflection',    name: 'Reflection',           family: 'cognitive',     present: false,     relevance: 'USE',  best_for: 'Top-1% gap closer · autonomous improve', failure: 'Infinite loop without termination',      source: '§64.43 #10' },
  { id: 'society_mind',  name: 'Society of Mind',      family: 'cognitive',     present: false,     relevance: 'SKIP', best_for: 'Academic cognitive AI · micro-agents',  failure: 'Coordination overhead',                   source: '§64.43 #11' },
  { id: 'moa',           name: 'Mixture-of-Agents',    family: 'consensus',     present: false,     relevance: 'KNOW', best_for: 'Reliability + accuracy ensemble',       failure: 'Latency × N; quorum-failure',             source: '§64.43 #12' },
  { id: 'supervisor',    name: 'Supervisor-Worker',    family: 'orchestration', present: 'partial', relevance: 'USE',  best_for: 'Task automation · central planner',     failure: 'Supervisor backlog',                      source: '§64.43 #13' },
  { id: 'recursive',     name: 'Recursive Delegation', family: 'orchestration', present: false,     relevance: 'SKIP', best_for: 'Deep research (not insurance)',         failure: 'Runaway cost; depth bombs',               source: '§64.43 #14 (§42 gated)' },
  { id: 'digital_twin',  name: 'Digital Twin',         family: 'simulation',    present: 'partial', relevance: 'KNOW', best_for: 'Mfg / IoT · simulated environments',    failure: 'Sim-to-real gap',                         source: '§64.43 #15' },
  // ─── Operator additions 2026-06-05 ───
  { id: 'mesh_p2p',      name: 'Mesh / Peer-to-Peer',  family: 'mesh',          present: false,     relevance: 'SKIP', best_for: 'Decentralized agents (insurance is centralized regulated)', failure: 'Eventual consistency · gossip storms', source: 'operator 2026-06-05' },
  { id: 'dark_factory',  name: 'AI Dark Factory',      family: 'autonomous',    present: false,     relevance: 'KNOW', best_for: 'Lights-out L9-L10 maturity state',      failure: 'No HITL on edge cases · runaway agents',  source: 'operator 2026-06-05' },
  { id: 'gsd',           name: 'GSD (Get Shit Done)',  family: 'philosophy',    present: false,     relevance: 'KNOW', best_for: 'Outcome > process; minimal ceremony',   failure: 'Skips governance · accumulates debt',     source: 'operator 2026-06-05' },
  { id: 'ralph_loop',    name: 'Ralph / Ralph Loop',   family: 'autonomous',    present: false,     relevance: 'KNOW', best_for: 'Autonomous coding loop (not insurance)', failure: 'Loop without termination · cost burn',    source: 'operator 2026-06-05' },
];

// ─────────────────────────────────────────────────────────────────────
// 9. SPEC-DRIVEN DEVELOPMENT STACK — operator 2026-06-05
// ─────────────────────────────────────────────────────────────────────
export const SPEC_DRIVEN = [
  { id: 'spec_openspec',   name: 'Spec / OpenSpec',  vendor: 'OSS',     mode: 'spec-format',       relevance: 'KNOW', present: false,     why: 'Machine-readable spec → drives codegen + tests + docs from one source.',                                              evaluation: 'high · standardizes intent capture' },
  { id: 'aws_kiro',        name: 'AWS Kiro',         vendor: 'Amazon',  mode: 'spec-IDE',          relevance: 'KNOW', present: false,     why: 'Spec-first IDE: operator writes spec, agent writes code that matches.',                                               evaluation: 'medium · vendor lock to AWS' },
  { id: 'github_spec_kit', name: 'GitHub Spec Kit',  vendor: 'GitHub',  mode: 'spec-toolkit',      relevance: 'KNOW', present: false,     why: 'Specs → tests → code via GitHub-native workflow; PR-driven.',                                                         evaluation: 'medium · maturing fast' },
  { id: 'bmad',            name: 'BMAD',             vendor: 'OSS',     mode: 'meta-method',       relevance: 'USE',  present: 'partial', why: 'Breakthrough Method for Agile AI-Driven Dev — multi-agent role playbook. Already in autonomy policy.',                evaluation: 'used in autonomy policy; surface here' },
  { id: 'augment_intent',  name: 'Augment Code Intent', vendor: 'Augment', mode: 'intent-IDE',     relevance: 'KNOW', present: false,     why: 'IDE captures developer intent → routes to multi-agent council for impl.',                                             evaluation: 'medium · proprietary' },
  { id: 'bernstein',       name: 'Bernstein',        vendor: 'OSS',     mode: 'meta-orchestrator', relevance: 'KNOW', present: false,     why: 'Deterministic Python scheduler orchestrating parallel CLI coding agents (Claude Code / Codex / Gemini) on isolated git worktrees with HMAC-SHA256-chained audit log. github.com/sipyourdrink-ltd/bernstein', evaluation: 'high for dev team · audit-grade compliance · cost-controlled multi-agent dev' },
];

// ─────────────────────────────────────────────────────────────────────
// 10. AGENTIC RUNTIME 5-OS + CUA STACK — §67 + §64.44 + operator 2026-06-05
// ─────────────────────────────────────────────────────────────────────
export const AGENTIC_RUNTIME = [
  // 5-OS canonical (§67)
  { id: 'mcp',         name: 'MCP',                    layer: '5-OS · Protocol',         relevance: 'USE',  present: 'partial', why: 'Tool standardisation + protocol fidelity. Every tool conforms to one schema.',                source: '§67 + §76 Layer 5' },
  { id: 'paperclip',   name: 'Paperclip',              layer: '5-OS · Business Orch',    relevance: 'KNOW', present: false,     why: 'Long-running goal orchestration across teams · business-level workflow OS.',                  source: '§67' },
  { id: 'openclaw',    name: 'OpenClaw',               layer: '5-OS · Execution Orch',   relevance: 'KNOW', present: false,     why: 'Execution-level orchestration: workflow + state + retry + reflection.',                       source: '§67' },
  { id: 'harness',     name: 'Harness Agent',          layer: '5-OS · Cross-Agent Sync', relevance: 'KNOW', present: false,     why: 'Cross-agent sync, MCP-latency dodge, distributed workflow consistency.',                       source: '§67' },
  { id: 'poliai',      name: 'PoliAI',                 layer: '5-OS · Governance',       relevance: 'KNOW', present: false,     why: 'AI governance + runtime policy enforcement (allow/deny/require_human at action time).',       source: '§67' },
  // CUA + browser automation
  { id: 'cua_generic', name: 'CUA (generic)',          layer: 'CUA',                     relevance: 'USE',  present: 'partial', why: 'Computer-Using Agent — agent acts on screen/keyboard/mouse vs only LLM text.',                source: '§64.40 Layer 6' },
  { id: 'stagehand',   name: 'Stagehand',              layer: 'CUA',                     relevance: 'USE',  present: 'partial', why: 'Semantic browser primitives: page.act(), page.extract() — insurance portals, KYC, broker.',    source: '§64.40 Layer 7 + §64.44' },
  { id: 'playwright',  name: 'Playwright',             layer: 'CUA',                     relevance: 'USE',  present: 'partial', why: 'Low-level browser automation under Stagehand · selectors + navigation + screenshots.',       source: '§64.40 Layer 8 + §19.6' },
  { id: 'browser_use', name: 'Browser-Use',            layer: 'CUA',                     relevance: 'SKIP', present: false,     why: 'Redundant with Stagehand for this project.',                                                  source: '§64.42 + §64.44' },
  { id: 'open_op',     name: 'Open Operator',          layer: 'CUA',                     relevance: 'SKIP', present: false,     why: 'Redundant with Stagehand for this project.',                                                  source: '§64.44' },
  { id: 'cc_use',      name: 'Claude Computer Use',    layer: 'CUA',                     relevance: 'SKIP', present: false,     why: 'Anthropic vendor SaaS — Stagehand covers same surface OSS.',                                  source: '§64.44' },
  // Long-running workflow runtimes
  { id: 'temporal',    name: 'Temporal',               layer: 'Workflow',                relevance: 'USE',  present: false,     why: 'Durable workflow engine — FNOL→settlement spans weeks; need state survives restart.',         source: '§64.42 + §64.44' },
  { id: 'langgraph',   name: 'LangGraph',              layer: 'Workflow',                relevance: 'USE',  present: false,     why: 'DAG agent workflow framework — underwriting decision graphs are DAGs.',                       source: '§64.44' },
  { id: 'celery_redis', name: 'Celery + Redis',        layer: 'Workflow',                relevance: 'USE',  present: 'partial', why: 'Hub-and-Spoke queue + worker fleet — already in stack, used for agent fan-out.',              source: '§64.43 #13 (HOLY ref impl)' },
];

// ─────────────────────────────────────────────────────────────────────
// 11. OBSERVABILITY + RESILIENCE STACK — operator 2026-06-05
//     Architect flow: how each tool helps · how to use · benefit · integration
// ─────────────────────────────────────────────────────────────────────
export const OBSERVABILITY_STACK = [
  {
    id: 'service_discovery', name: 'Service Discovery (Consul / etcd / k8s DNS)',
    family: 'Service mesh foundation', relevance: 'USE', present: 'partial',
    helps:       'Agents + services find each other without hardcoded IPs. Survives pod restarts + scaling events.',
    how_to_use:  'Deploy Consul (sidecar) OR use k8s native (Service + DNS). Every service registers on boot.',
    benefit:     'Zero downtime during deploys; agents reconnect to new MCP server instances automatically.',
    architect:   'L2 container layer. Sits BETWEEN agent runtime and tool layer (MCP servers).',
    integration: 'MCP gateway → discovery → MCP server pool. Composes with §76.5 MCP architecture.',
    value:       '$15-50k/yr saved per outage prevented · time-to-recovery from 30min to <30s.',
  },
  {
    id: 'circuit_breaker', name: 'Circuit Breaker (Envoy / Resilience4j / Hystrix-style)',
    family: 'Resilience pattern', relevance: 'USE', present: false,
    helps:       'When LLM provider / MCP server / RAG index degrades, breaker opens, returns fallback, prevents cascade failure.',
    how_to_use:  'Wrap every external call (LLM, MCP, RAG, DB) in CircuitBreaker.execute(...) with 3-fail / 30s-reset config.',
    benefit:     'Single tool outage no longer crashes every agent. Per §52 row #11 brutal review.',
    architect:   'Cross-cutting at every L2 container egress. Composes with retry policy + timeout.',
    integration: 'Already partial: backend/ml/reference/rag_lifecycle.py has CircuitBreaker class. Extract to core/.',
    value:       'Per CRA outage incident-cost benchmark: $200k+ per major cascading failure prevented.',
  },
  {
    id: 'istio', name: 'Istio (Service Mesh)',
    family: 'Service mesh', relevance: 'USE', present: false,
    helps:       'mTLS between every service · per-route circuit breakers · per-route retries · canary rollouts.',
    how_to_use:  'Install Istio control plane in cluster, inject sidecars (auto on label), configure VirtualService + DestinationRule per agent/MCP.',
    benefit:     'Security (mTLS) + resilience (CB + retry) + canary all without code changes. Policy-as-code in YAML.',
    architect:   'L3 infra mesh. Wraps every L2 container with sidecar proxy. Centralizes traffic policy.',
    integration: 'Composes with §47.7 4-layer rollback (Istio for app-layer canary) + §47.6 SOC2 CC6.2 (mTLS).',
    value:       'Security audit fast-track (mTLS in mesh) + canary saves bad-deploy rollback cost ~$50k per incident.',
  },
  {
    id: 'kiali', name: 'Kiali (Istio Visualization)',
    family: 'Service mesh observability', relevance: 'USE', present: false,
    helps:       'Live topology of which agent calls which MCP calls which model. Shows degraded edges in red.',
    how_to_use:  'Deploy Kiali alongside Istio. Browse https://kiali.your-cluster — see graph in real time.',
    benefit:     'On-call answers "what is talking to what right now?" in 30s instead of grepping logs.',
    architect:   'Read-side observability layer. Consumes Istio telemetry. No production traffic.',
    integration: 'Pairs with §57.5 5-question runbook (WHAT/WHEN/WHO/WHY/HOW-rollback).',
    value:       '70% reduction in MTTI (mean-time-to-investigate). Operator self-serve.',
  },
  {
    id: 'opentelemetry', name: 'OpenTelemetry (OTel)',
    family: 'Distributed tracing', relevance: 'USE', present: 'partial',
    helps:       'Single request_id traverses agent → MCP → LLM → RAG → output. Every hop has a span. Every span has timing + status + payload.',
    how_to_use:  'Pip install opentelemetry-{api,sdk,instrumentation-*}; init in main.py; OTLP export to Tempo/Jaeger.',
    benefit:     'Per §57.6 canonical field "request_id" actually traverses every layer. Enables §57.5 troubleshooting.',
    architect:   'Cross-cutting library at every L2 container. Pushes spans to a collector → backend.',
    integration: 'Already in §72 observability module. Wire to every agent + MCP + LLM call.',
    value:       '60% reduction in MTTR · "WHEN did it break?" answered in seconds.',
  },
  {
    id: 'jaeger_tempo', name: 'Jaeger / Tempo (Trace backend)',
    family: 'Distributed tracing', relevance: 'USE', present: false,
    helps:       'Stores OTel spans. Query: "show me all traces > 5s in the last hour" → see the slow paths.',
    how_to_use:  'Deploy Tempo (Grafana) or Jaeger. Point OTel collector OTLP_ENDPOINT at it.',
    benefit:     'Without a backend, OTel is noise. With one, every slow request is investigable.',
    architect:   'Storage layer. Consumes OTel via OTLP. Exposes Grafana / Jaeger UI for query.',
    integration: 'Composes with OpenTelemetry above. Tempo preferred (Grafana-native).',
    value:       'Each on-call incident investigation: 4hr → 30min.',
  },
  {
    id: 'prometheus_grafana', name: 'Prometheus + Grafana',
    family: 'Metrics + Dashboards', relevance: 'USE', present: 'partial',
    helps:       'Time-series metrics (latency p50/p95/p99, error rate, token cost per minute, RAG cache hit %).',
    how_to_use:  'Expose /metrics on every service. Prometheus scrapes. Grafana dashboards visualize.',
    benefit:     'Alerts fire BEFORE on-call notices. Cost budget alerts at 50/80/100% per §41.1.',
    architect:   'Scrape-side observability. Pull model (Prom polls services).',
    integration: 'Already in §72 observability module + per-tab Dashboard tab.',
    value:       'Catches degradation 15-60min before user complaints. Each prevented incident: $25-100k.',
  },
  {
    id: 'loki_elk', name: 'Loki / ELK (Logs)',
    family: 'Centralized logging', relevance: 'USE', present: false,
    helps:       'Search every log line across every service by request_id, tenant_id, actor (§57.6 canonical fields).',
    how_to_use:  'Ship structured JSON logs via Promtail (Loki) or Filebeat (ELK). Index by canonical fields.',
    benefit:     '5-question runbook step #4 ("WHY did it break?") needs grep-by-request_id across services.',
    architect:   'Pull/push side. Logs collected by Promtail/Filebeat → Loki/Elasticsearch.',
    integration: 'Composes with §57.6 canonical fields (request_id mandatory in every log).',
    value:       'Incident root-cause: hours → minutes.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// 13. WORKSPACE TAB ALIGNMENT — operator 2026-06-05 (parallel session)
//     The 9-tab standard from docs/BANKING_TAB_ALIGNMENT.md. Renders as
//     Section 11 on /bank/framework. Composes with §73 two-menu layout.
// ─────────────────────────────────────────────────────────────────────
export const WORKSPACE_TAB_ALIGNMENT = [
  { order: 1, id: 'overview',   label: 'Overview',   subtabs: [],
    components: 'Tab-level executive summary' },
  { order: 2, id: 'process',    label: 'Process',
    subtabs: ['Workflow', 'Manual Execution', 'Automatic Execution', 'Pipeline Status', 'Approvals', 'History'],
    components: 'Trigger · Decide · Act · Persist · Audit · Hand-off' },
  { order: 3, id: 'data',       label: 'Data',
    subtabs: ['Data Sources', 'Discovery', 'Quality', 'Preparation', 'Master Data', 'Metadata', 'Lineage', 'Security', 'Monitoring'],
    components: 'The largest workspace — must use sub-tabs (never flat)' },
  { order: 4, id: 'analytics',  label: 'Analytics',
    subtabs: ['EDA', 'Feature Engineering', 'Evaluation', 'Explainability'],
    components: 'Distribution · Correlation · SHAP · Decision path' },
  { order: 5, id: 'ai',         label: 'AI',
    subtabs: ['Capabilities', 'Models', 'Agents', 'Experiments', 'Registry'],
    components: 'AI type catalog · Model lifecycle · Agent telemetry' },
  { order: 6, id: 'testing',    label: 'Testing',    subtabs: [],
    components: 'Test results · Coverage · Defect leakage · Eval gates' },
  { order: 7, id: 'operations', label: 'Operations',
    subtabs: ['Monitoring', 'Jobs', 'Incidents', 'Alerts', 'Deployment', 'Rollback', 'Logs', 'Observability', 'SLA'],
    components: 'Live latency · throughput · error rate · MTTR · SLA met %' },
  { order: 8, id: 'governance', label: 'Governance',
    subtabs: ['Security', 'Compliance', 'Risk', 'Audit', 'Responsible AI', 'Explainable AI', 'Policies', 'Approvals', 'Controls', 'Data Privacy', 'Model Risk'],
    components: 'OWASP · EU AI Act · NIST RMF · ISO 42001 · SOC2 · GDPR · HIPAA · NAIC' },
  { order: 9, id: 'reports',    label: 'Reports',
    subtabs: ['Executive', 'Business', 'Technical', 'Financial', 'Compliance', 'Audit'],
    components: 'Per-persona · per-cadence · with sign-off + PDF/Excel export' },
];

export const NAVIGATION_DEPTH_RULE = {
  allowed: 'Workspace Tab → Workspace Sub-Tab → Components',
  forbidden_example: 'Data → Quality → Completeness → Missing Values → Rules',
  max_depth: 3,
};

export const UNIVERSAL_FOOTER_WIDGETS = [
  { name: 'TabTimestamp',          purpose: 'Render timestamp for the current tab/sub-tab' },
  { name: 'TabDatabaseOps',        purpose: 'DB table, op list, IPO, audit/cache contract' },
  { name: 'TabTransactionHistory', purpose: 'Placeholder audit-row transaction history' },
  { name: 'TabTodoByRole',         purpose: 'Role-based to-do list' },
  { name: 'HitlFeedback',          purpose: 'Human feedback capture for improving tab output' },
];

// ─────────────────────────────────────────────────────────────────────
// 14. 18-STEP FORCED SEQUENCE — operator 2026-06-05 (§83.5)
//     Renders as Section 12 on /bank/framework. The brutal rule:
//     "No agent can directly answer the user. Every response MUST pass
//     Security → Retrieval → Evaluation → Review → Compliance → Audit."
// ─────────────────────────────────────────────────────────────────────
export const FORCED_SEQUENCE = [
  { n:  1, name: 'User / API / Event',          purpose: 'Inbound trigger',                            owner: 'External' },
  { n:  2, name: 'API Gateway',                 purpose: 'Auth · rate limit · request_id · trace_id', owner: 'Platform' },
  { n:  3, name: 'Request Context Builder',     purpose: 'tenant_id · user_id · role · region',       owner: 'Platform' },
  { n:  4, name: 'Orchestration Agent',         purpose: 'Validate · workflow state · agent path',    owner: 'AI Architect' },
  { n:  5, name: 'Security Agent',              purpose: 'RBAC · ABAC · prompt injection · ACL',      owner: 'Security' },
  { n:  6, name: 'Planner Agent',               purpose: 'Decompose · DAG · risk · HITL flag',        owner: 'AI Product' },
  { n:  7, name: 'Memory Agent',                purpose: 'Load context · TTL · tenant isolation',     owner: 'AI Platform' },
  { n:  8, name: 'RAG Agent',                   purpose: 'Query rewrite · retrieve · rerank · cite',  owner: 'AI Platform' },
  { n:  9, name: 'Specialist Agents',           purpose: 'Architect / Developer / Browser (if needed)', owner: 'Various' },
  { n: 10, name: 'Evaluation Agent',            purpose: 'Groundedness · halluc · relevance · safety',owner: 'AI QA' },
  { n: 11, name: 'Reviewer Agent',              purpose: 'Approve · reject · retry',                  owner: 'Tech Lead' },
  { n: 12, name: 'Council of Agents',           purpose: 'High-impact output review',                 owner: 'AI Governance' },
  { n: 13, name: 'Compliance Agent',            purpose: 'Policy check · audit evidence',             owner: 'GRC' },
  { n: 14, name: 'Human Approval Gate',         purpose: 'High-risk actions (§83.7)',                 owner: 'Human Operator' },
  { n: 15, name: 'Response Composer',           purpose: 'Merge · citations · confidence',            owner: 'AI Platform' },
  { n: 16, name: 'Audit Logger',                purpose: '§83.6 16-field row → immutable store',      owner: 'Security/Compliance' },
  { n: 17, name: 'Observability Layer',         purpose: 'Logs · traces · metrics · cost',            owner: 'SRE/Platform' },
  { n: 18, name: 'User / System Action',        purpose: 'Outbound response',                         owner: 'External' },
];

export const GOLDEN_RULE_AUDIT_ROW = [
  'user_id', 'tenant_id', 'request_id', 'trace_id', 'agent_path',
  'sharepoint_site_id', 'document_ids', 'chunk_ids', 'retrieval_scores',
  'model_name', 'prompt_version', 'eval_score', 'cost', 'latency',
  'final_decision', 'audit_event_id',
];

// Cross-link target — operator parallel session shipped /agent-supervisor
// (frontend/src/pages/AgentSupervisorPage.jsx) for live agent fleet visibility.
// Framework page links here for the operational ↔ reference handoff.
export const AGENT_SUPERVISOR_ROUTE = '/agent-supervisor';

// Lookups by id
export const OBSERVABILITY_BY_ID = Object.fromEntries(OBSERVABILITY_STACK.map((o) => [o.id, o]));
export const SDLC_BY_ID    = Object.fromEntries(SDLC_LIFECYCLE.map((s) => [s.id, s]));
export const OPS_BY_ID     = Object.fromEntries(OPS_DOMAINS.map((o) => [o.id, o]));
export const TIER_BY_ID    = Object.fromEntries(BUILD_ORDER.map((t) => [t.id, t]));
export const PATTERN_BY_ID = Object.fromEntries(AGENT_PATTERNS.map((p) => [p.id, p]));
export const SPEC_BY_ID    = Object.fromEntries(SPEC_DRIVEN.map((s) => [s.id, s]));
export const RUNTIME_BY_ID = Object.fromEntries(AGENTIC_RUNTIME.map((r) => [r.id, r]));

// Status helper
export function statusColor(s) {
  if (s === true || s === 'present')  return { bg: '#16a34a', label: '✓ Present' };
  if (s === 'partial')                return { bg: '#f59e0b', label: '◐ Partial' };
  return { bg: '#dc2626', label: '✗ Missing' };
}

// Aggregate readiness score (0-100) across all framework dimensions
export function readinessScore() {
  const all = [
    ...TOP1_CAPABILITIES,
    ...SDLC_LIFECYCLE.map((s) => ({ status: s.present })),
    ...BUILD_ORDER.flatMap((t) => t.components.map((c) => ({ status: c.present }))),
    ...OPS_DOMAINS,
    ...MENTAL_MODEL.map((m) => ({ status: m.present })),
    ...AGENT_PATTERNS.map((p) => ({ status: p.present })),
    ...SPEC_DRIVEN.map((s) => ({ status: s.present })),
    ...AGENTIC_RUNTIME.map((r) => ({ status: r.present })),
    ...OBSERVABILITY_STACK.map((o) => ({ status: o.present })),
  ];
  let total = 0;
  for (const item of all) {
    const s = item.status;
    if (s === true || s === 'present') total += 1;
    else if (s === 'partial')          total += 0.5;
  }
  return { score: total, max: all.length, pct: Math.round((total / all.length) * 100) };
}

// ─────────────────────────────────────────────────────────────────────
// 12. PER-TOOL DEEP-DIVE — only for USE-tagged tools across §7+§8+§9.
//     Operator 2026-06-05: "how it helps · how to use · benefit · architect ·
//     integration · value on the table". Indexed by tool id.
// ─────────────────────────────────────────────────────────────────────
export const TOOL_DETAILS = {
  // ─── Agent patterns (USE) ───
  hub_spoke: {
    helps: 'Decouple producer (insurance UI) from consumers (agents). Spike handling = scale workers, not refactor.',
    how_to_use: 'Redis BRPOP queue + N worker containers. docker compose up --scale worker=10.',
    benefit: 'Backpressure absorbed; agents fail independently; horizontally scalable to 100s of agents.',
    architect: 'L2 — sits BETWEEN UI/API and per-agent runtime. Queue is the trust boundary.',
    integration: 'Already in HOLY/bev (agents/agent.py). Copy pattern to insur backend/workers/.',
    value: 'Survive 10× traffic spike. Cost = $0 OSS · 100 agents on 4 vCPU.',
  },
  council: {
    helps: 'Underwriting / claim approval / fraud detection = 3 agents disagree → chair tie-breaks. Eliminates single-model bias.',
    how_to_use: '3 agents (different models or different prompts) run same input in parallel; aggregator scores; chair decides.',
    benefit: 'Per §64.43 #2: 95%+ apply rate vs 0% for single-model proposals.',
    architect: 'L2 cognitive layer. 1 council = 3-4 LLM calls = ~3× cost but ~10× accuracy.',
    integration: 'Already in HOLY/bev (agents/council_agent.py). Wire to underwriting + claim approval tabs.',
    value: 'Reduces underwriting error rate from 8% to <1%. Per insurance: $400-800k/yr per regional book.',
  },
  hierarchical: {
    helps: 'Claim triage → adjuster → SIU → settlement is naturally hierarchical. Parent agent delegates to child by step type.',
    how_to_use: 'Planner agent decomposes goal → DAG → child agents per node. Per §64.40 layer 3-4.',
    benefit: 'Each child agent specializes; planner orchestrates. Cost capped at planner level.',
    architect: 'L2 multi-agent layer. Planner = orchestrator; children = workers.',
    integration: 'Already partial in §76 multi-agent runtime card. Build PlannerAgent in backend/ml/reference/agentic_stack.py.',
    value: 'Cycle time for claims: weeks → days. Per insurance: $50-200k/yr per FTE saved.',
  },
  federated: {
    helps: 'Each tenant (insurer / broker) sees only their data. Critical for multi-tenant SaaS.',
    how_to_use: 'tenant_id on every DB row + RLS policies + per-tenant rate limits + per-tenant prompt context.',
    benefit: 'Per §47.6 SOC2 CC6.2 — passes federated audit without isolated DBs.',
    architect: 'Cross-cutting at every L2 container. Tenant_id propagated via OTel baggage.',
    integration: 'Already in §64.43 #7. Add tenant_id check to every backend route.',
    value: 'Unlocks B2B SaaS sales. Per tenant landed: $50-500k/yr ARR.',
  },
  dag_workflow: {
    helps: 'Underwriting = if-then-else tree of risk gates. DAG executor handles cycle detection + partial-failure rollback.',
    how_to_use: 'LangGraph or native DAG executor; each node = check (credit / health / claim-history); edges = decision rules.',
    benefit: 'Reproducible decisions. Each node logged separately for §38.3 audit.',
    architect: 'L2 cognitive. DAG state lives in Postgres / Redis.',
    integration: '§64.43 #8. Composes with LangGraph (KNOW) or build native.',
    value: 'Underwriting consistency: 70% → 95%. Per insurance: regulatory fast-track + lower reserves.',
  },
  reflection: {
    helps: 'Agent self-critiques output. "Would I have asked for additional medical records here?" Catches errors before HITL.',
    how_to_use: 'After every decision, re-run with reflection prompt: "Find 3 problems with this answer." Re-decide if any P0.',
    benefit: 'Per §64.43 #10: ~30% reduction in HITL escalation. Top-1% gap closer.',
    architect: 'L2 cognitive layer. Adds 1 LLM call per decision (~30% cost increase).',
    integration: 'Add ReflectionLoop component to backend/ml/reference/agent_orchestration.py.',
    value: 'HITL load: 40% → 28%. Per FTE saved: $80-150k/yr.',
  },
  supervisor: {
    helps: 'Long-running goals (FNOL → settlement weeks). Supervisor agent tracks state, delegates to workers, escalates on stall.',
    how_to_use: 'Celery beat schedule with supervisor task that polls open goals + dispatches workers.',
    benefit: 'No goal forgotten. SLA compliance auto-tracked.',
    architect: 'L2 orchestration. Supervisor is durable state holder (Redis / Postgres).',
    integration: 'Celery already in stack (backend/workers/). Add supervisor task.',
    value: 'SLA breach rate: 12% → 2%. Per breach prevented: $5-20k regulatory cost.',
  },
  // ─── Spec-driven (USE) ───
  bmad: {
    helps: 'Multi-agent role playbook: PM / Architect / Engineer / QA each have specialized prompt + tool set.',
    how_to_use: 'Already in ~/.claude/policies/. Run BMAD-style tasks via Task() with subagent_type per role.',
    benefit: 'Faster + more consistent feature delivery vs single-agent.',
    architect: 'Dev-time meta-pattern. Composes with Council pattern at runtime.',
    integration: 'Already in autonomy policy. Surface in dev docs.',
    value: 'Feature velocity: 1.5-2× vs single-agent.',
  },
  // ─── Agentic runtime (USE) ───
  mcp: {
    helps: 'Every tool (insurance, claim, broker, KYC, NICB) speaks one protocol. Add a tool without rewriting the agent.',
    how_to_use: 'Build per-tool MCP server (Python SDK). Register in MCP gateway. Agent uses tools via list_tools() / call_tool().',
    benefit: 'Per §67: tool sprawl → unified protocol. Per §76: standardized at the agent boundary.',
    architect: 'L2 protocol layer between agents and tools. MCP gateway = enforcement point.',
    integration: 'Already in §76 runtime card. Build MCP servers for: claims, KYC, NICB, broker portal.',
    value: 'Per new tool added: 80% faster vs custom integration. $20-40k saved per tool.',
  },
  cua_generic: {
    helps: 'Acts on legacy insurance portals that lack APIs (broker portals, state DOI filings, NICB lookups).',
    how_to_use: 'Stagehand or Open Operator wraps Playwright. Agent calls page.act("upload PDF") in natural language.',
    benefit: 'No API? No problem. CUA reads/writes the same UI a human would.',
    architect: 'L2 execution layer. Headless browser runs in sandboxed container.',
    integration: 'Per §64.40 Layer 6-9. Stub already in agentic_stack.py.',
    value: 'Unlocks ~30% of insurance integrations that have no API. $50-200k/yr per integration unlocked.',
  },
  stagehand: {
    helps: 'Semantic browser primitives. page.act("file the claim form") instead of CSS selectors.',
    how_to_use: 'npm install @browserbasehq/stagehand; agent calls page.act() / page.extract() / page.observe().',
    benefit: 'Resilient to UI changes (semantic) vs Playwright (selector-fragile).',
    architect: 'L2 CUA semantic wrapper over Playwright. Vendor: Browserbase OR self-host.',
    integration: 'Already stub in §64.40. Production needs Browserbase key OR local Playwright fallback.',
    value: 'CUA reliability: 60% → 92%. Halves agent re-tries.',
  },
  playwright: {
    helps: 'Battle-tested headless browser. CI-friendly. Pixel-perfect screenshots for audit.',
    how_to_use: 'npm install playwright; npx playwright install chromium; await page.click("text=Submit").',
    benefit: 'Free, OSS, mature. The selector-level layer under Stagehand.',
    architect: 'L3 browser primitive. Stagehand → Playwright → Chromium.',
    integration: 'Already in devDeps per §19.6. Used by e2e tests.',
    value: 'CI-level UI testing without paid SaaS. $0 OSS.',
  },
  temporal: {
    helps: 'FNOL claims span weeks (waiting on medical records / police reports). Temporal survives restarts; activity state durable.',
    how_to_use: 'Define Workflow + Activities in Python; worker polls Temporal server; activities have retry policies.',
    benefit: 'No more "where did that claim go?" Every step durable + replayable.',
    architect: 'L2 workflow OS. Workflow code runs in worker; state stored in Temporal cluster.',
    integration: 'Add temporal-sdk-python. Replace ad-hoc Celery flows for multi-day workflows.',
    value: 'Lost-in-the-middle claims rate: 8% → <1%. Customer NPS +15. Each saved claim: $200-2000.',
  },
  langgraph: {
    helps: 'Stateful agent graphs. Underwriting decision = LangGraph of risk-gates with state per gate.',
    how_to_use: 'pip install langgraph; define StateGraph; nodes are agent calls; edges are decision rules.',
    benefit: 'State management without manual code. Built-in checkpointing.',
    architect: 'L2 cognitive layer. Composes WITH or REPLACES native DAG executor.',
    integration: 'Drop-in for DAG Workflow pattern. Eval vs native impl per §56 stage-1.',
    value: 'Engineering effort: 50% reduction vs hand-rolled state machine.',
  },
  celery_redis: {
    helps: 'Async task queue + worker fleet. The implementation of Hub-and-Spoke.',
    how_to_use: 'pip install celery redis. Define @app.task; .delay() enqueues; workers consume.',
    benefit: 'Free, OSS, decades old, battle-tested. The default fan-out queue.',
    architect: 'L2 queue layer. Composes with Hub-and-Spoke pattern.',
    integration: 'Already in stack (backend/workers/). Add more task types per agent role.',
    value: '$0 OSS. Foundation of every agent fleet.',
  },
};
