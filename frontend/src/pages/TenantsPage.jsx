// TenantsPage.jsx — Surfaces migration 017 tenants + departments tables.
// Reads from /api/v1/admin/tenants and /api/v1/admin/departments; falls
// back to mirror data from migration 017 seed if API unreachable.

import { useEffect, useState } from 'react';
import { fallbackDepartments, fallbackTenants } from '../data/catalogIndex';

const COLORS = { standard: '#3b82f6', insurerage_specific: '#f59e0b', healthcare_specific: '#10b981', finance_specific: '#8b5cf6' };

async function tryFetch(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  }
}

function StatusBadge({ children, color = '#64748b', bg = '#f1f5f9' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', background: bg, color, borderRadius: 999, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

function StatLine({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [source, setSource] = useState('loading');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tenantsApi = await tryFetch('/api/v1/admin/tenants');
      const deptsApi = await tryFetch('/api/v1/admin/departments');
      if (cancelled) return;
      if (tenantsApi && deptsApi) {
        setTenants(tenantsApi.items || tenantsApi);
        setDepartments(deptsApi.items || deptsApi);
        setSource('live');
      } else {
        setTenants(fallbackTenants);
        setDepartments(fallbackDepartments);
        setSource('fallback');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedTenant && tenants.length > 0) setSelectedTenant(tenants[0]);
  }, [tenants, selectedTenant]);

  const families = ['all', ...new Set(departments.map((d) => d.family))];
  const filteredDepts = filter === 'all' ? departments : departments.filter((d) => d.family === filter);

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
            Tenants &amp; Departments
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Multi-tenant foundation per migration 017. {source === 'live' ? 'Live data from backend.' : source === 'fallback' ? 'Showing fallback seed data (backend not reachable).' : 'Loading…'}
          </p>
        </div>
        {source === 'fallback' && (
          <StatusBadge color="#ef4444" bg="#fef2f2">⚠ Backend offline · showing seed</StatusBadge>
        )}
        {source === 'live' && (
          <StatusBadge color="#10b981" bg="#f0fdf4">✓ Live</StatusBadge>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Left: Tenants */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tenants ({tenants.length})
          </h2>
          {tenants.map((t) => {
            const active = selectedTenant && selectedTenant.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTenant(t)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  marginBottom: 8,
                  border: active ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: 6,
                  background: active ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.display_name}</span>
                  <StatusBadge color={t.status === 'active' ? '#10b981' : '#64748b'} bg={t.status === 'active' ? '#f0fdf4' : '#f1f5f9'}>
                    {t.status || 'active'}
                  </StatusBadge>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                  {t.slug} · {t.jurisdiction || 'CA'}{t.region ? ` · ${t.region}` : ''}
                </div>
              </button>
            );
          })}
        </section>

        {/* Right: Tenant detail + departments */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          {selectedTenant ? (
            <>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {selectedTenant.display_name}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <StatLine label="Slug"            value={selectedTenant.slug} />
                  <StatLine label="Legal Name"      value={selectedTenant.legal_name || '—'} />
                  <StatLine label="Industry"        value={selectedTenant.industry || '—'} />
                  <StatLine label="Jurisdiction"    value={`${selectedTenant.jurisdiction || 'CA'}${selectedTenant.region ? ' · ' + selectedTenant.region : ''}`} />
                </div>
                <div>
                  <StatLine label="Data Residency"  value={selectedTenant.data_residency || 'CA-CENTRAL'} />
                  <StatLine label="Rate Limit (req/min)" value={selectedTenant.rate_limit_per_min || 1000} />
                  <StatLine label="Monthly Budget"  value={selectedTenant.monthly_budget_usd ? `$${selectedTenant.monthly_budget_usd}` : 'No cap'} />
                  <StatLine label="Departments Enabled" value={selectedTenant.departments_enabled || departments.length} />
                </div>
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Departments ({filteredDepts.length} of {departments.length})
              </h3>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {families.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      background: filter === f ? COLORS[f] || '#3b82f6' : '#fff',
                      color: filter === f ? '#fff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Display Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Family</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{d.id}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#3b82f6' }}>{d.code}</td>
                      <td style={{ padding: '8px 10px', color: '#0f172a' }}>{d.display_name}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', background: (COLORS[d.family] || '#64748b') + '22', color: COLORS[d.family] || '#64748b', borderRadius: 4, fontWeight: 600 }}>
                          {d.family}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Select a tenant from the left</div>
          )}
        </section>
      </div>

      <footer style={{ marginTop: 20, padding: 12, fontSize: 11, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <strong>Schema source:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>backend/migrations/017_tenants_and_departments.sql</code> ·
        Tables: <code>tenants</code>, <code>departments</code>, <code>tenant_departments</code>, <code>tenant_users</code>, <code>tenant_user_dept_roles</code> ·
        Composes with §41.3 multi-tenant · §47.6 SOC2 CC6.1+CC6.2 · §63 19-dept scaffold.
      </footer>
    </div>
  );
}
