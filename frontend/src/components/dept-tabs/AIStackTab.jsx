import { departmentAIStack } from '../../data/aiStack';

const AI_COLORS = {
  ML: 'ml', DL: 'dl', CV: 'cv', NLP: 'nlp', RAG: 'rag',
  RPA: 'rpa', n8n: 'n8n', 'Physical AI': 'physical',
};

export default function AIStackTab({ dept }) {
  const stack = departmentAIStack[dept.id] || [];

  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🤖 AI Technology Stack</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{stack.length} AI types deployed</span>
        </div>

        <div className="governance-grid">
          {stack.map((ai, i) => (
            <div key={i} className="governance-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span className={`ai-badge ai-badge-${AI_COLORS[ai.type] || 'ml'}`}>{ai.type}</span>
              </div>
              <div className="governance-card-title">{ai.useCase.split(',')[0].trim()}</div>
              <div className="governance-card-description">{ai.useCase}</div>
              <div style={{ marginTop: 'auto', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                📊 {ai.exampleOutput}
              </div>
              <div className="governance-status-row">
                <div className="governance-status-dot compliant" />
                <span style={{ color: 'var(--accent-success)' }}>Active in Production</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 AI Types Reference</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>AI Type</th>
                <th>Full Name</th>
                <th>Primary Use</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stack.map((ai, i) => (
                <tr key={i}>
                  <td><span className={`ai-badge ai-badge-${AI_COLORS[ai.type] || 'ml'}`}>{ai.type}</span></td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>
                    {{ ML: 'Machine Learning', DL: 'Deep Learning', CV: 'Computer Vision', NLP: 'Natural Language Processing', RAG: 'Retrieval Augmented Generation', RPA: 'Robotic Process Automation', n8n: 'Workflow Automation', 'Physical AI': 'Physical AI / Robotics' }[ai.type] || ai.type}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{ai.useCase.split(',')[0]}</td>
                  <td>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 600 }}>✓ Production</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
