// ManagerArchetypePage — per-archetype scoped dashboard for a given department.
//
// Route: /:departmentId/manager/archetype/:archetypeId
//
// Shows: archetype focus + full responsibilities, KPI pills with deterministic
// synthetic current values, related workflows (narrowed by keyword match),
// related reports, signal sources, and an archetype switcher.

import { Link, Navigate, useParams } from 'react-router-dom';
import { departments } from '../data/departments';
import {
  MANAGER_ARCHETYPES,
  getArchetypeById,
  getArchetypesForDept,
} from '../data/managerArchetypes';
import { getWorkflowsForDept } from '../data/workflows';
import { getReportsByRole } from '../data/reports';
import { hashString } from '../utils/seed';

// Manager-family palette — aligned with RolesResponsibilitiesTab + archetype tab.
const MGR_COLOR = { bg: 'rgba(59,130,246,0.08)', fg: '#2563eb', border: '#bfdbfe' };

// Signal sources per archetype — 4 concrete signals the archetype watches.
// Hardcoded here (vs. in managerArchetypes.js) to keep the data file lean.
const ARCHETYPE_SIGNALS = {
  'agile-manager': [
    'Sprint burndown vs. commitment',
    'Retro action-item close rate',
    'Team velocity variance (last 3 sprints)',
    'Escaped-defect rate per release',
  ],
  'project-manager': [
    'Milestone slippage vs. baseline',
    'Critical-path task status',
    'Open risks aging > 7 days',
    'Budget burn vs. plan',
  ],
  'product-manager': [
    'Feature activation & adoption funnel',
    'NPS / CSAT deltas by cohort',
    'Experiment-to-launch velocity',
    'Churn + retention cohort curves',
  ],
  'product-owner': [
    'Backlog readiness (ready stories / sprint)',
    'Story acceptance rate per sprint',
    'Defects discovered post-acceptance',
    'Sprint scope-change rate',
  ],
  'delivery-manager': [
    'Release SLA attainment %',
    'Change-failure rate (CFR)',
    'Incident MTTR & post-mortem closure',
    'Vendor deliverable on-time %',
  ],
  'program-manager': [
    'Cross-team dependency aging',
    'Program-level milestone heatmap',
    'Executive stakeholder satisfaction',
    'Portfolio financials vs. plan',
  ],
  'presales-manager': [
    'Proposal win rate trend',
    'Demo → opportunity conversion',
    'RFP on-time submission rate',
    'Discount desk override volume',
  ],
  'engineering-manager': [
    'Engineer retention & attrition',
    'Deploy frequency & lead time',
    'Tech-debt backlog burn-down',
    '1:1 coverage & performance review cadence',
  ],
  'architect-manager': [
    'ADR coverage of major decisions',
    'Design review cycle time',
    'Architecture-drift incidents',
    'Reference-pattern adoption %',
  ],
};

// Keyword buckets per archetype — used to narrow workflows by simple match
// against workflow.name / description.
const ARCHETYPE_KEYWORDS = {
  'agile-manager': ['sprint', 'retro', 'velocity', 'stand-up', 'standup', 'impediment', 'agile'],
  'project-manager': ['milestone', 'schedule', 'plan', 'risk', 'critical-path', 'budget variance'],
  'product-manager': ['roadmap', 'launch', 'feature', 'adoption', 'nps', 'research', 'gtm'],
  'product-owner': ['backlog', 'grooming', 'acceptance', 'story', 'refinement'],
  'delivery-manager': ['release', 'deploy', 'vendor', 'sla', 'incident', 'change-failure', 'operational readiness'],
  'program-manager': ['portfolio', 'program', 'cross-team', 'stakeholder', 'review'],
  'presales-manager': ['proposal', 'rfp', 'demo', 'discount', 'pricing', 'win-loss', 'deal'],
  'engineering-manager': ['hiring', 'tech debt', 'tech-debt', 'retention', 'review', 'mentoring', 'onboarding', 'deploy frequency', 'code review'],
  'architect-manager': ['architecture', 'adr', 'design', 'standard', 'pattern', 'reference'],
};

