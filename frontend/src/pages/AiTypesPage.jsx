/**
 * §148 · All 200 AI Types · §131 catalog · §133 14-field contract
 * 1 page · click any type → detail with 14 fields + 8 data-prep sections + model detail tabs
 */
import { useEffect, useMemo, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

const FIELD_LABELS = {
  data_source: 'Data Source',
  data_types_handled: 'Data Types Handled',
  preprocessing: 'Preprocessing',
  model: 'Model',
  accuracy_metric: 'Accuracy Metric',
  manual_pipeline: 'Manual Pipeline',
  automatic_pipeline: 'Automatic Pipeline',
  res_ai: 'Responsible AI',
  exp_ai: 'Explainable AI',
  dashboard: 'Dashboard',
  user_story: 'User Story',
  demo_story: 'Demo Story',
  stakeholders: 'Stakeholders',
  failure_mode: 'Failure Mode',
};

const PIPELINE_TABS = [
  { id: '1_data_preprocessing',          name: '1. Data Preprocessing' },
  { id: '2_eda',                          name: '2. EDA' },
  { id: '3_normalization',                name: '3. Normalization' },
  { id: '4_standardization',              name: '4. Standardization' },
  { id: '5_feature_engineering',          name: '5. Feature Engineering' },
  { id: '6_feature_evaluation',           name: '6. Feature Evaluation' },
  { id: '7_feature_selection',            name: '7. Feature Selection' },
  { id: '8_before_after_visualization',   name: '8. Before/After Viz' },
];

export default function AiTypesPage() {
  const [types, setTypes] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('14-field');

  useEffect(() => {
    fetch(`${API}/api/v1/ai-taxonomy/types`).then(r => r.json()).then(d => setTypes(d.types || []));
    fetch(`${API}/api/v1/ai-taxonomy/overview`).then(r => r.json()).then(setOverview);
    fetch(`${API}/api/v1/ai-type-impl/data-prep-pipeline`).then(r => r.json()).then(setPipeline);
  }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    if (!f) return types;
    return types.filter(t => t.toLowerCase().includes(f));
  }, [types, filter]);

  const select = (t) => {
    setSelected(t);
    setActiveTab('14-field');
    fetch(`${API}/api/v1/ai-type-impl/template/${encodeURIComponent(t)}`)
      .then(r => r.json()).then(setDetail);
  };

  return (
    <div style={{ padding: 20, background: '#f3f4f6', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🤖 All AI Types · §131 catalog</h1>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {types.length} types · §133 14-field contract · click any type for detail
        </div>
      </div>

      {/* Overview KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Stat label="AI Types"        value={types.length} />
        <Stat label="Categories"      value={overview?.n_categories || overview?.categories?.length || '—'} color="#10b981" />
        <Stat label="Mega-Domains"    value={overview?.n_mega_domains || '—'} color="#6366f1" />
        <Stat label="Maturity Levels" value={overview?.n_maturity_levels || '20'} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        {/* LEFT · types list with search */}
        <aside style={{ background: '#fff', borderRadius: 10, padding: 12,
                         border: '1px solid #e5e7eb', maxHeight: '70vh', overflowY: 'auto' }}>
          <input value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter…"
                  style={{ width: '100%', padding: 6, marginBottom: 8, border: '1px solid #d1d5db',
                            borderRadius: 4, fontSize: 12 }} />
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
            {filtered.length} of {types.length}
          </div>
          {filtered.map((t, i) => (
            <div key={i} onClick={() => select(t)}
                  style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 12,
                            borderRadius: 4, marginBottom: 2,
                            background: selected === t ? '#eef2ff' : 'transparent',
                            color: selected === t ? '#4338ca' : '#374151',
                            fontWeight: selected === t ? 700 : 400 }}>
              <span style={{ color: '#9ca3af', fontSize: 10, marginRight: 6 }}>{i + 1}</span>
              {t}
            </div>
          ))}
        </aside>

        {/* RIGHT · detail */}
        <main style={{ background: '#fff', borderRadius: 10, padding: 16,
                        border: '1px solid #e5e7eb' }}>
          {!selected && (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: 60, fontSize: 14 }}>
              Click any AI type to see §133 14-field contract + 8-section pipeline + model detail
            </div>
          )}

          {selected && detail && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>{detail.ai_type}</h2>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                spec: {detail.spec} · usage: {detail.usage?.substring(0, 80)}…
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                {['14-field', 'pipeline', 'model', 'raw'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: '6px 14px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    borderBottom: activeTab === t ? '3px solid #4f46e5' : '3px solid transparent',
                    color: activeTab === t ? '#1f2937' : '#6b7280',
                  }}>
                    {t === '14-field' && '§133 14 Fields'}
                    {t === 'pipeline' && '8-Section Data Prep'}
                    {t === 'model' && 'Model Detail'}
                    {t === 'raw' && 'Raw JSON'}
                  </button>
                ))}
              </div>

              {/* 14-field view */}
              {activeTab === '14-field' && detail.skeleton && (
                <div>
                  {Object.entries(detail.skeleton).map(([k, v]) => (
                    <div key={k} style={{ padding: 10, marginBottom: 6,
                                            background: '#f9fafb', borderRadius: 6,
                                            borderLeft: '3px solid #4f46e5' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#1f2937' }}>
                        {FIELD_LABELS[k] || k}
                      </div>
                      <div style={{ fontSize: 12, color: v?.startsWith('TODO') ? '#92400e' : '#374151',
                                      marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 8-section pipeline */}
              {activeTab === 'pipeline' && pipeline && (
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                    Common 8-section data preparation pipeline applied to <strong>{detail.ai_type}</strong>:
                  </div>
                  {PIPELINE_TABS.map(p => {
                    const v = pipeline[p.id];
                    if (!v) return null;
                    return (
                      <div key={p.id} style={{ marginBottom: 12, padding: 10,
                                                  background: '#f9fafb', borderRadius: 6,
                                                  borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
                        <pre style={{ fontSize: 11, color: '#374151', margin: '6px 0 0',
                                        whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {typeof v === 'string' ? v : JSON.stringify(v, null, 2).substring(0, 800)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Model detail */}
              {activeTab === 'model' && <ModelDetail type={detail.ai_type} />}

              {/* Raw */}
              {activeTab === 'raw' && (
                <pre style={{ fontSize: 11, background: '#1f2937', color: '#a7f3d0',
                                padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: '60vh' }}>
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}


function ModelDetail({ type }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/ai-type-impl/model-detail`)
      .then(r => r.json()).then(setData).catch(() => setData({ error: 'No model-detail endpoint' }));
  }, [type]);
  if (!data) return <div>Loading…</div>;
  if (data.error) return <div style={{ color: '#92400e' }}>{data.error}</div>;
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        Common model detail blueprint:
      </div>
      {Object.entries(data).filter(([k]) => !['ts_utc', 'ts_local', 'tz', 'actor_user', 'actor_host', 'spec'].includes(k)).map(([k, v]) => (
        <div key={k} style={{ padding: 10, marginBottom: 6, background: '#f9fafb',
                                 borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{k}</div>
          <pre style={{ fontSize: 11, margin: '4px 0 0', whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit', color: '#374151' }}>
            {typeof v === 'string' ? v : JSON.stringify(v, null, 2).substring(0, 600)}
          </pre>
        </div>
      ))}
    </div>
  );
}


function Stat({ label, value, color = '#1f2937' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
