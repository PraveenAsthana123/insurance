import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../../styles/workbench.css';

const MANUAL_STEPS = [
  { step: 'Data Collection', manual: 'Export from ERP manually to Excel', automated: 'Automated ETL pipeline runs daily at 6am', status: 'automated' },
  { step: 'Data Cleaning', manual: 'Manual data validation in spreadsheet', automated: 'Great Expectations data quality checks', status: 'automated' },
  { step: 'Analysis', manual: 'Analyst runs pivot tables and formulas', automated: 'ML model scores automatically', status: 'automated' },
  { step: 'Review', manual: 'Manager reviews weekly in meeting', automated: 'Exception-based alerts trigger review', status: 'hybrid' },
  { step: 'Decision', manual: 'Manual decision by team lead', automated: 'Auto-approved within thresholds; escalation above', status: 'hybrid' },
  { step: 'Action', manual: 'Manual entry into ERP system', automated: 'API push to ERP with confirmation', status: 'automated' },
  { step: 'Reporting', manual: 'Manual Excel report prepared weekly', automated: 'Real-time dashboard auto-updated', status: 'automated' },
  { step: 'Audit', manual: 'Annual manual audit', automated: 'Continuous automated audit trail', status: 'automated' },
];

const TODOS = [
  { task: 'Connect to live ERP data feed', priority: 'High', status: 'done', owner: 'Data Engineering' },
  { task: 'Deploy model to production environment', priority: 'High', status: 'done', owner: 'ML Ops' },
  { task: 'Set up monitoring and alerting', priority: 'High', status: 'done', owner: 'DevOps' },
  { task: 'Build user-facing dashboard', priority: 'Medium', status: 'in-progress', owner: 'Frontend' },
  { task: 'Integrate with ERP for auto-action', priority: 'Medium', status: 'in-progress', owner: 'Integration' },
  { task: 'Train end users on new system', priority: 'Medium', status: 'pending', owner: 'Change Mgmt' },
  { task: 'Set up n8n workflow automation', priority: 'Low', status: 'pending', owner: 'Automation' },
  { task: 'Document SOPs for automated process', priority: 'Low', status: 'pending', owner: 'Business Analyst' },
];

const statusColor = { done: 'var(--accent-success)', 'in-progress': 'var(--accent-warning)', pending: 'var(--text-muted)' };
const statusIcon = { done: '✓', 'in-progress': '⏳', pending: '○' };
const stepColor = { automated: 'var(--accent-success)', hybrid: 'var(--accent-warning)', manual: 'var(--accent-danger)' };

const PIPELINE_NODES = [
  { id: 'source', label: 'Data Source', icon: '🗄️', status: 'active', desc: 'ERP / Kaggle / API' },
  { id: 'etl', label: 'ETL', icon: '🔄', status: 'active', desc: 'dbt / Airflow' },
  { id: 'features', label: 'Feature Store', icon: '🛠️', status: 'active', desc: 'Feast / custom' },
  { id: 'model', label: 'Model', icon: '🧠', status: 'active', desc: 'XGBoost / MLflow' },
  { id: 'serve', label: 'Serve', icon: '🚀', status: 'active', desc: 'FastAPI / BentoML' },
  { id: 'monitor', label: 'Monitor', icon: '📡', status: 'active', desc: 'Evidently / Grafana' },
];

const RAW_SAMPLE = [
  { sku: 'SKU-001', date: '2024-01-15', sales: '8,472', price: '12.99', store: 'NYC-01', promo: 'Y' },
  { sku: 'SKU-002', date: '2024-01-15', sales: null, price: '8.49', store: 'LA-05', promo: 'N' },
  { sku: 'SKU-003', date: '2024-01-16', sales: '2,001', price: '99.99', store: 'CHI-03', promo: 'Y' },
  { sku: 'SKU-004', date: '2024-01-16', sales: '590', price: '5.25', store: 'NYC-02', promo: 'N' },
  { sku: 'SKU-005', date: '2024-01-17', sales: '14,823', price: '11.99', store: 'LA-01', promo: 'Y' },
];

