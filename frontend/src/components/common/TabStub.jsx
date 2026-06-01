// TabStub — rendered by every Phase-1 stubbed tab. Accepts name + phase label.

export default function TabStub({ name, phase = 'Phase 2–5', description }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      minHeight: '360px',
      color: 'var(--text-secondary, #64748b)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
      <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary, #0f172a)' }}>
        {name}
      </h3>
      <p style={{ margin: '8px 0 16px', fontSize: '14px', maxWidth: '520px', textAlign: 'center' }}>
        {description || 'This section is scaffolded. Content arrives in a later phase.'}
      </p>
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: 'rgba(59,130,246,0.1)',
        color: '#3b82f6',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        Coming in {phase}
      </span>
    </div>
  );
}
