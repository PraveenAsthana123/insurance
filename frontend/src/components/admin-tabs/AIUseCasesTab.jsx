import { useMemo, useState } from 'react';
import { getUseCasesForDept, USE_CASE_CATEGORIES } from '../../data/aiUseCases';
import { ROLE_LABELS, ROLE_ICONS } from '../../data/roles';

const ROLE_SHORT = {
  manager: 'Mgr',
  'team-member': 'TM',
  compliance: 'Compl',
  'reporting-monitoring': 'R&M',
  tester: 'Test',
};

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb' },
  'team-member': { bg: 'rgba(16,185,129,0.1)', fg: '#059669' },
  compliance: { bg: 'rgba(139,92,246,0.1)', fg: '#7c3aed' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.1)', fg: '#c2410c' },
  tester: { bg: 'rgba(202,138,4,0.1)', fg: '#a16207' },
};

// Category family palettes — 5 distinct palettes grouped semantically.
// Multiple categories share a palette (task spec: "at least 4 distinct palettes").
const CATEGORY_FAMILY = {
  // Automation family — teal
  RPA: 'automation',
  n8n: 'automation',
  // ML family — blue
  ML: 'ml',
  NLP: 'ml',
  'Anomaly Detection': 'ml',
  Recommendation: 'ml',
  'Fraud Detection': 'ml',
  // Agent / conversational family — purple
  'AI Agent': 'agent',
  'Voice AI': 'agent',
  // Marketing family — amber
  Campaign: 'marketing',
  'Email Marketing': 'marketing',
  'Digital Marketing': 'marketing',
  'Generative Marketing': 'marketing',
  'SEO Content': 'marketing',
  'Funnel Optimization': 'marketing',
  // Ops / CRM family — slate
  CRM: 'ops',
  'Vendor Mgmt': 'ops',
  'Contact Center Mgmt': 'ops',
};

const CATEGORY_FAMILY_COLORS = {
  automation: { bg: 'rgba(20,184,166,0.1)', fg: '#0d9488' },
  ml: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb' },
  agent: { bg: 'rgba(139,92,246,0.1)', fg: '#7c3aed' },
  marketing: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309' },
  ops: { bg: 'rgba(100,116,139,0.12)', fg: '#475569' },
};

function categoryColors(cat) {
  return CATEGORY_FAMILY_COLORS[CATEGORY_FAMILY[cat]] || CATEGORY_FAMILY_COLORS.ops;
}

const STATUS_COLORS = {
  live: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  pilot: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309' },
  planned: { bg: 'rgba(100,116,139,0.12)', fg: '#475569' },
};

function truncate(text, max = 80) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export default function AIUseCasesTab({ dept }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const deptId = dept?.id || '';
  const all = useMemo(() => getUseCasesForDept(deptId), [deptId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((u) => {
      if (categoryFilter !== 'all' && u.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.description.toLowerCase().includes(q) ||
        (u.model || '').toLowerCase().includes(q) ||
        (u.trigger || '').toLowerCase().includes(q) ||
        (u.businessImpact || '').toLowerCase().includes(q)
      );
    });
  }, [all, categoryFilter, search]);

  if (all.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-secondary, #64748b)',
          fontSize: '14px',
        }}
      >
        No AI use cases catalogued for {dept?.name || 'this department'} yet.
      </div>
    );
  }

  const activeCategories = new Set(all.map((u) => u.category));
  const filterPills = [
    { id: 'all', label: 'All' },
    ...USE_CASE_CATEGORIES.filter((c) => activeCategories.has(c)).map((c) => ({
      id: c,
      label: c,
    })),
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          role="group"
          aria-label="Filter by category"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        >
          {filterPills.map((p) => {
            const isActive = categoryFilter === p.id;
            const colors = p.id !== 'all' ? categoryColors(p.id) : null;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(p.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: '999px',
                  border: isActive
                    ? `1px solid ${colors ? colors.fg : '#1e3a5f'}`
                    : '1px solid var(--border-subtle, #e2e8f0)',
                  background: isActive
                    ? colors
                      ? colors.bg
                      : 'rgba(30,58,95,0.1)'
                    : '#fff',
                  color: isActive
                    ? colors
                      ? colors.fg
                      : '#1e3a5f'
                    : 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              fontWeight: 500,
            }}
          >
            Search use cases
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, model, trigger, impact..."
            aria-label="Search AI use cases"
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              minWidth: '240px',
              background: '#fff',
              color: 'var(--text-primary, #0f172a)',
              outline: 'none',
            }}
          />
        </label>
      </div>

      {/* Stats line */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, #64748b)',
          marginBottom: '10px',
        }}
      >
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{all.length}</strong> use cases
        {' · '}
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{filtered.length}</strong> shown
        {' · '}
        <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
          {activeCategories.size}
        </strong>{' '}
        categories active
      </div>

      {/* Table */}
      <div
        style={{
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  width: '40px',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                #
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  width: '160px',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Category
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Description
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Inputs
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Model
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  width: '80px',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Owner
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Impact
              </th>
              <th
                style={{
                  padding: '10px',
                  textAlign: 'left',
                  width: '80px',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #64748b)',
                    fontStyle: 'italic',
                  }}
                >
                  No AI use cases match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => {
                const catColors = categoryColors(u.category);
                const ownerColors =
                  ROLE_COLORS[u.owner] || { bg: '#f1f5f9', fg: '#64748b' };
                const statusColors =
                  STATUS_COLORS[u.status] || { bg: '#f1f5f9', fg: '#64748b' };
                const inputsJoined = Array.isArray(u.inputs) ? u.inputs.join(', ') : '';
                return (
                  <tr
                    key={u.id}
                    style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}
                  >
                    <td style={{ padding: '10px', color: 'var(--text-secondary, #64748b)' }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: catColors.bg,
                          color: catColors.fg,
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.category}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        fontWeight: 600,
                        color: 'var(--text-primary, #0f172a)',
                      }}
                    >
                      {u.name}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-primary, #0f172a)' }}>
                      {u.description}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        color: 'var(--text-secondary, #64748b)',
                        fontSize: '12px',
                      }}
                      title={inputsJoined}
                    >
                      {truncate(inputsJoined, 60)}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #64748b)',
                      }}
                    >
                      {u.model}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        aria-label={ROLE_LABELS[u.owner] || u.owner}
                        title={ROLE_LABELS[u.owner] || u.owner}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: ownerColors.bg,
                          color: ownerColors.fg,
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span aria-hidden="true">{ROLE_ICONS[u.owner] || ''}</span>
                        {ROLE_SHORT[u.owner] || u.owner}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #64748b)',
                      }}
                    >
                      {u.businessImpact}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: statusColors.bg,
                          color: statusColors.fg,
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
