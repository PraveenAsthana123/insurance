// Dark blue (navy) main menu — Business Hierarchy: Department → Business Domain → Main Process.
// Per operator spec: all 3 levels visible in the main menu.
// Font scale matched to BankSubMenu for visual parity.

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const DOMAINS = ['B2C', 'B2B', 'B2E'];

// Shared font scale (must match BankSubMenu) — every level a UNIQUE size for clarity.
const FS_SECTION_HEADER = 14;   // top-level header
const FS_TOP_ROW        = 13;   // dept name
const FS_MID_ROW        = 12;   // domain row, category title, cross-dept tools
const FS_LEAF_ROW       = 11;   // process (main process)
const FS_SUBPROC_ROW    = 10;   // sub-process (AI capability inside a process)
const FS_SMALL_LABEL    =  9;   // hints, #ID badge, breadcrumb caption
const FS_TINY_LABEL     =  8;   // UC-X.Y code, P badge

// Process keys to use as "sub-process" items (blueprint has no sub_processes
// field; use AI capabilities as the natural per-process drill-down).
function subProcessesOf(p) {
  const ai = Array.isArray(p?.ai) ? p.ai : [];
  return ai.map((entry, i) => {
    const label = entry?.ai_type || entry?.name || entry?.label || `AI #${i + 1}`;
    const idSlug = (label || `ai${i}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return { id: idSlug, label, kind: 'ai' };
  });
}

export function BankSidebar({ bp, collapsed, onToggle }) {
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState('');
  const [openDepts, setOpenDepts] = useState(() =>
    params.deptId ? { [params.deptId]: true } : {}
  );
  const [openDomains, setOpenDomains] = useState(() =>
    params.deptId && params.domain ? { [`${params.deptId}:${params.domain}`]: true } : {}
  );
  const [openProcs, setOpenProcs] = useState({});

  if (collapsed) {
    return (
      <aside style={{
        background: '#1e3a8a', color: '#dbeafe',
        borderRight: '1px solid #1e40af',
        padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <button onClick={onToggle} style={{
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
        (d.processes || []).some((p) => (p.name || '').toLowerCase().includes(q)))
    : allDepts;

  const toggleDept = (id) => setOpenDepts((p) => ({ ...p, [id]: !p[id] }));
  const toggleDomain = (key) => setOpenDomains((p) => ({ ...p, [key]: !p[key] }));
  const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <aside style={{
      background: '#1e3a8a', color: '#dbeafe',
      borderRight: '1px solid #1e40af',
      overflow: 'auto', padding: '12px 0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 12px', borderBottom: '1px solid #1e40af',
      }}>
        <strong style={{
          color: '#fff', fontSize: FS_SECTION_HEADER,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>BUSINESS HIERARCHY</strong>
        <button onClick={onToggle} style={{
          background: 'transparent', border: 'none', color: '#93c5fd',
          fontSize: 18, cursor: 'pointer',
        }}>≡</button>
      </div>

      {/* Cross-dept tools */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid #1e40af', marginBottom: 8 }}>
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
            padding: '5px 16px',
            color: '#dbeafe', textDecoration: 'none',
            fontSize: FS_MID_ROW, fontWeight: 600,
            borderLeft: `3px solid ${item.color}`,
          }}>
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Filter */}
      <div style={{ padding: '12px 16px' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter dept / process…"
          style={{
            width: '100%', padding: '6px 10px', fontSize: FS_MID_ROW,
            background: '#1e40af', color: '#fff',
            border: '1px solid #3b82f6', borderRadius: 6, outline: 'none',
          }}
        />
      </div>

      <div style={{
        padding: '8px 16px 4px', fontSize: FS_SMALL_LABEL,
        color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Dept › Domain › Main Process · {depts.length} dept{depts.length === 1 ? '' : 's'}
      </div>

      {/* 3-level tree */}
      {depts.map((d) => {
        const deptOpen = openDepts[d.id] || !!q || params.deptId === String(d.id);
        const isActiveDept = params.deptId === String(d.id) && !params.domain;
        return (
          <div key={d.id}>
            <button
              type="button"
              onClick={() => toggleDept(d.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '11px 14px',
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

            {deptOpen && DOMAINS.map((dom) => {
              const domKey = `${d.id}:${dom}`;
              const domOpen = openDomains[domKey] ||
                !!q ||
                (params.deptId === String(d.id) && params.domain === dom);
              const isActiveDom = params.deptId === String(d.id) &&
                                   params.domain === dom && !params.processId;
              const hasDomain = d.channel_scenarios && d.channel_scenarios[dom];
              return (
                <div key={dom} style={{ paddingLeft: 14 }}>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDomain(domKey);
                      navigate(`/bank/dept/${d.id}/${dom}`);
                    }}
                    title={hasDomain ? (hasDomain.label || dom) : `${dom} (no operator content)`}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 14px',
                      background: isActiveDom ? '#b91c1c' : 'transparent',
                      border: 'none',
                      color: isActiveDom ? '#fff' : (hasDomain ? '#dbeafe' : '#60a5fa'),
                      fontSize: FS_MID_ROW, fontWeight: 600, cursor: 'pointer',
                      opacity: hasDomain ? 1 : 0.6,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{ width: 10, color: '#93c5fd' }}>{domOpen ? '▾' : '▸'}</span>
                    <span>{dom}</span>
                  </button>

                  {domOpen && (d.processes || []).map((p, i) => {
                    const procSlug = slug(p.name);
                    const procKey = `${d.id}:${dom}:${procSlug}`;
                    const isActive = params.deptId === String(d.id)
                                  && params.domain === dom
                                  && params.processId === procSlug;
                    const procOpen = openProcs[procKey] || !!q || isActive;
                    const subs = subProcessesOf(p);
                    return (
                      <div key={procSlug}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenProcs((s) => ({ ...s, [procKey]: !s[procKey] }));
                            navigate(`/bank/dept/${d.id}/${dom}/${procSlug}`);
                          }}
                          style={{
                            width: '100%', textAlign: 'left',
                            padding: '6px 14px 6px 32px',
                            background: isActive ? '#2563eb' : 'transparent',
                            borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                            border: 'none',
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
                          <span style={{ fontSize: FS_TINY_LABEL, opacity: 0.7 }}>({subs.length})</span>
                        </button>

                        {procOpen && subs.length === 0 && (
                          <div style={{
                            padding: '4px 14px 6px 56px',
                            color: '#94a3b8', fontSize: FS_SUBPROC_ROW, fontStyle: 'italic',
                          }}>
                            (no sub-processes — backfill via blueprint)
                          </div>
                        )}

                        {procOpen && subs.map((s) => {
                          const subActive = params.subProcessId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => navigate(`/bank/dept/${d.id}/${dom}/${procSlug}/${s.id}`)}
                              style={{
                                width: '100%', textAlign: 'left',
                                padding: '5px 14px 5px 56px',
                                background: subActive ? '#1d4ed8' : 'transparent',
                                borderLeft: subActive ? '3px solid #fff' : '3px solid transparent',
                                border: 'none',
                                color: subActive ? '#fff' : '#bfdbfe',
                                fontSize: FS_SUBPROC_ROW, fontWeight: subActive ? 600 : 400,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              <span style={{
                                width: 4, height: 4, borderRadius: 4,
                                background: subActive ? '#fff' : '#3b82f6',
                              }} />
                              <span style={{ flex: 1 }}>{s.label}</span>
                              <span style={{
                                fontSize: FS_TINY_LABEL, padding: '0 4px', borderRadius: 2,
                                background: '#1e3a8a', color: '#dbeafe', fontWeight: 600,
                              }}>{s.kind}</span>
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
