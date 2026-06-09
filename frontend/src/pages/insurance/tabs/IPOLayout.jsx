// Banking-style shared building blocks for every right-pane tab.
// Composes: IPO sections (Input/Process/Output) · sub-tab grid · transactional
// history · output evaluation.
//
// Per global §64.15 (Process IPO + TODO + Tasks) + §38.3 (decision audit) +
// §59.4 (ORF metrics) + §73 (17 fixed tabs).

// =========================================
// -1. TabShell — canonical wrapper · Path E (deep review 2026-06-09)
// =========================================
// Wraps every tab body with the canonical pattern:
//   1. JourneyFlow horizontal at top (operator's phase orientation)
//   2. TodoList with per-tab pending items
//   3. Hero InfoCard explaining sequence/priority/information/operation
//   4. Tab body (per-tab unique content)
//   5. TransactionalHistory footer
//   6. OutputEvaluation footer
//
// Every Process*Tab and SimpleTabs tab adopts this wrapper to reach
// score ≥ 4 per docs/COMPREHENSIVE_MATRIX_2026-06-09.md Matrix 7.
//
// Usage:
//   <TabShell
//     tabName="my-tab"
//     title="What this shows"           // 1-liner in InfoCard
//     phase="Understand"                // §73 phase
//     phases={['Orient', 'Understand', 'Describe', 'Ship']}
//     priority="P1"                     // P0 / P1 / P2 / P3
//     information="role · want · so-that"
//     operation="read-only here · edit in blueprint.json"
//     todos={['todo 1', 'todo 2']}
//     accent="#8b5cf6">
//     {/* tab body */}
//   </TabShell>

const PHASE_DEFAULT = ['Orient', 'Understand', 'Describe', 'Ship'];
const PRIORITY_TONE = {
  P0: { bg: '#fee2e2', border: '#dc2626', label: 'P0 · regulator blocker' },
  P1: { bg: '#fef3c7', border: '#d97706', label: 'P1 · operational' },
  P2: { bg: '#dbeafe', border: '#1e40af', label: 'P2 · polish' },
  P3: { bg: '#e5e7eb', border: '#6b7280', label: 'P3 · backlog' },
};

export function TabShell({
  tabName,
  title,
  phase,
  phases = PHASE_DEFAULT,
  priority,
  information,
  operation,
  todos = [],
  accent = '#3b82f6',
  children,
}) {
  const journeySteps = phases.map((p) => ({
    slug: p,
    label: p === phase ? `${p} (THIS TAB)` : p,
    color: accent,
  }));
  const pTone = PRIORITY_TONE[priority] || null;

  return (
    <div>
      {/* 1. JourneyFlow · horizontal phase strip at TOP */}
      <JourneyFlow steps={journeySteps} currentSlug={phase} />

      {/* 2. TodoList · per-tab pending items at TOP */}
      {todos.length > 0 && (
        <TodoList items={todos} title={`TODO · pending for this tab`} />
      )}

      {/* 3. Hero InfoCard · sequence + priority + information + operation */}
      <InfoCard icon="ℹ️" title={title || 'What this tab shows'} accent={accent}>
        {priority && pTone && (
          <span style={{
            display: 'inline-block', marginRight: 8,
            padding: '2px 8px', borderRadius: 3,
            background: pTone.bg, color: pTone.border,
            border: `1px solid ${pTone.border}`,
            fontSize: 10, fontWeight: 700,
          }}>{pTone.label}</span>
        )}
        <strong>Sequence</strong>: {phase ? `${phase} phase of ${phases.join(' → ')}` : phases.join(' → ')}.
        {information && <><br /><strong>Information</strong>: {information}.</>}
        {operation && <><br /><strong>Operation</strong>: {operation}.</>}
      </InfoCard>

      {/* 4. Tab body · per-tab UNIQUE content */}
      {children}

      {/* 5+6. Footer · transactional history + output evaluation */}
      <TransactionalHistory rows={[]} tabName={tabName} />
      <OutputEvaluation metrics={{}} tabName={tabName} />
    </div>
  );
}

// =========================================
// 0. DerivedBadge — promoted from AIDetailView + SimpleTabs (DRY 2026-06-04)
// =========================================

