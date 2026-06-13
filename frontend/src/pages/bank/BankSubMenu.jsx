// Maroon process menu. Lists only metadata that exists on the selected process.

import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { canonicalDomainId, domainMeta, slugOf } from '../../utils/insuranceNavigation';

const FS_SECTION_HEADER = 14;
const FS_MID_ROW = 13;
const FS_SMALL_LABEL = 12;

const KIND_TO_TAB = {
  sub: 'process',
  ai: 'ai',
  agent: 'ai',
  app: 'operations',
  md: 'data',
};


const KIND_TO_WORKSPACE = {
  sub: { tab: 'process', sub: 'workflow' },
  ai: { tab: 'ai', sub: 'capabilities' },
  agent: { tab: 'ai', sub: 'agents' },
  app: { tab: 'operations', sub: 'monitoring' },
  md: { tab: 'data', sub: 'master-data' },
};

const OPERATION_WORKSPACE_LINKS = [
  {
    group: 'Master Data Operation',
    helper: 'Reference entities used by operations, analytics, and AI governance.',
    color: '#10b981',
    items: [
      { label: 'Organization Master Data', focus: 'md:Organization', tab: 'data', sub: 'master-data' },
      { label: 'Customer Master Data', focus: 'md:Customer', tab: 'data', sub: 'master-data' },
      { label: 'Vendor Master Data', focus: 'md:Vendor', tab: 'data', sub: 'master-data' },
      { label: 'Employee Master Data', focus: 'md:Employee', tab: 'data', sub: 'master-data' },
      { label: 'Product Master Data', focus: 'md:Product', tab: 'data', sub: 'master-data' },
    ],
  },
  {
    group: 'Conditional Data Operation',
    helper: 'Rules, conditions, eligibility, thresholds, exceptions, and policy gates.',
    color: '#f59e0b',
    items: [
      { label: 'Condition / Rule Data', focus: 'condition:Rule Data', tab: 'data', sub: 'quality' },
      { label: 'Eligibility / Threshold Data', focus: 'condition:Eligibility Threshold', tab: 'data', sub: 'preparation' },
    ],
  },
  {
    group: 'Transaction Data Operation',
    helper: 'Event, request, case, claim, ticket, and interaction records produced by users or systems.',
    color: '#38bdf8',
    items: [
      { label: 'Manual Transaction Input', focus: 'transaction:Manual Input', tab: 'manual-transaction', sub: 'inputs' },
      { label: 'Automatic Transaction Pipeline', focus: 'transaction:Automatic Pipeline', tab: 'automatic-pipeline', sub: 'pipeline' },
      { label: 'Transaction Monitoring', focus: 'transaction:Monitoring', tab: 'automatic-pipeline', sub: 'monitoring' },
    ],
  },
  {
    group: 'Process Dependency Operation',
    helper: 'Clarifies whether this process can run alone or depends on upstream/downstream process handoffs.',
    color: '#a78bfa',
    items: [
      { label: 'Independent Process', focus: 'process:Independent Process', tab: 'problem-as-is', sub: 'current-state' },
      { label: 'Dependent Process', focus: 'process:Dependent Process', tab: 'to-be', sub: 'target-process' },
    ],
  },
];


const WORKSTREAM_DETAIL = {
  'ops:brownfield': {
    title: 'Operations Brownfield · Run / Support',
    owner: 'Operations Team',
    reviewer: 'Business Manager + Service Owner',
    items: [
      'Operations Incident Management', 'Problem Management', 'Contact Center Support',
      'SLA / KPI Monitoring', 'Customer / Agent Impact', 'Manual Workaround',
      'Root Cause', 'Resolution Plan', 'Closure / Lessons Learned',
    ],
  },
  'ops:greenfield-request': {
    title: 'Operations Greenfield · Business Request',
    owner: 'Operations Product Owner',
    reviewer: 'Business Sponsor + IT Intake',
    items: [
      'New Use Case Request', 'Enhancement Request', 'Problem / Pain', 'AS-IS Process',
      'TO-BE Outcome', 'ROI / Dollar Impact', 'Stakeholder Approval', 'Handover to IT Delivery',
    ],
  },
  'it:greenfield': {
    title: 'IT Greenfield · Build / Enhance',
    owner: 'IT Delivery Team',
    reviewer: 'Architecture + Security + AI Governance',
    items: [
      'Requirement', 'Architecture', 'API / Integration', 'Data Design', 'Model / AI Type',
      'Pipeline', 'Security / Access', 'Testing', 'Deployment', 'Monitoring', 'Handover to Operations',
    ],
  },
  'it:brownfield': {
    title: 'IT Brownfield · Technical Support',
    owner: 'IT Run Team',
    reviewer: 'SRE / Platform Owner',
    items: [
      'Application Incident', 'Integration / API Issue', 'Data Pipeline Issue', 'Model / AI Issue',
      'Performance / Load Issue', 'Access / Security Issue', 'Release / Patch', 'Verification Evidence',
    ],
  },
};


