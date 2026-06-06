import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
          </div>
        );
      })}
    </nav>
  );
}