const PROCESSED_SAMPLE = [
  { sku: 'SKU-001', date: '2024-01-15', sales_norm: '0.572', price_z: '-0.18', store_enc: '1', promo_enc: '1', lag_7: '0.541', roll_30: '0.558' },
  { sku: 'SKU-002', date: '2024-01-15', sales_norm: '0.320', price_z: '-0.42', store_enc: '5', promo_enc: '0', lag_7: '0.318', roll_30: '0.315' },
  { sku: 'SKU-003', date: '2024-01-16', sales_norm: '0.135', price_z: '2.91', store_enc: '3', promo_enc: '1', lag_7: '0.122', roll_30: '0.128' },
  { sku: 'SKU-004', date: '2024-01-16', sales_norm: '0.040', price_z: '-0.61', store_enc: '2', promo_enc: '0', lag_7: '0.038', roll_30: '0.041' },
  { sku: 'SKU-005', date: '2024-01-17', sales_norm: '1.000', price_z: '-0.24', store_enc: '1', promo_enc: '1', lag_7: '0.982', roll_30: '0.961' },
];

const REPORT_METRICS = [
  { name: 'Before Pipeline', accuracy: 61, quality: 72, time: 180 },
  { name: 'After Pipeline', accuracy: 92, quality: 98, time: 12 },
];

