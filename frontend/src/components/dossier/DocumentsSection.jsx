// DocumentsSection.jsx — shows the RAG corpus files that live under
// data/sales-context/. We hardcode the filename + description list
// because Vite cannot import arbitrary .md at runtime. Clicking a card
// is a no-op today — the plan's "link to ExplainDrawer" is aspirational;
// the drawer is tightly coupled to ForecastTab state and lifting it is
// out of scope for this additive-only pilot. We link to Manager instead.

import SectionCard, { EmptySection } from './SectionCard';

const SALES_DOCS = [
  {
    file: 'rossmann-business-context.md',
    title: 'Rossmann business context',
    description:
      'Dataset primer, store types, promo semantics, and known seasonal patterns used as the RAG base for Sales explain calls.',
  },
  {
    file: 'sales-kpi-definitions.md',
    title: 'Sales KPI definitions',
    description:
      'Canonical definitions of MAPE, forecast accuracy, discount rate, net margin and pipeline coverage — the lingua franca of the explain-drawer.',
  },
  {
    file: 'promo-playbook.md',
    title: 'Promo playbook',
    description:
      'Standard promo patterns, competitor-response heuristics, and expected uplift bands used by the simulation waterfall.',
  },
  {
    file: 'anomaly-handbook.md',
    title: 'Anomaly handbook',
    description:
      'Response protocols for sudden pipeline drops, stale-deal spikes, and MAPE regressions flagged by scheduled jobs.',
  },
];

// Per-dept doc lists — only Sales has a seeded corpus in Phase α.
const DOCS_BY_DEPT = {
  sales: SALES_DOCS,
};

export default function DocumentsSection({ dept }) {
  const docs = DOCS_BY_DEPT[dept.id];

  if (!docs || docs.length === 0) {
    return (
      <SectionCard
        id="documents"
        icon="📚"
        title="Documents / RAG corpus"
        subtitle={dept.name}
      >
        <EmptySection
          label={`No RAG corpus seeded for ${dept.name}. Sales is the flagship dept for retrieval-augmented explain (Phase α).`}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="documents"
      icon="📚"
      title="Documents / RAG corpus"
      subtitle={`${docs.length} markdown files fed to /api/v1/ai/explain`}
      footer={
        <>
          Source: <code>data/sales-context/*.md</code>. Used by{' '}
          <a href={`/${dept.id}/manager`} style={{ color: '#3b82f6' }}>
            Manager → Forecast → Ask AI why
          </a>{' '}
          drawer.
        </>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {docs.map((d) => (
          <div
            key={d.file}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <code
                style={{
                  fontSize: 11,
                  color: '#1d4ed8',
                  fontFamily: 'monospace',
                }}
              >
                {d.file}
              </code>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
              {d.title}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              {d.description}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
