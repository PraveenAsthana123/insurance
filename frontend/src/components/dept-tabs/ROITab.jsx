import { departmentROI } from '../../data/roi';

export default function ROITab({ dept }) {
  const roi = departmentROI[dept.id] || [];

  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">💰 ROI Analysis — {dept.name}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--accent-success)' }}>{dept.roi}</span>
        </div>
        <div className="card-grid card-grid-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {roi.map((r, i) => (
            <div key={i} className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <div>
                    <div className="card-title">{r.area}</div>
                    <div className="card-subtitle">{r.measurement}</div>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--accent-success)', whiteSpace: 'nowrap' }}>
                  {r.impact}
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.description}</p>
              </div>
              <div className="card-footer">
                <span>📏 {r.measurement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 ROI Summary Table</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Area</th>
                <th>Impact</th>
                <th>Description</th>
                <th>Measurement Method</th>
              </tr>
            </thead>
            <tbody>
              {roi.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.area}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-success)', whiteSpace: 'nowrap' }}>{r.impact}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{r.description}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.measurement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
