// LifecyclesTab — 12th admin tab. Renders declarative state machines for
// the major entities (Task, Decision, Document, Incident, AI Model) as
// horizontal flow diagrams using inline CSS (no mermaid dependency).
//
// Forward transitions draw between adjacent boxes; any non-adjacent
// transition (including back-edges like blocked → in-progress) is listed
// as an annotated "also" row beneath the flow.

import { LIFECYCLES } from '../../data/lifecycles';

const LEGEND_ITEMS = [
  {
    swatch: '#e2e8f0',
    label: 'Not-yet-enforced (blueprint)',
    description: 'Target state machine — implementation lands in Phase 2+.',
  },
  {
    swatch: '#3b82f6',
    label: 'Current-state marker',
    description: 'Highlights the initial / entry state in each lifecycle.',
  },
];

export default function LifecyclesTab() {
  return (
    <div style={{ padding: '0 4px' }}>
      <Legend />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {LIFECYCLES.map((lc) => (
          <LifecycleBlock key={lc.entity} lifecycle={lc} />
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '12px 14px',
        marginBottom: '20px',
        background: '#f8fafc',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-secondary, #64748b)',
          alignSelf: 'center',
          marginRight: '4px',
        }}
      >
        Legend
      </div>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              background: item.swatch,
              border: '1px solid rgba(15,23,42,0.15)',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-primary, #0f172a)' }}>
            <strong>{item.label}</strong>
            <span style={{ color: 'var(--text-secondary, #64748b)', marginLeft: 6 }}>
              {item.description}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function LifecycleBlock({ lifecycle }) {
  const { entity, states, transitions, description } = lifecycle;

  // Split transitions into adjacent (drawn inline) vs. non-adjacent (listed below).
  const adjacent = new Set();
  const extra = [];
  for (const [from, to] of transitions) {
    const fromIdx = states.indexOf(from);
    const toIdx = states.indexOf(to);
    if (fromIdx !== -1 && toIdx === fromIdx + 1) {
      adjacent.add(`${from}->${to}`);
    } else {
      extra.push([from, to]);
    }
  }

  return (
    <section
      aria-label={`${entity} lifecycle`}
      style={{
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '10px',
        padding: '18px 20px',
        background: '#fff',
      }}
    >
      <header style={{ marginBottom: '16px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            color: 'var(--text-primary, #0f172a)',
            fontWeight: 700,
          }}
        >
          {entity}
        </h3>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: 'var(--text-secondary, #64748b)',
          }}
        >
          {description}
        </p>
      </header>

      {/* Horizontal flow */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          paddingBottom: '4px',
        }}
      >
        {states.map((s, i) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <StateBox state={s} isStart={i === 0} />
            {i < states.length - 1 && <Arrow enabled={adjacent.has(`${s}->${states[i + 1]}`)} />}
          </span>
        ))}
      </div>

      {/* Extra transitions (non-adjacent or back-edges). */}
      {extra.length > 0 && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: '6px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              color: 'var(--text-secondary, #64748b)',
              marginBottom: '6px',
            }}
          >
            Additional transitions
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {extra.map(([from, to], idx) => (
              <li
                key={`${from}->${to}-${idx}`}
                style={{ fontSize: '12px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.6 }}
              >
                <code style={{ fontSize: '11px' }}>{from}</code>
                {' → '}
                <code style={{ fontSize: '11px' }}>{to}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StateBox({ state, isStart }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '7px 14px',
        borderRadius: '999px',
        background: isStart ? 'rgba(59,130,246,0.12)' : '#f1f5f9',
        color: isStart ? '#1d4ed8' : 'var(--text-primary, #0f172a)',
        border: `1px solid ${isStart ? '#3b82f6' : '#cbd5e1'}`,
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {state}
    </span>
  );
}

function Arrow({ enabled = true }) {
  return (
    <svg
      aria-hidden="true"
      width="32"
      height="14"
      viewBox="0 0 32 14"
      style={{ opacity: enabled ? 1 : 0.35 }}
    >
      <line
        x1="0"
        y1="7"
        x2="24"
        y2="7"
        stroke={enabled ? '#64748b' : '#cbd5e1'}
        strokeWidth="1.5"
      />
      <polygon
        points="24,3 32,7 24,11"
        fill={enabled ? '#64748b' : '#cbd5e1'}
      />
    </svg>
  );
}
