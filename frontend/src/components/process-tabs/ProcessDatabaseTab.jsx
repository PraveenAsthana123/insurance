import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ── A. Architecture data ── */
const ARCH_NODES = [
  { id: 'postgres',   label: 'PostgreSQL',    icon: '🐘', color: '#336791', role: 'Transactional',  arrow: '↔ Application' },
  { id: 'chroma',     label: 'ChromaDB',      icon: '🔮', color: '#8b5cf6', role: 'Vector / RAG',   arrow: '↔ RAG Pipeline' },
  { id: 'neo4j',      label: 'Neo4j',         icon: '🕸️', color: '#10b981', role: 'Knowledge Graph', arrow: '↔ Entity Resolution' },
  { id: 'timescale',  label: 'TimescaleDB',   icon: '📅', color: '#f59e0b', role: 'Time Series',     arrow: '↔ Forecasting' },
  { id: 'redis',      label: 'Redis',         icon: '⚡', color: '#ef4444', role: 'Cache',           arrow: '↔ All Services' },
  { id: 'minio',      label: 'MinIO / S3',    icon: '🗄️', color: '#3b82f6', role: 'Object Store',    arrow: '↔ ML Artifacts' },
];

/* ── B. PostgreSQL data ── */
const PG_TABLES = [
  { table: 'sales_fact',      rows: '48,320,174', size: '12.4 GB', indexes: 8,  description: 'Core transactional sales records' },
  { table: 'product_dim',     rows: '142,380',    size: '89 MB',   indexes: 5,  description: 'Product master with attributes' },
  { table: 'store_dim',       rows: '18,941',     size: '22 MB',   indexes: 4,  description: 'Store master, region, format' },
  { table: 'forecast_output', rows: '9,830,240',  size: '3.1 GB',  indexes: 6,  description: 'Model forecast results per SKU/store/date' },
  { table: 'ml_jobs',         rows: '24,812',     size: '48 MB',   indexes: 7,  description: 'Pipeline job tracking, status, logs' },
  { table: 'departments',     rows: '12',         size: '256 KB',  indexes: 2,  description: 'Org units with config' },
  { table: 'audit_log',       rows: '3,412,900',  size: '1.8 GB',  indexes: 4,  description: 'All CRUD events for compliance' },
  { table: 'feature_store',   rows: '5,620,000',  size: '2.3 GB',  indexes: 9,  description: 'Precomputed ML features' },
];

const PG_QUERIES = [
  {
    name: 'Daily Sales Aggregation',
    sql: 'SELECT store_id, SUM(sales_qty) as total\nFROM sales_fact\nWHERE date = $1\nGROUP BY store_id\nORDER BY total DESC;',
    cost: '1,240 ms → 38 ms (with index)',
    frequency: '~12,000/day',
    index: 'idx_sales_fact_date_store',
  },
  {
    name: 'Top 10 SKUs by Revenue',
    sql: 'SELECT p.sku, p.name, SUM(s.revenue) as rev\nFROM sales_fact s\nJOIN product_dim p ON s.product_id = p.id\nWHERE s.date BETWEEN $1 AND $2\nGROUP BY p.sku, p.name\nORDER BY rev DESC LIMIT 10;',
    cost: '3,820 ms → 180 ms (with index)',
    frequency: '~2,400/day',
    index: 'idx_product_dim_sku, idx_sales_revenue',
  },
  {
    name: 'Latest Forecast Fetch',
    sql: 'SELECT sku_id, store_id, forecast_date, forecast_qty\nFROM forecast_output\nWHERE model_version = $1\n  AND forecast_date >= NOW()\nORDER BY forecast_date\nLIMIT $2;',
    cost: '290 ms → 12 ms (with index)',
    frequency: '~45,000/day',
    index: 'idx_forecast_model_date',
  },
];

const PG_POOL_DATA = [
  { name: 'Active',  value: 42, fill: '#3b82f6' },
  { name: 'Idle',    value: 31, fill: '#10b981' },
  { name: 'Waiting', value: 7,  fill: '#f59e0b' },
];

