// DataFlowsSection.jsx — two mini tables: inbound (to=dept.id) and
// outbound (from=dept.id) data flows. Each row shows source/target,
// the entity, schedule and SLA.

import SectionCard, { EmptySection } from './SectionCard';
import { getInboundEdges, getOutboundEdges } from '../../data/dataFlow';
import departments from '../../data/departments';

function deptLabel(id) {
  const d = departments.find((x) => x.id === id);
  return d ? `${d.icon} ${d.name}` : id;
}

function FlowTable({ rows, direction }) {
  if (rows.length === 0) {
    return (
      <EmptySection
        label={`No ${direction} flows catalogued.`}
      />
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
            <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
              {direction === 'inbound' ? 'From' : 'To'}
            </th>
            <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Entity</th>
            <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Schedule</th>
            <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>SLA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                {deptLabel(direction === 'inbound' ? r.from : r.to)}
              </td>
              <td style={{ padding: '6px 10px', color: '#0f172a' }}>{r.entity}</td>
              <td style={{ padding: '6px 10px', color: '#64748b' }}>{r.schedule}</td>
              <td style={{ padding: '6px 10px', color: '#475569', fontFamily: 'monospace' }}>
                {r.sla}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataFlowsSection({ dept }) {
  const inbound = getInboundEdges(dept.id) || [];
  const outbound = getOutboundEdges(dept.id) || [];

  return (
    <SectionCard
      id="dataflows"
      icon="🔀"
      title="Data flows"
      subtitle={`${inbound.length} in · ${outbound.length} out`}
      footer={
        <>
          Source: <code>dataFlow.js</code>. Full cross-dept graph in{' '}
          <a href="/data-flow" style={{ color: '#3b82f6' }}>
            /data-flow
          </a>
          .
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            ← Inbound ({inbound.length})
          </div>
          <FlowTable rows={inbound} direction="inbound" />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#059669',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Outbound → ({outbound.length})
          </div>
          <FlowTable rows={outbound} direction="outbound" />
        </div>
      </div>
    </SectionCard>
  );
}
