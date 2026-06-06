import { useEffect, useMemo, useState } from 'react';
import { agentRoster, buildSimulation, mcpRegistry, requestTemplates } from '../data/agentGovernance';
import { apiFetch } from '../services/apiFetch';
import '../styles/agent-supervisor.css';

const statusLabels = {
  approved: 'Approved',
  done: 'Done',
  running: 'Running',
  queued: 'Queued',
  blocked: 'Blocked',
};

export default function AgentSupervisorPage() {
  const [templateId, setTemplateId] = useState(requestTemplates[0].id);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tick, setTick] = useState(0);
  const [liveReport, setLiveReport] = useState(null);
  const [liveError, setLiveError] = useState('');
  const selected = requestTemplates.find((item) => item.id === templateId) || requestTemplates[0];
  const simulation = useMemo(() => buildSimulation(selected), [selected, tick]);
  const running = simulation.filter((item) => item.state === 'running').length;
  const approved = simulation.filter((item) => item.approval === 'approved').length;
  const blocked = simulation.filter((item) => item.state === 'blocked').length;
  const mcpWorking = mcpRegistry.filter((item) => item.state === 'working-local').length;
  const liveAgents = liveReport?.heartbeats?.live ?? 0;
  const pendingTotal = liveReport?.pending_total ?? 0;
  const recentFailureCount = liveReport?.recent_failure_count ?? 0;
  const scheduleCount = liveReport?.schedules?.length ?? 0;

  useEffect(() => {
    let cancelled = false;

    async function loadLiveReport() {
      try {
        const data = await apiFetch('/api/v1/agent-supervisor/report?sample=10');
        if (!cancelled) {
          setLiveReport(data);
          setLiveError('');
        }
      } catch (error) {
        if (!cancelled) setLiveError(error.message || 'Unable to load live supervisor report');
      }
    }

    loadLiveReport();
    if (!autoRefresh) return () => { cancelled = true; };
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      loadLiveReport();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoRefresh]);

  return (
    <div className="agent-supervisor-page">
      <header className="agent-supervisor-header">
        <div>
          <p className="eyebrow">Agent Governance Control Room</p>
          <h1>Approval Agent Supervisor</h1>
          <p className="page-subtitle">
            Live execution monitor for Redis-backed agents, queues, schedules, task results, delegation, and approval-flow simulation.
          </p>
        </div>
        <div className="header-actions" aria-label="Supervisor controls">
          <label className="select-label">
            Request
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {requestTemplates.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <button type="button" className="icon-button" onClick={() => setTick((value) => value + 1)} title="Refresh simulation">
            ↻
          </button>
          <button
            type="button"
            className={'toggle-button' + (autoRefresh ? ' active' : '')}
            onClick={() => setAutoRefresh((value) => !value)}
          >
            Auto
          </button>
        </div>
      </header>

      <section className="supervisor-kpi-grid" aria-label="Agent supervisor summary">
        <MetricCard label="Live Agents" value={liveAgents} detail={liveReport?.status === 'ok' ? 'fresh Redis heartbeats' : 'Redis unavailable or not started'} tone={liveAgents ? 'green' : 'amber'} />
        <MetricCard label="Pending Tasks" value={pendingTotal} detail="simple + council + test queues" tone={pendingTotal ? 'blue' : 'neutral'} />
        <MetricCard label="Recent Failures" value={recentFailureCount} detail="sampled completed results" tone={recentFailureCount ? 'red' : 'green'} />
        <MetricCard label="Schedules" value={scheduleCount} detail="registered recurring jobs" tone={scheduleCount ? 'blue' : 'amber'} />
        <MetricCard label="MCP Working" value={`${mcpWorking}/${mcpRegistry.length}`} detail="local capabilities visible" tone="amber" />
      </section>

      <LiveSupervisorPanel report={liveReport} error={liveError} />

      <section className="request-panel">
        <div>
          <h2>{selected.title}</h2>
          <p>{selected.request}</p>
        </div>
        <div className={`risk-pill risk-${selected.risk}`}>{selected.risk} risk</div>
      </section>

      <div className="supervisor-layout">
        <section className="timeline-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Request Flow</p>
              <h2>Approval → specialist → next approval</h2>
            </div>
            <span className="refresh-note">updates every 5s when Auto is active</span>
          </div>
          <div className="agent-timeline">
            {simulation.map((step) => (
              <TimelineStep key={step.id} step={step} agent={agentRoster.find((item) => item.id === step.agentId)} />
            ))}
          </div>
        </section>

        <aside className="agent-side-panel">
          <section className="side-section">
            <p className="eyebrow">Agent Collection</p>
            <h2>Roles and handoff state</h2>
            <div className="agent-list">
              {agentRoster.map((agent) => (
                <div key={agent.id} className="agent-row">
                  <div className={`agent-dot status-${agent.status}`} />
                  <div>
                    <strong>{agent.name}</strong>
                    <p>{agent.role}</p>
                    <span>{agent.sla}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="side-section">
            <p className="eyebrow">MCP And Tool Status</p>
            <h2>Capability monitor</h2>
            <div className="mcp-list">
              {mcpRegistry.map((server) => (
                <div key={server.id} className="mcp-row">
                  <div>
                    <strong>{server.name}</strong>
                    <p>{server.monitor}</p>
                  </div>
                  <span className={`state-chip state-${server.state}`}>{server.state}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}


function LiveSupervisorPanel({ report, error }) {
  const queues = report?.queues || {};
  const heartbeats = report?.heartbeats?.rows || [];
  const recentResults = flattenRecentResults(report?.recent_results || {});
  const recommendations = report?.recommendations || [];
  const visibility = report?.operations_visibility || {};
  const scores = visibility.scores || {};
  const tracking = visibility.tracking || {};
  const operations = visibility.operations || [];
  const traces = visibility.tracing || [];
  const reporting = visibility.reporting || [];
  const insights = visibility.insights || [];
  const brutalFeedback = visibility.brutal_feedback || [];
  const failureTaxonomy = visibility.failure_taxonomy || {};
  const failureOwners = visibility.failure_owners || {};

  return (
    <section className="live-supervisor-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live Execution</p>
          <h2>Agents, queues, communication, outputs</h2>
        </div>
        <span className={`state-chip state-${report?.status === 'ok' ? 'done' : 'blocked'}`}>
          {report?.status || 'loading'}
        </span>
      </div>

      {error && <div className="live-error">{error}</div>}
      {report?.detail && <p className="live-detail">{report.detail} Last refresh: {formatDate(report.generated_at)}</p>}

      <div className="visibility-score-grid" aria-label="Advanced visibility scores">
        <ScoreCard label="Health" value={scores.health} detail="fleet freshness + queue state + failures" />
        <ScoreCard label="Execution" value={scores.execution} detail="success rate + completion + movement" />
        <ScoreCard label="Quality" value={scores.quality} detail="failure pressure + catalog coverage" />
        <ScoreCard label="Completion" value={scores.completion} detail="done work vs pending backlog" />
        <ScoreCard label="Observability" value={scores.observability} detail="heartbeats + outputs + schedules" />
      </div>

      <div className="ops-cockpit-grid">
        <div className="live-card cockpit-card">
          <h3>Tracking</h3>
          <div className="tracking-grid">
            <TrackingMetric label="Live" value={tracking.live_agents} />
            <TrackingMetric label="Running" value={tracking.running_agents} />
            <TrackingMetric label="Stale" value={tracking.stale_agents} />
            <TrackingMetric label="Processed" value={tracking.processed_total} />
            <TrackingMetric label="Completed" value={tracking.completed_total} />
            <TrackingMetric label="Success" value={tracking.recent_success_rate == null ? '-' : `${tracking.recent_success_rate}%`} />
          </div>
        </div>

        <div className="live-card cockpit-card">
          <h3>Intelligent Insights</h3>
          <ul className="insight-list">
            {(insights.length ? insights : ['No insight generated yet. Run tasks to build a useful signal.']).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="live-card cockpit-card feedback-card">
          <h3>Brutal Feedback</h3>
          <ul className="insight-list">
            {(brutalFeedback.length ? brutalFeedback : ['No feedback generated yet.']).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="failure-grid">
        <div className="live-card">
          <h3>Failure Taxonomy</h3>
          <div className="taxonomy-list">
            {Object.entries(failureTaxonomy).length ? Object.entries(failureTaxonomy).map(([name, count]) => (
              <div key={name} className="queue-row">
                <strong>{name}</strong>
                <span>{count}</span>
              </div>
            )) : <p className="empty-note">No durable failure categories yet.</p>}
          </div>
        </div>

        <div className="live-card">
          <h3>Failure Owners</h3>
          <div className="taxonomy-list">
            {Object.entries(failureOwners).length ? Object.entries(failureOwners).map(([name, count]) => (
              <div key={name} className="queue-row">
                <strong>{name}</strong>
                <span>{count}</span>
              </div>
            )) : <p className="empty-note">No owner routing yet.</p>}
          </div>
        </div>
      </div>

      <div className="live-table-wrap">
        <h3>Operations Health Check</h3>
        <table className="live-table compact-table">
          <thead>
            <tr>
              <th>Operation</th>
              <th>Status</th>
              <th>Metric</th>
            </tr>
          </thead>
          <tbody>
            {operations.length ? operations.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td><span className={`ops-status ops-${item.status}`}>{item.status}</span></td>
                <td>{item.metric}</td>
              </tr>
            )) : <tr><td colSpan="3">No operation checks available yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="live-grid">
        <div className="live-card">
          <h3>Task Queues</h3>
          <div className="queue-list">
            {Object.entries(queues).map(([name, row]) => (
              <div key={name} className="queue-row">
                <strong>{name}</strong>
                <span>pending {row.pending}</span>
                <span>done {row.completed}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="live-card">
          <h3>Delegation By Kind</h3>
          <div className="kind-list">
            {Object.entries(report?.heartbeats?.by_kind || {}).length ? Object.entries(report.heartbeats.by_kind).map(([kind, count]) => (
              <div key={kind} className="queue-row">
                <strong>{kind}</strong>
                <span>{count} live</span>
              </div>
            )) : <p className="empty-note">No live heartbeat yet.</p>}
          </div>
        </div>

        <div className="live-card">
          <h3>Recommendations</h3>
          <ul className="recommendation-list">
            {recommendations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="live-table-wrap">
        <h3>Working Agents</h3>
        <table className="live-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Kind</th>
              <th>State</th>
              <th>Processed</th>
              <th>Age</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            {heartbeats.length ? heartbeats.slice(0, 30).map((row) => (
              <tr key={row.key || row.agent_id}>
                <td>{row.agent_id}</td>
                <td>{row.kind}</td>
                <td>{row.state}</td>
                <td>{row.processed}</td>
                <td>{row.age_sec == null ? '-' : `${row.age_sec}s`}</td>
                <td>{row.last_task_id || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan="6">No live agents reported. Start workers with ./scripts/agent_fleet.sh start-simple or start-100-kivi.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="live-table-wrap">
        <h3>Tracing</h3>
        <table className="live-table">
          <thead>
            <tr>
              <th>Trace</th>
              <th>Queue</th>
              <th>Task</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Failure</th>
              <th>Owner</th>
              <th>Duration</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {traces.length ? traces.slice(0, 25).map((item) => (
              <tr key={`${item.trace_id}-${item.queue}-${item.task_id}`}>
                <td>{item.trace_id}</td>
                <td>{item.queue}</td>
                <td>{item.task_id}</td>
                <td>{item.agent_id}</td>
                <td><span className={`ops-status ops-${item.status}`}>{item.status}</span></td>
                <td>{item.failure_category || '-'}</td>
                <td>{item.owner || '-'}</td>
                <td>{item.duration_ms == null ? '-' : `${item.duration_ms}ms`}</td>
                <td>{item.tokens ?? '-'}</td>
              </tr>
            )) : <tr><td colSpan="9">No trace rows in sampled results yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="live-table-wrap">
        <h3>Reporting Catalog</h3>
        <table className="live-table compact-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Cadence</th>
              <th>Owner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reporting.length ? reporting.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.cadence}</td>
                <td>{item.owner}</td>
                <td><span className={`ops-status ops-${String(item.status).replace(/ /g, '-')}`}>{item.status}</span></td>
              </tr>
            )) : <tr><td colSpan="4">No reporting definitions available yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="live-table-wrap">
        <h3>Recent Outputs</h3>
        <table className="live-table">
          <thead>
            <tr>
              <th>Queue</th>
              <th>Task</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Department</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {recentResults.length ? recentResults.slice(0, 20).map((item) => (
              <tr key={`${item.queue}-${item.taskId}-${item.index}`}>
                <td>{item.queue}</td>
                <td>{item.taskId}</td>
                <td>{item.agentId}</td>
                <td>{item.ok}</td>
                <td>{item.department}</td>
                <td>{item.output}</td>
              </tr>
            )) : (
              <tr><td colSpan="6">No completed output in the sampled result queues yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function flattenRecentResults(results) {
  return Object.entries(results).flatMap(([queue, rows]) => (rows || []).map((row, index) => ({
    queue,
    index,
    taskId: row.task_id || row.id || '-',
    agentId: row.agent_id || row.agent || '-',
    ok: String(row.ok ?? row.status ?? '-'),
    department: row.department || row.dept || '-',
    output: summarizeOutput(row),
  })));
}

function summarizeOutput(row) {
  const value = row.output || row.result || row.summary || row.error || row.response || row.detail || '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text || '-';
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}


function ScoreCard({ label, value, detail }) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return (
    <div className={`score-card score-${scoreTone(safeValue)}`}>
      <div className="score-ring" style={{ '--score': safeValue }}>
        <strong>{safeValue}</strong>
        <span>/100</span>
      </div>
      <div>
        <h3>{label}</h3>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function TrackingMetric({ label, value }) {
  return (
    <div className="tracking-metric">
      <span>{label}</span>
      <strong>{value ?? '-'}</strong>
    </div>
  );
}

function scoreTone(value) {
  if (value >= 85) return 'green';
  if (value >= 70) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

function MetricCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function TimelineStep({ step, agent }) {
  const duration = step.durationMs ? `${Math.round(step.durationMs / 1000)}s` : 'waiting';
  return (
    <article className={`timeline-step step-${step.state}`}>
      <div className="timeline-index">{step.order}</div>
      <div className="timeline-body">
        <div className="timeline-title-row">
          <div>
            <h3>{step.title}</h3>
            <p>{agent?.name || step.agentId} · {duration}</p>
          </div>
          <div className="timeline-badges">
            <span className={`state-chip state-${step.state}`}>{statusLabels[step.state] || step.state}</span>
            <span className={`approval-chip approval-${step.approval}`}>{step.approval}</span>
          </div>
        </div>
        <div className="io-grid">
          <div>
            <span>Input</span>
            <p>{step.input}</p>
          </div>
          <div>
            <span>Output</span>
            <p>{step.output}</p>
          </div>
        </div>
        <div className="handoff-row">
          <span>Next agent</span>
          <strong>{step.nextAgent}</strong>
        </div>
        <div className="evidence-row">
          {step.evidence.map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </article>
  );
}
