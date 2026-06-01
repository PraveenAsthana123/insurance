// managerArchetypes.js — 9 sub-specializations of the Manager role.
// These are ARCHETYPES *inside* the Manager role, not new top-level RBAC
// roles. The canonical 5-role matrix (manager, team-member, compliance,
// reporting-monitoring, tester) is unchanged; this file only adds richer
// manager content. The per-dept Manager entry in roles.js can reference
// these via getArchetypesForDept(deptId).

export const MANAGER_ARCHETYPES = [
  {
    id: 'agile-manager',
    label: 'Agile Manager',
    icon: '🏃',
    focus: 'Scrum ceremonies, sprint velocity, retro actions',
    responsibilities: [
      'Facilitate daily stand-ups, sprint planning, reviews, and retrospectives',
      'Coach the team on agile practices and remove impediments',
      'Track sprint velocity and burndown; coordinate scope trade-offs',
      'Own retro action items and drive continuous-improvement experiments',
    ],
    kpis: [
      'Sprint velocity',
      'Retro-action close rate',
      'Impediment MTTR',
    ],
    typicalDepts: 'all',
  },
  {
    id: 'project-manager',
    label: 'Project Manager',
    icon: '📋',
    focus: 'Scope, schedule, budget, risk',
    responsibilities: [
      'Own project plan, milestones, and critical path',
      'Maintain risk & issue register with mitigation owners',
      'Track scope changes and manage change-control board decisions',
      'Report status to stakeholders on cost/schedule/scope variance',
    ],
    kpis: [
      'On-time milestone delivery %',
      'Budget variance %',
      'Open risks > SLA',
    ],
    typicalDepts: 'all',
  },
  {
    id: 'product-manager',
    label: 'Product Manager',
    icon: '🎯',
    focus: 'Roadmap, user research, market fit',
    responsibilities: [
      'Own product roadmap and quarterly OKRs aligned to business strategy',
      'Synthesize user research, analytics, and market signals into bets',
      'Define success metrics and gate launches on activation/adoption data',
      'Coordinate GTM with marketing, sales, support, and legal',
    ],
    kpis: [
      'Feature adoption %',
      'NPS / CSAT lift',
      'Time-to-market (idea→GA)',
    ],
    typicalDepts: 'marketing, sales, customer, retail, telehealth',
  },
  {
    id: 'product-owner',
    label: 'Product Owner',
    icon: '📝',
    focus: 'Backlog, acceptance criteria, dev-team liaison',
    responsibilities: [
      'Groom and prioritize the product backlog against roadmap outcomes',
      'Write clear user stories and acceptance criteria with dev + QA',
      'Act as single voice-of-customer for the delivery team',
      'Accept or reject sprint increments against definition of done',
    ],
    kpis: [
      'Backlog readiness %',
      'Story acceptance rate',
      'Defects found post-acceptance',
    ],
    typicalDepts: 'all',
  },
  {
    id: 'delivery-manager',
    label: 'Delivery Manager',
    icon: '🚚',
    focus: 'Release orchestration, vendor mgmt, SLA',
    responsibilities: [
      'Orchestrate cross-team releases and deployment calendar',
      'Manage vendor / partner deliverables and SLA adherence',
      'Own incident response bridge and post-mortem follow-through',
      'Drive operational readiness reviews before every GA',
    ],
    kpis: [
      'SLA attainment %',
      'Change-failure rate',
      'Vendor escalations closed on time',
    ],
    typicalDepts: 'supply-chain, logistics, contact-center, finance',
  },
  {
    id: 'program-manager',
    label: 'Program Manager',
    icon: '🗺️',
    focus: 'Multi-project coordination, stakeholders',
    responsibilities: [
      'Coordinate a portfolio of inter-dependent projects to shared outcomes',
      'Align executive stakeholders on trade-offs across workstreams',
      'Run monthly program reviews; escalate cross-team blockers',
      'Consolidate roadmaps, risks, and financials across the program',
    ],
    kpis: [
      'Portfolio milestone attainment',
      'Cross-team blocker MTTR',
      'Stakeholder satisfaction score',
    ],
    typicalDepts: 'governance, finance, telehealth, marketing',
  },
  {
    id: 'presales-manager',
    label: 'Presales Manager',
    icon: '💼',
    focus: 'Deal shaping, demos, RFPs',
    responsibilities: [
      'Lead solution scoping and demo strategy for strategic deals',
      'Own RFP / RFI responses with accurate pricing and feasibility',
      'Coach solution consultants on discovery and objection handling',
      'Partner with sales to shape commercial structure and close plans',
    ],
    kpis: [
      'Proposal win rate %',
      'Demo-to-deal conversion',
      'RFP on-time submission %',
    ],
    typicalDepts: 'sales, marketing',
  },
  {
    id: 'engineering-manager',
    label: 'Engineering Manager',
    icon: '🧰',
    focus: 'Team health, tech debt, hiring, mentoring',
    responsibilities: [
      'Grow and retain an engineering team through 1:1s, reviews, and career pathing',
      'Balance feature delivery against tech debt and platform investment',
      'Own hiring pipeline, interview loop quality, and onboarding ramp',
      'Champion code quality, review culture, and incident learnings',
    ],
    kpis: [
      'Engineer retention %',
      'Deploy frequency / lead time',
      'Tech-debt burn-down',
    ],
    typicalDepts: 'governance, manufacturing, telehealth',
  },
  {
    id: 'architect-manager',
    label: 'Architect / Solutions Architect Manager',
    icon: '🏛️',
    focus: 'Architecture decisions, ADRs, standards',
    responsibilities: [
      'Own target architecture and maintain the ADR log for major decisions',
      'Review designs for scalability, security, and cost fitness',
      'Define and steward engineering standards and reference patterns',
      'Partner with security + governance on risk-based approval of designs',
    ],
    kpis: [
      'ADR coverage of major decisions %',
      'Design review cycle time',
      'Architecture drift incidents',
    ],
    typicalDepts: 'governance, manufacturing, supply-chain',
  },
];

/**
 * Return the archetypes applicable to a department.
 *
 * - If `typicalDepts` is the string 'all', the archetype applies to every dept.
 * - Otherwise `typicalDepts` is a comma-separated list of dept IDs; any dept
 *   ID listed there matches.
 *
 * @param {string} deptId
 * @returns {Array<object>} filtered archetype list (may be empty if deptId is falsy)
 */
export function getArchetypesForDept(deptId) {
  if (!deptId) return [];
  return MANAGER_ARCHETYPES.filter((a) => {
    if (a.typicalDepts === 'all') return true;
    const list = a.typicalDepts.split(',').map((s) => s.trim());
    return list.includes(deptId);
  });
}

/**
 * Return an archetype by id or undefined.
 * @param {string} id
 */
export function getArchetypeById(id) {
  return MANAGER_ARCHETYPES.find((a) => a.id === id);
}
