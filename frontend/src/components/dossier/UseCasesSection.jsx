// UseCasesSection.jsx — filters aiUseCases.js by dept and renders up to 6
// as category-coloured cards with inputs/outputs/impact. Uses the same
// CATEGORY_FAMILY palette pattern as AIUseCasesTab so visuals line up
// when users flip between Dossier and Admin → AI Use Cases.

import SectionCard, { EmptySection } from './SectionCard';
import { getUseCasesForDept } from '../../data/aiUseCases';

// Palette mirrors AIUseCasesTab.jsx — kept in sync by convention.
const CATEGORY_FAMILY = {
  RPA: 'automation',
  n8n: 'automation',
  ML: 'ml',
  NLP: 'ml',
  'Anomaly Detection': 'ml',
  Recommendation: 'ml',
  'Fraud Detection': 'ml',
  'AI Agent': 'agent',
  'Voice AI': 'agent',
  Campaign: 'marketing',
  'Email Marketing': 'marketing',
  'Digital Marketing': 'marketing',
  'Generative Marketing': 'marketing',
  'SEO Content': 'marketing',
  'Funnel Optimization': 'marketing',
  CRM: 'ops',
  'Vendor Mgmt': 'ops',
  'Contact Center Mgmt': 'ops',
};

const FAMILY_COLORS = {
  automation: { bg: 'rgba(20,184,166,0.1)', fg: '#0d9488', border: '#5eead4' },
  ml: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb', border: '#93c5fd' },
  agent: { bg: 'rgba(139,92,246,0.1)', fg: '#7c3aed', border: '#c4b5fd' },
  marketing: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309', border: '#fcd34d' },
  ops: { bg: 'rgba(100,116,139,0.12)', fg: '#475569', border: '#cbd5e1' },
};

const STATUS_COLORS = {
  live: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  pilot: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309' },
  draft: { bg: 'rgba(148,163,184,0.15)', fg: '#475569' },
};

function categoryColors(cat) {
  return FAMILY_COLORS[CATEGORY_FAMILY[cat]] || FAMILY_COLORS.ops;
}

export default function UseCasesSection({ dept }) {
  const items = getUseCasesForDept(dept.id) || [];
  const top = items.slice(0, 6);

  return (
    <SectionCard
      id="usecases"
      icon="🤖"
      title="AI Use Cases"
      subtitle={`${items.length} catalogued · showing top ${top.length}`}
      footer={
        <>
          Source: <code>aiUseCases.js</code>. Full catalog in{' '}
          <a href={`/${dept.id}/admin`} style={{ color: '#3b82f6' }}>
            Admin → AI Use Cases
          </a>
          .
        </>
      }
    >
      {top.length === 0 ? (
        <EmptySection label={`No AI use cases catalogued for ${dept.name} yet.`} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {top.map((u) => {
            const cc = categoryColors(u.category);
            const sc = STATUS_COLORS[u.status] || STATUS_COLORS.draft;
            return (
              <div
                key={u.id}
                style={{
                  border: `1px solid ${cc.border}`,
                  borderRadius: 8,
                  padding: 12,
                  background: '#fff',
                  borderLeft: `4px solid ${cc.fg}`,
                }}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: cc.bg,
                      color: cc.fg,
                      borderRadius: 10,
                      fontWeight: 600,
                    }}
                  >
                    {u.category}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: sc.bg,
                      color: sc.fg,
                      borderRadius: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {u.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
                  {u.description}
                </div>
                <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                  <div>
                    <strong>Input:</strong> {(u.inputs || []).slice(0, 2).join(', ')}
                  </div>
                  <div>
                    <strong>Output:</strong> {(u.outputs || []).slice(0, 2).join(', ')}
                  </div>
                  <div style={{ color: '#059669', marginTop: 2 }}>
                    <strong>Impact:</strong> {u.businessImpact}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
