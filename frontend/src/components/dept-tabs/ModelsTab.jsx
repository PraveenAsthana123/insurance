import { departmentModels } from '../../data/models';

const statusColor = { production: 'var(--accent-success)', staging: 'var(--accent-warning)', deprecated: 'var(--accent-danger)' };

export default function ModelsTab({ dept }) {
  const models = departmentModels[dept.id] || [];

  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🧠 Deployed Models</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{models.length} models</span>
        </div>
        <div className="table-wrapper">
          <table className="model-comparison">
            <thead>
              <tr>
                <th>Model</th>
                <th>Algorithm</th>
                <th>Use Case</th>
                <th>MAPE</th>
                <th>Accuracy</th>
                <th>F1</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={i} className={m.status === 'production' && i === 0 ? 'best-model' : ''}>
                  <td>
                    <div className="model-name-cell">
                      {i === 0 && m.status === 'production' && <span className="best-model-crown">👑</span>}
                      {m.name}
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{m.algorithm}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{m.useCase}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{m.metrics.mape != null ? `${m.metrics.mape}%` : '—'}</td>
                  <td>
                    {m.metrics.accuracy != null ? (
                      <div className="accuracy-bar">
                        <div className="accuracy-fill" style={{ width: `${m.metrics.accuracy}px`, maxWidth: 80 }} />
                        <span className="accuracy-value">{m.metrics.accuracy}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{m.metrics.f1 != null ? m.metrics.f1.toFixed(2) : '—'}</td>
                  <td>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: statusColor[m.status] || 'var(--text-muted)' }}>
                      ● {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">💡 Model Justifications</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {models.map((m, i) => (
            <div key={i} className="test-case-card">
              <div className={`test-case-status-icon ${m.status === 'production' ? 'pass' : m.status === 'staging' ? 'skip' : 'fail'}`}>
                {m.status === 'production' ? '✓' : m.status === 'staging' ? '⏳' : '✗'}
              </div>
              <div className="test-case-content">
                <div className="test-case-name">{m.name}</div>
                <div className="test-case-description">{m.justification}</div>
                <div className="test-case-meta">
                  <span className="test-case-tag">{m.algorithm}</span>
                  <span className="test-case-tag">{m.useCase}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
