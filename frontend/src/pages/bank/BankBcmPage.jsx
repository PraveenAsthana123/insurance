// Business Continuity Manager (BCM) UI.
// Operator brief:
//   - Any high-priority issue across any department must appear here
//   - Same ticket must also appear in the dept's own Incidents tab
//   - Team member can pick (assign to me) OR let AI solve
//
// Cross-dept aggregator. Per §57.7 row data is Pending until /api/v1/incidents
// is wired. Per §38.3 every assign/resolve action will land an audit row.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#f1f5f9', fg: '#475569' },
    success: { bg: '#dcfce7', fg: '#166534' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
    danger:  { bg: '#fee2e2', fg: '#991b1b' },
    info:    { bg: '#dbeafe', fg: '#1e40af' },
    purple:  { bg: '#ede9fe', fg: '#5b21b6' },
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

function MetricTile({ label, value, sub, color }) {
  return (
    <div style={{
      padding: 14, background: '#fff',
      border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function BankBcmPage() {
  const { bp } = useOutletContext();
  const depts = bp?.department_catalog || [];
  const [actions, setActions] = useState([]);

  const handleAssignToMe = (incidentId, deptName) => {
    setActions((a) => [...a, {
      id: Date.now(), action: 'assign-to-me', incidentId, deptName,
      status: 'pending', timestamp: new Date().toLocaleTimeString(),
    }]);
  };

  const handleAiSolve = (incidentId, deptName) => {
    setActions((a) => [...a, {
      id: Date.now(), action: 'ai-solve', incidentId, deptName,
      status: 'pending', timestamp: new Date().toLocaleTimeString(),
    }]);
  };

  // Stub incident rows — one per dept for visibility. Real data Pending.
  const incidents = depts.map((d, i) => ({
    id: `INC-${d.id}-${(i + 1).toString().padStart(3, '0')}`,
    deptId: d.id,
    deptName: d.name,
    severity: 'pending',
    summary: null,
    opened: null,
    sla: null,
    owner: null,
  }));

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🛡️ Business Continuity Manager</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
          Cross-department high-priority incidents. Every P1/P2 ticket here also appears in the respective department's Incidents tab.
        </p>
      </div>

      {/* 1. Top-line metrics */}
      <Section title="Cross-department posture" color="#dc2626">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
        }}>
          <MetricTile label="P1 open (cross-dept)"      value={<Pending />} sub="across all depts" color="#dc2626" />
          <MetricTile label="P2 open"                    value={<Pending />} sub="across all depts" color="#f59e0b" />
          <MetricTile label="MTTD (24h)"                 value={<Pending />} sub="mean time to detect" color="#3b82f6" />
          <MetricTile label="MTTR (24h)"                 value={<Pending />} sub="mean time to resolve" color="#10b981" />
          <MetricTile label="AI-resolved (24h)"          value={<Pending />} sub="autonomous resolution rate" color="#8b5cf6" />
          <MetricTile label="Depts affected"             value={<Pending />} sub={`of ${depts.length} depts`} color="#0ea5e9" />
        </div>
      </Section>

      {/* 2. High-priority incident queue */}
      <Section
        title="High-priority incident queue (cross-dept)"
        subtitle="Same row appears in each dept's Incidents tab under Monitor Hub."
        color="#dc2626"
      >
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Incident', 'Dept', 'Severity', 'Summary', 'Opened', 'SLA', 'Owner', 'Action'].map((c) => (
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
              {incidents.slice(0, 12).map((inc) => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', color: '#0f172a' }}>
                    <code style={{ fontSize: 11 }}>{inc.id}</code>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#0f172a' }}>
                    <strong>#{inc.deptId}</strong> {(inc.deptName || '').slice(0, 24)}
                  </td>
                  <td style={{ padding: '8px 12px' }}><Pending /></td>
                  <td style={{ padding: '8px 12px' }}><Pending /></td>
                  <td style={{ padding: '8px 12px' }}><Pending /></td>
                  <td style={{ padding: '8px 12px' }}><Pending /></td>
                  <td style={{ padding: '8px 12px' }}><Pending /></td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleAssignToMe(inc.id, inc.deptName)}
                        title="Assign this incident to me"
                        style={{
                          padding: '3px 8px', fontSize: 10, fontWeight: 600,
                          background: '#1e40af', color: '#fff',
                          border: 'none', borderRadius: 4, cursor: 'pointer',
                        }}
                      >👤 Take</button>
                      <button
                        onClick={() => handleAiSolve(inc.id, inc.deptName)}
                        title="Let the AI auto-remediate this incident"
                        style={{
                          padding: '3px 8px', fontSize: 10, fontWeight: 600,
                          background: '#8b5cf6', color: '#fff',
                          border: 'none', borderRadius: 4, cursor: 'pointer',
                        }}
                      >🤖 AI</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Wire to <code>GET /api/v1/incidents?severity=P1,P2</code> · cells populate from live ticketing.
        </p>
      </Section>

      {/* 3. Routing rules (which incidents the BCM owns) */}
      <Section title="Routing rules — what lands here" color="#0ea5e9">
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Trigger', 'Severity', 'Auto-escalate to BCM?', 'Also visible in']
                  .map((c) => (
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
              {[
                ['Service down (5xx > 5%)',                  <Badge key="b1" tone="danger">P1</Badge>,  'Yes',                 'Dept #N Incidents tab + #incidents channel'],
                ['Regulator-visible breach',                  <Badge key="b2" tone="danger">P1</Badge>,  'Yes + DPO + legal',   'Dept Incidents tab + Compliance channel'],
                ['Latency p95 > SLA',                         <Badge key="b3" tone="warning">P2</Badge>, 'Yes',                 'Dept Incidents tab + #ops channel'],
                ['Fairness regression (DI < 0.80)',            <Badge key="b4" tone="warning">P2</Badge>, 'Yes',                 'Dept Incidents tab + #compliance channel'],
                ['Drift detected (PSI > 0.20)',               <Badge key="b5" tone="info">P3</Badge>,    'Only if cross-dept',  'Dept Incidents tab + #ai-team channel'],
                ['Cost overrun (> 20%)',                      <Badge key="b6" tone="info">P3</Badge>,    'Only if multi-dept',  'Dept Incidents tab + #finops channel'],
                ['Cyber alert (high severity)',               <Badge key="b7" tone="danger">P1</Badge>,  'Yes',                 'Dept 20 Cybersecurity tab + BCM + SOC'],
                ['Multi-dept dependency outage',              <Badge key="b8" tone="danger">P1</Badge>,  'Yes',                 'All affected dept Incidents tabs'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 12px', color: '#0f172a' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 4. Assignment / AI-solve actions panel */}
      <Section title="Resolution actions — team member or AI" color="#8b5cf6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{
            padding: 12, background: '#dbeafe',
            border: '1px solid #93c5fd', borderRadius: 8,
          }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#1e40af' }}>
              👤 Team member takes it
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#1e3a8a' }}>
              <li>Click <strong>Take</strong> in the queue · assignment + ack row written</li>
              <li>Open the dept's Incidents tab to work it</li>
              <li>Runbook + linked dashboards auto-opened</li>
              <li>Status updates flow back to BCM + dept</li>
              <li>SLA timer + on-call handoff if breach</li>
            </ul>
          </div>
          <div style={{
            padding: 12, background: '#ede9fe',
            border: '1px solid #c4b5fd', borderRadius: 8,
          }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#5b21b6' }}>
              🤖 AI auto-remediation
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#4c1d95' }}>
              <li>Click <strong>AI</strong> · agent invoked with scope token (§42 gated)</li>
              <li>Confidence ≥ 0.85 → auto-execute remediation plan</li>
              <li>0.5–0.85 → propose plan + human approval</li>
              <li>&lt; 0.5 → reject + page on-call</li>
              <li>All actions logged in §38.3 decision audit · rollback path tested</li>
            </ul>
          </div>
        </div>

        {actions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>Recent actions ({actions.length})</h4>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Time', 'Action', 'Incident', 'Dept', 'Status'].map((c) => (
                      <th key={c} style={{
                        textAlign: 'left', padding: '6px 10px', fontSize: 10, fontWeight: 700,
                        color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0',
                      }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px' }}>{a.timestamp}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {a.action === 'ai-solve'
                          ? <Badge tone="purple">🤖 AI auto-remediate</Badge>
                          : <Badge tone="info">👤 Assign to me</Badge>}
                      </td>
                      <td style={{ padding: '6px 10px' }}><code style={{ fontSize: 11 }}>{a.incidentId}</code></td>
                      <td style={{ padding: '6px 10px' }}>{a.deptName}</td>
                      <td style={{ padding: '6px 10px', color: '#f59e0b', fontStyle: 'italic' }}>
                        Pending backend wiring ({a.action === 'ai-solve'
                          ? 'POST /api/v1/incidents/:id/ai-resolve'
                          : 'POST /api/v1/incidents/:id/assign'})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* 5. Backend wiring */}
      <Section title="Backend wiring needed" color="#475569">
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Endpoint', 'Purpose'].map((c) => (
                  <th key={c} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 11,
                    color: '#475569', fontWeight: 700, borderBottom: '1px solid #e2e8f0',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['GET /api/v1/incidents?severity=P1,P2',  'Cross-dept high-priority queue'],
                ['GET /api/v1/incidents/:id',              'Incident detail'],
                ['POST /api/v1/incidents/:id/assign',      'Assign to team member'],
                ['POST /api/v1/incidents/:id/ai-resolve',  'Invoke AI auto-remediation'],
                ['GET /api/v1/incidents/dept/:id',         'Per-dept incidents (used by dept Incidents tab)'],
                ['POST /api/v1/incidents',                 'Create new incident'],
                ['WebSocket /api/v1/incidents/stream',     'Live updates'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 12px', color: '#0f172a' }}>
                      {j === 0 ? <code style={{ fontSize: 11 }}>{cell}</code> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
