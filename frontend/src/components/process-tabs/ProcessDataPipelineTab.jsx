import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ---- Medallion Layer Data ---- */
const MEDALLION_LAYERS = [
  {
    id: 'bronze',
    label: 'BRONZE',
    subtitle: 'Raw Ingestion',
    icon: '🟤',
    color: '#cd7f32',
    bgColor: 'rgba(205,127,50,0.08)',
    borderColor: '#cd7f32',
    description: 'CSVs, JSON, streaming, IoT feeds ingested as-is — schema-on-read',
    metrics: [
      { label: 'Row Count', value: '12.4M' },
      { label: 'File Size', value: '48.7 GB' },
      { label: 'Schema', value: 'Schema-on-read' },
    ],
    sources: ['CSV Files', 'JSON API', 'Streaming (Kafka)', 'IoT Sensors', 'ERP Export'],
  },
  {
    id: 'silver',
    label: 'SILVER',
    subtitle: 'Cleaned & Conformed',
    icon: '⚪',
    color: '#9ca3af',
    bgColor: 'rgba(156,163,175,0.08)',
    borderColor: '#9ca3af',
    description: 'Deduplicated, typed, validated — consistent schema across all sources',
    metrics: [
      { label: 'Row Count', value: '11.8M' },
      { label: 'Quality Score', value: '97.4%' },
      { label: 'Transforms', value: '24 applied' },
    ],
    sources: ['Dedup Logic', 'Type Casting', 'Null Handling', 'Range Validation'],
  },
  {
    id: 'gold',
    label: 'GOLD',
    subtitle: 'Business Aggregates',
    icon: '🟡',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: '#f59e0b',
    description: 'Star schema aggregates, feature store tables, and business KPIs',
    metrics: [
      { label: 'Table Count', value: '38' },
      { label: 'KPI Metrics', value: '127' },
      { label: 'Refresh', value: 'Daily 2 AM' },
    ],
    sources: ['Star Schema', 'Feature Store', 'KPI Aggregates', 'Dimension Tables'],
  },
  {
    id: 'ml',
    label: 'ML / AI',
    subtitle: 'Model Training & Serving',
    icon: '🔵',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.08)',
    borderColor: '#3b82f6',
    description: 'Features → training → model artifacts → real-time predictions',
    metrics: [
      { label: 'Model Count', value: '14' },
      { label: 'Avg Accuracy', value: '91.2%' },
      { label: 'Predictions/day', value: '2.3M' },
    ],
    sources: ['Feature Engineering', 'Model Training', 'MLflow Registry', 'Serving API'],
  },
];

/* ---- Data Type Classification ---- */
const DATA_TYPES = [
  {
    category: 'Structured Data',
    icon: '📊',
    color: '#3b82f6',
    items: [
      { format: 'CSV', size: '~2–5 GB', tool: 'Pandas / Spark', storage: 'Delta Lake', example: 'sales_transactions.csv' },
      { format: 'Parquet', size: '~500 MB–2 GB', tool: 'Apache Spark', storage: 'S3 / ADLS', example: 'inventory_daily.parquet' },
      { format: 'DB Tables', size: 'Variable', tool: 'JDBC / SQLAlchemy', storage: 'PostgreSQL', example: 'orders, products, customers' },
    ],
  },
  {
    category: 'Semi-Structured',
    icon: '📋',
    color: '#8b5cf6',
    items: [
      { format: 'JSON', size: '~200 MB–1 GB', tool: 'PySpark JSON reader', storage: 'Bronze Delta', example: 'api_events.json' },
      { format: 'XML', size: '~100–800 MB', tool: 'lxml / ElementTree', storage: 'Bronze Delta', example: 'supplier_catalog.xml' },
      { format: 'Log Files', size: '~10–50 GB/day', tool: 'Logstash / Fluentd', storage: 'Elasticsearch', example: 'app_server.log' },
    ],
  },
  {
    category: 'Unstructured',
    icon: '🖼️',
    color: '#10b981',
    items: [
      { format: 'Images', size: '~3–10 GB', tool: 'OpenCV / TorchVision', storage: 'S3 Bucket', example: 'product_defect_images/' },
      { format: 'Text', size: '~500 MB–2 GB', tool: 'spaCy / HuggingFace', storage: 'Vector DB', example: 'customer_reviews.txt' },
      { format: 'Audio', size: '~1–5 GB', tool: 'librosa / Whisper', storage: 'Blob Storage', example: 'call_center_recordings/' },
    ],
  },
];

