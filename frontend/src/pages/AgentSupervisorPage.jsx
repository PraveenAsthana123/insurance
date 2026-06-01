import { useEffect, useMemo, useState } from 'react';
import { agentRoster, buildSimulation, mcpRegistry, requestTemplates } from '../data/agentGovernance';
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
  const selected = requestTemplates.find((item) => item.id === templateId) || requestTemplates[0];
  const simulation = useMemo(() => buildSimulation(selected), [selected, tick]);
  const running = simulation.filter((item) => item.state === 'running').length;
  const approved = simulation.filter((item) => item.approval === 'approved').length;
  const blocked = simulation.filter((item) => item.state === 'blocked').length;
  const mcpWorking = mcpRegistry.filter((item) => item.state === 'working-local').length;

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 5000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  return (
    <div className="agent-supervisor-page">
      <header className="agent-supervisor-header">
        <div>
          <p className="eyebrow">Agent Governance Control Room</p>
          <h1>Approval Agent Supervisor</h1>
          <p className="page-subtitle">
            Simulates request approval, next-agent approval, specialist execution, memory handoff, MCP status, and review gates.
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
        <MetricCard label="Agents" value={agentRoster.length} detail="approval, review, search, code, advisor, error, memory, MCP" />
        <MetricCard label="Approval Gates" value={approved} detail="initial and next-agent approvals" tone="green" />
        <MetricCard label="Running" value={running} detail="active execution steps" tone="blue" />
        <MetricCard label="Blocked" value={blocked} detail="waiting for evidence or approval" tone="red" />
        <MetricCard label="MCP Working" value={`${mcpWorking}/${mcpRegistry.length}`} detail="local capabilities visible" tone="amber" />
      </section>

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
