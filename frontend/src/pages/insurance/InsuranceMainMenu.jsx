import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Per §73 two-menu layout: main menu = Dept → Business Domain (B2C/B2B/B2E).
// Three canonical domains rendered as children of the active dept.
const DOMAINS = [
  { id: 'b2c', label: 'B2C', title: 'Business-to-Consumer' },
  { id: 'b2b', label: 'B2B', title: 'Business-to-Business' },
  { id: 'b2e', label: 'B2E', title: 'Business-to-Employee' },
];

export function InsuranceMainMenu({ bp }) {
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState('');

  const depts = (bp.department_catalog || []).slice().sort((a, b) => a.id - b.id);
  const q = filter.trim().toLowerCase();
  const filteredDepts = q
    ? depts.filter((d) => d.name.toLowerCase().includes(q) || `dept ${d.id}`.includes(q))
    : depts;

  return (
    <nav className="insurance-main-menu" aria-label="Main menu: Department + Business Domain">
      <div className="insurance-main-menu-header">Departments</div>
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
        const isActiveDept = params.deptId === String(d.id);
        const isPartial = !!d.partial;
        return (
          <div key={d.id}>
            <span
              className={`insurance-dept-row ${isActiveDept ? 'active' : ''}`}
              onClick={() => navigate(`/insurance/${d.id}`)}
              role="button"
              title={d.name}
            >
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

            {/* Per §73: B2C / B2B / B2E rendered as level-2 under the active dept. */}
            {isActiveDept && (
              <div
                role="group"
                aria-label="Business Domain"
                style={{
                  marginLeft: 12, marginTop: 2, marginBottom: 4,
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                {DOMAINS.map((dom) => {
                  const isActiveDomain = params.domain === dom.id;
                  return (
                    <span
                      key={dom.id}
                      className={`insurance-domain-row ${isActiveDomain ? 'active' : ''}`}
                      onClick={() => navigate(`/insurance/${d.id}/${dom.id}`)}
                      role="button"
                      title={dom.title}
                      style={{
                        cursor: 'pointer',
                        padding: '3px 8px',
                        fontSize: '0.85em',
                        borderRadius: 'var(--border-radius-sm)',
                        background: isActiveDomain ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                        color: isActiveDomain ? '#fff' : 'var(--text-secondary)',
                        borderLeft: '2px solid var(--border-color)',
                      }}
                    >
                      {dom.label}
                      <span style={{ marginLeft: 6, fontSize: '0.85em', opacity: 0.7 }}>
                        {dom.title}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
