import { Link } from 'react-router-dom';
import { departments } from '../data/departments';
import { brand, labels, totals, priorityDepartment } from '../config/brand';

export default function Dashboard() {
  const depts = departments.filter((d) => d.id !== 'dashboard');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1
            className="page-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: 0,
              fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
              fontWeight: 800,
              color: brand.primaryColor || 'var(--text-primary)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1.3em' }}>{brand.icon}</span>
            <span>{brand.name}</span>
          </h1>
          <p className="page-subtitle" style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
            {brand.tagline}
          </p>
        </div>
        <div className="page-header-right">
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '4px 12px', borderRadius: 10 }}>
            {labels.lastUpdatedPrefix} {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {priorityDepartment && (
        <Link
          to={priorityDepartment.route}
          style={{
            display: 'block',
            textDecoration: 'none',
            background: `linear-gradient(135deg, ${priorityDepartment.color}10, ${priorityDepartment.color}25)`,
            border: `1px solid ${priorityDepartment.color}55`,
            borderLeft: `4px solid ${priorityDepartment.color}`,
            borderRadius: 'var(--border-radius-lg)',
            padding: '14px 18px',
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">{priorityDepartment.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: priorityDepartment.color, fontWeight: 700 }}>
                Priority department
              </div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{priorityDepartment.name}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {priorityDepartment.description}
              </div>
            </div>
            <span style={{ fontSize: 20, color: priorityDepartment.color }}>›</span>
          </div>
        </Link>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-accent blue" />
          <div className="kpi-label">{labels.departmentCount}</div>
          <div className="kpi-value">{totals.departments}</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> Full coverage</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent green" />
          <div className="kpi-label">{labels.processCount}</div>
          <div className="kpi-value">{totals.processes}+</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> AI-powered workflows</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent purple" />
          <div className="kpi-label">{labels.aiTypes}</div>
          <div className="kpi-value">{totals.aiTypes.length}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">{labels.aiTypesSubtitle}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent amber" />
          <div className="kpi-label">{labels.datasets}</div>
          <div className="kpi-value">{totals.datasets}+</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> Real-world data</div>
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: 'var(--spacing-md)' }}>
        📊 Department Overview
      </div>

      <div className="card-grid card-grid-3">
        {depts.map((dept) => (
          <Link key={dept.id} to={dept.route} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', borderTop: `3px solid ${dept.color}` }}>
              <div className="card-header">
                <div className="card-header-left">
                  <span style={{ fontSize: 24 }}>{dept.icon}</span>
                  <div>
                    <div className="card-title">{dept.name}</div>
                    <div className="card-subtitle">{dept.processCount} processes</div>
                  </div>
                </div>
                <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</div>
              </div>

              <div className="card-body">
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--spacing-sm)' }}>
                  {dept.description}
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(dept.aiTypes || []).map((t) => (
                    <span key={t} className={`ai-badge ai-badge-${t.toLowerCase().replace(' ', '')}`}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="card-footer">
                <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{dept.roi}</span>
                <span>📊 {dept.processCount} processes</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="section-divider" />

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🤖 AI Capabilities Deployed</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          {totals.aiTypes.map((type) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)' }}>
              <span className={`ai-badge ai-badge-${type.toLowerCase().replace(' ', '')}`}>{type}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Used across {depts.filter((d) => (d.aiTypes || []).includes(type)).length} department(s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
