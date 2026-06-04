// Banking-style shared building blocks for every right-pane tab.
// Composes: IPO sections (Input/Process/Output) · sub-tab grid · transactional
// history · output evaluation.
//
// Per global §64.15 (Process IPO + TODO + Tasks) + §38.3 (decision audit) +
// §59.4 (ORF metrics) + §73 (17 fixed tabs).

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
          onClick={() => onSelect(s.slug)}
          style={{
            padding: 'var(--spacing-md)',
            background: 'var(--bg-card)',
            border: `2px solid ${s.color || 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon || '▸'}</div>
          <h4 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-sm)', color: s.color || 'var(--text-primary)', fontWeight: 700 }}>{s.label}</h4>
          {s.desc && <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{s.desc}</p>}
        </button>
      ))}
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

