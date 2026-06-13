// Dark blue main menu: Department -> Business Domain -> Main Process.
// Domain IDs are lowercase in URLs and uppercase only in labels.

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CANONICAL_DOMAINS,
  canonicalDomainId,
  processesForDomain,
  scenarioForDomain,
  slugOf,
} from '../../utils/insuranceNavigation';

const FS_SECTION_HEADER = 15;
const FS_TOP_ROW = 14;
const FS_MID_ROW = 13;
const FS_LEAF_ROW = 13;
const FS_SMALL_LABEL = 11;
const FS_TINY_LABEL = 11;

const WORKSTREAMS = [
  {
    lane: 'ops',
    field: 'brownfield',
    label: 'Operations · Brownfield',
    helper: 'Run, support, incidents, problem management, contact center support',
    color: '#f59e0b',
  },
  {
    lane: 'ops',
    field: 'greenfield-request',
    label: 'Operations · Greenfield Request',
    helper: 'New business use case, enhancement ask, ROI and approval request',
    color: '#10b981',
  },
  {
    lane: 'it',
    field: 'greenfield',
    label: 'IT · Greenfield Build',
    helper: 'New implementation, architecture, API, data, model, pipeline, deploy',
    color: '#38bdf8',
  },
  {
    lane: 'it',
    field: 'brownfield',
    label: 'IT · Brownfield Support',
    helper: 'Application, integration, data, model, performance, security fixes',
    color: '#a78bfa',
  },
];