/* ── C. ChromaDB data ── */
const CHROMA_COLLECTIONS = [
  {
    name: 'process_docs',
    docs: 84_320,
    dims: 1536,
    index: 'HNSW',
    model: 'text-embedding-3-small',
    desc: 'SOPs, runbooks, process documentation',
  },
  {
    name: 'model_explanations',
    docs: 12_840,
    dims: 1536,
    index: 'HNSW',
    model: 'text-embedding-3-small',
    desc: 'SHAP explanations, model cards, feature descriptions',
  },
  {
    name: 'knowledge_base',
    docs: 241_000,
    dims: 1536,
    index: 'HNSW',
    model: 'text-embedding-3-small',
    desc: 'Industry reports, research papers, market intelligence',
  },
];

const CHROMA_RESULTS = [
  { rank: 1, doc: 'demand_planning_sop_v3.pdf',     score: 0.962, preview: 'Seasonal demand adjustment protocol for Q4...' },
  { rank: 2, doc: 'promotional_lift_analysis.pdf',  score: 0.941, preview: 'Promo multiplier calibration for FMCG categories...' },
  { rank: 3, doc: 'store_clustering_report.pdf',    score: 0.918, preview: 'K-means clustering of 18,941 stores by sales pattern...' },
  { rank: 4, doc: 'weekly_sales_forecast.pdf',      score: 0.904, preview: 'Week-over-week variance decomposition and adjustment...' },
  { rank: 5, doc: 'inventory_buffer_policy.pdf',    score: 0.887, preview: 'Safety stock formulas for lead-time variability...' },
];

const CHROMA_PERF = [
  { metric: 'QPS',         value: '1,240', unit: 'queries/sec' },
  { metric: 'P99 Latency', value: '28',    unit: 'ms' },
  { metric: 'Recall@10',   value: '94.7',  unit: '%' },
  { metric: 'Index Size',  value: '4.2',   unit: 'GB' },
  { metric: 'Total Vecs',  value: '2.1M',  unit: 'vectors' },
];

/* ── D. Neo4j data ── */
const NEO4J_NODES = [
  { type: 'Product',   count: '142,380',   properties: 'sku, name, category, brand, price, weight' },
  { type: 'Store',     count: '18,941',    properties: 'store_id, region, format, lat, lon, cluster' },
  { type: 'Supplier',  count: '3,847',     properties: 'supplier_id, name, country, lead_time, tier' },
  { type: 'Customer',  count: '284,120',   properties: 'customer_id, segment, lifetime_value, churn_risk' },
  { type: 'Model',     count: '1,240',     properties: 'model_id, version, algo, accuracy, deployed_at' },
  { type: 'Feature',   count: '1,847',     properties: 'feature_name, type, importance, drift_status' },
  { type: 'Process',   count: '89',        properties: 'process_id, dept, kpi, status, last_run' },
];

const NEO4J_RELS = [
  { type: 'SOLD_AT',        count: '48.3M',   from: 'Product',  to: 'Store',    desc: 'Product availability per store' },
  { type: 'SUPPLIED_BY',    count: '12,840',  from: 'Product',  to: 'Supplier', desc: 'Supply chain sourcing' },
  { type: 'DEPENDS_ON',     count: '4,218',   from: 'Feature',  to: 'Feature',  desc: 'Feature dependency graph' },
  { type: 'TRAINED_WITH',   count: '2,841',   from: 'Model',    to: 'Feature',  desc: 'Feature → model linkage' },
  { type: 'PRODUCES',       count: '1,240',   from: 'Model',    to: 'Process',  desc: 'Model output consumed by process' },
  { type: 'PURCHASED_BY',   count: '8.2M',    from: 'Product',  to: 'Customer', desc: 'Purchase history' },
  { type: 'FEEDS',          count: '3,420',   from: 'Feature',  to: 'Model',    desc: 'Input features to model' },
];

const NEO4J_STATS = [
  { metric: 'Total Nodes',         value: '452,419' },
  { metric: 'Total Relationships', value: '57.5M' },
  { metric: 'Property Count',      value: '12.4M' },
  { metric: 'Active Indexes',      value: '9' },
  { metric: 'DB Size',             value: '18.7 GB' },
  { metric: 'P95 Query Latency',   value: '42 ms' },
];

