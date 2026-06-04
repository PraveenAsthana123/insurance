import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams, useNavigate } from 'react-router-dom';

function useFetchJSON(url) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled && e.name !== 'AbortError') setErr(e.message); });
    return () => { cancelled = true; controller.abort(); };
  }, [url]);
  return { data, err };
}

export function InsuranceOverview() {
  const { bp } = useOutletContext();
  const { data: audit } = useFetchJSON('/insurance-audit/insurance_alignment_latest.json');

  const catalog = bp.department_catalog || [];
  const expected = Array.from({ length: 22 }, (_, i) => i + 1);
  const presentIds = new Set(catalog.map((d) => d.id));
  const missing = expected.filter((id) => !presentIds.has(id));
  const partial = catalog.filter((d) => d.partial).length;
  const complete = catalog.length - partial;

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--spacing-xs)' }}>Insurance — operating-model overview</h2>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)' }}>
        Pick a department + business domain (B2B/B2C/B2E) from the menu on the left, then a process from the sub-menu to land on a 17-tab detail view per global §73.
      </p>

      <div className="insurance-kpi-grid" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-success)' }}>
          <span>Complete</span><strong style={{ color: 'var(--accent-success)' }}>{complete}</strong>
        </div>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-warning)' }}>
          <span>Partial</span><strong style={{ color: 'var(--accent-warning)' }}>{partial}</strong>
        </div>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
          <span>Missing</span><strong style={{ color: 'var(--accent-danger)' }}>{missing.length}</strong>
        </div>
        <div className="insurance-metric">
          <span>Catalog coverage</span>
          <strong>{Math.round(100 * catalog.length / 22)}%</strong>
        </div>
      </div>

      {audit && (
        <div className="insurance-card" style={{
          marginBottom: 'var(--spacing-md)',
          borderLeft: `4px solid ${audit.summary?.failed === 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
        }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>
            Hourly alignment audit · {audit.summary?.failed === 0 ? 'GREEN' : 'RED'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {audit.summary?.total - audit.summary?.failed} pass · {audit.summary?.failed} fail · {audit.summary?.total} total ·
            generated {audit.generated_at ? new Date(audit.generated_at).toLocaleString() : '—'}
          </p>
        </div>
      )}

      <div className="insurance-card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>Download data</h3>
        <p style={{ margin: '4px 0 var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          Live JSON served via vite middleware. All operator-editable on the host.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {[
            { url: '/insurance-blueprint', name: 'blueprint.json' },
            { url: '/insurance-audit/insurance_alignment_latest.json', name: 'audit-latest.json' },
            { url: '/insurance-audit/insurance_alignment_latest.md', name: 'audit-latest.md' },
            { url: '/insurance-state/capability_status.json', name: 'capability_status.json' },
            { url: '/insurance-state/maturity_state.json', name: 'maturity_state.json' },
            { url: '/insurance-state/implementation_state.json', name: 'implementation_state.json' },
          ].map((it) => (
            <a key={it.url} href={it.url} download={it.name} style={{
              display: 'block', padding: 'var(--spacing-xs) var(--spacing-sm)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              textDecoration: 'none',
              borderLeft: '3px solid var(--accent-primary)',
              fontSize: 'var(--font-size-sm)',
            }}>
              ↓ {it.name}
            </a>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        Per global §73 (Two-Menu Layout): this landing page intentionally shows NO inline dept catalog grid. Use the left menus to drill into any dept × domain × process × sub-process.
      </p>
    </div>
  );
}

function processIdOf(p) {
  return (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Per the /insurance-catalog screenshot pattern: dept summary card with
//   - header (name + tagline + ROI tag)
//   - horizontal AI capability badges (de-duplicated across processes)
//   - vertical compact process cards (name + note + B2C/B2B/B2E + AI tags)
function DeptSummaryCard({ bp, dept, filterDomain }) {
  const navigate = useNavigate();

  // Filter processes by domain if specified
  const allProcesses = dept.processes || [];
  // De-dup AI capabilities across all processes
  const capabilitySet = new Map();
  allProcesses.forEach((p) => {
    (p.ai || []).forEach((ai) => {
      if (ai.ai_type && !capabilitySet.has(ai.ai_type)) {
        capabilitySet.set(ai.ai_type, ai.scenario || '');
      }
    });
  });
  const capabilities = [...capabilitySet.entries()];

  const scenarios = dept.channel_scenarios || {};

  return (
    <div>
      {/* Header card */}
      <div className="insurance-card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 style={{ margin: '0 0 4px' }}>{dept.name}</h2>
        <p style={{ margin: '0 0 var(--spacing-xs)', color: 'var(--text-secondary)' }}>
          {dept.tagline}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          <strong>Mission:</strong> {dept.mission}
        </p>
        {dept.partial && (
          <p style={{
            marginTop: 'var(--spacing-sm)',
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--accent-warning)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-xs)',
          }}>
            <strong style={{ color: 'var(--accent-warning)' }}>PARTIAL · </strong>
            {dept.partial_note}
          </p>
        )}
      </div>

      {/* Department AI Capabilities pill row */}
      <h3 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
        Department AI Capabilities ({capabilities.length})
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
        {capabilities.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No AI capabilities listed yet.
          </span>
        )}
        {capabilities.map(([ai, scenario]) => (
          <span
            key={ai}
            title={scenario || ai}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-sidebar, #1e3a5f)',
              color: '#fff',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              border: '1px solid var(--border-color)',
            }}
          >
            {ai}
          </span>
        ))}
      </div>

      {/* Domain selector (if no domain set yet) */}
      {!filterDomain && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <p style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            <strong>Filter by domain:</strong>
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
            {['B2C', 'B2B', 'B2E'].map((dom) => (
              <button
                key={dom}
                onClick={() => navigate(`/insurance/${dept.id}/${dom}`)}
                className="insurance-tab"
                style={{
                  background: scenarios[dom] ? 'var(--bg-card)' : 'var(--bg-hover)',
                  opacity: scenarios[dom] ? 1 : 0.5,
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
                title={scenarios[dom]?.label || `${dom} (no operator content yet)`}
              >
                {dom}{scenarios[dom] ? '' : ' ·'}
              </button>
            ))}
            <button
              onClick={() => navigate(`/insurance/${dept.id}`)}
              className="insurance-tab"
              style={{ borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}
            >
              all domains
            </button>
          </div>
        </div>
      )}

      {/* Process cards */}
      <h3 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
        Processes ({allProcesses.length}){filterDomain ? ` · ${filterDomain}` : ''}
      </h3>
      <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
        {allProcesses.map((p, i) => {
          const pid = processIdOf(p) || `p${i}`;
          const domain = filterDomain || 'B2C';
          const subProcs = p.sub_processes || [];
          const issuesPreview = (p.issues || []).slice(0, 2).map((i) => i.issue).join(' · ');
          return (
            <div
              key={pid}
              className="insurance-card"
              style={{ cursor: 'pointer', borderLeft: '3px solid var(--accent-primary)' }}
              onClick={() => navigate(`/insurance/${dept.id}/${domain}/${pid}?tab=readme`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/insurance/${dept.id}/${domain}/${pid}?tab=readme`);
                }
              }}
            >
              <h4 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-base)' }}>
                ▸ {p.name}
                <span style={{ marginLeft: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {(p.ai || []).length} AI · {subProcs.length} sub
                </span>
              </h4>
              {issuesPreview && (
                <p style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  {issuesPreview}{(p.issues || []).length > 2 ? ' · …' : ''}
                </p>
              )}
              {/* Domain pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {Object.keys(scenarios).map((dom) => (
                  <span key={dom} style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: dom === 'B2C' ? 'rgba(59,130,246,0.15)' : dom === 'B2B' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                    color: dom === 'B2C' ? 'var(--accent-primary)' : dom === 'B2B' ? 'var(--accent-warning)' : 'var(--accent-purple)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>{dom}</span>
                ))}
              </div>
              {/* AI tag pills */}
              {(p.ai || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(p.ai || []).slice(0, 8).map((ai, k) => (
                    <span
                      key={k}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/insurance/${dept.id}/${domain}/${pid}/ai/${encodeURIComponent(ai.ai_type)}?sub=data`);
                      }}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'var(--bg-sidebar, #1e3a5f)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title={`${ai.ai_type} — ${ai.scenario || ''}`}
                    >
                      {ai.ai_type}
                    </span>
                  ))}
                  {(p.ai || []).length > 8 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                      +{(p.ai || []).length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{
        marginTop: 'var(--spacing-md)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-muted)',
      }}>
        Click any process card to open its 17-tab detail. Click an AI tag inside a card to jump straight to that AI's 5-section detail. Per global §73.
      </p>
    </div>
  );
}

export function InsuranceDeptViewImpl() {
  const { bp } = useOutletContext();
  const params = useParams();
  const dept = (bp.department_catalog || []).find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return <div className="insurance-empty-state">Dept {params.deptId} not in catalog.</div>;
  }
  return <DeptSummaryCard bp={bp} dept={dept} filterDomain={null} />;
}

export function InsuranceDomainView() {
  const { bp } = useOutletContext();
  const params = useParams();
  const dept = (bp.department_catalog || []).find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return <div className="insurance-empty-state">Dept {params.deptId} not in catalog.</div>;
  }
  return <DeptSummaryCard bp={bp} dept={dept} filterDomain={params.domain} />;
}
