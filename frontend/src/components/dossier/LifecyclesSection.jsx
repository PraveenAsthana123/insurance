// LifecyclesSection.jsx — renders 3 compact lifecycle diagrams (Task,
// Decision, AI Model) as horizontal state chains with arrows. Mini
// version of LifecyclesTab — this is the dossier-tile size.

import SectionCard from './SectionCard';
import { LIFECYCLES } from '../../data/lifecycles';

const SHOW_ENTITIES = ['Task', 'Decision', 'AI Model'];

const STATE_COLORS = {
  created: '#3b82f6',
  assigned: '#8b5cf6',
  'in-progress': '#f59e0b',
  blocked: '#ef4444',
  completed: '#10b981',
  closed: '#64748b',
  pending: '#94a3b8',
  recommended: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  overridden: '#f59e0b',
  training: '#f59e0b',
  validated: '#3b82f6',
  deployed: '#10b981',
  monitored: '#8b5cf6',
  retired: '#64748b',
};

function StateNode({ state }) {
  const color = STATE_COLORS[state] || '#64748b';
  return (
    <div
      style={{
        padding: '4px 10px',
        background: `${color}18`,
        border: `1px solid ${color}`,
        color,
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {state}
    </div>
  );
}

function Arrow() {
  return <span style={{ color: '#cbd5e1', fontSize: 14, flexShrink: 0 }}>→</span>;
}

function MiniLifecycle({ lifecycle }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 12,
        background: '#fff',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{lifecycle.entity}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
          {lifecycle.states.length} states · {lifecycle.transitions.length} transitions
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#64748b',
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        {lifecycle.description}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {lifecycle.states.map((state, idx) => (
          <div
            key={state}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <StateNode state={state} />
            {idx < lifecycle.states.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LifecyclesSection({ dept }) {
  const selected = LIFECYCLES.filter((lc) => SHOW_ENTITIES.includes(lc.entity));

  return (
    <SectionCard
      id="lifecycles"
      icon="🔄"
      title="Lifecycles"
      subtitle={`3 of ${LIFECYCLES.length} entities · cross-dept state machines`}
      footer={
        <>
          Source: <code>lifecycles.js</code>. Full diagrams in{' '}
          <a href={`/${dept.id}/admin`} style={{ color: '#3b82f6' }}>
            Admin → Lifecycles
          </a>
          .
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selected.map((lc) => (
          <MiniLifecycle key={lc.entity} lifecycle={lc} />
        ))}
      </div>
    </SectionCard>
  );
}
