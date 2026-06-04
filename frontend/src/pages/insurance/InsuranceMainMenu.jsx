import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DOMAINS = ['B2C', 'B2B', 'B2E'];

export function InsuranceMainMenu({ bp }) {
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState('');

  const [expanded, setExpanded] = useState(() =>
    params.deptId ? { [params.deptId]: true } : {}
  );
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const depts = (bp.department_catalog || []).slice().sort((a, b) => a.id - b.id);
  const q = filter.trim().toLowerCase();
  const filteredDepts = q
    ? depts.filter((d) => d.name.toLowerCase().includes(q) || `dept ${d.id}`.includes(q))
    : depts;

  const isAgenticActive = typeof window !== 'undefined' && window.location.pathname.includes('/reference/agentic');

  return (
    <nav className="insurance-main-menu" aria-label="Main menu: Department + Business Domain">
      <div className="insurance-main-menu-header">Main menu · Department + Domain</div>
      <span
        className={`insurance-dept-row ${isAgenticActive ? 'active' : ''}`}
        onClick={() => navigate('/insurance/reference/agentic')}
        title="Agentic AI reference architecture (operator-provided)"
        style={{ marginBottom: 8, borderLeft: '3px solid var(--accent-purple)' }}
      >
        🧠 <strong>Reference</strong> · Agentic AI
      </span>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter depts…"
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
        aria-label="Filter departments"
      />

      {filteredDepts.map((d) => {
        const isOpen = expanded[d.id] || params.deptId === String(d.id) || q;
        const isActiveDept = params.deptId === String(d.id) && !params.domain;
        const isPartial = !!d.partial;
        return (
          <div key={d.id}>
            <span
              className={`insurance-dept-row ${isActiveDept ? 'active' : ''}`}
              onClick={() => {
                toggle(d.id);
                navigate(`/insurance/${d.id}`);
              }}
              title={d.name}
            >
              <span style={{ marginRight: 4 }}>{isOpen ? '▾' : '▸'}</span>
              <strong>#{d.id}</strong>{' '}
              <span style={{ fontSize: '0.92em' }}>
                {d.name.slice(0, 28)}{d.name.length > 28 ? '…' : ''}
              </span>
              {isPartial && (
                <span style={{
                  marginLeft: 4, fontSize: '10px',
                  padding: '0 4px', borderRadius: 2,
                  background: 'var(--accent-warning)', color: '#fff',
                  fontWeight: 700,
                }}>P</span>
              )}
            </span>
            {isOpen && DOMAINS.map((dom) => {
              const isActive = params.deptId === String(d.id) && params.domain === dom;
              const hasDomain = d.channel_scenarios && d.channel_scenarios[dom];
              return (
                <span
                  key={dom}
                  className={`insurance-domain-row ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(`/insurance/${d.id}/${dom}`)}
                  style={!hasDomain ? { opacity: 0.5 } : {}}
                  title={hasDomain ? hasDomain.label : `${dom} (no operator content yet)`}
                >
                  ↳ {dom}{!hasDomain && ' ·'}
                </span>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
