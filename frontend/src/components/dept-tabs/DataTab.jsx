import { departmentDatasets } from '../../data/datasets';

export default function DataTab({ dept }) {
  const ds = departmentDatasets[dept.id];
  if (!ds) return <div className="empty-state"><div className="empty-state-title">No dataset info available</div></div>;

  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📦 Primary Dataset</span>
          <a href={ds.kaggleUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            🔗 View on Kaggle ↗
          </a>
        </div>
        <div className="before-after-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="kpi-card">
            <div className="kpi-card-accent blue" />
            <div className="kpi-label">Dataset Name</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{ds.name}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent purple" />
            <div className="kpi-label">Data Type</div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{ds.dataType}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent green" />
            <div className="kpi-label">Columns</div>
            <div className="kpi-value">{ds.columns.length}</div>
          </div>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ds.description}</p>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🗂️ Schema / Columns</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Column Name</th><th>Type (Inferred)</th></tr>
            </thead>
            <tbody>
              {ds.columns.map((col, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)' }}>{col}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    {col.includes('date') || col.includes('time') ? 'datetime' :
                      col.includes('id') ? 'string/int' :
                      col.includes('flag') || col.includes('label') ? 'boolean/int' :
                      col.includes('score') || col.includes('rate') || col.includes('amount') || col.includes('value') ? 'float' : 'string/float'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ds.sharedWith && ds.sharedWith.length > 0 && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🤝 Shared With Departments</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {ds.sharedWith.map((dep, i) => (
              <span key={i} style={{
                padding: '6px 14px', borderRadius: 'var(--border-radius)',
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                color: 'var(--accent-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 500
              }}>{dep}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