/* ---- Data Quality per Layer ---- */
const QUALITY_DATA = [
  { layer: 'Bronze', rows: '12,400,000', nulls: '8.3%', dupes: '4.7%', schemaValid: 'N/A', quality: 62, color: '#cd7f32' },
  { layer: 'Silver', rows: '11,800,000', nulls: '1.2%', dupes: '0.1%', schemaValid: '100%', quality: 97, color: '#9ca3af' },
  { layer: 'Gold',   rows: '4,200,000',  nulls: '0.0%', dupes: '0.0%', schemaValid: '100%', quality: 100, color: '#f59e0b' },
];

/* ---- Class Balance Data ---- */
const BEFORE_BALANCE = [
  { name: 'Class 0 (Normal)',  value: 8420, color: '#3b82f6' },
  { name: 'Class 1 (Defect)',  value: 580,  color: '#ef4444' },
];
const AFTER_BALANCE = [
  { name: 'Class 0 (Normal)',  value: 4200, color: '#3b82f6' },
  { name: 'Class 1 (Defect)',  value: 3800, color: '#ef4444' },
];

/* ---- Lineage Steps ---- */
const LINEAGE_STEPS = [
  { label: 'Source Systems', detail: 'ERP, IoT, API, CSV', icon: '🗄️', color: '#6b7280' },
  { label: 'Bronze Table', detail: 'raw_ingestion_delta', icon: '🟤', color: '#cd7f32' },
  { label: 'Silver Table', detail: 'cleaned_conformed_delta', icon: '⚪', color: '#9ca3af' },
  { label: 'Gold Table', detail: 'business_aggregates_delta', icon: '🟡', color: '#f59e0b' },
  { label: 'Feature Store', detail: 'feature_store_v2', icon: '🏪', color: '#8b5cf6' },
  { label: 'Model Input', detail: 'training_dataset_v3', icon: '🤖', color: '#3b82f6' },
];

const LINEAGE_TRANSFORMS = [
  'Schema validation, type inference',
  'Dedup, null fill, range checks',
  'Aggregations, joins, KPI calc',
  'Feature encoding, scaling',
  'Train/test split, balancing',
];

const QUALITY_CHART_DATA = QUALITY_DATA.map((d) => ({ name: d.layer, score: d.quality }));

