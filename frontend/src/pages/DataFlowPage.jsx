import { dataFlowEdges } from '../data/dataFlow';
import { departments } from '../data/departments';
import TabStub from '../components/common/TabStub';

export default function DataFlowPage() {
  const deptsById = Object.fromEntries(departments.map((d) => [d.id, d]));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🔀 Cross-Department Data Flow</div>
          <div className="page-subtitle">
            {dataFlowEdges.length} data flows across {departments.length - 1} departments
          </div>
        </div>
      </div>

      <TabStub
        name="Global Data-Flow Diagram"
        phase="Phase 4"
        description={`Interactive org-wide data-flow visualization. Phase 1 ships the data (${dataFlowEdges.length} edges); the diagram ships in Phase 4.`}
      />

      <div style={{ padding: '0 32px 32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Seeded edges (preview)</h3>
        <div style={{
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>From</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>To</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Entity</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Schedule</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>SLA</th>
              </tr>
            </thead>
            <tbody>
              {dataFlowEdges.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>{deptsById[e.from]?.icon} {deptsById[e.from]?.name || e.from}</td>
                  <td style={{ padding: '10px' }}>{deptsById[e.to]?.icon} {deptsById[e.to]?.name || e.to}</td>
                  <td style={{ padding: '10px' }}>{e.entity}</td>
                  <td style={{ padding: '10px' }}>{e.schedule}</td>
                  <td style={{ padding: '10px' }}>{e.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
