// EmptyState · Iter 25 · G3 closure · reusable empty-state component.
// Replaces "No data" text + "loading..." stub patterns.

export default function EmptyState({
  icon = '📭',
  title = 'No data yet',
  description = '',
  action = null,
  accent = '#94a3b8',
  size = 'md',  // sm | md | lg
}) {
  const sizes = {
    sm: { padding: 12, iconSize: 24, titleSize: 12 },
    md: { padding: 20, iconSize: 36, titleSize: 13 },
    lg: { padding: 32, iconSize: 48, titleSize: 14 },
  };
  const sz = sizes[size] || sizes.md;

  return (
    <div role="status" style={{
      padding: sz.padding,
      textAlign: 'center',
      background: `${accent}08`,
      border: `1px dashed ${accent}60`,
      borderRadius: 8,
      color: '#475569',
    }}>
      <div aria-hidden="true" style={{ fontSize: sz.iconSize, marginBottom: 8, opacity: 0.7 }}>
        {icon}
      </div>
      <div style={{ fontSize: sz.titleSize, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: action ? 10 : 0, maxWidth: 360, marginInline: 'auto' }}>
          {description}
        </div>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
