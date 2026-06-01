import { seededRng, randInt } from '../../utils/seed';

const BASE_SERVERS = [
  {
    id: 'dept-rag',
    name: 'dept-rag',
    transport: 'HTTP/SSE',
    url: 'https://mcp.internal/dept-rag',
    tools: ['search-knowledge', 'summarize-doc', 'cite-source'],
    resources: ['Confluence', 'SharePoint', 'S3 bucket'],
  },
  {
    id: 'model-registry',
    name: 'model-registry',
    transport: 'stdio',
    url: 'mcp+stdio://model-registry',
    tools: ['list-models', 'deploy-model', 'promote-challenger'],
    resources: ['MLflow', 'Feature Store'],
  },
  {
    id: 'audit-log',
    name: 'audit-log',
    transport: 'HTTP',
    url: 'https://mcp.internal/audit',
    tools: ['query-events', 'export-slice'],
    resources: ['Postgres (audit)', 'Splunk'],
  },
  {
    id: 'databricks-connector',
    name: 'databricks-connector',
    transport: 'HTTP/SSE',
    url: 'https://mcp.internal/databricks',
    tools: ['run-job', 'query-table', 'list-jobs'],
    resources: ['Delta Lake', 'Unity Catalog'],
  },
];

export default function MCPServersTab({ dept }) {
  const deptId = dept?.id || '';
  const rng = seededRng(`mcp-${deptId}`);

  const rows = BASE_SERVERS.map((s) => {
    const healthy = rng() > 0.15;
    return {
      ...s,
      health: healthy ? 'up' : 'degraded',
      latencyMs: randInt(rng, 25, 340),
      rateLimit: '100 req/min',
    };
  });

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        MCP (Model Context Protocol) servers registered for
        {' '}<strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Used by LLM agents to invoke tools and read department resources.
      </div>

      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 8,
        overflow: 'hidden', background: '#fff',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Server</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Transport</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>URL</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Tools advertised</th>
              <th style={{ padding: 10, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Health</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>p95 latency</th>
              <th style={{ padding: 10, textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Rate limit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                <td style={{ padding: 10, color: '#64748b', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                  {s.transport}
                </td>
                <td style={{ padding: 10, color: '#64748b', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                  {s.url}
                </td>
                <td style={{ padding: 10, color: '#0f172a', fontSize: 12 }}>
                  {s.tools.map((t) => (
                    <code key={t} style={{
                      display: 'inline-block', margin: '2px 4px 2px 0',
                      padding: '2px 6px', fontSize: 11,
                      background: '#f1f5f9', borderRadius: 4, color: '#334155',
                    }}>
                      {t}
                    </code>
                  ))}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: s.health === 'up' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                    color: s.health === 'up' ? '#059669' : '#b45309',
                  }}>
                    ● {s.health}
                  </span>
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                  {s.latencyMs} ms
                </td>
                <td style={{ padding: 10, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                  {s.rateLimit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
