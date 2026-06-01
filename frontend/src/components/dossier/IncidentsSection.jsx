// IncidentsSection.jsx — filters generateOverrideEvents(50) down to the
// current dept and renders the 5 most recent. Re-uses the same seeded
// generator as OverrideAnalyticsTab so entries match across views.

import SectionCard, { EmptySection } from './SectionCard';
import { generateOverrideEvents } from '../../data/overrideEvents';

const TYPE_COLORS = {
  'rbac.denied': { bg: 'rgba(239,68,68,0.12)', fg: '#b91c1c' },
  'decision.overridden': { bg: 'rgba(245,158,11,0.12)', fg: '#b45309' },
  'decision.rejected': { bg: 'rgba(148,163,184,0.18)', fg: '#475569' },
  'policy.violation': { bg: 'rgba(139,92,246,0.12)', fg: '#6d28d9' },
};

export default function IncidentsSection({ dept }) {
  const all = generateOverrideEvents(50);
  const filtered = all.filter((e) => e.dept === dept.id).slice(0, 5);

  return (
    <SectionCard
      id="incidents"
      icon="🚨"
      title="Incidents / RBAC events"
      subtitle={`${filtered.length} most recent for ${dept.name}`}
      footer="Source: overrideEvents.js seeded generator. Real backend-fed version ships with Phase 3b structured logs."
    >
      {filtered.length === 0 ? (
        <EmptySection
          label={`No incidents in the seeded event stream for ${dept.name}.`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((e) => {
            const tc = TYPE_COLORS[e.type] || TYPE_COLORS['policy.violation'];
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    background: tc.bg,
                    color: tc.fg,
                    borderRadius: 10,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}
                >
                  {e.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#0f172a' }}>{e.reason}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    role: {e.role} · {e.correlation_id}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
                  {new Date(e.timestamp).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