export function DerivedBadge({ derived }) {
  return (
    <span style={{
      padding: '2px 6px', borderRadius: 'var(--border-radius-sm)',
      background: derived ? 'var(--bg-hover)' : 'var(--accent-success)',
      color: derived ? 'var(--text-secondary)' : '#fff',
      fontSize: 'var(--font-size-xs)', fontWeight: 600,
    }}>
      {derived ? 'derived' : 'operator-set'}
    </span>
  );
}

// =========================================
// 1. IPOSection — banking's numbered card (Section N: INPUT / PROCESS / OUTPUT)
// =========================================

const SECTION_TONE = {
  input:   { number_bg: '#3b82f6', header_bg: '#eff6ff', border: '#bfdbfe' },   // blue
  process: { number_bg: '#8b5cf6', header_bg: '#f5f3ff', border: '#ddd6fe' },   // violet
  output:  { number_bg: '#10b981', header_bg: '#ecfdf5', border: '#a7f3d0' },   // emerald
  history: { number_bg: '#6b7280', header_bg: '#f9fafb', border: '#e5e7eb' },   // slate
  eval:    { number_bg: '#f59e0b', header_bg: '#fffbeb', border: '#fde68a' },   // amber
};

export function IPOSection({ number, kind = 'input', title, subtitle, children }) {
  const tone = SECTION_TONE[kind] || SECTION_TONE.input;
  return (
    <div style={{
      marginBottom: 'var(--spacing-md)',
      border: `1px solid ${tone.border}`,
      borderRadius: 'var(--border-radius)',
      overflow: 'hidden',
      background: 'var(--bg-card)',
    }}>
      <div style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: tone.header_bg,
        borderBottom: `1px solid ${tone.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: tone.number_bg, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14,
        }}>{number}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>{title}</h3>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: 'var(--spacing-md)' }}>
        {children}
      </div>
    </div>
  );
}

// =========================================
// 2. SubTabGrid — banking-style card-grid landing for hub tabs
// =========================================

export function SubTabGrid({ subtabs, onSelect, columns = 4 }) {
  // CLICKABLE cards · LIGHT-TINTED background per operator 2026-06-09
  // ("clickable card must have background light color · information card must be white")
  // 'Click to open →' affordance + cursor pointer + hover lift make clickability obvious.
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(200, Math.floor(960 / columns))}px, 1fr))`,
      gap: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-lg)',
    }}>
      {subtabs.map((s) => (
        <button
          key={s.slug}
          onClick={() => { onSelect(s.slug); window.scrollTo({top: 0, behavior: 'instant'}); }}
          title={`Click to open ${s.label}`}
          style={{
            padding: 'var(--spacing-md)',
            background: s.color ? `${s.color}10` : '#eff6ff',  // light-tint = clickable affordance
            border: `2px solid ${s.color || '#3b82f6'}`,
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.15s, box-shadow 0.15s',
            display: 'flex', flexDirection: 'column', minHeight: 110,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; e.currentTarget.style.background = s.color ? `${s.color}20` : '#dbeafe'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = s.color ? `${s.color}10` : '#eff6ff'; }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon || '▸'}</div>
          <h4 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-sm)', color: s.color || 'var(--text-primary)', fontWeight: 700 }}>{s.label}</h4>
          {s.desc && <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', flex: 1 }}>{s.desc}</p>}
          <div style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: s.color || '#3b82f6', fontWeight: 600 }}>
            Click to open →
          </div>
        </button>
      ))}
    </div>
  );
}

// =========================================
// 2b. InfoCard — non-clickable information surface (WHITE background)
// =========================================
// Per operator 2026-06-09: "information card must be background white"
// Use when you want to show structured info without inviting a click.

export function InfoCard({ icon, title, children, accent = '#6b7280' }) {
  return (
    <div style={{
      background: '#ffffff',                                    // pure white = info-only
      border: `1px solid ${accent}40`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 'var(--border-radius)',
      padding: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-sm)',
    }}>
      {(icon || title) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          {title && <strong style={{ fontSize: 'var(--font-size-sm)', color: accent }}>{title}</strong>}
          <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto', fontStyle: 'italic' }}>info-only</span>
        </div>
      )}
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}

// =========================================
// 2c. JourneyFlow — horizontal step-flow on top (operator 2026-06-09)
// =========================================
// "there must be one journy flow on top to undestand .. list of operation
// going to havppend in horizental"

