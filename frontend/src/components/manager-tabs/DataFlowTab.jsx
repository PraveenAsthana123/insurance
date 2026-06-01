import { getInboundEdges, getOutboundEdges } from '../../data/dataFlow';
import { departments } from '../../data/departments';

const deptName = (id) => departments.find((d) => d.id === id)?.name || id;
const deptIcon = (id) => departments.find((d) => d.id === id)?.icon || '◆';

function EdgeTable({ edges, partnerKey, emptyText }) {
  if (edges.length === 0) {
    return (
      <div style={{
        padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13,
        border: '1px dashed #e2e8f0', borderRadius: 8, background: '#f8fafc',
      }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 8,
      overflow: 'hidden', background: '#fff',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>
              {partnerKey === 'from' ? 'From' : 'To'}
            </th>
            <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Entity</th>
            <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Schedule</th>
            <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>SLA</th>
          </tr>
        </thead>
        <tbody>
          {edges.map((e, i) => {
            const partner = e[partnerKey];
            return (
              <tr key={`${e.from}-${e.to}-${e.entity}-${i}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>
                  {deptIcon(partner)} {deptName(partner)}
                </td>
                <td style={{ padding: 10, color: '#0f172a' }}>{e.entity}</td>
                <td style={{ padding: 10, color: '#64748b', fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {e.schedule}
                </td>
                <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>{e.sla}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DataFlowTab({ dept }) {
  const deptId = dept?.id || '';
  const inbound = getInboundEdges(deptId);
  const outbound = getOutboundEdges(deptId);

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Data flows for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Global view available at <code>/data-flow</code>.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
            ▶ Inbound · {inbound.length} feed{inbound.length === 1 ? '' : 's'}
          </div>
          <EdgeTable
            edges={inbound}
            partnerKey="from"
            emptyText="No inbound data feeds catalogued."
          />
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
            ◀ Outbound · {outbound.length} feed{outbound.length === 1 ? '' : 's'}
          </div>
          <EdgeTable
            edges={outbound}
            partnerKey="to"
            emptyText="No outbound data feeds catalogued."
          />
        </div>
      </div>
    </div>
  );
}
