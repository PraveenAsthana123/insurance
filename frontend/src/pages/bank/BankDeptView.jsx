// Second-level view: shows the process list for a canonical department/domain pair.
// Clicking a process opens the BankUseCasePage.

import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import {
  canonicalDomainId,
  domainMeta,
  processesForDomain,
  scenarioForDomain,
  slugOf,
} from '../../utils/insuranceNavigation';

export function BankDeptView() {
  const { bp } = useOutletContext();
  const params = useParams();
  const navigate = useNavigate();

  const dept = bp.department_catalog?.find((d) => String(d.id) === params.deptId);
  if (!dept) {
    return <div style={{ padding: 24, color: '#dc2626' }}>Department #{params.deptId} not found.</div>;
  }

  const domain = canonicalDomainId(params.domain);
  const meta = domainMeta(domain);
  const hasDomain = scenarioForDomain(dept, domain);
  const domainProcesses = processesForDomain(dept.processes, dept, domain);

  return (
    <div>
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: '#7f1d1d', color: '#fff',
          }}>#{dept.id}</span>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>{dept.name}</h2>
          {meta && (
            <span style={{
              padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700,
              background: '#1e40af', color: '#fff',
            }}>{meta.label}</span>
          )}
        </div>
        {dept.mission && (
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{dept.mission}</p>
        )}
        {hasDomain && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
            {meta?.label} scenario: {hasDomain.label || '-'}
          </p>
        )}
        {!hasDomain && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>
            Operator-pending scenario for {meta?.label || params.domain} on this department.
          </p>
        )}
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#0f172a' }}>
          Processes ({domainProcesses.length})
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
          Pick a process to open its banking view. The list is filtered by the selected canonical domain.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10,
        }}>
          {domainProcesses.map((p, i) => {
            const ucSlug = slugOf(p.name);
            const ai = p.ai || [];
            const issues = p.issues || [];
            return (
              <button
                key={ucSlug}
                onClick={() => navigate(`/bank/dept/${dept.id}/${domain}/${ucSlug}`)}
                style={{
                  textAlign: 'left', padding: 12, cursor: 'pointer',
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                  transition: 'transform 0.1s, box-shadow 0.1s, border-color 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#7f1d1d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#7f1d1d',
                    background: '#fee2e2', padding: '1px 6px', borderRadius: 3,
                  }}>UC-{dept.id}.{i + 1}</span>
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>{p.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                  <span><strong style={{ color: '#5b21b6' }}>{ai.length}</strong> AI</span>
                  <span><strong style={{ color: '#dc2626' }}>{issues.length}</strong> issue{issues.length === 1 ? '' : 's'}</span>
                  <span>{(p.sub_processes || []).length} sub-process</span>
                </div>
              </button>
            );
          })}
          {domainProcesses.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
              No processes are mapped to this department/domain yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