export function JourneyFlow({ steps, currentSlug }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: 'var(--spacing-sm)',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 'var(--border-radius)',
      marginBottom: 'var(--spacing-md)',
      overflowX: 'auto',
    }}>
      {steps.map((s, i) => (
        <div key={s.slug} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            padding: '4px 10px',
            background: s.slug === currentSlug ? s.color || '#3b82f6' : '#fff',
            color: s.slug === currentSlug ? '#fff' : '#475569',
            border: `1px solid ${s.color || '#cbd5e1'}`,
            borderRadius: 4, fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            {i + 1}. {s.label}
          </div>
          {i < steps.length - 1 && (
            <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

// =========================================
// 2d. TodoList — pending-tasks panel at TOP of every sub-tab (operator 2026-06-09)
// =========================================
// "todo must be top"
// Renders BEFORE IPO sections so operator sees what's pending immediately.

export function TodoList({ items, title = "TODO · pending for this artifact" }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      background: '#fff7ed',                                  // light orange = pending
      border: '1px solid #fed7aa',
      borderLeft: '4px solid #f59e0b',
      borderRadius: 'var(--border-radius)',
      padding: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-md)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>📝</span>
        <strong style={{ fontSize: 'var(--font-size-sm)', color: '#b45309' }}>{title}</strong>
        <span style={{
          marginLeft: 'auto',
          background: '#f59e0b', color: '#fff',
          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
        }}>
          {items.length} pending
        </span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--font-size-xs)', color: '#78350f' }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: 2 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// =========================================
// 3. TransactionalHistory — per-tab audit-row strip (recent decisions)
// =========================================

export function TransactionalHistory({ rows, tabName }) {
  if (!rows || rows.length === 0) {
    return (
      <IPOSection number="4" kind="history" title="Transactional history" subtitle="No audit rows recorded for this tab yet. Backend wiring pending per global §38.3.">
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          When the backend goes live, every <code>{tabName}</code>-tab action will land here
          keyed by <code>request_id</code> · <code>tenant_id</code> · <code>actor</code> ·
          <code>latency_ms</code> · <code>outcome</code>.
        </p>
      </IPOSection>
    );
  }
  return (
    <IPOSection number="4" kind="history" title="Transactional history" subtitle={`Last ${rows.length} audit rows for ${tabName}.`}>
      <table className="insurance-matrix">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Outcome</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.request_id || i}>
              <td>{r.timestamp}</td>
              <td>{r.actor}</td>
              <td>{r.action}</td>
              <td>{r.outcome}</td>
              <td>{r.latency_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </IPOSection>
  );
}

// =========================================
// 4. OutputEvaluation — Ragas-style metric panel (per §59.4)
// =========================================

const ORF_THRESHOLDS = {
  faithfulness:      { target: 0.85, label: 'Faithfulness' },
  context_precision: { target: 0.75, label: 'Context precision' },
  answer_relevance:  { target: 0.80, label: 'Answer relevance' },
  citation_accuracy: { target: 1.00, label: 'Citation accuracy' },
};

export function OutputEvaluation({ metrics, tabName }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <IPOSection number="5" kind="eval" title="Output evaluation" subtitle="No ORF metrics computed for this tab yet. Backend eval wiring pending per global §59.4.">
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          When the eval harness goes live, every <code>{tabName}</code>-tab output will be scored against
          ORF thresholds (faithfulness ≥ 0.85 · context precision ≥ 0.75 · answer relevance ≥ 0.80 · citation accuracy = 100%).
        </p>
      </IPOSection>
    );
  }
  return (
    <IPOSection number="5" kind="eval" title="Output evaluation" subtitle="Ragas-style metrics per global §59.4">
      <table className="insurance-matrix">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(metrics).map(([k, v]) => {
            const spec = ORF_THRESHOLDS[k] || { target: 0.0, label: k };
            const pass = v >= spec.target;
            return (
              <tr key={k}>
                <td>{spec.label}</td>
                <td>{typeof v === 'number' ? v.toFixed(3) : v}</td>
                <td>{spec.target}</td>
                <td>{pass ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ pass</span> : <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ fail</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </IPOSection>
  );
}

