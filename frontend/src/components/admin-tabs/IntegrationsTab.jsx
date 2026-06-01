import { seededRng, randInt, pick } from '../../utils/seed';

const CONNECTORS = [
  { id: 'salesforce',  name: 'Salesforce CRM',     type: 'SaaS API',     auth: 'OAuth2',  relevantTo: ['sales', 'marketing', 'customer', 'contact-center'] },
  { id: 'sap',         name: 'SAP S/4HANA',        type: 'ODATA',        auth: 'Basic',   relevantTo: ['supply-chain', 'finance', 'procurement', 'manufacturing', 'logistics'] },
  { id: 'snowflake',   name: 'Snowflake DW',       type: 'JDBC',         auth: 'KeyPair', relevantTo: ['sales', 'marketing', 'customer', 'finance', 'retail', 'supply-chain', 'governance'] },
  { id: 'databricks',  name: 'Databricks',         type: 'REST + JDBC',  auth: 'PAT',     relevantTo: ['sales', 'manufacturing', 'maintenance', 'quality', 'supply-chain', 'customer', 'marketing'] },
  { id: 'kafka',       name: 'Apache Kafka',       type: 'Event stream', auth: 'SASL',    relevantTo: ['contact-center', 'logistics', 'manufacturing', 'retail', 'maintenance'] },
  { id: 'shopify',     name: 'Shopify',            type: 'REST + webhook', auth: 'APIKey', relevantTo: ['retail', 'sales', 'marketing', 'customer'] },
  { id: 'hubspot',     name: 'HubSpot',            type: 'REST API',     auth: 'OAuth2',  relevantTo: ['marketing', 'sales', 'contact-center'] },
  { id: 'stripe',      name: 'Stripe',             type: 'REST + webhook', auth: 'APIKey', relevantTo: ['finance', 'retail', 'sales'] },
];

const STATUSES = ['healthy', 'healthy', 'healthy', 'degraded', 'pending'];

export default function IntegrationsTab({ dept }) {
  const deptId = dept?.id || '';
  const rng = seededRng(`integ-${deptId}`);

  const rows = CONNECTORS.map((c) => {
    const relevant = c.relevantTo.includes(deptId);
    const status = relevant ? pick(rng, STATUSES) : 'not-connected';
    const lastSyncMin = relevant ? randInt(rng, 1, 240) : null;
    const recordsToday = relevant ? randInt(rng, 500, 50000) : null;
    return { ...c, relevant, status, lastSyncMin, recordsToday };
  });

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Data source connectors for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Highlighted rows are relevant to this department.
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Connector</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Type</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Auth</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Last sync</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Records/24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const statusColor = (
                r.status === 'healthy' ? { bg: 'rgba(16,185,129,0.12)', fg: '#059669' }
                : r.status === 'degraded' ? { bg: 'rgba(234,179,8,0.12)', fg: '#b45309' }
                : r.status === 'pending' ? { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' }
                : { bg: '#f1f5f9', fg: '#64748b' }
              );
              return (
                <tr
                  key={r.id}
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    background: r.relevant ? 'rgba(59,130,246,0.04)' : 'transparent',
                  }}
                >
                  <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>
                    {r.name}
                    {r.relevant && <span style={{ marginLeft: 8, fontSize: 11, color: '#2563eb' }}>◆ primary</span>}
                  </td>
                  <td style={{ padding: 10, color: '#64748b' }}>{r.type}</td>
                  <td style={{ padding: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#64748b' }}>{r.auth}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: statusColor.bg, color: statusColor.fg,
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                    {r.lastSyncMin !== null ? `${r.lastSyncMin} min ago` : '—'}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                    {r.recordsToday !== null ? r.recordsToday.toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
