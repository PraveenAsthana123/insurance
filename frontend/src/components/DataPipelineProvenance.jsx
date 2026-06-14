// DataPipelineProvenance · 4-section visibility panel for the data pipeline
//
// Operator 2026-06-14 17:48 MDT: "how do I know what data type we are
// handing, which path data is save, data visulization"
//
// Answers 3 concrete questions:
//   1. What data type are we handling? → § 1 SOURCE card + § 2 DATA TYPE
//      DETECTION table (per-column dtype + confidence + samples)
//   2. Which path data is saved? → § 3 STORAGE PATHS table (raw → cleaned →
//      features → output with size + last_modified per stage)
//   3. Data visualization? → § 4 VISUALIZATION REGISTRY table (chart name ·
//      type · path · generated_at)
//
// §57.7 HONEST: fixture data per §64.6 · banner explicit. Real wiring =
// backend `/api/v1/data-provenance/{dataset_id}` reading from §38.3 audit
// rows + filesystem stat. Drill ensures the 4 sections can't be removed.
//
// Composes with: §38.3 (audit · path tracking) · §43 (drill enforces 4
// sections) · §47.6 (per-tenant data scope) · §57.7 (fixture banner) ·
// §64.6 (before/after viz registry) · §122 (top-1% = visibility into
// the actual pipeline · not a black box).
import React from 'react';
import { ComponentInfo, ComponentInfoInline } from './ComponentInfo';

export function DataPipelineProvenance({
  source,
  detection,
  storage,
  visualizations,
}) {
  const usingFixture = !source && !detection && !storage && !visualizations;
  const data = {
    source: source || fallbackSource(),
    detection: detection || fallbackDetection(),
    storage: storage || fallbackStorage(),
    visualizations: visualizations || fallbackVisualizations(),
  };

  return (
    <div>
      <ComponentInfo
        title="Data Pipeline Provenance"
        description="Answers 3 mandatory questions: what data type · where data is saved · which visualizations exist · per-stage paths + sizes + timestamps · feeds §38.3 audit row."
        icon="🔬"
        accent="#7c3aed"
      />

      {usingFixture && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: '#fef3c7', border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b',
          borderRadius: 4, fontSize: 11, color: '#78350f',
        }}>
          🟡 <strong>§57.7 honest fixture:</strong> no props passed · showing insurance underwriting
          pipeline so layout is reviewable. Pass <code>source/detection/storage/visualizations</code>
          props to render real data.
        </div>
      )}

      {/* § 1 SOURCE card */}
      <SourceCard source={data.source} />

      {/* § 2 DATA TYPE DETECTION */}
      <DataTypeDetection detection={data.detection} />

      {/* § 3 STORAGE PATHS */}
      <StoragePathsTable storage={data.storage} />

      {/* § 4 VISUALIZATION REGISTRY */}
      <VisualizationRegistry visualizations={data.visualizations} />
    </div>
  );
}

// § 1 · SOURCE card (where data comes from)
function SourceCard({ source }) {
  return (
    <div style={{
      marginBottom: 12, padding: 14,
      background: '#fff', border: '2px solid #0891b2', borderLeft: '6px solid #0891b2',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        § 1 · 📥 Source · where data originates
      </div>
      <ComponentInfoInline description="Origin metadata of the dataset · type, path, format, schema reference, freshness, row count · operator can audit lineage starting here." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 8 }}>
        <Field label="Source type" value={source.type} icon="📦" />
        <Field label="Format" value={source.format} icon="📄" />
        <Field label="Row count" value={(source.row_count || 0).toLocaleString()} icon="#️⃣" />
        <Field label="Size" value={source.size} icon="💾" />
        <Field label="Last refresh" value={source.last_refresh} icon="🕐" />
        <Field label="Schema ref" value={source.schema_ref} icon="📋" />
      </div>
      <div style={{ marginTop: 8, padding: '6px 10px', background: '#f1f5f9', borderRadius: 4 }}>
        <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
          Path / connection string
        </div>
        <code style={{ fontSize: 11, color: '#0f172a', wordBreak: 'break-all' }}>{source.path}</code>
      </div>
    </div>
  );
}

