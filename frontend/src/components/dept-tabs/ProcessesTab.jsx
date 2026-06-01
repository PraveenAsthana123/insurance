import { Link } from 'react-router-dom';
import { departmentProcesses } from '../../data/processes';

export default function ProcessesTab({ dept }) {
  const processes = departmentProcesses[dept.id] || [];

  if (processes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔧</div>
        <div className="empty-state-title">No processes defined</div>
        <div className="empty-state-description">Processes for this department are being onboarded.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="page-header-left">
          <div className="page-title" style={{ fontSize: 'var(--font-size-lg)' }}>
            {dept.icon} {dept.name} — Processes
          </div>
          <div className="page-subtitle">Click any process to open its full detail page with 7 tabs</div>
        </div>
        <div className="page-header-right">
          <span className="topbar-badge badge-info">{processes.length} Processes</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {processes.map((proc, idx) => (
          <Link
            key={proc.id}
            to={`/${dept.id}/${proc.id}`}
            className="process-list-card"
          >
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--border-radius)',
              background: `linear-gradient(135deg, ${dept.color}22, ${dept.color}44)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: dept.color, flexShrink: 0,
              border: `1px solid ${dept.color}33`
            }}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div className="process-list-card-content">
              <div className="process-list-card-title">{proc.name}</div>
              <div className="process-list-card-meta">
                <span>{proc.description.slice(0, 90)}…</span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {proc.aiTypes.map((t) => (
                  <span key={t} className={`ai-badge ai-badge-${t.toLowerCase().replace(' ', '')}`}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: 18 }}>›</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
