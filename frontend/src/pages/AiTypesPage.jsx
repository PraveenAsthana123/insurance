/**
 * §148 v2 · AI Types · proper 3-level hierarchy (operator: "correct main menu and sub menu")
 *   Main menu: 10 Mega-Domains (Intelligence/Knowledge/Interaction/...)
 *   Sub menu:  100 Categories (filtered by selected domain)
 *   Right:     200 AI Types (filtered by selected category) · 4 detail tabs per type
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API = (typeof window !== 'undefined' && window.__BACKEND__) || 'http://localhost:8001';

const FIELD_LABELS = {
  data_source: 'Data Source', data_types_handled: 'Data Types Handled',
  preprocessing: 'Preprocessing', model: 'Model', accuracy_metric: 'Accuracy Metric',
  manual_pipeline: 'Manual Pipeline', automatic_pipeline: 'Automatic Pipeline',
  res_ai: 'Responsible AI', exp_ai: 'Explainable AI', dashboard: 'Dashboard',
  user_story: 'User Story', demo_story: 'Demo Story',
  stakeholders: 'Stakeholders', failure_mode: 'Failure Mode',
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

const parseRange = (rangeStr) => {
  // "1-10" or "1-5,8-9"
  const out = [];
  for (const part of (rangeStr || '').split(',')) {
    const [a, b] = part.split('-').map(s => parseInt(s, 10));
    if (!isNaN(a)) {
      const end = isNaN(b) ? a : b;
      for (let i = a; i <= end; i++) out.push(i);
    }
  }
  return out;
};

export default function AiTypesPage() {
  const [searchParams] = useSearchParams();
  const businessDomain = searchParams.get('domain') || 'all';
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [selDomain, setSelDomain] = useState(null);
  const [selCategory, setSelCategory] = useState(null);
  const [selType, setSelType] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [activeTab, setActiveTab] = useState('14-field');

  useEffect(() => {
    fetch(`${API}/api/v1/ai-taxonomy/domains`).then(r => r.json()).then(d => setDomains(d.mega_domains || d.domains || []));
    fetch(`${API}/api/v1/ai-taxonomy/categories`).then(r => r.json()).then(d => setCategories(d.categories || []));
    fetch(`${API}/api/v1/ai-taxonomy/types`).then(r => r.json()).then(d => setTypes(d.types || []));
    fetch(`${API}/api/v1/ai-type-impl/data-prep-pipeline`).then(r => r.json()).then(setPipeline);
  }, []);

  // Filter categories by selected domain
  const filteredCategories = useMemo(() => {
    if (!selDomain) return categories;
    const range = parseRange(selDomain.category_range);
    return categories.filter(c => range.includes(c.n));
  }, [categories, selDomain]);

  // Filter types by selected category (best-effort · 2 types per category if 200/100)
  const filteredTypes = useMemo(() => {
    if (!selCategory) return types;
    // Each category has ~2 types · pick by index
    const idx = selCategory.n - 1;
    return [types[idx * 2], types[idx * 2 + 1]].filter(Boolean);
  }, [types, selCategory]);

  const selectType = (t) => {
    setSelType(t);
    setActiveTab('14-field');
    fetch(`${API}/api/v1/ai-type-impl/template/${encodeURIComponent(t)}`)
      .then(r => r.json()).then(setDetail);
  };

  return (
    <div style={{ padding: 20, background: '#f3f4f6', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          🤖 AI Types · §131 catalog
          {businessDomain !== 'all' && (
            <span style={{
              marginLeft: 12, fontSize: 14, padding: '4px 12px', borderRadius: 6,
              background: businessDomain === 'b2c' ? '#dcfce7'
                          : businessDomain === 'b2b' ? '#f3e8ff' : '#dbeafe',
              color: businessDomain === 'b2c' ? '#15803d'
                     : businessDomain === 'b2b' ? '#7e22ce' : '#1d4ed8',
            }}>
              {businessDomain.toUpperCase()}
            </span>
          )}
        </h1>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          3-level: 10 Mega-Domains → 100 Categories → 200 AI Types
          {businessDomain !== 'all' && ` · filtered by ${businessDomain.toUpperCase()} business domain`}
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#4338ca', marginBottom: 10 }}>
        <button onClick={() => { setSelDomain(null); setSelCategory(null); setSelType(null); }}
                 style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4338ca' }}>
          All
        </button>
        {selDomain && <> › <button onClick={() => { setSelCategory(null); setSelType(null); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4338ca' }}>
          {selDomain.name}
        </button></>}
        {selCategory && <> › <button onClick={() => setSelType(null)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4338ca' }}>
          {selCategory.name}
        </button></>}
        {selType && <> › <strong>{selType}</strong></>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 320px 1fr', gap: 18 }}>

        {/* COLUMN 1 · MAIN MENU · Mega-Domains */}
        <aside style={{ background: '#fff', borderRadius: 10, padding: 10,
                         border: '1px solid #e5e7eb', maxHeight: '74vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 6,
                          textTransform: 'uppercase' }}>
            Main · Mega-Domain ({domains.length})
          </div>
          {domains.map((d, i) => (
            <div key={i} onClick={() => { setSelDomain(d); setSelCategory(null); setSelType(null); }}
                  style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: 6,
                            marginBottom: 6, fontSize: 13,
                            background: selDomain?.id === d.id ? '#4f46e5' : 'transparent',
                            color: selDomain?.id === d.id ? '#fff' : '#374151' }}>
              <div style={{ fontWeight: 600 }}>
                <span style={{ fontSize: 12, opacity: 0.6, marginRight: 4 }}>L{d.id}</span>
                {d.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                cats {d.category_range}
              </div>
            </div>
          ))}
        </aside>

        {/* COLUMN 2 · SUB MENU · Categories */}
        <aside style={{ background: '#fff', borderRadius: 10, padding: 10,
                         border: '1px solid #e5e7eb', maxHeight: '74vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 6,
                          textTransform: 'uppercase' }}>
            Sub · Category ({filteredCategories.length})
          </div>
          {filteredCategories.length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 10 }}>Select a domain</div>
          )}
          {filteredCategories.map((c, i) => (
            <div key={i} onClick={() => { setSelCategory(c); setSelType(null); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 5,
                            marginBottom: 6, fontSize: 13,
                            background: selCategory?.n === c.n ? '#10b981' : 'transparent',
                            color: selCategory?.n === c.n ? '#fff' : '#374151' }}>
              <div style={{ fontWeight: 600 }}>
                <span style={{ fontSize: 12, opacity: 0.6, marginRight: 4 }}>#{c.n}</span>
                {c.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {c.examples?.substring(0, 50)}
              </div>
            </div>
          ))}
        </aside>

        {/* COLUMN 3 · TYPES + DETAIL */}
        <main style={{ background: '#fff', borderRadius: 10, padding: 14,
                        border: '1px solid #e5e7eb', maxHeight: '74vh', overflowY: 'auto' }}>
          {!selType && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 8,
                              textTransform: 'uppercase' }}>
                AI Types ({selCategory ? filteredTypes.length : types.length}) {selCategory ? '· filtered' : '· all 200'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {(selCategory ? filteredTypes : types).map((t, i) => t && (
                  <div key={i} onClick={() => selectType(t)}
                        style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: 6,
                                  background: '#f9fafb', border: '1px solid #e5e7eb',
                                  fontSize: 13 }}>
                    <span style={{ color: '#9ca3af', fontSize: 12, marginRight: 4 }}>{i + 1}</span>
                    {t}
                  </div>
                ))}
              </div>
            </>
          )}

          {selType && detail && (
            <>
              {/* Main + Sub reference visible INSIDE content (operator req) */}
              <div style={{
                background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6,
                padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#3730a3',
                display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                {selDomain && (
                  <span>
                    <strong>Main:</strong> L{selDomain.id} {selDomain.name}
                    <span style={{ opacity: 0.7, marginLeft: 4 }}>· {selDomain.purpose?.substring(0, 60)}</span>
                  </span>
                )}
                {selCategory && (
                  <span>
                    <strong>Sub:</strong> #{selCategory.n} {selCategory.name}
                    <span style={{ opacity: 0.7, marginLeft: 4 }}>· {selCategory.purpose}</span>
                  </span>
                )}
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>{detail.ai_type}</h2>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                spec: {detail.spec}
                {selCategory?.examples && <> · examples: {selCategory.examples}</>}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                {['14-field', 'pipeline', 'model', 'raw'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: '5px 12px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    borderBottom: activeTab === t ? '3px solid #4f46e5' : '3px solid transparent',
                    color: activeTab === t ? '#1f2937' : '#6b7280',
                  }}>
                    {t === '14-field' && '§133 · 14 Fields'}
                    {t === 'pipeline' && '8-Section Pipeline'}
                    {t === 'model' && 'Model Detail'}
                    {t === 'raw' && 'Raw'}
                  </button>
                ))}
              </div>

              {activeTab === '14-field' && detail.skeleton && (
                <div>
                  {Object.entries(detail.skeleton).map(([k, v]) => (
                    <div key={k} style={{ padding: 14, marginBottom: 10, background: '#f9fafb',
                                            borderRadius: 4, borderLeft: '3px solid #4f46e5' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{FIELD_LABELS[k] || k}</div>
                      <div style={{ fontSize: 13, color: String(v).startsWith('TODO') ? '#92400e' : '#374151',
                                      marginTop: 3 }}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pipeline' && pipeline && (
                <div>
                  {PIPELINE_TABS.map(p => pipeline[p.id] && (
                    <div key={p.id} style={{ marginBottom: 8, padding: 8,
                                                background: '#f9fafb', borderRadius: 4,
                                                borderLeft: '3px solid #10b981' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <pre style={{ fontSize: 12, margin: '4px 0 0', whiteSpace: 'pre-wrap',
                                      fontFamily: 'inherit', color: '#374151' }}>
                        {typeof pipeline[p.id] === 'string' ? pipeline[p.id]
                          : JSON.stringify(pipeline[p.id], null, 2).substring(0, 500)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'model' && <ModelDetail />}

              {activeTab === 'raw' && (
                <pre style={{ fontSize: 12, background: '#1f2937', color: '#a7f3d0',
                                padding: 10, borderRadius: 5, overflow: 'auto', maxHeight: '55vh' }}>
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

function ModelDetail() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/v1/ai-type-impl/model-detail`).then(r => r.json()).then(setData);
  }, []);
  if (!data) return <div style={{ color: '#9ca3af' }}>Loading…</div>;
  return (
    <div>
      {Object.entries(data).filter(([k]) =>
        !['ts_utc', 'ts_local', 'tz', 'actor_user', 'actor_host', 'spec'].includes(k)
      ).map(([k, v]) => (
        <div key={k} style={{ padding: 14, marginBottom: 10, background: '#f9fafb',
                                 borderRadius: 4, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{k}</div>
          <pre style={{ fontSize: 12, margin: '4px 0 0', whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit', color: '#374151' }}>
            {typeof v === 'string' ? v : JSON.stringify(v, null, 2).substring(0, 500)}
          </pre>
        </div>
      ))}
    </div>
  );
}
