// Cross-department BOT UI.
// Operator brief: "must get all the department activity data in table and table
// to vector db so that manager of each department should able to generate the
// progress report for each story".
//
// Design surface only — wiring to vector DB + RAG pipeline pending. All values
// shown as <Pending /> until backend endpoints land. Per §57.7 no fabrication.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

function Section({ title, subtitle, color = '#3b82f6', children }) {
  return (
    <div style={{
      marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 8,
      overflow: 'hidden', background: '#fff',
    }}>
      <div style={{
        padding: '12px 16px', background: `${color}11`,
        borderBottom: `1px solid ${color}33`,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{subtitle}</p>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map((c) => (
              <th key={c} style={{
                textAlign: 'left', padding: '8px 12px',
                fontSize: 11, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                borderBottom: '1px solid #e2e8f0',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {r.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', color: '#0f172a' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SAMPLE_QUERIES = [
  'Generate this week\'s progress report for Underwriting (dept #4)',
  'Show me top 3 stuck stories in Claims (dept #7) right now',
  'Compare Sales B2C vs B2B story velocity for the last quarter',
  'Which department has the most accuracy-regression incidents this month?',
  'List all stories that are over budget in run-cost by > 20%',
  'For Cybersecurity (dept #20), pull every story with open P1 incidents',
  'Build the executive summary for the Underwriting → Policy Issuance handoff',
];

export function BankBotPage() {
  const { bp } = useOutletContext();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const depts = bp?.department_catalog || [];
  const totalProcesses = depts.reduce((s, d) => s + (d.processes || []).length, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setHistory((h) => [...h, { id: Date.now(), q: query, status: 'pending' }]);
    setQuery('');
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🤖 Cross-department Bot</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
          Ingests every department's activity → vector DB → per-dept manager generates progress reports per story.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <div>📚 Indexed depts: <strong>{depts.length}</strong></div>
          <div>🧩 Total processes: <strong>{totalProcesses}</strong></div>
          <div>🧠 Vector DB: <strong>operator-pending wiring</strong></div>
        </div>
      </div>

      {/* 1. Chat / query interface */}
      <Section
        title="Ask the bot — generate a progress report"
        subtitle="Type a natural-language question. The bot retrieves from the cross-dept index and produces a structured report."
        color="#3b82f6"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'Generate this week's progress report for Underwriting (dept #4)'"
            style={{
              flex: 1, padding: '10px 14px', fontSize: 13,
              border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600,
            background: '#1e40af', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
          }}>
            Ask
          </button>
        </form>

        <details>
          <summary style={{ fontSize: 12, color: '#475569', cursor: 'pointer', marginBottom: 6 }}>
            Sample queries ({SAMPLE_QUERIES.length})
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#475569' }}>
            {SAMPLE_QUERIES.map((q, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => setQuery(q)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0,
                    color: '#1e40af', cursor: 'pointer',
                    textAlign: 'left', fontSize: 12, textDecoration: 'underline',
                  }}
                >{q}</button>
              </li>
            ))}
          </ul>
        </details>

        {history.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>Recent queries</h4>
            <Table
              columns={['#', 'Query', 'Status']}
              rows={history.map((h, i) => [
                i + 1,
                h.q,
                <span key={`s${h.id}`} style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                  {h.status === 'pending' ? 'Awaiting backend wiring (/api/v1/bot/query)' : h.status}
                </span>,
              ])}
            />
          </div>
        )}
      </Section>

      {/* 2. Cross-dept activity ingest status */}
      <Section
        title="Cross-department activity ingest"
        subtitle="Every department's activity (cases · decisions · audit rows · incidents · KPI updates) feeds the vector DB."
        color="#10b981"
      >
        <Table
          columns={['#', 'Department', 'Processes', 'Rows indexed (24h)', 'Last sync', 'Vector DB status']}
          rows={depts.map((d, i) => [
            i + 1,
            <strong key={`d${d.id}`}>#{d.id} · {d.name}</strong>,
            (d.processes || []).length,
            <Pending key={`r${d.id}`} />,
            <Pending key={`l${d.id}`} />,
            <Pending key={`v${d.id}`} />,
          ])}
        />
      </Section>

      {/* 3. Vector DB architecture */}
      <Section
        title="Vector DB pipeline"
        subtitle="Activity table → embeddings → vector store → RAG retrieval → LLM → structured report."
        color="#8b5cf6"
      >
        <Table
          columns={['Stage', 'Component', 'Configuration']}
          rows={[
            ['1. Source',           'Per-dept activity tables (cases · decisions · audit · incidents · KPIs)',  '21 depts × N processes'],
            ['2. Chunk',            'Row-level + summary-level chunks (per §45 RAG patterns)',                  '256–1024 tokens · 10–20% overlap'],
            ['3. Embed',            'Embedding model (versioned per §45.3)',                                     'OpenAI ada-002 / Cohere / bge-large'],
            ['4. Index',            'Vector DB',                                                                  'pgvector · Pinecone · Weaviate · Qdrant'],
            ['5. Metadata filter',  'Per dept · per process · per date · per role',                              'Required at query time'],
            ['6. Retrieve',         'Hybrid (vector + keyword) + rerank',                                         'Top-k · MMR · reranker model'],
            ['7. Context build',    'Inject top-k chunks into prompt template',                                   'Prompt versioned per §38'],
            ['8. Generate',         'LLM call (model versioned per §45.3)',                                       'GPT-4 / Claude / LLaMA / Mistral'],
            ['9. Cite',             'Per §48.5 citation contract — every claim maps to chunk_id',                 'Hallucination check'],
            ['10. Audit',           'Decision row written per query (§38.3)',                                     'request_id + tenant_id + user_role'],
          ]}
        />
      </Section>

      {/* 4. Per-dept manager report templates */}
      <Section
        title="Progress report templates — per-department manager"
        subtitle="Each manager picks a template + dept scope, the bot generates the report from the indexed activity."
        color="#f59e0b"
      >
        <Table
          columns={['Template', 'Audience', 'Cadence', 'What it includes']}
          rows={[
            ['Weekly business review',  'Dept manager → Exec sponsor',     'Weekly',     'KPI movement · top wins · top blockers · next-week plan'],
            ['Daily my-work brief',     'Team member',                     'Daily',      'My queue · cases due · personal SLA'],
            ['Story progress',           'PM',                              'Per request', 'Per-tab status (Data/Model/Accuracy/etc.) · % complete · blockers'],
            ['Incident digest',         'Dept manager + SRE',              'Daily',      'P1-P4 by cadence · MTTD · MTTR · top root causes'],
            ['Fairness + bias audit',   'AI Lead + Compliance',            'Weekly',     'Per protected group · DI · EO gap · regression vs prior'],
            ['Cost rollup',             'Manager + FinOps',                'Monthly',    'Build · run · savings · ROI · trend vs forecast'],
            ['Cross-dept handoff',      'Two dept managers',               'Per request', 'Where dept A output enters dept B · gaps · SLA'],
            ['Quarterly DT scorecard',  'Strategy + Exec',                 'Quarterly',   'Per-process automation % · maturity level · AS-IS vs TO-BE'],
            ['Compliance disclosure',   'Compliance + DPO',                'On demand',  'EU AI Act + NIST RMF + ISO 42001 status per process'],
          ]}
        />
      </Section>

      {/* 5. Permissions + audit */}
      <Section
        title="Permissions + audit"
        subtitle="Per §38.3 + §42 + §47.6 — every query logged, scope-gated, tenant-isolated."
        color="#dc2626"
      >
        <Table
          columns={['Role', 'Can query', 'Can see other depts', 'Scope', 'Audit row']}
          rows={[
            ['Team member',       'My processes only',           'No',  'tenant + my-role',     'Per query'],
            ['Manager',           'My department',               'No',  'tenant + dept_id',     'Per query'],
            ['Cross-dept lead',   'Multiple depts (named)',      'Yes', 'tenant + dept_list',   'Per query + cross-ref'],
            ['Strategy / Exec',   'All depts',                   'Yes', 'tenant',                'Per query + exec-tag'],
            ['Compliance',        'All depts + audit history',   'Yes', 'tenant + audit',       'Per query (legal hold ready)'],
            ['Auditor (read-only)','Per-regulator scope',         'Yes', 'tenant + audit + redact PII', 'Per query'],
          ]}
        />
      </Section>

      {/* 6. Backend wiring needed */}
      <Section
        title="What needs to be wired (operator-pending backend)"
        subtitle="When these endpoints land, every Pending cell on this page becomes live."
        color="#475569"
      >
        <Table
          columns={['Endpoint', 'Purpose', 'Status']}
          rows={[
            ['POST /api/v1/bot/query',                'Submit natural-language query',                <span key="s1" style={{ color: '#f59e0b' }}>Pending</span>],
            ['GET /api/v1/bot/depts/:id/ingest',      'Per-dept ingest status + row count',           <span key="s2" style={{ color: '#f59e0b' }}>Pending</span>],
            ['GET /api/v1/bot/vectordb/health',       'Vector DB index health + drift',               <span key="s3" style={{ color: '#f59e0b' }}>Pending</span>],
            ['POST /api/v1/bot/report',               'Generate report from template + dept + range', <span key="s4" style={{ color: '#f59e0b' }}>Pending</span>],
            ['GET /api/v1/bot/audit',                 'Bot query audit trail (per §38.3)',            <span key="s5" style={{ color: '#f59e0b' }}>Pending</span>],
            ['WebSocket /api/v1/bot/stream',          'Streaming response + citation links',          <span key="s6" style={{ color: '#f59e0b' }}>Pending</span>],
          ]}
        />
      </Section>
    </div>
  );
}