function MasterAiCatalogBlock() {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #991b1b' }}>
      <div style={{
        padding: '6px 18px 8px', color: '#fde68a',
        fontSize: FS_SMALL_LABEL, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>AI Types · Sub Menu Only</div>
      {/* §138 navigation contract · /ai-types is a top-level route outside
          /bank/* and would replace BankLayout. Open in new tab so the
          bank shell (Main Menu · Sub Menu · workspace) stays intact. */}
      <Link to="/ai-types"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '9px 18px',
              color: '#fef3c7', textDecoration: 'none',
              fontSize: FS_MID_ROW, fontWeight: 700,
            }}>
        <span>AI</span><span style={{ flex: 1 }}>All 200 AI Types</span>
        <span style={{ fontSize: 10, color: '#fcd34d', opacity: 0.8 }} aria-label="opens in new tab">↗</span>
      </Link>
      {[
        { domain: 'b2c', label: 'B2C · Consumer-facing AI' },
        { domain: 'b2b', label: 'B2B · Business partner AI' },
        { domain: 'b2e', label: 'B2E · Employee-facing AI' },
      ].map((d) => (
        <Link key={d.domain} to={`/ai-types?domain=${d.domain}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                minHeight: 38,
                padding: '8px 30px',
                color: '#fecaca', textDecoration: 'none',
                fontSize: FS_MID_ROW,
              }}>
          <span style={{
            width: 7, height: 7, borderRadius: 999,
            background: d.domain === 'b2c' ? '#22c55e' : d.domain === 'b2b' ? '#a855f7' : '#3b82f6',
          }} />
          <span style={{ flex: 1 }}>{d.label}</span>
          <span style={{ fontSize: 9, color: '#fda4af', opacity: 0.7 }} aria-label="opens in new tab">↗</span>
        </Link>
      ))}
    </div>
  );
}


function aiTypeLabel(ai) {
  return ai?.ai_type || ai?.name || String(ai || 'AI Type');
}

function classifyAiTypes(aiTypes) {
  const list = (aiTypes || []).map((ai, index) => ({ ai, label: aiTypeLabel(ai), index }));
  return [
    { segment: 'Primary AI Type', note: 'Main automation fit for this process', items: list.slice(0, 1), color: '#fef3c7' },
    { segment: 'Secondary AI Type', note: 'Supporting intelligence or guardrail', items: list.slice(1, 2), color: '#fee2e2' },
    { segment: 'Third / Support AI Type', note: 'Auxiliary, monitoring, or governance AI', items: list.slice(2), color: '#fecaca' },
  ];
}

function AiTypeSegmentBlock({ aiTypes, activeFocus, onClickItem }) {
  const segments = classifyAiTypes(aiTypes);
  return (
    <div style={{ borderBottom: '1px solid #991b1b' }}>
      <div style={{
        padding: '10px 16px 6px',
        color: '#fff',
        fontSize: FS_MID_ROW,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        AI Type Segmentation
      </div>
      {segments.map((segment) => (
        <div key={segment.segment} style={{ paddingBottom: 6 }}>
          <div style={{
            padding: '6px 18px 4px',
            color: segment.color,
            fontSize: FS_SMALL_LABEL,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {segment.segment}
          </div>
          <div style={{ padding: '0 18px 4px', color: '#fecaca', fontSize: FS_SMALL_LABEL, lineHeight: 1.35 }}>
            {segment.note}
          </div>
          {segment.items.length === 0 ? (
            <div style={{ padding: '5px 30px 7px', fontSize: FS_SMALL_LABEL, color: '#fecaca99', fontStyle: 'italic' }}>
              Not mapped for this process.
            </div>
          ) : segment.items.map(({ label }) => {
            const isActive = activeFocus === `ai:${label}`;
            return (
              <button
                key={`${segment.segment}-${label}`}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onClickItem('ai', label)}
                style={{
                  width: '100%', textAlign: 'left',
                  minHeight: 40,
                  padding: '9px 16px 9px 34px',
                  fontSize: FS_MID_ROW,
                  color: isActive ? '#fff' : '#fecaca',
                  background: isActive ? '#b91c1c' : 'transparent',
                  border: 'none', borderLeft: '3px solid #8b5cf6',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ display: 'block', fontSize: FS_SMALL_LABEL, color: isActive ? '#fff' : segment.color, fontWeight: 800 }}>
                  {segment.segment}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}


function OperationWorkspaceLinkBlock({ activeFocus, onOpenWorkspace }) {
  return (
    <div style={{ borderBottom: '1px solid #991b1b', padding: '10px 0' }}>
      <div style={{
        padding: '6px 18px 4px', color: '#fff',
        fontSize: FS_MID_ROW, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        Operations Data / Process Links
      </div>
      <div style={{ padding: '0 18px 8px', color: '#fecaca', fontSize: FS_SMALL_LABEL, lineHeight: 1.35 }}>
        Sub Menu links open workspace tabs. Main Menu selects department, B2C/B2B/B2E, and main process only.
      </div>
      {OPERATION_WORKSPACE_LINKS.map((group) => (
        <div key={group.group} style={{ paddingBottom: 8 }}>
          <div style={{
            padding: '7px 18px 3px', color: '#fde68a',
            fontSize: FS_SMALL_LABEL, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {group.group}
          </div>
          <div style={{ padding: '0 18px 4px', color: '#fecaca', fontSize: FS_SMALL_LABEL, lineHeight: 1.3 }}>
            {group.helper}
          </div>
          {group.items.map((item) => {
            const active = activeFocus === item.focus;
            return (
              <button
                key={item.focus}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onOpenWorkspace(item)}
                style={{
                  width: '100%', textAlign: 'left',
                  minHeight: 40,
                  padding: '9px 16px 9px 34px',
                  color: active ? '#fff' : '#fecaca',
                  background: active ? '#b91c1c' : 'transparent',
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  borderLeft: `3px solid ${group.color}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: FS_MID_ROW, fontWeight: active ? 700 : 500,
                }}
              >
                <span style={{ display: 'block' }}>{item.label}</span>
                <span style={{ display: 'block', marginTop: 2, color: active ? '#fee2e2' : '#fecaca99', fontSize: FS_SMALL_LABEL }}>
                  Opens {item.tab} / {item.sub}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}


function WorkstreamSupportBlock({ lane, field }) {
  const detail = WORKSTREAM_DETAIL[`${lane}:${field}`] || WORKSTREAM_DETAIL['ops:brownfield'];
  return (
    <div style={{ borderBottom: '1px solid #991b1b', padding: '10px 0' }}>
      <div style={{
        padding: '6px 18px 8px', color: '#fff',
        fontSize: FS_MID_ROW, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {detail.title}
      </div>
      <div style={{ padding: '0 18px 8px', color: '#fecaca', fontSize: FS_SMALL_LABEL, lineHeight: 1.4 }}>
        Owner: <strong>{detail.owner}</strong> · Review: <strong>{detail.reviewer}</strong>
      </div>
      {detail.items.map((item, index) => (
        <div key={item} style={{
          display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: 6,
          padding: '6px 18px 6px 28px', color: '#fecaca', fontSize: FS_MID_ROW,
          borderTop: index === 0 ? '1px solid #991b1b' : 'none',
        }}>
          <span style={{ color: '#fca5a5', fontWeight: 800 }}>{index + 1}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryBlock({ icon, title, items, color, emptyLabel, kind, activeFocus, onClickItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid #991b1b' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left',
          minHeight: 42,
          padding: '10px 16px', background: 'transparent', border: 'none',
          color: '#fff', fontSize: FS_MID_ROW, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ width: 10, color: '#fca5a5' }}>{open ? '▾' : '▸'}</span>
        <span>{icon} {title}</span>
        <span style={{ marginLeft: 'auto', fontSize: FS_SMALL_LABEL, color: '#fecaca99' }}>
          {items.length}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 8 }}>
          {items.length === 0 ? (
            <div style={{ padding: '8px 28px', fontSize: FS_SMALL_LABEL, color: '#fecaca', fontStyle: 'italic' }}>
              {emptyLabel || 'Operator-pending'}
            </div>
          ) : items.map((label, i) => {
            const isActive = activeFocus === `${kind}:${label}`;
            return (
              <button
                key={`${label}-${i}`}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onClickItem(kind, label)}
                style={{
                  width: '100%', textAlign: 'left',
                  minHeight: 40,
                  padding: '9px 16px 9px 34px',
                  fontSize: FS_MID_ROW,
                  color: isActive ? '#fff' : '#fecaca',
                  background: isActive ? '#b91c1c' : 'transparent',
                  borderLeft: `3px solid ${color}`,
                  border: 'none', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: color,
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#991b1b'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BankSubMenu({ bp }) {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFocus = searchParams.get('focus') || '';
  const activeLane = searchParams.get('lane') || 'ops';
  const activeField = searchParams.get('field') || 'brownfield';
  const activeDomain = canonicalDomainId(params.domain);
  const meta = domainMeta(activeDomain);

  const dept = (bp.department_catalog || []).find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return (
      <aside style={{
        background: '#7f1d1d', color: '#fecaca',
        borderRight: '1px solid #991b1b',
        padding: 16,
      }}>
        <div style={{
          color: '#fff',
          fontSize: FS_SECTION_HEADER,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
        }}>
          SUB MENU
        </div>
        <div style={{ fontSize: FS_MID_ROW, fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>
          Pick a dept + B2C/B2B/B2E + Main Process from the Main Menu.
        </div>
        <WorkstreamSupportBlock lane={activeLane} field={activeField} />
        <MasterAiCatalogBlock />
      </aside>
    );
  }

  const proc = (dept.processes || []).find((p) => slugOf(p.name) === params.processId);

  const subProcesses = proc?.sub_processes?.map((s) => s.name || String(s)) || [];
  const agents = proc?.agents?.map((a) => a.name || String(a)) || [];
  const apps = proc?.applications?.map((a) => a.name || String(a)) || [];
  const masterData = proc?.master_data?.map((m) => m.name || String(m)) || [];

  const openWorkspace = ({ focus, tab, sub }) => {
    const next = new URLSearchParams(searchParams);
    if (focus) next.set('focus', focus);
    else next.delete('focus');
    if (tab) next.set('tab', tab);
    if (sub) next.set('sub', sub);
    else next.delete('sub');
    setSearchParams(next, { replace: false });
    window.dispatchEvent(new CustomEvent('insur:workspace-jump', {
      detail: { tab, sub, focus },
    }));
  };

  const handleClickItem = (kind, label) => {
    const focus = `${kind}:${label}`;
    const target = KIND_TO_WORKSPACE[kind] || { tab: KIND_TO_TAB[kind] };
    openWorkspace({ focus, tab: target.tab, sub: target.sub });
  };

  return (
    <aside style={{
      background: '#7f1d1d', color: '#fecaca',
      borderRight: '1px solid #991b1b',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '2px solid #991b1b',
        background: '#991b1b',
      }}>
        <div style={{
          fontSize: FS_SMALL_LABEL,
          color: '#fecaca',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 800,
          marginBottom: 4,
        }}>
          SUB MENU
        </div>
        <strong style={{
          fontSize: FS_SECTION_HEADER, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {proc ? proc.name : `Pick a process ->`}
        </strong>
        <div style={{ fontSize: FS_SMALL_LABEL, color: '#fecaca', marginTop: 2 }}>
          #{dept.id} · {dept.name}{meta ? ` · ${meta.label}` : ''}
        </div>
        {activeFocus && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: '#b91c1c', borderRadius: 4,
            fontSize: FS_SMALL_LABEL, color: '#fff', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ flex: 1 }}>{activeFocus.split(':')[1]}</span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('focus');
                setSearchParams(next, { replace: false });
              }}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                cursor: 'pointer', fontSize: FS_MID_ROW, fontWeight: 700,
                minWidth: 28, minHeight: 28, padding: 0,
              }}
              title="Clear focus"
            >x</button>
          </div>
        )}
      </div>

      <WorkstreamSupportBlock lane={activeLane} field={activeField} />
      <MasterAiCatalogBlock />

      {proc && (
        <OperationWorkspaceLinkBlock
          activeFocus={activeFocus}
          onOpenWorkspace={openWorkspace}
        />
      )}

      {proc ? (
        <>
          <CategoryBlock icon="[]" title="Sub Processes" items={subProcesses}
            color="#3b82f6"
            kind="sub" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="No real sub-processes in blueprint for this process." />
          <AiTypeSegmentBlock aiTypes={proc?.ai || []}
            activeFocus={activeFocus} onClickItem={handleClickItem} />
          <CategoryBlock icon="AG" title="Agents" items={agents}
            color="#ec4899"
            kind="agent" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="Operator-pending process agents." />
          <CategoryBlock icon="AP" title="Applications" items={apps}
            color="#0ea5e9"
            kind="app" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="Operator-pending process applications." />
          <CategoryBlock icon="MD" title="Master Data" items={masterData}
            color="#10b981"
            kind="md" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="Operator-pending process master data." />
        </>
      ) : (
        <div style={{ padding: 18, fontSize: FS_MID_ROW, color: '#fecaca', fontStyle: 'italic' }}>
          Expand a department, pick a domain, and click a Main Process.
          The maroon menu will populate from process-specific blueprint fields only.
        </div>
      )}
    </aside>
  );
}