/* ── E. TimescaleDB data ── */
const TIMESCALE_TABLES = [
  {
    hypertable: 'sales_ts',
    rows: '48.3M',
    chunk_interval: '1 week',
    chunks: 364,
    compression: '11:1',
    retention: '90 days raw / 2 years agg',
    ingestion: '28,400 rows/min',
  },
  {
    hypertable: 'sensor_readings',
    rows: '284M',
    chunk_interval: '1 day',
    chunks: 1460,
    compression: '14:1',
    retention: '30 days raw / 1 year agg',
    ingestion: '142,000 rows/min',
  },
  {
    hypertable: 'model_metrics_ts',
    rows: '12.4M',
    chunk_interval: '1 week',
    chunks: 52,
    compression: '8:1',
    retention: '180 days',
    ingestion: '1,840 rows/min',
  },
];

const TIMESCALE_AGGS = [
  { agg: 'daily_sales_agg',    refresh: 'Every 1 hour', window: 'by store, sku, date', size: '2.3 GB' },
  { agg: 'weekly_demand_agg',  refresh: 'Every 6 hours', window: 'by store, category, week', size: '840 MB' },
  { agg: 'monthly_kpi_agg',    refresh: 'Every 24 hours', window: 'by dept, month, metric', size: '320 MB' },
];

