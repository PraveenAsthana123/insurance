import { useState, useEffect } from 'react';
import { useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import { ReadmeTabPanel } from './tabs/ReadmeTabPanel';
import {
  TechStackTab, DemoStoryTab, AsIsToBeTab,
  ProblemTab, DataTab, ManualProcessTab, AutomaticProcessTab,
  FlowDiagramTab, OutputTab, VisualizationTab, DashboardTab,
  ResAITab, ExpAITab, GovernanceAITab, TestsTab, SecurityTab,
} from './tabs/SimpleTabs';

// 17 tabs in fixed order per global §73
const TABS = [
  { slug: 'readme',           label: 'Architecture',       phase: 'Orient' },
  { slug: 'tech-stack',       label: 'Tech stack',         phase: 'Orient' },
  { slug: 'demo-story',       label: 'Demo story',         phase: 'Orient' },
  { slug: 'as-is-to-be',      label: 'AS-IS → TO-BE',      phase: 'Orient' },
  { slug: 'problem',          label: 'Problem',            phase: 'Understand' },
  { slug: 'data',             label: 'Data',               phase: 'Understand' },
  { slug: 'manual',           label: 'Manual process',     phase: 'Describe' },
  { slug: 'automatic',        label: 'Automatic process',  phase: 'Describe' },
  { slug: 'flow-diagram',     label: 'Flow diagram',       phase: 'Ship' },
  { slug: 'output',           label: 'Output',             phase: 'Ship' },
  { slug: 'visualization',    label: 'Visualization',      phase: 'Measure' },
  { slug: 'dashboard',        label: 'Dashboard',          phase: 'Measure' },
  { slug: 'resai',            label: 'ResAI',              phase: 'Govern' },
  { slug: 'expai',            label: 'ExpAI',              phase: 'Govern' },
  { slug: 'governance',       label: 'Governance AI',      phase: 'Govern' },
  { slug: 'tests',            label: 'Tests',              phase: 'Verify' },
  { slug: 'security',         label: 'Security',           phase: 'Secure' },
];

// Phase-colored active-tab gradients (banking-style)
const PHASE_GRADIENT = {
  Orient:     { bg: 'linear-gradient(135deg, #64748b, #475569)', solid: '#475569' },
  Understand: { bg: 'linear-gradient(135deg, #3b82f6, #1e40af)', solid: '#1e40af' },
  Describe:   { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', solid: '#6366f1' },
  Ship:       { bg: 'linear-gradient(135deg, #6366f1, #4338ca)', solid: '#4338ca' },
  Measure:    { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', solid: '#d97706' },
  Govern:     { bg: 'linear-gradient(135deg, #10b981, #059669)', solid: '#059669' },
  Verify:     { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', solid: '#0891b2' },
  Secure:     { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', solid: '#dc2626' },
};

// §49 compose-footer per-tab: which tabs each tab cross-references.
// Wired into the renderer so every tab can reach its neighbours in one click.
const TAB_CROSSREFS = {
  data:         ['problem', 'manual', 'automatic', 'flow-diagram', 'output'],
  manual:       ['problem', 'data', 'automatic', 'flow-diagram'],
  automatic:    ['manual', 'data', 'flow-diagram', 'governance', 'output'],
  'flow-diagram': ['manual', 'automatic', 'data', 'output', 'visualization'],
  problem:      ['data', 'manual', 'as-is-to-be'],
  output:       ['automatic', 'flow-diagram', 'visualization', 'dashboard'],
};

function findProcess(dept, processId) {
  if (!dept?.processes) return null;
  for (const p of dept.processes) {
    const pid = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (pid === decodeURIComponent(processId)) return p;
  }
  return null;
}

function TabCrossRefs({ activeTab, setTab }) {
  const refs = TAB_CROSSREFS[activeTab];
  if (!refs || refs.length === 0) return null;
  return (
    <div style={{
      marginTop: 'var(--spacing-lg)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      background: 'var(--bg-hover)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-sm)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--text-secondary)',
    }}>
      <strong style={{ marginRight: 8 }}>Related tabs:</strong>
      {refs.map((slug, idx) => {
        const t = TABS.find((x) => x.slug === slug);
        if (!t) return null;
        return (
          <span key={slug}>
            {idx > 0 && <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>·</span>}
            <button
              onClick={() => setTab(slug)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: PHASE_GRADIENT[t.phase].solid,
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              {t.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function ProcessDetailView() {
  const { bp } = useOutletContext();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'readme';

  const dept = bp.department_catalog?.find((d) => String(d.id) === params.deptId);
  const proc = findProcess(dept, params.processId);

  // Banking-parity: last-refreshed timestamp updated whenever activeTab changes
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  useEffect(() => { setLastRefreshed(new Date()); }, [activeTab]);

  if (!dept || !proc) {
    return (
      <div className="insurance-empty-state">
        Process not found at this URL. Pick a process from the sub-menu on the left.
      </div>
    );
  }

  const setTab = (slug) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', slug);
    setSearchParams(p);
  };

  const currentIdx = TABS.findIndex((t) => t.slug === activeTab);
  const isFirst = currentIdx <= 0;
  const isLast = currentIdx >= TABS.length - 1;
  const currentTab = TABS[currentIdx] || TABS[0];

  const renderTab = () => {
    switch (activeTab) {
      case 'readme':         return <ReadmeTabPanel proc={proc} dept={dept} />;
      case 'tech-stack':     return <TechStackTab proc={proc} dept={dept} />;
      case 'demo-story':     return <DemoStoryTab proc={proc} dept={dept} />;
      case 'as-is-to-be':    return <AsIsToBeTab proc={proc} dept={dept} />;
      case 'problem':        return <ProblemTab proc={proc} dept={dept} />;
      case 'data':           return <DataTab proc={proc} dept={dept} />;
      case 'manual':         return <ManualProcessTab proc={proc} dept={dept} bp={bp} />;
      case 'automatic':      return <AutomaticProcessTab proc={proc} dept={dept} bp={bp} />;
      case 'flow-diagram':   return <FlowDiagramTab proc={proc} dept={dept} />;
      case 'output':         return <OutputTab proc={proc} dept={dept} />;
      case 'visualization':  return <VisualizationTab proc={proc} dept={dept} />;
      case 'dashboard':      return <DashboardTab proc={proc} dept={dept} />;
      case 'resai':          return <ResAITab proc={proc} dept={dept} />;
      case 'expai':          return <ExpAITab proc={proc} dept={dept} />;
      case 'governance':     return <GovernanceAITab proc={proc} dept={dept} />;
      case 'tests':          return <TestsTab proc={proc} dept={dept} />;
      case 'security':       return <SecurityTab proc={proc} dept={dept} />;
      default:               return <ReadmeTabPanel proc={proc} dept={dept} />;
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-xl)' }}>{proc.name}</h2>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Dept {dept.id} · {dept.name} · {params.domain || 'all domains'}
      </p>

      {/* Banking-style: Prev/Next + tab row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <button
          onClick={() => { if (!isFirst) setTab(TABS[currentIdx - 1].slug); }}
          disabled={isFirst}
          className="insurance-tab"
          style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            opacity: isFirst ? 0.4 : 1, cursor: isFirst ? 'default' : 'pointer',
          }}
          title="Previous tab"
        >
          ‹ Prev
        </button>
        <div className="insurance-tab-bar" role="tablist" style={{ flex: 1, flexWrap: 'wrap', gap: 6 }}>
          {TABS.map((t) => {
            const isActive = activeTab === t.slug;
            const grad = PHASE_GRADIENT[t.phase];
            return (
              <button
                key={t.slug}
                role="tab"
                aria-selected={isActive}
                className={`insurance-tab ${isActive ? 'active' : ''}`}
                onClick={() => setTab(t.slug)}
                style={{
                  background: isActive ? grad.bg : undefined,
                  color: isActive ? '#fff' : undefined,
                  borderTop: `2px solid ${isActive ? grad.solid : 'transparent'}`,
                  fontWeight: isActive ? 700 : 500,
                }}
                title={`${t.phase} phase`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { if (!isLast) setTab(TABS[currentIdx + 1].slug); }}
          disabled={isLast}
          className="insurance-tab"
          style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            opacity: isLast ? 0.4 : 1, cursor: isLast ? 'default' : 'pointer',
          }}
          title="Next tab"
        >
          Next ›
        </button>
      </div>

      {/* Banking-style: Tab position indicator + phase badge + last-refreshed */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '8px 14px',
        background: 'var(--bg-hover)', borderRadius: 8,
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>Tab {currentIdx + 1} of {TABS.length}</span>
          <span style={{
            padding: '2px 8px', borderRadius: 'var(--border-radius-sm)',
            background: PHASE_GRADIENT[currentTab.phase].solid, color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>{currentTab.phase}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
        </div>
      </div>

      <div className="insurance-tab-content" role="tabpanel">
        {renderTab()}
        <TabCrossRefs activeTab={activeTab} setTab={setTab} />
      </div>
    </div>
  );
}
