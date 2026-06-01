// SectionCard.jsx — shared wrapper so every dossier section has consistent
// padding, border, header and anchor-scroll offset. Additive-only primitive;
// no existing component imports this yet.

export default function SectionCard({ id, icon, title, subtitle, children, footer }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            {title}
          </h3>
          {subtitle && (
            <span style={{ fontSize: 12, color: '#64748b' }}>· {subtitle}</span>
          )}
        </header>
        {children}
        {footer && (
          <footer style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
            {footer}
          </footer>
        )}
      </div>
    </section>
  );
}

// Small shared empty-state for sections that may have no data for a given dept.
export function EmptySection({ label = 'No data catalogued for this department yet.' }) {
  return (
    <div
      style={{
        padding: '16px 12px',
        fontSize: 12,
        color: '#94a3b8',
        background: '#f8fafc',
        border: '1px dashed #e2e8f0',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}
