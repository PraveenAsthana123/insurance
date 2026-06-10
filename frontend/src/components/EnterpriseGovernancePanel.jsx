// EnterpriseGovernancePanel.jsx · Iter 39 · 8 enterprise governance tables.
// Tabs: Value Streams · Departments · Teams · Roles · RACI · Stakeholders · Policies · Standards · Org Tree

import { useState, useEffect, useCallback } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

const TABS = [
  { key: 'value-streams', label: 'Value Streams', endpoint: '/value-streams', root: 'value_streams' },
  { key: 'departments', label: 'Departments', endpoint: '/departments', root: 'departments' },
  { key: 'teams', label: 'Teams', endpoint: '/teams', root: 'teams' },
  { key: 'roles', label: 'Roles', endpoint: '/roles', root: 'roles' },
  { key: 'raci', label: 'RACI', endpoint: '/raci', root: 'raci' },
  { key: 'stakeholders', label: 'Stakeholders', endpoint: '/stakeholders', root: 'stakeholders' },
  { key: 'policies', label: 'AI Policies', endpoint: '/policies', root: 'policies' },
  { key: 'standards', label: 'AI Standards', endpoint: '/standards', root: 'standards' },
  { key: 'org-tree', label: 'Org Tree', endpoint: '/org-tree', root: null },
];

function Pill({ children, color = '#94a3b8' }) {
  return (
    <span style={{
      padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 3,
      background: `${color}22`, color, border: `1px solid ${color}55`, display: 'inline-block',
    }}>{children}</span>
  );
}

function Section({ title, children, accent = '#3b82f6' }) {
  return (
    <div style={{
      marginTop: 10, padding: 12, background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 6,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: accent, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function EnterpriseGovernancePanel() {
  const [activeTab, setActiveTab] = useState('value-streams');
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  const refresh = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const tab = TABS.find(t => t.key === activeTab);
      const r = await fetch(`${API}/api/v1/governance${tab.endpoint}`);
      const d = await r.json();
      setData(prev => ({ ...prev, [tab.key]: d }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [activeTab]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    fetch(`${API}/api/v1/governance/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  const tab = TABS.find(t => t.key === activeTab);
  const tabData = data[activeTab];
  const rows = tabData?.[tab.root] || [];

  function renderTable() {
    if (!rows.length) {
      return (
        <em style={{ fontSize: 11 }}>
          No {tab.label.toLowerCase()} yet · POST <code>{API}/api/v1/governance{tab.endpoint}</code>
        </em>
      );
    }
    const cols = Object.keys(rows[0]).filter(c =>
      !['created_at', 'tenant_id'].includes(c) && rows[0][c] !== null && rows[0][c] !== ''
    ).slice(0, 8);
    return (
      <table style={{ fontSize: 10, width: '100%' }}>
        <thead style={{ color: '#64748b' }}>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ textAlign: 'left', padding: 4 }}>
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
              {cols.map(c => (
                <td key={c} style={{ padding: 4 }}>
                  {typeof r[c] === 'boolean'
                    ? (r[c] ? '✓' : '—')
                    : typeof r[c] === 'object'
                      ? JSON.stringify(r[c])?.slice(0, 30)
                      : String(r[c] ?? '—').slice(0, 60)
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderOrgTree() {
    if (!tabData) return <em>Loading…</em>;
    return (
      <div style={{ fontSize: 11, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 8, fontSize: 10, color: '#64748b' }}>
          {tabData.n_value_streams} value streams · {tabData.n_departments} departments ·
          {' '}{tabData.n_teams} teams · {tabData.n_roles} roles
        </div>
        {(tabData.value_streams || []).map(vs => (
          <details key={vs.value_stream_id} open style={{ marginBottom: 6 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#3b82f6' }}>
              📊 {vs.value_stream_name}
              {' '}<Pill color="#3b82f6">{vs.status}</Pill>
            </summary>
            {(vs.departments || []).map(d => (
              <div key={d.department_id} style={{ marginLeft: 20 }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#8b5cf6' }}>
                    🏢 {d.department_name}
                    {' '}<Pill color="#8b5cf6">{d.maturity_level}</Pill>
                  </summary>
                  {(d.teams || []).map(t => (
                    <div key={t.team_id} style={{ marginLeft: 20 }}>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#10b981' }}>
                          👥 {t.team_name}
                          {' '}<Pill color="#10b981">{t.support_level}</Pill>
                          {t.on_call_enabled && <Pill color="#f97316">on-call</Pill>}
                        </summary>
                        {(t.roles || []).map(r => (
                          <div key={r.role_id} style={{ marginLeft: 20, color: '#475569' }}>
                            👤 {r.role_name} ({r.seniority_level || '—'})
                            {r.approval_authority && <Pill color="#ef4444">approver</Pill>}
                            {r.production_access && <Pill color="#f59e0b">prod</Pill>}
                          </div>
                        ))}
                      </details>
                    </div>
                  ))}
                </details>
              </div>
            ))}
          </details>
        ))}
        {(tabData.orphan_departments || []).length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ color: '#94a3b8' }}>
              ⚠ Orphan departments (no value stream): {tabData.orphan_departments.length}
            </summary>
            {tabData.orphan_departments.map(d => (
              <div key={d.department_id} style={{ marginLeft: 16, color: '#64748b' }}>🏢 {d.department_name}</div>
            ))}
          </details>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{
        padding: 12, background: '#fff', borderRadius: 6,
        border: '1px solid #e2e8f0', marginBottom: 12,
      }}>
        <strong style={{ fontSize: 14 }}>Enterprise Governance</strong>
        <span style={{ marginLeft: 12, fontSize: 11, color: '#64748b' }}>
          value streams → departments → teams → roles → RACI → stakeholders → policies → standards
        </span>
        {health && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
            Health: <Pill color={health.status === 'ok' ? '#10b981' : '#f59e0b'}>{health.status}</Pill>
            {' '} · Rows per table: {Object.entries(health.counts || {}).map(([t, n]) =>
              <span key={t} style={{ marginRight: 8 }}>{t.split('_')[0]}={n}</span>
            )}
          </div>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: activeTab === t.key ? '#3b82f6' : '#fff',
                color: activeTab === t.key ? '#fff' : '#475569',
                border: `1px solid ${activeTab === t.key ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: 3,
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 10, fontSize: 11, background: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <Section title={tab.label} accent="#3b82f6">
        {busy && <em style={{ fontSize: 10, color: '#94a3b8' }}>Loading…</em>}
        {!busy && activeTab === 'org-tree' && renderOrgTree()}
        {!busy && activeTab !== 'org-tree' && renderTable()}
      </Section>
    </div>
  );
}