export default function ProcessDataPipelineTab() {
  const [expandedType, setExpandedType] = useState(null);

  <TabShell
      tabName="datapipeline"
      title="Data Pipeline · DAG + stages + run history"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="pipeline DAG · stage list · run history · retry rules"
      operation="read-only · wire pipeline state"
      accent="#0ea5e9"
      todos={[]}
    >
      return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

      {/* ── A. Medallion Architecture ── */}
      <section>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
          Databricks Medallion Architecture
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
          Progressive data refinement from raw ingestion to ML-ready features — Bronze → Silver → Gold → ML/AI
        </p>

        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', overflowX: 'auto' }}>
          {MEDALLION_LAYERS.map((layer, idx) => (
            <div key={layer.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                minWidth: 220,
                border: `2px solid ${layer.borderColor}`,
                borderRadius: 'var(--border-radius-lg)',
                background: layer.bgColor,
                padding: 'var(--spacing-lg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.5rem' }}>{layer.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: layer.color }}>{layer.label}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{layer.subtitle}</div>
                  </div>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {layer.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {layer.metrics.map((m) => (
                    <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{m.label}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: layer.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {layer.sources.map((s) => (
                    <span key={s} style={{
                      fontSize: '10px', padding: '2px 6px',
                      background: `${layer.color}22`, color: layer.color,
                      borderRadius: 'var(--border-radius-sm)', fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
              {idx < MEDALLION_LAYERS.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>→</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── B. Data Type Classification ── */}
      <section>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)', color: 'var(--text-primary)' }}>
          Data Type Classification
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {DATA_TYPES.map((dt) => (
            <div key={dt.category} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  background: `${dt.color}11`, cursor: 'pointer',
                  borderBottom: expandedType === dt.category ? '1px solid var(--border-color)' : 'none',
                }}
                onClick={() => setExpandedType(expandedType === dt.category ? null : dt.category)}
              >
                <span style={{ fontSize: '1.2rem' }}>{dt.icon}</span>
                <span style={{ fontWeight: 700, color: dt.color, fontSize: 'var(--font-size-base)' }}>{dt.category}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                  {expandedType === dt.category ? '▲' : '▼'} {dt.items.length} formats
                </span>
              </div>
              {expandedType === dt.category && (
                <div style={{ padding: 'var(--spacing-md)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-hover)' }}>
                        {['Format', 'Typical Size', 'Processing Tool', 'Storage', 'Example'].map((h) => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dt.items.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: dt.color }}>{row.format}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{row.size}</td>
                          <td style={{ padding: '8px 12px' }}>{row.tool}</td>
                          <td style={{ padding: '8px 12px' }}>{row.storage}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── C. Data Quality per Layer ── */}
      <section>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)', color: 'var(--text-primary)' }}>
          Data Quality at Each Layer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)' }}>
                  {['Layer', 'Row Count', 'Nulls %', 'Dupes %', 'Schema Valid', 'Quality Score'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUALITY_DATA.map((row) => (
                  <tr key={row.layer} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: row.color }}>{row.layer}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{row.rows}</td>
                    <td style={{ padding: '10px 12px', color: parseFloat(row.nulls) > 3 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{row.nulls}</td>
                    <td style={{ padding: '10px 12px', color: parseFloat(row.dupes) > 2 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>{row.dupes}</td>
                    <td style={{ padding: '10px 12px' }}>{row.schemaValid}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-hover)', borderRadius: 4 }}>
                          <div style={{ width: `${row.quality}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: row.color, minWidth: 36 }}>{row.quality}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ height: 220 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Quality Score by Layer</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={QUALITY_CHART_DATA} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Quality Score']} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {QUALITY_CHART_DATA.map((entry, i) => (
                    <Cell key={i} fill={QUALITY_DATA[i].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── D. Balanced vs Unbalanced ── */}
      <section>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
          Balanced vs Unbalanced Data
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
          Class imbalance correction using SMOTE + undersampling to prevent model bias
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          {/* Before */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-lg)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-danger)' }}>Before Balancing (Imbalanced)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={BEFORE_BALANCE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}>
                    {BEFORE_BALANCE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)' }}>
              ⚠ Imbalance ratio 14.5:1 — model will predict majority class
            </div>
          </div>

          {/* After */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-lg)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-success)' }}>After Balancing (SMOTE + Undersampling)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={AFTER_BALANCE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}>
                    {AFTER_BALANCE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>
              ✓ Near-balanced 1.1:1 ratio — model performance improved +12% F1
            </div>
          </div>
        </div>

        {/* Techniques */}
        <div style={{ marginTop: 'var(--spacing-md)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
          {[
            { name: 'SMOTE', desc: 'Synthetic Minority Over-sampling Technique — generates synthetic minority class samples', badge: 'Oversampling', color: '#3b82f6' },
            { name: 'Random Undersampling', desc: 'Randomly removes majority class samples to reduce imbalance ratio', badge: 'Undersampling', color: '#8b5cf6' },
            { name: 'Class Weights', desc: 'Applies inverse-frequency weights to loss function during model training', badge: 'Algorithm-level', color: '#10b981' },
          ].map((t) => (
            <div key={t.name} style={{ border: `1px solid ${t.color}44`, borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{t.name}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', background: `${t.color}22`, color: t.color, borderRadius: 20 }}>{t.badge}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── E. Data Lineage ── */}
      <section>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
          Data Lineage
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
          End-to-end transformation trace from source systems to model input
        </p>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-lg)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 700 }}>
            {LINEAGE_STEPS.map((step, idx) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `${step.color}22`, border: `2px solid ${step.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', marginTop: 6, textAlign: 'center', color: step.color }}>{step.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', fontFamily: 'monospace', marginTop: 2 }}>{step.detail}</div>
                  {idx < LINEAGE_STEPS.length - 1 && (
                    <div style={{ marginTop: 8, fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius-sm)', maxWidth: 120 }}>
                      {LINEAGE_TRANSFORMS[idx]}
                    </div>
                  )}
                </div>
                {idx < LINEAGE_STEPS.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 14, flexShrink: 0 }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>→</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
    </TabShell>
  );
}
