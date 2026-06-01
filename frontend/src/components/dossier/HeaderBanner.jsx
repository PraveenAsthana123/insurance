// HeaderBanner.jsx — dept dossier hero: colored gradient strip with icon,
// name, description, ROI pill, and a small "Dossier · pilot" badge.

export default function HeaderBanner({ dept }) {
  const color = dept.color || '#3b82f6';
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 60%, ${color}99 100%)`,
        color: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 18,
        boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {dept.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{dept.name}</h1>
            <span
              style={{
                fontSize: 10,
                background: 'rgba(255,255,255,0.22)',
                padding: '3px 8px',
                borderRadius: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Dossier · Pilot
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.95,
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            {dept.description}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: 10,
              }}
            >
              ROI: {dept.roi}
            </span>
            <span
              style={{
                fontSize: 11,
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: 10,
              }}
            >
              {dept.processCount} processes
            </span>
            <span
              style={{
                fontSize: 11,
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px',
                borderRadius: 10,
              }}
            >
              AI: {(dept.aiTypes || []).join(' · ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
