// Agentic AI demo — HIGHEST PRIORITY per operator.
// Shows how Agentic AI + Model Context Protocol (MCP) + Council of Agents
// help each process + each tab. Demonstrable surface.

import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    success: { bg: '#dcfce7', fg: '#166534' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
    danger:  { bg: '#fee2e2', fg: '#991b1b' },
    info:    { bg: '#dbeafe', fg: '#1e40af' },
    purple:  { bg: '#ede9fe', fg: '#5b21b6' },
    neutral: { bg: '#f1f5f9', fg: '#475569' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.fg,
    }}>{children}</span>
  );
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
                textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700,
                color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em',
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

const TABS_14 = [
  'Overview','Data','Model','Automation','Accuracy','Analysis','Problem',
  'Manual','Demo','Architecture','Testing','AI','Monitor','B2x',
];

export function BankAgenticPage() {
  const { bp } = useOutletContext();
  const [activeProcess, setActiveProcess] = useState(null);
  const now = new Date();
  const userName = 'demo-user'; // operator-pending — wire to auth

  const depts = bp?.department_catalog || [];
  const allProcesses = depts.flatMap((d) =>
    (d.processes || []).map((p) => ({ dept: d, proc: p })));

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🧠 Agentic AI · MCP · Council of Agents</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.95 }}>
          How autonomous agents + Model Context Protocol + multi-agent councils help every process and every tab. Demo-ready.
        </p>
        <div style={{
          marginTop: 12, display: 'flex', gap: 16, fontSize: 11, opacity: 0.9, flexWrap: 'wrap',
        }}>
          <div>👤 User: <strong>{userName}</strong></div>
          <div>🕒 {now.toISOString()}</div>
          <div>📍 Local: {now.toLocaleString()}</div>
        </div>
      </div>

      {/* 1. The three pillars */}
      <Section title="The three pillars — Agentic AI · MCP · Council of Agents" color="#6366f1">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{
            padding: 14, background: '#ede9fe',
            border: '2px solid #c4b5fd', borderRadius: 8,
          }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#5b21b6' }}>🤖 Agentic AI</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#4c1d95' }}>
              Autonomous agents that plan + act. Per global §64.40 10-layer agentic stack:
              user goal → planner → decomposition → policy → CUA → browser → action → audit.
            </p>
          </div>
          <div style={{
            padding: 14, background: '#dbeafe',
            border: '2px solid #93c5fd', borderRadius: 8,
          }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#1e40af' }}>🔌 Model Context Protocol (MCP)</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#1e3a8a' }}>
              Standardized tool-discovery + invocation protocol. Each tool exposes a contract;
              any agent can list + call tools regardless of model vendor. Per global §67.
            </p>
          </div>
          <div style={{
            padding: 14, background: '#fce7f3',
            border: '2px solid #f9a8d4', borderRadius: 8,
          }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 14, color: '#be185d' }}>🗣️ Council of Agents</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#831843' }}>
              Multi-agent consensus: Author proposes · Reviewer critiques · Chair decides.
              Per global §64.43 #2 — different model lineages reduce blind spots.
            </p>
          </div>
        </div>
      </Section>

      {/* 2. Per-tab agent assist matrix */}
      <Section title="How each pillar helps each tab" color="#3b82f6">
        <Table
          columns={['Tab', 'Agentic AI does', 'MCP exposes (tools)', 'Council reviews']}
          rows={[
            ['Overview',   'Generates exec summary · synthesizes ROI/KPI/Value sections', 'kpi_query · roi_calc · narrative_gen', 'Pitch quality + factual accuracy'],
            ['Data',       'Profiles new dataset · runs EDA · proposes cleaning steps',  'data_profile · eda_run · clean_propose · viz_render', 'Data quality + bias detection'],
            ['Model',      'Suggests model family · tunes hyperparams · runs eval',     'sklearn_train · optuna_tune · mlflow_log · eval_run', 'Model selection + benchmark fairness'],
            ['Automation', 'Builds + runs the 11-phase pipeline · self-heals on fail',  '11 pipeline tools (1 per phase)',     'End-summary scorecard'],
            ['Accuracy',   'Runs full metric suite · paired AS-IS/TO-BE plots',          'metric_compute · plot_gen · ragas_eval', 'Gate pass/fail per §59.4 + §48.8'],
            ['Analysis',   'Drives 13 sub-cards · feature eng · sensitivity analyses',   'shap_run · perm_imp · stability_check', 'Statistical soundness'],
            ['Problem',    'Triages issue register · proposes priorities + owners',     'issue_classify · severity_score',     'Triage consistency'],
            ['Manual',     'Watches operator workflow · suggests next step',             'screen_capture · click_predict',     'UX correctness'],
            ['Demo',       'Generates demo script per persona · simulates run',          'demo_simulate · pitch_gen',          'Demo polish + factual'],
            ['Architecture','Drafts BRD/FRD/HLD/LLD · validates against ADRs',           'doc_draft · adr_check',              'Design correctness'],
            ['Testing',    'Generates tests per tier · runs CI gate · auto-fix flaky',  'test_gen · test_run · coverage_calc','Test adequacy + gate enforcement'],
            ['AI',         'Audits XAI/RAI/Ethical/Compliance · drafts model card',     'shap_run · fairness_audit · model_card_gen', 'Compliance + ethical sign-off'],
            ['Monitor',    'Watches dashboards · alerts on anomaly · drafts incident',  'metric_watch · alert_fire · incident_draft', 'Severity + escalation correctness'],
            ['B2x',        'Tailors per-domain (B2C/B2B/B2E) demos + KPIs',              'persona_gen · domain_kpi_pick',      'Per-domain message clarity'],
          ]}
        />
      </Section>

      {/* 3. Live agent run (demo) */}
      <Section title="Live agent run — demo on a process" color="#8b5cf6">
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>
            Pick a process to demo (operator-pending live run):
          </label>
          <select
            value={activeProcess || ''}
            onChange={(e) => setActiveProcess(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none',
            }}
          >
            <option value="">— pick a process —</option>
            {allProcesses.map(({ dept, proc }) => (
              <option key={`${dept.id}-${proc.name}`} value={`${dept.id}/${proc.name}`}>
                #{dept.id} {dept.name} → {proc.name}
              </option>
            ))}
          </select>
        </div>
        {activeProcess && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
            <Table
              columns={['Step', 'Actor', 'Pillar', 'Action', 'Output']}
              rows={[
                ['1', 'User',                'Trigger',     'Click "Run agentic demo"',                                  'Request id created · audit row queued'],
                ['2', 'Planner agent',       <Badge key="2p" tone="purple">Agentic</Badge>, 'Decompose goal into 5 sub-tasks',          'Task DAG · est cost'],
                ['3', 'MCP server',          <Badge key="3p" tone="info">MCP</Badge>,       'Expose tools — kpi_query · model_run · plot_gen', 'Tool catalog (with auth scopes)'],
                ['4', 'Author agent',         <Badge key="4p" tone="purple">Council</Badge>, 'Drafts response via tools',                'Draft answer + citations'],
                ['5', 'Reviewer agent',       <Badge key="5p" tone="purple">Council</Badge>, 'Critiques + lists faults',                 'Critique notes'],
                ['6', 'Chair agent',          <Badge key="6p" tone="purple">Council</Badge>, 'Resolves + picks final',                   'Final answer'],
                ['7', 'Policy engine',        <Badge key="7p" tone="warning">Gate</Badge>,    'Scope + safety + cost checks',             'Allow / deny / require_human'],
                ['8', 'CUA / Tool call',     <Badge key="8p" tone="info">MCP</Badge>,        'Invoke tool with scope token',             'Tool result'],
                ['9', 'Audit',                <Badge key="9p" tone="success">Govern</Badge>,  'Write §38.3 decision row',                  'request_id · prediction · explanation'],
                ['10','User',                 'Receive',     'See structured answer + citations + audit link',          'Decision accepted · feedback collected'],
              ]}
            />
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              Wire to <code>POST /api/v1/agentic/run</code> + WebSocket <code>/api/v1/agentic/stream</code> to make this live.
            </p>
          </div>
        )}
      </Section>

      {/* 4. MCP tool catalog */}
      <Section title="MCP tool catalog — what's exposed to agents" color="#0ea5e9">
        <Table
          columns={['Tool', 'Description', 'Required scope', 'Used by tab']}
          rows={[
            ['kpi_query',         'Read KPI for a process · timeframe',          'kpi.read',          'Overview · Monitor'],
            ['issue_classify',    'Classify issue severity · root cause',         'issue.classify',    'Problem · Monitor'],
            ['data_profile',      'Profile a dataset · schema + stats',           'data.read',         'Data'],
            ['eda_run',           'Run full EDA suite + plots',                   'data.read',         'Data · Analysis'],
            ['model_run',         'Inference call to deployed model',             'model.invoke',      'Model · Automation'],
            ['sklearn_train',     'Train a tabular model · log to MLflow',         'model.train',       'Model'],
            ['optuna_tune',       'Hyperparameter sweep',                          'model.train',       'Model'],
            ['metric_compute',    'Calculate metric (P · R · F1 · ROC · etc.)',    'eval.run',          'Accuracy'],
            ['ragas_eval',        'Run Ragas faithfulness · context-precision',    'eval.run',          'Accuracy · AI'],
            ['shap_run',          'SHAP global + per-pred explanation',            'eval.run',          'Analysis · AI'],
            ['fairness_audit',    'Disparate impact · EO gap audit',               'eval.run',          'AI · Accuracy'],
            ['plot_gen',          'Render chart (line · bar · ROC · etc.)',        'viz.render',        'All tabs'],
            ['doc_draft',         'Draft BRD/FRD/HLD/LLD/SAD/ADR',                 'doc.write',         'Architecture'],
            ['adr_check',         'Validate proposal against existing ADRs',       'doc.read',          'Architecture'],
            ['test_gen',          'Generate test cases per tier',                  'test.write',        'Testing'],
            ['test_run',          'Run a test suite + report',                     'test.run',          'Testing'],
            ['model_card_gen',    'Draft model card per §64.21',                   'doc.write',         'AI'],
            ['alert_fire',        'Trigger monitoring alert',                      'alert.fire',        'Monitor'],
            ['incident_draft',    'Open / update an incident',                     'incident.write',    'Monitor · BCM'],
            ['persona_gen',       'Synthesize persona + scenario',                 'narrative.gen',     'Demo'],
            ['demo_simulate',     'Simulate the demo path',                        'narrative.gen',     'Demo'],
            ['progress_report',   'Generate per-dept progress report',             'report.write',      'Monitor · Bot'],
            ['audit_query',       'Read decision audit rows by request_id',        'audit.read',       'AI · Compliance'],
            ['rollback_plan',     'Build + execute reversal plan',                 'agent.act',         'Architecture · BCM'],
            ['chat_search',       'Search chat history in vector DB',              'chat.read',         'Bot · Chat'],
            ['cost_estimate',     'Estimate token + compute cost for a plan',      'finops.read',       'Architecture · Bot'],
          ]}
        />
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Per global §67 5-OS layering — MCP is one of 5 OS layers. Tool registry: <code>GET /api/v1/mcp/tools</code>.
        </p>
      </Section>

      {/* 5. Council pattern detail */}
      <Section title="Council pattern — Author · Reviewer · Chair" color="#ec4899">
        <Table
          columns={['Role', 'Model family example', 'Responsibility', 'Failure mode it catches']}
          rows={[
            ['Author',   'Claude · GPT-4 · LLaMA-3 70B',  'Generates first-pass response via MCP tools',  'Off-topic · missed context'],
            ['Reviewer', 'Different family (e.g., Mistral · Gemini)', 'Critiques + flags hallucination', 'Hallucination · scope violation'],
            ['Chair',    'Operator-chosen judge model',   'Resolves disagreement + picks final',          'Group-think · correlated bias'],
            ['Optional 4th', 'Domain-specialist (e.g., regulatory)', 'Inserts compliance check',         'Regulatory blind spot'],
          ]}
        />
        <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Per global §64.43 #2 + §50.3 — different model lineages reduce blind spots; mandatory for non-trivial decisions.
        </p>
      </Section>

      {/* 6. Demo on a specific process */}
      <Section title="Demonstrate — pick a process, see Agentic AI act" color="#10b981">
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#475569' }}>
          Open any of these processes to see the same banking-tab structure — every tab gets Agentic + MCP + Council assist.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {allProcesses.slice(0, 8).map(({ dept, proc }) => {
            const slug = (proc.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            return (
              <li key={`${dept.id}-${slug}`} style={{ marginBottom: 4 }}>
                <Link to={`/bank/dept/${dept.id}/B2C/${slug}`} style={{ color: '#1e40af', textDecoration: 'underline' }}>
                  #{dept.id} {dept.name.slice(0, 30)} → {proc.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