export default function ProcessAutomationTab({ process }) {
  const automated = MANUAL_STEPS.filter((s) => s.status === 'automated').length;
  const hybrid = MANUAL_STEPS.filter((s) => s.status === 'hybrid').length;
  const manual = MANUAL_STEPS.filter((s) => s.status === 'manual').length;

  const [activeSection, setActiveSection] = useState('pipeline');

  const sections = [
    { id: 'pipeline', label: 'Pipeline View' },
    { id: 'compare', label: 'Before / After Data' },
    { id: 'report', label: 'Pipeline Report' },
    { id: 'steps', label: 'Automation Steps' },
    { id: 'todos', label: 'To-Do Tasks' },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="kpi-card">
          <div className="kpi-card-accent green" />
          <div className="kpi-label">Automated Steps</div>
          <div className="kpi-value">{automated}</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> {Math.round(automated / MANUAL_STEPS.length * 100)}% automation</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent amber" />
          <div className="kpi-label">Hybrid Steps</div>
          <div className="kpi-value">{hybrid}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">Human in loop</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent red" />
          <div className="kpi-label">Manual Steps</div>
          <div className="kpi-value">{manual}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">To be automated</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent blue" />
          <div className="kpi-label">Pipeline Status</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-size-base)', color: 'var(--accent-success)' }}>Active</div>
          <div className="kpi-change positive">n8n + ERP integrated</div>
        </div>
      </div>

      {/* Section nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)',
              background: activeSection === s.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: activeSection === s.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ---- PIPELINE VIEW ---- */}
      {activeSection === 'pipeline' && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">⚡ Pipeline Architecture</span>
          </div>
          <div className="auto-pipeline">
            {PIPELINE_NODES.map((node, idx) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div className="auto-node">
                  <div className={`auto-node-box ${node.status}`}>
                    <span style={{ fontSize: '1.3rem' }}>{node.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{node.label}</span>
                  </div>
                  <div className="auto-node-label">{node.desc}</div>
                </div>
                {idx < PIPELINE_NODES.length - 1 && (
                  <div className={`auto-edge ${node.status === 'active' ? 'active' : ''}`} />
                )}
              </div>
            ))}
          </div>

          <div className="table-wrapper" style={{ marginTop: 'var(--spacing-md)' }}>
            <table className="data-table">
              <thead><tr><th>Node</th><th>Status</th><th>Data Path</th><th>Throughput</th><th>SLA</th></tr></thead>
              <tbody>
                {PIPELINE_NODES.map((n) => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600 }}>{n.icon} {n.label}</td>
                    <td><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-success)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 8 }}>● {n.status}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{`/pipeline/${n.id}`}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{Math.floor(Math.random() * 50000 + 5000).toLocaleString()} rows/min</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>✓ Met</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- BEFORE / AFTER DATA ---- */}
      {activeSection === 'compare' && (
        <div>
          <div className="before-after-compare">
            <div className="before-after-card before-card">
              <div className="before-after-header">⚠️ Raw Input Data</div>
              <div className="before-after-body" style={{ padding: 'var(--spacing-sm)', overflowX: 'auto' }}>
                <table className="ba-data-table">
                  <thead>
                    <tr>
                      {Object.keys(RAW_SAMPLE[0]).map((k) => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {RAW_SAMPLE.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ color: v === null ? 'var(--accent-danger)' : 'var(--text-primary)', fontStyle: v === null ? 'italic' : 'normal' }}>
                            {v ?? 'NULL'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--accent-danger)' }}>
                  ⚠ Nulls detected, no normalization, no feature engineering
                </div>
              </div>
            </div>
            <div className="before-after-card after-card">
              <div className="before-after-header">✅ Processed Output Data</div>
              <div className="before-after-body" style={{ padding: 'var(--spacing-sm)', overflowX: 'auto' }}>
                <table className="ba-data-table">
                  <thead>
                    <tr>
                      {Object.keys(PROCESSED_SAMPLE[0]).map((k) => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESSED_SAMPLE.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ color: 'var(--text-primary)' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--accent-success)' }}>
                  ✓ Normalized, encoded, lag features added, no nulls
                </div>
              </div>
            </div>
          </div>

          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">🔄 Transformations Applied</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Null imputation (median)', 'Min-Max normalization', 'Z-score standardization', 'Label encoding (store, promo)', 'Lag features (7-day, 30-day)', 'Rolling mean (30-day)', 'Outlier capping (99th pct)', 'Date feature extraction'].map((t) => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 600 }}>
                  ✓ {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- PIPELINE REPORT ---- */}
      {activeSection === 'report' && (
        <div>
          <div className="content-section">
            <div className="content-section-header">
              <span className="content-section-title">📊 Pipeline Performance Report</span>
            </div>
            <div style={{ height: 220, marginBottom: 'var(--spacing-lg)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REPORT_METRICS} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Bar dataKey="accuracy" name="Model Accuracy %" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="quality" name="Data Quality %" fill="var(--accent-success)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)' }}>
              {[
                { label: 'Accuracy Gain', value: '+31%', color: 'var(--accent-success)' },
                { label: 'Data Quality', value: '98%', color: 'var(--accent-success)' },
                { label: 'Processing Time', value: '12 min', color: 'var(--accent-primary)' },
                { label: 'Error Count', value: '0', color: 'var(--accent-success)' },
              ].map((m) => (
                <div key={m.label} style={{ padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- AUTOMATION STEPS ---- */}
      {activeSection === 'steps' && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🔄 Manual vs Automated — Step Comparison</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Process Step</th><th>Before (Manual)</th><th>After (Automated)</th><th>Status</th></tr>
              </thead>
              <tbody>
                {MANUAL_STEPS.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.step}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)' }}>⚠️ {s.manual}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>✅ {s.automated}</td>
                    <td>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: stepColor[s.status] }}>
                        ● {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- TODOS ---- */}
      {activeSection === 'todos' && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">✅ To-Do Tasks</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {TODOS.filter((t) => t.status === 'done').length}/{TODOS.length} completed
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {TODOS.map((t, i) => (
              <div key={i} className="test-case-card" style={{ padding: '10px 16px' }}>
                <div className={`test-case-status-icon ${t.status === 'done' ? 'pass' : 'skip'}`}>
                  {statusIcon[t.status]}
                </div>
                <div className="test-case-content">
                  <div className="test-case-name" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {t.task}
                  </div>
                  <div className="test-case-meta">
                    <span className="test-case-tag">{t.priority} Priority</span>
                    <span className="test-case-tag">{t.owner}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: statusColor[t.status] }}>{t.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
