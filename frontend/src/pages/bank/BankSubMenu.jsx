// Maroon process menu. Lists only metadata that exists on the selected process.

import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { canonicalDomainId, domainMeta, slugOf } from '../../utils/insuranceNavigation';

const FS_SECTION_HEADER = 12;
const FS_MID_ROW = 11;
const FS_SMALL_LABEL = 10;

const KIND_TO_TAB = {
  sub: 'process',
  ai: 'ai',
  agent: 'ai',
  app: 'operations',
  md: 'data',
};

function CategoryBlock({ icon, title, items, color, emptyLabel, kind, activeFocus, onClickItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid #991b1b' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '8px 14px', background: 'transparent', border: 'none',
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
        <div style={{ paddingBottom: 6 }}>
          {items.length === 0 ? (
            <div style={{ padding: '4px 24px', fontSize: FS_SMALL_LABEL, color: '#fecaca', fontStyle: 'italic' }}>
              {emptyLabel || 'Operator-pending'}
            </div>
          ) : items.map((label, i) => {
            const isActive = activeFocus === `${kind}:${label}`;
            return (
              <button
                key={`${label}-${i}`}
                type="button"
                onClick={() => onClickItem(kind, label)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '3px 14px 3px 30px',
                  fontSize: FS_MID_ROW,
                  color: isActive ? '#fff' : '#fecaca',
                  background: isActive ? '#b91c1c' : 'transparent',
                  borderLeft: `3px solid ${color}`,
                  border: 'none', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: color,
                  cursor: 'pointer', font: 'inherit',
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
  const activeDomain = canonicalDomainId(params.domain);
  const meta = domainMeta(activeDomain);

  const dept = (bp.department_catalog || []).find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return (
      <aside style={{
        background: '#7f1d1d', color: '#fecaca',
        borderRight: '1px solid #991b1b',
        padding: 16, fontSize: FS_MID_ROW, fontStyle: 'italic',
      }}>
        Pick a dept + B2C/B2B/B2E + Main Process from the dark blue menu.
      </aside>
    );
  }

  const proc = (dept.processes || []).find((p) => slugOf(p.name) === params.processId);

  const subProcesses = proc?.sub_processes?.map((s) => s.name || String(s)) || [];
  const aiTypes = proc?.ai?.map((a) => a.ai_type).filter(Boolean) || [];
  const agents = proc?.agents?.map((a) => a.name || String(a)) || [];
  const apps = proc?.applications?.map((a) => a.name || String(a)) || [];
  const masterData = proc?.master_data?.map((m) => m.name || String(m)) || [];

  const handleClickItem = (kind, label) => {
    const next = new URLSearchParams(searchParams);
    const focusVal = `${kind}:${label}`;
    if (activeFocus === focusVal) {
      next.delete('focus');
    } else {
      next.set('focus', focusVal);
      const targetTab = KIND_TO_TAB[kind];
      if (targetTab) next.set('tab', targetTab);
    }
    setSearchParams(next, { replace: false });
  };

  return (
    <aside style={{
      background: '#7f1d1d', color: '#fecaca',
      borderRight: '1px solid #991b1b',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '2px solid #991b1b',
        background: '#991b1b',
      }}>
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
            marginTop: 6, padding: '4px 8px',
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
                padding: 0,
              }}
              title="Clear focus"
            >x</button>
          </div>
        )}
      </div>

      {proc ? (
        <>
          <CategoryBlock icon="[]" title="Sub Processes" items={subProcesses}
            color="#3b82f6"
            kind="sub" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="No real sub-processes in blueprint for this process." />
          <CategoryBlock icon="AI" title="AI Capabilities" items={aiTypes}
            color="#8b5cf6"
            kind="ai" activeFocus={activeFocus} onClickItem={handleClickItem}
            emptyLabel="No AI capabilities on this process yet." />
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
        <div style={{ padding: 14, fontSize: FS_MID_ROW, color: '#fecaca', fontStyle: 'italic' }}>
          Expand a department, pick a domain, and click a Main Process.
          The maroon menu will populate from process-specific blueprint fields only.
        </div>
      )}
    </aside>
  );
}
