import { useMemo, useState } from 'react';
import { ROLE_IDS, ROLE_LABELS, ROLE_ICONS, getRolesForDept } from '../../data/roles';
import { seededRng, pick } from '../../utils/seed';

const ROLE_COLORS = {
  manager: { bg: 'rgba(59,130,246,0.1)', fg: '#2563eb' },
  'team-member': { bg: 'rgba(16,185,129,0.1)', fg: '#059669' },
  compliance: { bg: 'rgba(139,92,246,0.1)', fg: '#7c3aed' },
  'reporting-monitoring': { bg: 'rgba(234,88,12,0.1)', fg: '#c2410c' },
  tester: { bg: 'rgba(202,138,4,0.1)', fg: '#a16207' },
};

const FIRST_NAMES = [
  'Priya', 'Arjun', 'Mei', 'David', 'Sofia', 'Omar', 'Elena', 'Hiroshi',
  'Fatima', 'Marcus', 'Chen', 'Amara', 'Jin', 'Noor', 'Luca', 'Yara',
  'Kiran', 'Dara', 'Naveen', 'Samira',
];
const LAST_NAMES = [
  'Patel', 'Kumar', 'Chen', 'Okafor', 'Silva', 'Hassan', 'Park', 'Rossi',
  'Nguyen', 'Kim', 'Garcia', 'Ito', 'Novak', 'Khan', 'Singh', 'Mendez',
];

function mockUsers(deptId) {
  const rng = seededRng(`users-${deptId}`);
  const roles = getRolesForDept(deptId);
  const rows = [];
  ROLE_IDS.forEach((role) => {
    const title = (roles[role] && roles[role].title) || ROLE_LABELS[role];
    for (let i = 0; i < 5; i += 1) {
      const first = pick(rng, FIRST_NAMES);
      const last = pick(rng, LAST_NAMES);
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}@corp.example`;
      const activeDays = Math.floor(rng() * 400) + 20;
      const status = rng() > 0.1 ? 'active' : 'suspended';
      rows.push({
        id: `${deptId}-${role}-${i}`,
        name,
        email,
        role,
        title,
        activeDays,
        status,
      });
    }
  });
  return rows;
}

export default function UsersRolesTab({ dept }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const deptId = dept?.id || '';
  const users = useMemo(() => mockUsers(deptId), [deptId]);

  const filtered = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);
  const counts = ROLE_IDS.reduce(
    (acc, r) => ({ ...acc, [r]: users.filter((u) => u.role === r).length }),
    {}
  );

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          aria-pressed={roleFilter === 'all'}
          style={{
            padding: '6px 12px', fontSize: 13, borderRadius: 999,
            border: '1px solid #e2e8f0', cursor: 'pointer',
            background: roleFilter === 'all' ? 'rgba(30,58,95,0.1)' : '#fff',
            color: roleFilter === 'all' ? '#1e3a5f' : '#64748b',
            fontWeight: roleFilter === 'all' ? 600 : 500,
          }}
        >
          All ({users.length})
        </button>
        {ROLE_IDS.map((r) => {
          const c = ROLE_COLORS[r];
          const active = roleFilter === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              aria-pressed={active}
              style={{
                padding: '6px 12px', fontSize: 13, borderRadius: 999,
                border: active ? `1px solid ${c.fg}` : '1px solid #e2e8f0',
                background: active ? c.bg : '#fff',
                color: active ? c.fg : '#64748b',
                cursor: 'pointer', fontWeight: active ? 600 : 500,
              }}
            >
              {ROLE_ICONS[r]} {ROLE_LABELS[r]} ({counts[r]})
            </button>
          );
        })}
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Name</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Email</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Role</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Title</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Active days</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const c = ROLE_COLORS[u.role];
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{u.name}</td>
                  <td style={{ padding: 10, color: '#64748b', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                    {u.email}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                      background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600,
                    }}>
                      {ROLE_ICONS[u.role]} {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: '#0f172a' }}>{u.title}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>{u.activeDays}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: u.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: u.status === 'active' ? '#059669' : '#dc2626',
                    }}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
        Demo users synthesized per department. Not real accounts.
      </div>
    </div>
  );
}