export function BankSidebar({ bp, collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const activeLane = searchParams.get('lane') || 'ops';
  const activeField = searchParams.get('field') || 'brownfield';
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

  const setWorkstream = (lane, field) => {
    const next = new URLSearchParams(searchParams);
    next.set('lane', lane);
    next.set('field', field);
    navigate(`${location.pathname}?${next.toString()}`, { replace: false });
  };

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
        }}>MAIN MENU</strong>
        <button onClick={onToggle} aria-label="Collapse main menu" style={{
          minWidth: 36, minHeight: 36,
          background: 'transparent', border: 'none', color: '#93c5fd',
          fontSize: 18, cursor: 'pointer',
        }}>≡</button>
      </div>
      <div style={{
        padding: '8px 18px 10px',
        borderBottom: '1px solid #1e40af',
        color: '#bfdbfe',
        fontSize: FS_SMALL_LABEL,
        lineHeight: 1.35,
      }}>
        Main Menu path: Department -&gt; Owner Lane -&gt; Brownfield/Greenfield -&gt; B2C/B2B/B2E -&gt; Main Process. Workspace tabs open from the Sub Menu.
      </div>

      <div style={{ padding: '10px 0', borderBottom: '1px solid #1e40af', marginBottom: 10 }}>
        <div style={{
          padding: '6px 18px 8px', color: '#bfdbfe',
          fontSize: FS_SMALL_LABEL, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Operating Model</div>
        {WORKSTREAMS.map((item) => {
          const active = activeLane === item.lane && activeField === item.field;
          return (
            <button key={`${item.lane}-${item.field}`} type="button" onClick={() => setWorkstream(item.lane, item.field)}
              style={{
                width: '100%', textAlign: 'left', minHeight: 48,
                padding: '8px 18px', background: active ? '#1d4ed8' : 'transparent',
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                borderLeft: `3px solid ${item.color}`,
                color: active ? '#fff' : '#dbeafe', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <span style={{ display: 'block', fontSize: FS_MID_ROW, fontWeight: 800 }}>{item.label}</span>
              <span style={{ display: 'block', marginTop: 2, color: active ? '#dbeafe' : '#93c5fd', fontSize: FS_SMALL_LABEL, lineHeight: 1.25 }}>
                {item.helper}
              </span>
            </button>
          );
        })}
      </div>

      {/* §147 Platform Modules · ALL new topics as departments */}
      <details style={{ padding: '10px 0', borderBottom: '1px solid #1e40af', marginBottom: 10 }}>
        <summary style={{
          padding: '6px 18px 8px', color: '#10b981',
          fontSize: FS_SMALL_LABEL, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
        }}>Platform Modules</summary>
        {[
          { to: '/eai-os',    icon: '🏢', label: '§144 · Enterprise AI OS (9 layers)' },
          { to: '/itsm',       icon: '🎫', label: '§143 · ITSM (incidents · L2 RCA · P1)' },
          { to: '/prompts',    icon: '💬', label: '§145 · Conversation log' },
          { to: '/platform',   icon: '🗺️', label: '§147 · Platform Explorer (all APIs)' },
          { to: '/processes',  icon: '🛡️', label: '§150 · Process Resilience (live)' },
          { to: '/chatgroup',  icon: '💬', label: 'ChatGroup · human + agent rooms' },
          { to: '/control-tower', icon: '🏗', label: '§144 · AI Control Tower (12 dashboards)' },
          { to: '/stt',        icon: '🎙', label: 'Speech-to-Text · audio + video' },
          { to: '/tts',        icon: '🔊', label: 'Text-to-Speech (§F01)' },
          { to: '/notifications', icon: '🔔', label: 'Notification Center (§F02)' },
          { to: '/feature-flags', icon: '🎛', label: 'Feature Flags (§F03)' },
          { to: '/workspace-demo', icon: '🧪', label: '§149.2 Layout Demo (drag · glass · flow)' },
          { to: '/eaos-dept',    icon: '🏢', label: '🆕 EAOS Department (10 sub-menu · 12 tabs each)' },
          { to: '/eaos',         icon: '🏢', label: '§EAOS Top-10 Scoreboard' },
          { to: '/command-center', icon: '🏛', label: 'Enterprise AI Command Center' },
          { to: '/promptops',    icon: '📝', label: 'PromptOps' },
          { to: '/evalops',      icon: '🧪', label: 'EvaluationOps' },
          { to: '/governance-om',icon: '⚖️', label: 'Governance Operating Model (§EAOS-3)' },
          { to: '/agent-lifecycle', icon: '🔁', label: 'Agent Lifecycle (§EAOS-5)' },
          { to: '/audit-explorer', icon: '📜', label: 'Audit Log Explorer (§F04)' },
          { to: '/cost',           icon: '💰', label: 'Cost Optimizer (§F05)' },
          { to: '/drift',          icon: '📉', label: 'Drift Monitor (§F06)' },
          { to: '/prompt-playground', icon: '🧪', label: 'Prompt Playground (§F07)' },
          { to: '/model-compare',  icon: '🆚', label: 'Model Comparison (§F09)' },
          { to: '/datasets',       icon: '📦', label: 'Datasets (§F13)' },
          { to: '/finetune',       icon: '🛠', label: 'Fine-tune Jobs (§F12)' },
          { to: '/webhook-debug',  icon: '🪝', label: 'Webhook Debug (§F15)' },
          { to: '/sse-stream',     icon: '📡', label: 'SSE Stream (§F16)' },
          { to: '/aeo',            icon: '🧠', label: '🆕 AEO · Autonomous Enterprise Orchestrator (Layer 10)' },
          { to: '/digital-twin',   icon: '🎮', label: 'Digital Twin (Layer 8)' },
          { to: '/investment-portfolio', icon: '💎', label: 'Investment Portfolio (Layer 7)' },
          { to: '/cost-portfolio', icon: '💰', label: 'Cost Portfolio (Layer 6)' },
          { to: '/risk-portfolio', icon: '⚠️', label: 'Risk Portfolio (Layer 5)' },
          { to: '/model-portfolio',icon: '🧠', label: 'Model Portfolio (Layer 4)' },
          { to: '/translate',      icon: '🌐', label: 'Translation (§F10)' },
          { to: '/ocr',            icon: '👁', label: 'Functional OCR (§F11)' },
          { to: '/embeddings',     icon: '🔢', label: 'Embedding Playground (§F14)' },
          { to: '/vectors',        icon: '🗄', label: 'Vector DB Browser (§F08)' },
        ].map((m) => (
          // §138 navigation contract · platform modules open in NEW TAB
          // so the bank shell (Main Menu · Sub Menu · workspace) stays
          // intact for the operator. Top-level routes like /eai-os ·
          // /itsm · /ai-types etc are NOT under <Route path="/bank">
          // and would replace BankLayout if clicked in-tab.
          <Link key={m.to} to={m.to}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  minHeight: 38,
                  padding: '8px 18px',
                  color: '#dbeafe', textDecoration: 'none',
                  fontSize: FS_LEAF_ROW,
                }}>
            <span>{m.icon}</span><span style={{ flex: 1 }}>{m.label}</span>
            <span style={{ fontSize: 10, color: '#93c5fd', opacity: 0.7 }} aria-label="opens in new tab">↗</span>
          </Link>
        ))}
      </details>

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
        Dept &gt; B2C/B2B/B2E &gt; Main Process · {depts.length} dept{depts.length === 1 ? '' : 's'}
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
                        </button>

                        {procOpen && (
                          <div style={{
                            padding: '5px 16px 8px 62px',
                            color: '#93c5fd', fontSize: FS_TINY_LABEL, lineHeight: 1.3,
                          }}>
                            Sub Menu opens workspace tabs: operations, data, AI types, applications, agents.
                          </div>
                        )}
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