const TIMESCALE_QUERY_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i + 1}`,
  queryMs: Math.round(80 + Math.random() * 60),
  ingestionRate: Math.round(25000 + Math.random() * 8000),
}));

/* ── F. Redis data ── */
const REDIS_KEYS = [
  { pattern: 'forecast:{store}:{sku}:{date}',  ttl: '1 hour',  count: '4.2M',  size: '820 MB', purpose: 'Cached forecast results per SKU/store' },
  { pattern: 'features:{model_id}:{version}',  ttl: '15 min',  count: '284K',  size: '240 MB', purpose: 'Precomputed feature vectors for inference' },
  { pattern: 'session:{user_id}',              ttl: '30 min',  count: '12,840', size: '48 MB',  purpose: 'User session tokens and permissions' },
  { pattern: 'ratelimit:{ip}:{endpoint}',      ttl: '1 min',   count: '98,400', size: '12 MB',  purpose: 'Per-IP rate limiting counters' },
  { pattern: 'product:{sku}:metadata',         ttl: '1 day',   count: '142K',  size: '180 MB', purpose: 'Product master cache (rarely changes)' },
  { pattern: 'leaderboard:{dept}:{kpi}',       ttl: '5 min',   count: '1,240', size: '8 MB',   purpose: 'KPI leaderboard for dashboard display' },
];

const REDIS_STATS = [
  { metric: 'Total Keys',    value: '4.74M' },
  { metric: 'Memory Used',   value: '2.1 GB / 8 GB' },
  { metric: 'Hit Rate',      value: '84.2%' },
  { metric: 'Miss Rate',     value: '15.8%' },
  { metric: 'Eviction Policy', value: 'allkeys-lru' },
  { metric: 'Ops/sec',       value: '48,400' },
  { metric: 'Connected Clients', value: '142' },
  { metric: 'Keyspace Hits', value: '392M / day' },
];

const REDIS_HIT_DATA = [
  { hour: '00', hits: 82, misses: 18 },
  { hour: '04', hits: 79, misses: 21 },
  { hour: '08', hits: 88, misses: 12 },
  { hour: '12', hits: 92, misses: 8 },
  { hour: '16', hits: 86, misses: 14 },
  { hour: '20', hits: 84, misses: 16 },
];

/* ── G. MinIO data ── */
const MINIO_BUCKETS = [
  { bucket: 'ml-models',       objects: '12,840', size: '284 GB', desc: 'Trained model artifacts, weights, ONNX exports' },
  { bucket: 'raw-data',        objects: '84,320', size: '1.8 TB', desc: 'Unprocessed source files — CSV, JSON, Parquet' },
  { bucket: 'processed-data',  objects: '42,100', size: '920 GB', desc: 'Cleaned, transformed, feature-engineered datasets' },
  { bucket: 'reports',         objects: '8,420',  size: '48 GB',  desc: 'PDF/HTML reports, dashboards, audit exports' },
  { bucket: 'embeddings',      objects: '3,841',  size: '160 GB', desc: 'Pre-computed embedding files for ChromaDB ingestion' },
];

const MINIO_LIFECYCLE = [
  { stage: 'Ingestion',   action: 'Upload to raw-data bucket',          retention: 'Indefinite (source of truth)' },
  { stage: 'Processing',  action: 'ETL pipeline → processed-data',      retention: '90 days raw after processing' },
  { stage: 'Training',    action: 'ML job reads from processed-data',    retention: 'Model artifact retained in ml-models' },
  { stage: 'Archiving',   action: 'Lifecycle rule → Glacier after 90d', retention: 'Archived for compliance (7 years)' },
  { stage: 'Expiry',      action: 'Delete after retention window',       retention: 'Per regulatory policy' },
];

/* ── H & I. Selection guide and data type mapping ── */
const DB_SELECTION = [
  { usecase: 'Transactions & CRUD',     db: 'PostgreSQL',   why: 'ACID guarantees, relational joins, JSONB support',      alt: 'MySQL, CockroachDB' },
  { usecase: 'Semantic / Vector Search', db: 'ChromaDB',    why: 'HNSW index, cosine similarity, embedded metadata',      alt: 'Pinecone, Weaviate, pgvector' },
  { usecase: 'Knowledge Graph',         db: 'Neo4j',        why: 'Native graph traversal, Cypher language, path queries', alt: 'Amazon Neptune, ArangoDB' },
  { usecase: 'Time Series Analytics',   db: 'TimescaleDB',  why: 'time_bucket(), hypertables, continuous aggregates',     alt: 'InfluxDB, QuestDB' },
  { usecase: 'Low-Latency Caching',     db: 'Redis',        why: 'Sub-ms latency, rich data structures, Lua scripting',   alt: 'Memcached, DragonflyDB' },
  { usecase: 'Binary / Object Storage', db: 'MinIO / S3',   why: 'S3-compatible API, lifecycle policies, versioning',     alt: 'AWS S3, GCS, Azure Blob' },
];

const DATA_TYPE_MAP = [
  { dataType: 'Structured (tabular)',    format: 'CSV / Parquet',    database: 'PostgreSQL + TimescaleDB', example: 'sales_fact, product_dim' },
  { dataType: 'Semi-structured',         format: 'JSON / XML',       database: 'PostgreSQL (JSONB)',        example: 'API responses, model configs' },
  { dataType: 'Unstructured (text)',     format: 'TXT / PDF',        database: 'ChromaDB (embeddings)',    example: 'SOPs, contracts, reports' },
  { dataType: 'Unstructured (images)',   format: 'JPG / PNG',        database: 'MinIO + PG metadata',      example: 'Defect images, shelf photos' },
  { dataType: 'Time Series',             format: 'CSV / Streaming',  database: 'TimescaleDB',              example: 'Sales, IoT sensor data' },
  { dataType: 'Graph / Relationships',   format: 'Triples / RDF',    database: 'Neo4j',                    example: 'Product-store, supply chain' },
  { dataType: 'Embeddings (float vecs)', format: 'Float32 vectors',  database: 'ChromaDB',                 example: 'Document embeddings, features' },
  { dataType: 'Log data',                format: 'JSON / plaintext', database: 'TimescaleDB + ElasticSearch', example: 'Pipeline logs, API logs' },
  { dataType: 'Cache / session',         format: 'Key-value',        database: 'Redis',                    example: 'Predictions, user sessions' },
  { dataType: 'ML Artifacts',            format: 'Binary / Pickle',  database: 'MinIO',                    example: 'Model weights, ONNX files' },
];

const DB_COLORS = {
  postgres:  '#336791',
  chroma:    '#8b5cf6',
  neo4j:     '#10b981',
  timescale: '#f59e0b',
  redis:     '#ef4444',
  minio:     '#3b82f6',
};

const SECTION_IDS = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'postgresql',   label: 'PostgreSQL' },
  { id: 'chromadb',     label: 'ChromaDB' },
  { id: 'neo4j',        label: 'Neo4j' },
  { id: 'timescale',    label: 'TimescaleDB' },
  { id: 'redis',        label: 'Redis' },
  { id: 'minio',        label: 'MinIO / S3' },
  { id: 'guide',        label: 'Selection Guide' },
  { id: 'mapping',      label: 'Data Mapping' },
];

/* ── Sub-components ── */
function SectionHeader({ title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 4, height: 28, background: color, borderRadius: 4 }} />
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {subtitle && <p style={{ marginLeft: 14, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '12px 16px', borderLeft: `3px solid ${color || 'var(--accent-primary)'}` }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
        {value} {unit && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Active: { bg: '#d1fae5', color: '#065f46' },
    Stable: { bg: '#d1fae5', color: '#065f46' },
    Warning: { bg: '#fef3c7', color: '#92400e' },
    Drifted: { bg: '#fee2e2', color: '#991b1b' },
    Retired: { bg: '#f3f4f6', color: '#6b7280' },
    Connected: { bg: '#dbeafe', color: '#1e40af' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
      {status}
    </span>
  );
}

function Table({ headers, rows, renderRow }) {
  return (
    <div className="table-wrapper" style={{ marginBottom: 'var(--spacing-lg)' }}>
      <table className="data-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code }) {
  return (
    <pre style={{ background: '#1e1e3a', color: '#e2e8f0', padding: '12px 16px', borderRadius: 'var(--border-radius)', fontSize: '0.72rem', overflowX: 'auto', lineHeight: 1.6, margin: 0 }}>
      <code>{code}</code>
    </pre>
  );
}

/* ── Main Component ── */
export default function ProcessDatabaseTab() {
  const [activeSection, setActiveSection] = useState('architecture');
  const [expandedQuery, setExpandedQuery] = useState(null);

  <TabShell
      tabName="database"
      title="Databases · table list + ERD + indexes"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P2"
      information="table inventory · ERD diagram · indexes · partition rules"
      operation="read-only · per-proc table refs pending"
      accent="#0ea5e9"
      todos={[]}
    >
      return (
    <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
      {/* Sidebar nav */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTION_IDS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                background: activeSection === s.id ? 'var(--accent-primary)' : 'transparent',
                color: activeSection === s.id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 'var(--font-size-xs)',
                fontWeight: activeSection === s.id ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── A. Architecture ── */}
        {activeSection === 'architecture' && (
          <div>
            <SectionHeader
              title="Database Architecture Overview"
              subtitle="All databases in the CPG AI platform and their primary roles"
              color="#3b82f6"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              {ARCH_NODES.map((n) => (
                <div
                  key={n.id}
                  style={{ background: 'var(--bg-card)', border: `2px solid ${n.color}22`, borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', borderLeft: `4px solid ${n.color}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.5rem' }}>{n.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{n.label}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: n.color, fontWeight: 600 }}>{n.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${n.color}11`, borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔗</span>
                    <span>{n.arrow}</span>
                  </div>
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <button
                      onClick={() => setActiveSection(n.id === 'postgres' ? 'postgresql' : n.id === 'chroma' ? 'chromadb' : n.id === 'timescale' ? 'timescale' : n.id)}
                      style={{ background: n.color, color: '#fff', border: 'none', padding: '4px 14px', borderRadius: 20, fontSize: 'var(--font-size-xs)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Deep Dive →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Flow diagram */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Data Flow Architecture</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                {['Raw Sources', '→', 'PostgreSQL', '→', 'Feature Store', '→', 'ML Models', '→', 'Forecast Output'].map((node, i) => (
                  <div key={i} style={node === '→' ? { color: 'var(--text-muted)', fontSize: '1.2rem' } : { background: i === 6 ? '#3b82f6' : 'var(--bg-hover)', color: i === 6 ? '#fff' : 'var(--text-primary)', padding: '8px 16px', borderRadius: 20, fontSize: 'var(--font-size-sm)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                    {node}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {['ChromaDB', '←→', 'RAG / LLM Pipeline', '←→', 'Neo4j', '←→', 'TimescaleDB'].map((node, i) => (
                  <div key={i} style={node === '←→' ? { color: 'var(--text-muted)', fontSize: '1.2rem' } : { background: 'var(--bg-hover)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: 20, fontSize: 'var(--font-size-sm)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                    {node}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {['Redis Cache', '←→', 'All Services', '  |  ', 'MinIO', '←→', 'ML Artifacts / Reports'].map((node, i) => (
                  <div key={i} style={node === '←→' || node === '  |  ' ? { color: 'var(--text-muted)', fontSize: '1.2rem' } : { background: 'var(--bg-hover)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: 20, fontSize: 'var(--font-size-sm)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                    {node}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── B. PostgreSQL ── */}
        {activeSection === 'postgresql' && (
          <div>
            <SectionHeader title="🐘 PostgreSQL — Relational Database" subtitle="ACID-compliant transactional database for core business data, metadata, and job tracking" color={DB_COLORS.postgres} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              <StatCard label="Version" value="PostgreSQL 15.4" color={DB_COLORS.postgres} />
              <StatCard label="Total Tables" value="48" color={DB_COLORS.postgres} />
              <StatCard label="Total Rows" value="~65M" color={DB_COLORS.postgres} />
              <StatCard label="DB Size" value="22.1 GB" color={DB_COLORS.postgres} />
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Key Tables</h3>
            <Table
              headers={['Table', 'Rows', 'Size', 'Indexes', 'Description']}
              rows={PG_TABLES}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem' }}>{row.table}</code></td>
                  <td style={{ fontWeight: 600 }}>{row.rows}</td>
                  <td>{row.size}</td>
                  <td style={{ textAlign: 'center' }}><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{row.indexes}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>{row.description}</td>
                </tr>
              )}
            />

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Top 3 Query Patterns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {PG_QUERIES.map((q, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                  <div
                    style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedQuery === i ? '#f0f7ff' : 'var(--bg-card)' }}
                    onClick={() => setExpandedQuery(expandedQuery === i ? null : i)}
                  >
                    <div>
                      <span style={{ fontWeight: 700, marginRight: 10 }}>{q.name}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>~{q.frequency}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: '#10b981', fontWeight: 600 }}>{q.cost.split('→')[1]?.trim()}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{expandedQuery === i ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedQuery === i && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <CodeBlock code={q.sql} />
                      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 10, fontSize: 'var(--font-size-xs)' }}>
                        <span><strong>Cost:</strong> {q.cost}</span>
                        <span><strong>Index used:</strong> <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{q.index}</code></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Connection Pool — pgBouncer</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {[{ label: 'Active connections', value: '42', color: '#3b82f6' }, { label: 'Idle connections', value: '31', color: '#10b981' }, { label: 'Waiting queue', value: '7', color: '#f59e0b' }, { label: 'Max pool size', value: '100', color: '#6b7280' }].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', borderLeft: `3px solid ${s.color}` }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={PG_POOL_DATA} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {PG_POOL_DATA.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── C. ChromaDB ── */}
        {activeSection === 'chromadb' && (
          <div>
            <SectionHeader title="🔮 ChromaDB — Vector Database" subtitle="Semantic search and similarity matching for the RAG pipeline using HNSW index" color={DB_COLORS.chroma} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {CHROMA_PERF.map((p) => <StatCard key={p.metric} label={p.metric} value={p.value} unit={p.unit} color={DB_COLORS.chroma} />)}
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Collections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {CHROMA_COLLECTIONS.map((c) => (
                <div key={c.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', borderLeft: `4px solid ${DB_COLORS.chroma}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <code style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4 }}>{c.name}</code>
                      <p style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{c.desc}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Documents', value: c.docs.toLocaleString() },
                        { label: 'Dims', value: c.dims },
                        { label: 'Index', value: c.index },
                        { label: 'Model', value: c.model },
                      ].map((m) => (
                        <div key={m.label} style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 4, fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Sample RAG Query</h3>
            <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>QUERY</div>
              <div style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"Find similar demand patterns for seasonal SKU adjustment"</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Embedding model: text-embedding-3-small | Distance: cosine | Top-K: 5</div>
            </div>
            <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Top 5 Results</h4>
            <Table
              headers={['Rank', 'Document', 'Similarity', 'Preview']}
              rows={CHROMA_RESULTS}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: DB_COLORS.chroma }}>#{row.rank}</td>
                  <td><code style={{ fontSize: 'var(--font-size-xs)', background: '#f9fafb', padding: '2px 6px', borderRadius: 3 }}>{row.doc}</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ background: '#e4d4f9', borderRadius: 8, height: 8, flex: 1 }}>
                        <div style={{ background: DB_COLORS.chroma, width: `${row.score * 100}%`, height: 8, borderRadius: 8 }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)' }}>{row.score.toFixed(3)}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.preview}</td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── D. Neo4j ── */}
        {activeSection === 'neo4j' && (
          <div>
            <SectionHeader title="🕸️ Neo4j — Knowledge Graph" subtitle="Graph database for entity relationships, supply chain tracing, and model dependency mapping" color={DB_COLORS.neo4j} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {NEO4J_STATS.map((s) => <StatCard key={s.metric} label={s.metric} value={s.value} color={DB_COLORS.neo4j} />)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Node Types</h3>
                <Table
                  headers={['Type', 'Count', 'Properties']}
                  rows={NEO4J_NODES}
                  renderRow={(row, i) => (
                    <tr key={i}>
                      <td><span style={{ background: `${DB_COLORS.neo4j}22`, color: DB_COLORS.neo4j, padding: '2px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>{row.type}</span></td>
                      <td style={{ fontWeight: 600 }}>{row.count}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.properties}</td>
                    </tr>
                  )}
                />
              </div>
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Relationship Types</h3>
                <Table
                  headers={['Type', 'Count', 'From → To']}
                  rows={NEO4J_RELS}
                  renderRow={(row, i) => (
                    <tr key={i}>
                      <td><code style={{ background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700 }}>{row.type}</code></td>
                      <td style={{ fontWeight: 600 }}>{row.count}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.from} → {row.to}</td>
                    </tr>
                  )}
                />
              </div>
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Sample Cypher Queries</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {[
                {
                  title: 'Products sold in East region stores',
                  cypher: "MATCH (p:Product)-[:SOLD_AT]->(s:Store)\nWHERE s.region = 'East'\nRETURN p.name, count(*) AS store_count\nORDER BY store_count DESC LIMIT 10;",
                  usecase: 'Regional availability analysis',
                },
                {
                  title: 'Feature-to-Model-to-Forecast lineage path',
                  cypher: "MATCH path = (f:Feature)-[:FEEDS]->(:Model)-[:PREDICTS]->(:Forecast)\nRETURN path\nLIMIT 5;",
                  usecase: 'Model lineage tracking',
                },
                {
                  title: 'Supply chain trace for a product',
                  cypher: "MATCH (p:Product {sku: 'SKU-90234'})-[:SUPPLIED_BY]->(s:Supplier)\nRETURN p.name, s.name, s.country, s.lead_time\nORDER BY s.lead_time;",
                  usecase: 'Supply chain risk assessment',
                },
              ].map((q, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{q.title}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Use case: {q.usecase}</span>
                  </div>
                  <CodeBlock code={q.cypher} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── E. TimescaleDB ── */}
        {activeSection === 'timescale' && (
          <div>
            <SectionHeader title="📅 TimescaleDB — Time Series Database" subtitle="High-volume time series storage with hypertables, compression, and continuous aggregates" color={DB_COLORS.timescale} />

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Hypertables</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {TIMESCALE_TABLES.map((t) => (
                <div key={t.hypertable} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', borderLeft: `4px solid ${DB_COLORS.timescale}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <code style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: DB_COLORS.timescale }}>{t.hypertable}</code>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { k: 'Rows', v: t.rows }, { k: 'Chunks', v: t.chunks },
                        { k: 'Chunk Interval', v: t.chunk_interval }, { k: 'Compression', v: t.compression },
                        { k: 'Ingestion', v: t.ingestion },
                      ].map((m) => (
                        <div key={m.k} style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 6, fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>{m.k}</div>
                          <div style={{ fontWeight: 700 }}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Retention: {t.retention}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Continuous Aggregates</h3>
            <Table
              headers={['Aggregate', 'Refresh Cadence', 'Window', 'Size']}
              rows={TIMESCALE_AGGS}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td><code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>{row.agg}</code></td>
                  <td>{row.refresh}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{row.window}</td>
                  <td>{row.size}</td>
                </tr>
              )}
            />

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Sample time_bucket() Queries</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              <CodeBlock code={"-- Weekly sales aggregation\nSELECT time_bucket('1 week', ts) AS week,\n       store_id,\n       SUM(sales_qty)  AS weekly_sales,\n       AVG(price)      AS avg_price\nFROM   sales_ts\nWHERE  ts > NOW() - INTERVAL '90 days'\nGROUP  BY week, store_id\nORDER  BY week DESC;"} />
              <CodeBlock code={"-- Daily model accuracy trend\nSELECT time_bucket('1 day', ts) AS day,\n       model_id,\n       AVG(mape)  AS avg_mape,\n       STDDEV(mape) AS mape_std\nFROM   model_metrics_ts\nWHERE  ts > NOW() - INTERVAL '30 days'\nGROUP  BY day, model_id;"} />
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Query & Ingestion Performance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={TIMESCALE_QUERY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="queryMs" stroke={DB_COLORS.timescale} strokeWidth={2} name="Query P95 (ms)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="ingestionRate" stroke="#3b82f6" strokeWidth={2} name="Ingestion (rows/min)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── F. Redis ── */}
        {activeSection === 'redis' && (
          <div>
            <SectionHeader title="⚡ Redis — In-Memory Cache" subtitle="Sub-millisecond cache for forecasts, features, sessions, and rate limiting" color={DB_COLORS.redis} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {REDIS_STATS.slice(0, 4).map((s) => <StatCard key={s.metric} label={s.metric} value={s.value} color={DB_COLORS.redis} />)}
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Key Patterns & TTL Strategies</h3>
            <Table
              headers={['Key Pattern', 'TTL', 'Key Count', 'Size', 'Purpose']}
              rows={REDIS_KEYS}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td><code style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700 }}>{row.pattern}</code></td>
                  <td><span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{row.ttl}</span></td>
                  <td>{row.count}</td>
                  <td>{row.size}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.purpose}</td>
                </tr>
              )}
            />

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Cache Hit/Miss Rate (24h)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={REDIS_HIT_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}:00`} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Bar dataKey="hits" name="Hit %" fill={DB_COLORS.redis} radius={[4, 4, 0, 0]} />
                <Bar dataKey="misses" name="Miss %" fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              {REDIS_STATS.slice(4).map((s) => <StatCard key={s.metric} label={s.metric} value={s.value} color={DB_COLORS.redis} />)}
            </div>
          </div>
        )}

        {/* ── G. MinIO ── */}
        {activeSection === 'minio' && (
          <div>
            <SectionHeader title="🗄️ MinIO / S3 — Object Storage" subtitle="S3-compatible object store for ML artifacts, datasets, embeddings, and reports" color={DB_COLORS.minio} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              <StatCard label="Total Buckets" value="5" color={DB_COLORS.minio} />
              <StatCard label="Total Objects" value="151,521" color={DB_COLORS.minio} />
              <StatCard label="Total Storage" value="3.21 TB" color={DB_COLORS.minio} />
              <StatCard label="Largest File" value="28.4 GB" unit="(raw-data/2024_full.parquet)" color={DB_COLORS.minio} />
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Buckets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              {MINIO_BUCKETS.map((b) => (
                <div key={b.bucket} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', borderTop: `3px solid ${DB_COLORS.minio}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span>🪣</span>
                    <code style={{ fontWeight: 700, color: DB_COLORS.minio }}>{b.bucket}</code>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 10 }}>{b.desc}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 6, fontSize: 'var(--font-size-xs)', flex: 1, textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Objects</div>
                      <div style={{ fontWeight: 700 }}>{b.objects}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 6, fontSize: 'var(--font-size-xs)', flex: 1, textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Size</div>
                      <div style={{ fontWeight: 700 }}>{b.size}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Data Lifecycle Policy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
              {MINIO_LIFECYCLE.map((stage, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 16px', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-hover)', borderBottom: i < MINIO_LIFECYCLE.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ minWidth: 28, height: 28, background: DB_COLORS.minio, color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-size-xs)', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{stage.stage}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>{stage.action}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: DB_COLORS.minio, fontWeight: 600 }}>Retention: {stage.retention}</div>
                  </div>
                  {i < MINIO_LIFECYCLE.length - 1 && <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', alignSelf: 'center' }}>↓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── H. Selection Guide ── */}
        {activeSection === 'guide' && (
          <div>
            <SectionHeader title="Database Selection Guide" subtitle="Choose the right database for each use case in the CPG AI platform" color="#6b7280" />
            <Table
              headers={['Use Case', 'Database', 'Why', 'Alternatives']}
              rows={DB_SELECTION}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.usecase}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: DB_COLORS[row.db.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)] || '#6b7280' }}>{row.db}</span>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.why}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{row.alt}</td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── I. Data Mapping ── */}
        {activeSection === 'mapping' && (
          <div>
            <SectionHeader title="Data Type → Database Mapping" subtitle="Which database stores which type of data in the CPG AI platform" color="#6b7280" />
            <Table
              headers={['Data Type', 'Format', 'Database', 'Example']}
              rows={DATA_TYPE_MAP}
              renderRow={(row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.dataType}</td>
                  <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 'var(--font-size-xs)' }}>{row.format}</code></td>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{row.database}</span></td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{row.example}</td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </div>
    </TabShell>
  );
}