// § 2 · DATA TYPE DETECTION table (per-column)
function DataTypeDetection({ detection }) {
  return (
    <div style={{
      marginBottom: 12, padding: 14,
      background: '#fff', border: '2px solid #7c3aed', borderLeft: '6px solid #7c3aed',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        § 2 · 🔍 Data Type Detection · per column
      </div>
      <ComponentInfoInline description="Detected data types per column with confidence score and inferred semantic role · catches schema drift and silent type-coercion bugs early." />
      <div style={{ overflowX: 'auto', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={th}>Column</th>
              <th style={th}>Detected Type</th>
              <th style={th}>Confidence</th>
              <th style={th}>Semantic Role</th>
              <th style={th}>Samples (head 3)</th>
              <th style={th}>Coercion?</th>
            </tr>
          </thead>
          <tbody>
            {detection.map((d, i) => (
              <tr key={d.column} style={{
                background: i % 2 === 0 ? '#fff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <td style={{ ...td, fontWeight: 700 }}><code>{d.column}</code></td>
                <td style={td}>{d.detected_type}</td>
                <td style={td}>
                  <div style={{
                    display: 'inline-block', width: 60, height: 8,
                    background: '#e2e8f0', borderRadius: 4, marginRight: 6,
                    verticalAlign: 'middle',
                  }}>
                    <div style={{
                      width: `${d.confidence * 100}%`, height: '100%',
                      background: d.confidence >= 0.9 ? '#16a34a' : d.confidence >= 0.7 ? '#f59e0b' : '#dc2626',
                      borderRadius: 4,
                    }} />
                  </div>
                  <strong style={{ fontSize: 10 }}>{(d.confidence * 100).toFixed(0)}%</strong>
                </td>
                <td style={td}>{d.semantic_role}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10 }}>{d.samples.slice(0, 3).join(', ')}</td>
                <td style={td}>
                  {d.coercion ? (
                    <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 10 }}>⚠ {d.coercion}</span>
                  ) : (
                    <span style={{ color: '#16a34a', fontSize: 10 }}>✓ none</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// § 3 · STORAGE PATHS table
function StoragePathsTable({ storage }) {
  return (
    <div style={{
      marginBottom: 12, padding: 14,
      background: '#fff', border: '2px solid #16a34a', borderLeft: '6px solid #16a34a',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        § 3 · 💾 Storage Paths · per pipeline stage
      </div>
      <ComponentInfoInline description="Where data lives at each pipeline stage · raw → cleaned → features → predictions → output · with bytes + last_modified · operator can trace transformation history." />
      <div style={{ overflowX: 'auto', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={th}>Stage</th>
              <th style={th}>Path</th>
              <th style={th}>Format</th>
              <th style={th}>Size</th>
              <th style={th}>Rows</th>
              <th style={th}>Last modified</th>
              <th style={th}>Audit row</th>
            </tr>
          </thead>
          <tbody>
            {storage.map((s, i) => (
              <tr key={s.stage} style={{
                background: i % 2 === 0 ? '#fff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <td style={{ ...td, fontWeight: 700 }}>
                  <span style={{
                    display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                    background: stageColor(s.stage), color: '#fff', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>{s.stage}</span>
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{s.path}</td>
                <td style={td}>{s.format}</td>
                <td style={td}>{s.size}</td>
                <td style={td}>{(s.rows || 0).toLocaleString()}</td>
                <td style={{ ...td, fontSize: 10, color: '#64748b' }}>{s.last_modified}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10 }}>
                  <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 2 }}>{s.audit_row_id || '—'}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// § 4 · VISUALIZATION REGISTRY
function VisualizationRegistry({ visualizations }) {
  return (
    <div style={{
      marginBottom: 12, padding: 14,
      background: '#fff', border: '2px solid #f59e0b', borderLeft: '6px solid #f59e0b',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        § 4 · 🎨 Visualization Registry · before/after PNG pairs
      </div>
      <ComponentInfoInline description="Per §64.6 mandatory · every ML/pipeline run saves before_*.png + after_*.png pairs · this registry shows what's saved, where, and when · drill checks both files exist." />
      <div style={{ overflowX: 'auto', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={th}>Chart name</th>
              <th style={th}>Type</th>
              <th style={th}>BEFORE path</th>
              <th style={th}>AFTER path</th>
              <th style={th}>Generated at</th>
              <th style={th}>Run ID</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visualizations.map((v, i) => (
              <tr key={v.chart} style={{
                background: i % 2 === 0 ? '#fff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <td style={{ ...td, fontWeight: 700 }}>{v.chart}</td>
                <td style={td}>
                  <span style={{
                    display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                    background: '#7c3aed22', color: '#7c3aed', fontSize: 10, fontWeight: 700,
                  }}>{v.type}</span>
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10, color: '#7f1d1d' }}>{v.before_path}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10, color: '#14532d' }}>{v.after_path}</td>
                <td style={{ ...td, fontSize: 10, color: '#64748b' }}>{v.generated_at}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 10 }}>
                  <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 2 }}>{v.run_id}</code>
                </td>
                <td style={td}>
                  <span style={{
                    color: v.both_present ? '#16a34a' : '#dc2626',
                    fontWeight: 700, fontSize: 10,
                  }}>
                    {v.both_present ? '✓ both' : '✗ missing'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        marginTop: 8, padding: '6px 10px',
        background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 4,
        fontSize: 10, color: '#475569',
      }}>
        <strong>§64.6 contract:</strong> every run MUST save both <code>before_X.png</code> AND
        <code>after_X.png</code> per chart · drill <code>drill_data_pipeline_provenance.py</code>
        verifies the registry has both paths populated per row.
      </div>
    </div>
  );
}

// Helpers
const th = {
  padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: '#475569',
  fontSize: 10, borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};
const td = { padding: '6px 10px', color: '#0f172a' };

function Field({ label, value, icon }) {
  return (
    <div style={{
      padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4,
    }}>
      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function stageColor(stage) {
  const map = {
    raw:         '#94a3b8',
    cleaned:     '#0891b2',
    features:    '#7c3aed',
    predictions: '#16a34a',
    output:      '#f59e0b',
    audit:       '#dc2626',
  };
  return map[stage] || '#64748b';
}

// §57.7 honest fixtures
function fallbackSource() {
  return {
    type: 'CSV File',
    format: 'text/csv',
    row_count: 10000,
    size: '2.4 MB',
    last_refresh: '2026-06-14 14:32 UTC',
    schema_ref: 'underwriting_v3.json',
    path: 's3://insur-data-prod/underwriting/raw/applications-2026-06-14.csv',
  };
}

function fallbackDetection() {
  return [
    { column: 'policy_id',        detected_type: 'string · UUID-like',  confidence: 1.00, semantic_role: 'identifier',  samples: ['POL-0001', 'POL-0002', 'POL-0003'], coercion: null },
    { column: 'applicant_age',    detected_type: 'int64',               confidence: 0.97, semantic_role: 'numerical',   samples: ['34', '52', '42'],                  coercion: null },
    { column: 'annual_income',    detected_type: 'float64',             confidence: 0.95, semantic_role: 'numerical',   samples: ['65000', '120000', '78400'],        coercion: 'str→float (3.2% rows)' },
    { column: 'risk_band',        detected_type: 'string · category',   confidence: 0.99, semantic_role: 'categorical', samples: ['standard', 'preferred', 'sub-std'], coercion: null },
    { column: 'medical_notes',    detected_type: 'string · text',       confidence: 0.92, semantic_role: 'text',        samples: ['no issues', 'hypertension·controlled', 'empty'], coercion: null },
    { column: 'application_date', detected_type: 'datetime · ISO-8601', confidence: 0.99, semantic_role: 'date',        samples: ['2025-03-14', '2025-04-02', '2025-05-19'], coercion: 'str→datetime (parsed)' },
    { column: 'has_diabetes',     detected_type: 'bool',                confidence: 0.94, semantic_role: 'boolean',     samples: ['False', 'True', 'False'],          coercion: 'str→bool (5.6% rows)' },
    { column: 'occupation',       detected_type: 'string · category',   confidence: 0.88, semantic_role: 'categorical', samples: ['software_eng', 'teacher', 'unknown'], coercion: null },
    { column: 'credit_score',     detected_type: 'int16',               confidence: 0.96, semantic_role: 'numerical',   samples: ['720', '680', '692'],               coercion: null },
    { column: 'approved',         detected_type: 'bool',                confidence: 1.00, semantic_role: 'boolean',     samples: ['True', 'False', 'True'],           coercion: null },
  ];
}

function fallbackStorage() {
  return [
    { stage: 'raw',         path: 's3://insur-data-prod/underwriting/raw/applications-2026-06-14.csv',          format: 'csv',     size: '2.4 MB',  rows: 10000, last_modified: '2026-06-14 14:32 UTC', audit_row_id: 'audit_a1f4b2c3' },
    { stage: 'cleaned',     path: 's3://insur-data-prod/underwriting/cleaned/applications-2026-06-14.parquet',  format: 'parquet', size: '1.1 MB',  rows: 10000, last_modified: '2026-06-14 14:38 UTC', audit_row_id: 'audit_b2e5c3d4' },
    { stage: 'features',    path: 's3://insur-data-prod/underwriting/features/applications-2026-06-14.parquet', format: 'parquet', size: '3.2 MB',  rows: 10000, last_modified: '2026-06-14 14:44 UTC', audit_row_id: 'audit_c3f6d4e5' },
    { stage: 'predictions', path: 's3://insur-data-prod/underwriting/predictions/run-r2026061420.parquet',       format: 'parquet', size: '420 KB',  rows: 10000, last_modified: '2026-06-14 14:52 UTC', audit_row_id: 'audit_d4a7e5f6' },
    { stage: 'output',      path: 's3://insur-data-prod/underwriting/output/run-r2026061420/',                  format: 'multi',   size: '5.8 MB',  rows: 10000, last_modified: '2026-06-14 14:54 UTC', audit_row_id: 'audit_e5b8f607' },
    { stage: 'audit',       path: 'postgres://insur-audit/audit_log · WHERE run_id=r2026061420',                format: 'pg row',  size: '~10 KB', rows: 47,    last_modified: '2026-06-14 14:54 UTC', audit_row_id: 'run_r2026061420' },
  ];
}

function fallbackVisualizations() {
  return [
    { chart: 'distribution_applicant_age',   type: 'histogram',  before_path: 's3://.../viz/before_distribution_applicant_age.png',   after_path: 's3://.../viz/after_distribution_applicant_age.png',   generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'distribution_annual_income',   type: 'histogram',  before_path: 's3://.../viz/before_distribution_annual_income.png',   after_path: 's3://.../viz/after_distribution_annual_income.png',   generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'correlation_matrix',           type: 'heatmap',    before_path: 's3://.../viz/before_correlation_matrix.png',           after_path: 's3://.../viz/after_correlation_matrix.png',           generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'missing_value_matrix',         type: 'matrix',     before_path: 's3://.../viz/before_missing_value_matrix.png',         after_path: 's3://.../viz/after_missing_value_matrix.png',         generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'outlier_box_plot_grid',        type: 'box',        before_path: 's3://.../viz/before_outlier_box_plot_grid.png',        after_path: 's3://.../viz/after_outlier_box_plot_grid.png',        generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'target_distribution',          type: 'bar',        before_path: 's3://.../viz/before_target_distribution.png',          after_path: 's3://.../viz/after_target_distribution.png',          generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'class_balance',                type: 'bar',        before_path: 's3://.../viz/before_class_balance.png',                after_path: 's3://.../viz/after_class_balance.png',                generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
    { chart: 'bias_disparate_impact',        type: 'bar',        before_path: 's3://.../viz/before_bias_disparate_impact.png',        after_path: 's3://.../viz/after_bias_disparate_impact.png',        generated_at: '2026-06-14 14:54', run_id: 'r2026061420', both_present: true },
  ];
}

export default DataPipelineProvenance;
