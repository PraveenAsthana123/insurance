import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function processIdOf(p) {
  return (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function InsuranceSubMenu({ bp }) {
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(() =>
    params.processId ? { [params.processId]: true } : {}
  );
  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const dept = (bp.department_catalog || []).find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return (
      <nav className="insurance-sub-menu" aria-label="Sub menu: Process + Sub-process + AI">
        <div className="insurance-main-menu-header">Sub menu · Process + AI</div>
        <div style={{ padding: 'var(--spacing-sm)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
          Select a dept on the left to see its processes.
        </div>
      </nav>
    );
  }

  const domain = params.domain || 'B2C';
  const q = filter.trim().toLowerCase();
  const processes = (dept.processes || []).filter((p) =>
    !q || p.name.toLowerCase().includes(q) || (p.ai || []).some((a) => (a.ai_type || '').toLowerCase().includes(q))
  );

  return (
    <nav className="insurance-sub-menu" aria-label="Sub menu: Process + Sub-process + AI">
      <div className="insurance-main-menu-header">
        Sub menu · dept {dept.id} {domain ? `· ${domain}` : ''}
      </div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter processes / AI…"
        style={{
          width: '100%', marginBottom: 'var(--spacing-xs)',
          padding: '4px 8px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-xs)',
          font: 'inherit',
        }}
        aria-label="Filter processes or AI"
      />

      {processes.length === 0 && (
        <div style={{ padding: 'var(--spacing-sm)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
          No processes match.
        </div>
      )}

      {processes.map((p, i) => {
        const pid = processIdOf(p) || `p${i}`;
        const procOpen = expanded[pid] || params.processId === pid || q;
        const isActiveProc = params.processId === pid && !params.subProcessId && !params.aiType;
        const subProcs = p.sub_processes || [];
        const ais = p.ai || [];
        const hasChildren = ais.length > 0 || subProcs.length > 0;
        return (
          <div key={pid}>
            <span
              className={`insurance-process-row ${isActiveProc ? 'active' : ''}`}
              onClick={() => {
                if (hasChildren) toggle(pid);
                navigate(`/insurance/${dept.id}/${domain}/${pid}`);
              }}
              style={{ paddingLeft: 8 }}
              title={p.name}
            >
              {hasChildren && <span style={{ marginRight: 4 }}>{procOpen ? '▾' : '▸'}</span>}
              {p.name}
              {ais.length > 0 && (
                <span style={{ marginLeft: 4, fontSize: '10px', color: isActiveProc ? '#fff' : 'var(--text-muted)' }}>
                  ({ais.length} AI)
                </span>
              )}
            </span>

            {procOpen && ais.map((ai, k) => {
              const aiType = ai.ai_type;
              const aiActive = params.aiType && decodeURIComponent(params.aiType) === aiType && params.processId === pid;
              const matches = !q || aiType.toLowerCase().includes(q);
              if (!matches && q) return null;
              return (
                <span
                  key={`${aiType}-${k}`}
                  className={`insurance-ai-row ${aiActive ? 'active' : ''}`}
                  onClick={() => navigate(`/insurance/${dept.id}/${domain}/${pid}/ai/${encodeURIComponent(aiType)}?sub=data`)}
                  title={`${aiType} — ${ai.scenario || ''}`}
                  style={{ paddingLeft: 24 }}
                >
                  ⤷ {aiType}
                </span>
              );
            })}

            {procOpen && subProcs.map((sp, j) => {
              const spid = (sp.name || `sub${j}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const spActive = params.subProcessId === spid;
              return (
                <span
                  key={spid}
                  className={`insurance-subprocess-row ${spActive ? 'active' : ''}`}
                  onClick={() => navigate(`/insurance/${dept.id}/${domain}/${pid}/${spid}`)}
                  style={{ paddingLeft: 24 }}
                  title={sp.name}
                >
                  ↳ {sp.name}
                </span>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
