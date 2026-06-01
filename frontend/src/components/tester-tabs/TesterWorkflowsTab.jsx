import { useMemo } from 'react';
import { getWorkflowsForDept } from '../../data/workflows';

export default function TesterWorkflowsTab({ dept }) {
  const deptId = dept?.id || '';
  const testerWorkflows = useMemo(
    () => getWorkflowsForDept(deptId).filter((w) => w.role === 'tester'),
    [deptId],
  );

  if (testerWorkflows.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        No tester workflows catalogued for {dept?.name || 'this department'} yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        <strong style={{ color: '#0f172a' }}>{testerWorkflows.length}</strong> tester enhancement
        workflow{testerWorkflows.length === 1 ? '' : 's'} for{' '}
        <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>. These are the
        recurring QA processes owned by the Tester role.
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['#', 'Process', 'Description', 'Trigger', 'KPI'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: 10,
                    textAlign: i === 0 ? 'left' : i >= 3 ? 'left' : 'left',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    width: i === 0 ? 40 : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {testerWorkflows.map((w, i) => (
              <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                <td style={{ padding: 10, color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{w.name}</td>
                <td style={{ padding: 10, color: '#0f172a' }}>{w.description}</td>
                <td
                  style={{
                    padding: 10,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  {w.trigger}
                </td>
                <td style={{ padding: 10, fontSize: 12, color: '#64748b' }}>{w.kpi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
