// Dark blue main menu: Department -> Business Domain -> Main Process -> AI Capability.
// Domain IDs are lowercase in URLs and uppercase only in labels.

import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CANONICAL_DOMAINS,
  aiCapabilitiesOf,
  canonicalDomainId,
  processesForDomain,
  scenarioForDomain,
  slugOf,
} from '../../utils/insuranceNavigation';

const FS_SECTION_HEADER = 15;
const FS_TOP_ROW = 14;
const FS_MID_ROW = 13;
const FS_LEAF_ROW = 13;
const FS_AI_CAPABILITY_ROW = 12;
const FS_SMALL_LABEL = 11;
const FS_TINY_LABEL = 11;

export function BankSidebar({ bp, collapsed, onToggle }) {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const activeFocus = searchParams.get('focus') || '';
  const activeDomain = canonicalDomainId(params.domain);
  const [filter, setFilter] = useState('');
  const [openDepts, setOpenDepts] = useState(() =>
    params.deptId ? { [params.deptId]: true } : {}
  );
  const [openDomains, setOpenDomains] = useState(() =>
    params.deptId && activeDomain ? { [`${params.deptId}:${activeDomain}`]: true } : {}
  );
  const [openProcs, setOpenProcs] = useState({});

  if (collapsed) {
    return (
      <aside style={{
        background: '#1e3a8a', color: '#dbeafe',
        borderRight: '1px solid #1e40af',
        padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <button onClick={onToggle} aria-label="Expand business hierarchy" style={{
          minWidth: 36, minHeight: 36,
          background: 'transparent', border: 'none', color: '#dbeafe',
          fontSize: 20, cursor: 'pointer', padding: 8,
        }}>≡</button>
      </aside>
    );
  }

  const allDepts = (bp.department_catalog || []).slice().sort((a, b) => a.id - b.id);
  const q = filter.trim().toLowerCase();
  const depts = q
    ? allDepts.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        `dept ${d.id}`.includes(q) ||
        (d.processes || []).some((p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.ai || []).some((ai) => (ai.ai_type || '').toLowerCase().includes(q))))
    : allDepts;

  const toggleDept = (id) => setOpenDepts((p) => ({ ...p, [id]: !p[id] }));
  const toggleDomain = (key) => setOpenDomains((p) => ({ ...p, [key]: !p[key] }));

  return (
    <aside style={{
      background: '#1e3a8a', color: '#dbeafe',
      borderRight: '1px solid #1e40af',
      overflow: 'auto', padding: '16px 0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px 14px', borderBottom: '1px solid #1e40af',
      }}>
        <strong style={{
          color: '#fff', fontSize: FS_SECTION_HEADER,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>BUSINESS HIERARCHY</strong>
        <button onClick={onToggle} aria-label="Collapse business hierarchy" style={{
          minWidth: 36, minHeight: 36,
          background: 'transparent', border: 'none', color: '#93c5fd',
          fontSize: 18, cursor: 'pointer',
        }}>≡</button>
      </div>

      {/* §147 Platform Modules · ALL new topics as departments */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid #1e40af', marginBottom: 10 }}>
        <div style={{
          padding: '6px 18px 8px', color: '#10b981',
          fontSize: FS_SMALL_LABEL, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Platform Modules</div>
        {[
          { to: '/eai-os',    icon: '🏢', label: '§144 · Enterprise AI OS (9 layers)' },
          { to: '/itsm',       icon: '🎫', label: '§143 · ITSM (incidents · L2 RCA · P1)' },
          { to: '/prompts',    icon: '💬', label: '§145 · Conversation log' },
          { to: '/platform',   icon: '🗺️', label: '§147 · Platform Explorer (all APIs)' },
          { to: '/ai-types',   icon: '🤖', label: '§148 · AI Types catalog (200)' },
          { to: '/processes',  icon: '🛡️', label: '§150 · Process Resilience (live)' },
        ].map((m) => (
          <Link key={m.to} to={m.to} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 38,
            padding: '8px 18px',
            color: '#dbeafe', textDecoration: 'none',
            fontSize: FS_LEAF_ROW,
          }}>
            <span>{m.icon}</span><span style={{ flex: 1 }}>{m.label}</span>
          </Link>
        ))}
      </div>

      {/* §148 AI Catalog · main menu entry · B2C/B2B/B2E sub-menu */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid #1e40af', marginBottom: 10 }}>
        <div style={{
          padding: '6px 18px 8px', color: '#fbbf24',
          fontSize: FS_SMALL_LABEL, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>AI Catalog (§131)</div>
        <Link to="/ai-types" style={{
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '9px 18px',
          color: '#fbbf24', textDecoration: 'none',
          fontSize: FS_MID_ROW, fontWeight: 700,
        }}>
          <span>🤖</span><span style={{ flex: 1 }}>All 200 AI Types</span>
        </Link>
        {[
          { domain: 'b2c', icon: '🟢', label: 'B2C · Consumer-facing AI' },
          { domain: 'b2b', icon: '🟣', label: 'B2B · Business partner AI' },
          { domain: 'b2e', icon: '🔵', label: 'B2E · Employee-facing AI' },
        ].map((d) => (
          <Link key={d.domain} to={`/ai-types?domain=${d.domain}`} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 38,
            padding: '8px 30px',
            color: '#dbeafe', textDecoration: 'none',
            fontSize: FS_LEAF_ROW,
          }}>
            <span>{d.icon}</span><span style={{ flex: 1 }}>{d.label}</span>
          </Link>
        ))}
      </div>

      <div style={{ padding: '10px 0', borderBottom: '1px solid #1e40af', marginBottom: 10 }}>
        {[
          { to: '/bank/prompts',   icon: '💬', label: 'My input prompts',        color: '#60a5fa' },
          { to: '/bank/agentic',   icon: '🧠', label: 'Agentic + MCP + Council', color: '#a78bfa' },
          { to: '/bank/scorecard', icon: '📊', label: 'Process scorecard',       color: '#38bdf8' },
          { to: '/bank/bot',       icon: '🤖', label: 'Cross-dept Bot',          color: '#38bdf8' },
          { to: '/bank/chat',      icon: '💬', label: 'Conversations',           color: '#34d399' },
          { to: '/bank/bcm',       icon: '🛡️', label: 'BCM (incidents)',         color: '#f87171' },
        ].map((item) => (
          <Link key={item.to} to={item.to} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 38,
            padding: '8px 18px',
            color: '#dbeafe', textDecoration: 'none',
            fontSize: FS_MID_ROW, fontWeight: 600,
            borderLeft: `3px solid ${item.color}`,
          }}>
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </Link>
        ))}
      </div>

      <div style={{ padding: '14px 18px' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter dept / process..."
          style={{
            width: '100%', padding: '9px 12px', fontSize: FS_MID_ROW,
            background: '#1e40af', color: '#fff',
            border: '1px solid #3b82f6', borderRadius: 6, outline: 'none',
          }}
        />
      </div>

      <div style={{
        padding: '10px 18px 6px', fontSize: FS_SMALL_LABEL,
        color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Dept &gt; Domain &gt; Main Process &gt; AI · {depts.length} dept{depts.length === 1 ? '' : 's'}
      </div>

      {depts.map((d) => {
        const deptOpen = openDepts[d.id] || !!q || params.deptId === String(d.id);
        const isActiveDept = params.deptId === String(d.id) && !activeDomain;
        return (
          <div key={d.id}>
            <button
              type="button"
              onClick={() => toggleDept(d.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '13px 16px',
                background: isActiveDept ? '#1e40af' : 'transparent',
                border: 'none', color: '#fff',
                fontSize: FS_TOP_ROW, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ width: 10, color: '#93c5fd' }}>{deptOpen ? '▾' : '▸'}</span>
              <span style={{
                fontSize: FS_SMALL_LABEL, padding: '1px 5px', borderRadius: 3,
                background: '#1e40af', color: '#dbeafe', fontWeight: 700,
              }}>#{d.id}</span>
              <span style={{ flex: 1 }}>{d.name}</span>
              {d.partial && (
                <span style={{
                  fontSize: FS_TINY_LABEL, padding: '1px 5px', borderRadius: 3,
                  background: '#f59e0b', color: '#fff', fontWeight: 700,
                }}>P</span>
              )}
            </button>

            {deptOpen && CANONICAL_DOMAINS.map((dom) => {
              const domKey = `${d.id}:${dom.id}`;
              const hasDomain = scenarioForDomain(d, dom.id);
              const domainProcesses = processesForDomain(d.processes, d, dom.id);
              const domOpen = openDomains[domKey] || !!q ||
                (params.deptId === String(d.id) && activeDomain === dom.id);
              const isActiveDom = params.deptId === String(d.id) && activeDomain === dom.id;
              return (
                <div key={dom.id} style={{ paddingLeft: 14 }}>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDomain(domKey);
                      navigate(`/bank/dept/${d.id}/${dom.id}`);
                    }}
                    title={hasDomain ? (hasDomain.label || dom.label) : `${dom.label} (operator-pending)`}
                    aria-current={isActiveDom ? 'location' : undefined}
                    style={{
                      width: '100%', textAlign: 'left',
                      minHeight: 40,
                      padding: '10px 16px',
                      background: isActiveDom ? '#1d4ed8' : 'transparent',
                      borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                      borderLeft: isActiveDom ? '3px solid #fff' : '3px solid transparent',
                      color: isActiveDom ? '#fff' : (hasDomain ? '#dbeafe' : '#60a5fa'),
                      fontSize: FS_MID_ROW, fontWeight: 600, cursor: 'pointer',
                      opacity: hasDomain ? 1 : 0.6,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{ width: 10, color: '#93c5fd' }}>{domOpen ? '▾' : '▸'}</span>
                    <span>{dom.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: FS_TINY_LABEL, opacity: 0.8 }}>
                      {domainProcesses.length}
                    </span>
                  </button>

                  {domOpen && domainProcesses.map((p, i) => {
                    const procSlug = slugOf(p.name);
                    const procKey = `${d.id}:${dom.id}:${procSlug}`;
                    const isActive = params.deptId === String(d.id)
                      && activeDomain === dom.id
                      && params.processId === procSlug;
                    const procOpen = openProcs[procKey] || !!q || isActive;
                    const aiCaps = aiCapabilitiesOf(p);
                    return (
                      <div key={procSlug}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenProcs((s) => ({ ...s, [procKey]: !s[procKey] }));
                            navigate(`/bank/dept/${d.id}/${dom.id}/${procSlug}`);
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          style={{
                            width: '100%', textAlign: 'left',
                            minHeight: 40,
                            padding: '9px 16px 9px 36px',
                            background: isActive ? '#2563eb' : 'transparent',
                            // Avoid border shorthand + borderLeft conflict (React TDZ warning).
                            // Set per-side borders explicitly: only left has color.
                            borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                            borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                            color: isActive ? '#fff' : '#dbeafe',
                            fontSize: FS_LEAF_ROW, fontWeight: isActive ? 600 : 400,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span style={{ width: 10, color: '#93c5fd' }}>{procOpen ? '▾' : '▸'}</span>
                          <span style={{ width: 4, height: 4, borderRadius: 4, background: '#60a5fa' }} />
                          <span style={{ fontSize: FS_TINY_LABEL, color: '#93c5fd', fontWeight: 700, marginRight: 4 }}>
                            UC-{d.id}.{i + 1}
                          </span>
                          <span style={{ flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: FS_TINY_LABEL, opacity: 0.7 }}>({aiCaps.length})</span>
                        </button>

                        {procOpen && aiCaps.length === 0 && (
                          <div style={{
                            padding: '4px 14px 6px 56px',
                            color: '#94a3b8', fontSize: FS_AI_CAPABILITY_ROW, fontStyle: 'italic',
                          }}>
                            (no AI capabilities on this process)
                          </div>
                        )}

                        {procOpen && aiCaps.map((capability) => {
                          const capabilityFocus = `ai:${capability.label}`;
                          const capabilityActive = activeFocus === capabilityFocus || params.subProcessId === capability.id;
                          return (
                            <button
                              key={capability.id}
                              type="button"
                              onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.set('focus', capabilityFocus);
                                next.set('tab', 'ai');
                                next.delete('sub');
                                navigate(`/bank/dept/${d.id}/${dom.id}/${procSlug}?${next.toString()}`);
                              }}
                              aria-current={capabilityActive ? 'true' : undefined}
                              style={{
                                width: '100%', textAlign: 'left',
                                minHeight: 38,
                                padding: '9px 16px 9px 62px',
                                background: capabilityActive ? '#1d4ed8' : 'transparent',
                                // Avoid border shorthand + borderLeft conflict.
                                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                                borderLeft: capabilityActive ? '3px solid #fff' : '3px solid transparent',
                                color: capabilityActive ? '#fff' : '#bfdbfe',
                                fontSize: FS_AI_CAPABILITY_ROW, fontWeight: capabilityActive ? 600 : 400,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              <span style={{
                                width: 4, height: 4, borderRadius: 4,
                                background: capabilityActive ? '#fff' : '#3b82f6',
                              }} />
                              <span style={{ flex: 1 }}>{capability.label}</span>
                              <span style={{
                                fontSize: FS_TINY_LABEL, padding: '0 4px', borderRadius: 2,
                                background: '#1e3a8a', color: '#dbeafe', fontWeight: 600,
                              }}>{capability.kind}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {depts.length === 0 && (
        <div style={{ padding: 16, fontSize: FS_MID_ROW, color: '#dbeafe', fontStyle: 'italic' }}>
          No matches for "{q}"
        </div>
      )}
    </aside>
  );
}