/**
 * Pick the 3 workflows most relevant to an archetype for a given dept.
 * Simple keyword scoring — each matched term bumps the score, top-3 returned.
 * Falls back to the first 3 manager workflows if no matches exist.
 */
function relatedWorkflows(deptId, archetypeId) {
  const mgrWorkflows = getWorkflowsForDept(deptId).filter((w) => w.role === 'manager');
  const keywords = ARCHETYPE_KEYWORDS[archetypeId] || [];
  if (keywords.length === 0 || mgrWorkflows.length === 0) return mgrWorkflows.slice(0, 3);
  const scored = mgrWorkflows
    .map((w) => {
      const hay = `${w.name} ${w.description || ''}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 1 : acc), 0);
      return { w, score };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.w);
  if (top.length >= 3) return top;
  // Pad with non-matching manager workflows (preserving original order).
  const remaining = mgrWorkflows.filter((w) => !top.includes(w));
  return [...top, ...remaining].slice(0, 3);
}

/**
 * Deterministic synthetic current value for a KPI given dept + archetype.
 * Returns { value, unit, band } where band is 'good' / 'warn' / 'bad'.
 */
function synthesizeKpiValue(deptId, archetypeId, kpi) {
  const seed = hashString(`${deptId}-${archetypeId}-${kpi}`);
  // Map into [0, 99] — use as a percentage or score.
  const raw = seed % 100;
  const looksPercent = /%/.test(kpi) || /rate|adoption|retention|attainment|coverage|readiness|win/i.test(kpi);
  const looksTime = /mttr|cycle|time-to-market|lead time/i.test(kpi);
  const looksCount = /open risks|escalations|incidents|defects/i.test(kpi);
  if (looksCount) {
    // lower is better: 0..15
    const v = raw % 16;
    const band = v <= 3 ? 'good' : v <= 8 ? 'warn' : 'bad';
    return { value: String(v), unit: 'open', band };
  }
  if (looksTime) {
    // lower is better: 1..30 hours (or days; treat as a relative unit)
    const v = (raw % 30) + 1;
    const band = v <= 10 ? 'good' : v <= 20 ? 'warn' : 'bad';
    return { value: String(v), unit: 'hrs', band };
  }
  if (looksPercent) {
    // higher is better: 40..99
    const v = 40 + (raw % 60);
    const band = v >= 85 ? 'good' : v >= 70 ? 'warn' : 'bad';
    return { value: String(v), unit: '%', band };
  }
  // fallback score: 40..99
  const v = 40 + (raw % 60);
  const band = v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad';
  return { value: String(v), unit: '', band };
}

const BAND_COLOR = {
  good: { bg: 'rgba(16,185,129,0.12)', fg: '#059669', border: '#a7f3d0' },
  warn: { bg: 'rgba(234,179,8,0.12)', fg: '#a16207', border: '#fde68a' },
  bad: { bg: 'rgba(239,68,68,0.12)', fg: '#b91c1c', border: '#fecaca' },
};

/**
 * Pick 3 deterministic related reports for this archetype from the manager
 * reports catalog. Deterministic across renders so the card is stable.
 */
function relatedReports(archetypeId) {
  const all = getReportsByRole('manager');
  if (all.length === 0) return [];
  const seed = hashString(archetypeId);
  // pick 3 distinct entries spaced by a prime
  const step = 3;
  const picked = [];
  for (let i = 0; i < 3 && picked.length < all.length; i += 1) {
    const idx = (seed + i * step) % all.length;
    const r = all[idx];
    if (!picked.find((p) => p.id === r.id)) picked.push(r);
  }
  // Fill in order if duplicates caused a shortfall.
  for (const r of all) {
    if (picked.length === 3) break;
    if (!picked.find((p) => p.id === r.id)) picked.push(r);
  }
  return picked.slice(0, 3);
}

// ------------------------------ render ------------------------------

export default function ManagerArchetypePage() {
  const { departmentId, archetypeId } = useParams();
  const dept = departments.find((d) => d.id === departmentId);
  const archetype = getArchetypeById(archetypeId);

  if (!dept || dept.id === 'dashboard' || !archetype) {
    return <Navigate to="/" replace />;
  }

  const workflows = relatedWorkflows(dept.id, archetype.id);
  const reports = relatedReports(archetype.id);
  const signals = ARCHETYPE_SIGNALS[archetype.id] || [];
  const otherArchetypes = getArchetypesForDept(dept.id).filter((a) => a.id !== archetype.id);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">
            {archetype.icon} {archetype.label}
          </div>
          <div className="page-subtitle">
            Manager archetype view for{' '}
            <strong>{dept.icon} {dept.name}</strong>
            {' · '}
            <Link
              to={`/${dept.id}/manager`}
              style={{ color: MGR_COLOR.fg, textDecoration: 'none', fontWeight: 600 }}
            >
              ← Back to {dept.name} Manager
            </Link>
          </div>
        </div>
        <div className="page-header-right">
          <span
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-lg)',
              background: `${dept.color}15`,
              border: `1px solid ${dept.color}33`,
              color: dept.color,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
            }}
          >
            {dept.icon} {dept.name}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, padding: '0 4px' }}>
        {/* Focus & Responsibilities */}
        <section
          style={{
            border: `1px solid ${MGR_COLOR.border}`,
            background: MGR_COLOR.bg,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: MGR_COLOR.fg,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Focus
          </div>
          <div style={{ fontSize: 14, color: '#0f172a', fontStyle: 'italic', marginBottom: 12 }}>
            {archetype.focus}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: MGR_COLOR.fg,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Responsibilities
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13,
              color: '#0f172a',
              lineHeight: 1.55,
            }}
          >
            {(archetype.responsibilities || []).map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* KPIs */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 4,
            }}
          >
            📊 KPIs — current synthetic values for {dept.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
            Values are deterministic stubs until per-archetype metrics are wired to the warehouse.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(archetype.kpis || []).map((k) => {
              const v = synthesizeKpiValue(dept.id, archetype.id, k);
              const c = BAND_COLOR[v.band];
              return (
                <div
                  key={k}
                  style={{
                    border: `1px solid ${c.border}`,
                    background: c.bg,
                    borderRadius: 10,
                    padding: '10px 14px',
                    minWidth: 180,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                    {k}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c.fg }}>
                    {v.value}
                    <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>{v.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, color: c.fg, fontWeight: 600, textTransform: 'uppercase' }}>
                    {v.band === 'good' ? '● on target' : v.band === 'warn' ? '● watch' : '● breach'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Related workflows */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            🔁 Related workflows
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            Narrowed from {dept.name} manager enhancement processes by keyword match on archetype focus.
          </div>
          {workflows.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              No manager workflows catalogued for {dept.name} yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                    Workflow
                  </th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                    Trigger
                  </th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                    KPI
                  </th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontWeight: 500 }}>
                      {w.name}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {w.trigger || '—'}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                      {w.kpi || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Related reports */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            📑 Related reports
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {reports.map((r) => (
              <div
                key={r.id}
                style={{
                  border: `1px solid ${MGR_COLOR.border}`,
                  background: MGR_COLOR.bg,
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: MGR_COLOR.fg, marginBottom: 2 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  {r.category}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signal sources */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            background: '#fff',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            📡 Signal sources
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            Leading indicators this archetype watches day-to-day.
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13,
              color: '#0f172a',
              lineHeight: 1.55,
            }}
          >
            {signals.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{s}</li>
            ))}
          </ul>
        </section>

        {/* Archetype switcher */}
        {otherArchetypes.length > 0 && (
          <section
            style={{
              border: '1px dashed #e2e8f0',
              background: '#fafbfc',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Switch archetype for {dept.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {otherArchetypes.map((a) => (
                <Link
                  key={a.id}
                  to={`/${dept.id}/manager/archetype/${a.id}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 999,
                    border: `1px solid ${MGR_COLOR.border}`,
                    background: '#fff',
                    color: MGR_COLOR.fg,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span aria-hidden="true">{a.icon}</span>
                  <span>{a.label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Re-export for tests that want to see the full set.
export { MANAGER_ARCHETYPES };
