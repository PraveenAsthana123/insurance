import { Link } from 'react-router-dom';
import { departments } from '../data/departments';

export default function Dashboard() {
  const depts = departments.filter((d) => d.id !== 'dashboard');
  const totalProcesses = depts.reduce((s, d) => s + d.processCount, 0);
  const allAITypes = [...new Set(depts.flatMap((d) => d.aiTypes))];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🥤 HOLY Analytics Platform</div>
          <div className="page-subtitle">AI-powered analytics across 11 departments — from demand forecasting to governance</div>
        </div>
        <div className="page-header-right">
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '4px 12px', borderRadius: 10 }}>
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-accent blue" />
          <div className="kpi-label">Departments</div>
          <div className="kpi-value">11</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> Full CPG coverage</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent green" />
          <div className="kpi-label">Total Processes</div>
          <div className="kpi-value">{totalProcesses}+</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> AI-powered workflows</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent purple" />
          <div className="kpi-label">AI Types</div>
          <div className="kpi-value">{allAITypes.length}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">ML, DL, CV, NLP, RAG, RPA, n8n, Physical</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent amber" />
          <div className="kpi-label">Kaggle Datasets</div>
          <div className="kpi-value">11+</div>
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
                  {dept.aiTypes.map((t) => (
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
          <span className="content-section-title">🤖 AI Types Deployed</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          {[
            { type: 'ML', desc: 'Machine Learning — Forecasting, classification, optimization' },
            { type: 'DL', desc: 'Deep Learning — Complex pattern recognition, sequences' },
            { type: 'CV', desc: 'Computer Vision — Defect detection, shelf analytics' },
            { type: 'NLP', desc: 'Natural Language Processing — Text analysis, chatbots' },
            { type: 'RAG', desc: 'Retrieval Augmented Generation — Document Q&A, insights' },
            { type: 'RPA', desc: 'Robotic Process Automation — Data entry, PO processing' },
            { type: 'n8n', desc: 'n8n Workflows — Alert routing, ERP integration, notifications' },
            { type: 'Physical AI', desc: 'Physical AI — Robotics, IoT, edge computing' },
          ].map((ai) => (
            <div key={ai.type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)' }}>
              <span className={`ai-badge ai-badge-${ai.type.toLowerCase().replace(' ', '')}`}>{ai.type}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{ai.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
