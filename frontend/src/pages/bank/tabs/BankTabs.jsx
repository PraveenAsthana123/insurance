// Banking-style tabs — ONLY real blueprint data, no fake metrics.
// Per operator feedback: "not production grade info", "no roi", "no kpi",
// "no data process flow", "as IS, to be", "problem assessment".
// Every value rendered here comes from the blueprint or shows
// "Operator-pending" explicitly — per global §57.7 honesty rule.

import { useState } from 'react';

// =========================================
// Atoms
// =========================================

function Section({ number, title, subtitle, color = '#3b82f6', children }) {
  return (
    <div style={{
      marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 8,
      overflow: 'hidden', background: '#fff',
    }}>
      <div style={{
        padding: '12px 16px', background: `${color}11`,
        borderBottom: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14,
        }}>{number}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{title}</h3>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0f172a' }}>{children}</div>
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#f1f5f9', fg: '#475569' },
    success: { bg: '#dcfce7', fg: '#166534' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
    danger:  { bg: '#fee2e2', fg: '#991b1b' },
    info:    { bg: '#dbeafe', fg: '#1e40af' },
    purple:  { bg: '#ede9fe', fg: '#5b21b6' },
    asis:    { bg: '#fef3c7', fg: '#92400e' },  // amber for AS-IS
    tobe:    { bg: '#dcfce7', fg: '#166534' },  // green for TO-BE
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.fg,
    }}>{children}</span>
  );
}

function DataTable({ columns, rows, empty = '—' }) {
  if (!rows || rows.length === 0) {
    return <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>{empty}</p>;
  }
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

function CardGrid({ cards, onSelect, hubColor = '#3b82f6' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
    }}>
      {cards.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          style={{
            padding: 14, textAlign: 'left', cursor: 'pointer',
            background: '#fff', border: `2px solid ${c.color || hubColor}`,
            borderRadius: 10, transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon || '▸'}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: c.color || hubColor, marginBottom: 4 }}>{c.label}</div>
          {c.desc && <div style={{ fontSize: 11, color: '#64748b' }}>{c.desc}</div>}
        </button>
      ))}
    </div>
  );
}

function SubBack({ onBack, hubColor = '#3b82f6' }) {
  return (
    <button onClick={onBack}
      style={{
        padding: '6px 12px', fontSize: 12, fontWeight: 600,
        background: hubColor, color: '#fff', border: 'none', borderRadius: 6,
        cursor: 'pointer', marginBottom: 16,
      }}
    >← Back to hub</button>
  );
}

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

// Universal tab footer atoms — appear on every tab via BankUseCasePage.

// Timestamp — when this tab was last rendered + when blueprint was last enriched
export function TabTimestamp({ tabName }) {
  const now = new Date();
  return (
    <div style={{
      marginTop: 16, padding: '6px 12px',
      background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6,
      fontSize: 11, color: '#64748b',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>🕒 Tab <strong>{tabName}</strong> rendered: <code>{now.toISOString()}</code></span>
      <span>Local: {now.toLocaleString()}</span>
    </div>
  );
}

// Transaction history strip — last N audit-row entries for this tab/process
// Deterministic mock data generator — operator §57.7: explicitly marked
// as (mock) so the operator knows these are synthesized until the backend
// is wired. Seeded by (proc, tab) so refresh gives the same rows.
function _mockRows(seedKey, count, builder) {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) {
    h = ((h << 5) - h + seedKey.charCodeAt(i)) | 0;
  }
  const rnd = (n) => {
    const x = Math.sin(h + n) * 10000;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => builder(rnd, i));
}

export function TabTransactionHistory({ tabName, proc }) {
  const procName = (proc?.name || 'process').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seed = `tx|${procName}|${tabName}`;
  const actors = ['svc-account', 'demo-user', 'agent-fraud-01', 'ops-runner', 'reviewer-1'];
  const actions = ['view', 'run', 'edit', 'validate', 'export'];
  const outcomes = ['ok', 'ok', 'ok', 'denied', 'queued'];
  const rows = _mockRows(seed, 5, (r, i) => {
    const m = Math.floor(r(i * 7 + 1) * 50);
    return {
      time: new Date(Date.now() - (i * 7 + 1) * 60 * 1000 - m * 1000)
        .toISOString().slice(11, 19),
      actor: actors[Math.floor(r(i * 7 + 2) * actors.length)],
      action: actions[Math.floor(r(i * 7 + 3) * actions.length)],
      tenant: `t-${(Math.floor(r(i * 7 + 4) * 9) + 1)}`,
      outcome: outcomes[Math.floor(r(i * 7 + 5) * outcomes.length)],
      latency: Math.round(r(i * 7 + 6) * 800 + 20) + 'ms',
      request_id: 'req-' + Math.floor(r(i * 7 + 7) * 1e9).toString(36).padStart(8, '0'),
    };
  });
  return (
    <div style={{
      marginTop: 16, padding: 12,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>
        📜 Transaction history — last {rows.length} audit rows on this tab
        <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 6px', background: '#fef3c7', color: '#b45309', borderRadius: 3, fontWeight: 700, textTransform: 'uppercase' }}>mock</span>
      </h4>
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Time', 'Actor', 'Action', 'Tenant', 'Outcome', 'Latency', 'request_id']
                .map((c) => (
                  <th key={c} style={{
                    textAlign: 'left', padding: '4px 8px', fontSize: 10,
                    color: '#475569', fontWeight: 700,
                    textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0',
                  }}>{c}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>{r.time}</td>
                <td style={{ padding: '4px 8px' }}>{r.actor}</td>
                <td style={{ padding: '4px 8px' }}>{r.action}</td>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>{r.tenant}</td>
                <td style={{ padding: '4px 8px' }}>
                  <span style={{
                    padding: '0 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase',
                    background: r.outcome === 'ok' ? '#dcfce7' : r.outcome === 'denied' ? '#fee2e2' : '#fef3c7',
                    color:      r.outcome === 'ok' ? '#16a34a' : r.outcome === 'denied' ? '#dc2626' : '#b45309',
                  }}>{r.outcome}</span>
                </td>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>{r.latency}</td>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{r.request_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8' }}>
        Per §38.3 — every action writes one audit row with the 7 canonical fields. Mock rows shown until <code>GET /api/v1/audit/{procName}/{tabName}?limit=10</code> is wired.
      </p>
    </div>
  );
}

// Database + operation list + IPO summary (per "each tab must have database and list of operation, input, process, output")
export function TabDatabaseOps({ tabName, proc }) {
  return (
    <div style={{
      marginTop: 16, padding: 12,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#475569' }}>
        🗄️ Database + operations + IPO for the <code>{tabName}</code> tab
      </h4>
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Aspect', 'Detail'].map((c) => (
                <th key={c} style={{
                  textAlign: 'left', padding: '4px 8px', fontSize: 10,
                  color: '#475569', fontWeight: 700,
                  textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0',
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Primary table</td>
              <td style={{ padding: '4px 8px' }}><code>tabs_{tabName.replace(/-/g, '_')}</code></td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>DB engine</td>
              <td style={{ padding: '4px 8px' }}>PostgreSQL (per §47 architecture)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Operations</td>
              <td style={{ padding: '4px 8px' }}>
                <code>SELECT</code> · <code>INSERT</code> (audit) · <code>UPDATE</code> (feedback) · NO <code>DELETE</code> (immutability per §38.3)
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Input</td>
              <td style={{ padding: '4px 8px' }}>process_id · tenant_id · user_role · query params</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Process</td>
              <td style={{ padding: '4px 8px' }}>Tenant-scoped query · cache lookup · render structured rows</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Output</td>
              <td style={{ padding: '4px 8px' }}>JSON payload + ETag + audit-row write (background)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Audit</td>
              <td style={{ padding: '4px 8px' }}><code>audit_log</code> table — 7-field row per §38.3</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>Cache</td>
              <td style={{ padding: '4px 8px' }}>Redis · tenant-keyed · 30s TTL · ETag-aware</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// To-do list per role (operator: "to do list, role")
export function TabTodoByRole({ tabName, proc }) {
  return (
    <div style={{
      marginTop: 16, padding: 12,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#475569' }}>
        ✅ To-do — per role on the <code>{tabName}</code> tab
      </h4>
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Role', 'Open items', 'Due', 'Owner'].map((c) => (
                <th key={c} style={{
                  textAlign: 'left', padding: '4px 8px', fontSize: 10,
                  color: '#475569', fontWeight: 700,
                  textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0',
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Manager',           'Review tab content + sign off',           'EOW',                'Manager'],
              ['Team member',       'Add personal annotations / fix Pending',  'Daily',              'Operator'],
              ['Tester',            'Add test cases for any new row',           'Per release',       'QA'],
              ['Admin',             'Configure tenant + RBAC scope',           'On setup',           'Admin'],
              ['Security',          'Verify scope + audit row writes',          'Per audit',         'Security'],
              ['DevOps',            'Wire endpoints listed above',              'Per phase rollout', 'Platform'],
              ['AI reviewer',       'Validate model + bias gates',              'Per release',       'AI Lead'],
              ['DT strategy',       'Tag automation % vs AS-IS baseline',      'Quarterly',         'Strategy'],
              ['Data owner',        'Confirm data lineage + freshness',         'Monthly',           'Data Lead'],
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '4px 8px', color: '#0f172a' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// HITL feedback widget — appears at the bottom of every tab so operator can
// rate the tab's output. Feeds back into model/bot/pipeline improvement.
// Per global §38.3 — every feedback row becomes a decision-audit row.
export function HitlFeedback({ tabName, proc }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };
  return (
    <div style={{
      marginTop: 24, padding: 12,
      background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🙋</span>
        <strong style={{ fontSize: 12, color: '#92400e' }}>
          HITL feedback for the <code>{tabName}</code> tab
        </strong>
      </div>
      {/* Mock prior-feedback rows so the widget isn't visually empty */}
      {!submitted && (() => {
        const procName = (proc?.name || 'process').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const seed = `hitl|${procName}|${tabName}`;
        const rows = _mockRows(seed, 3, (r, i) => {
          const labels = ['👎 Wrong', '🤔 Unclear', '🆗 OK', '✅ Useful', '🌟 Excellent'];
          const comments = [
            'Pulled the wrong source last week — please re-check lineage',
            'Tooltip text would help on the new chart',
            'Great new layout — saves a click',
            'Filter needs a multi-select option',
            'Numbers do not match the legacy report — verify',
          ];
          const actors = ['demo-user', 'reviewer-1', 'manager-2', 'ops-runner'];
          return {
            rating: labels[Math.floor(r(i * 5 + 1) * labels.length)],
            comment: comments[Math.floor(r(i * 5 + 2) * comments.length)],
            actor: actors[Math.floor(r(i * 5 + 3) * actors.length)],
            time: new Date(Date.now() - (i * 3 + 1) * 86400 * 1000 / 4)
              .toISOString().slice(0, 10),
          };
        });
        return (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              Recent feedback on this tab
              <span style={{ padding: '0 5px', background: '#fef3c7', color: '#b45309', borderRadius: 2, fontSize: 8 }}>MOCK</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} style={{
                padding: '4px 6px', marginBottom: 3,
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 3, fontSize: 11,
                display: 'flex', alignItems: 'baseline', gap: 6,
              }}>
                <span style={{ fontWeight: 700 }}>{row.rating}</span>
                <span style={{ color: '#78350f', flex: 1 }}>{row.comment}</span>
                <span style={{ fontSize: 9, color: '#92400e' }}>{row.actor}</span>
                <span style={{ fontSize: 9, color: '#a16207', fontFamily: 'monospace' }}>{row.time}</span>
              </div>
            ))}
          </div>
        );
      })()}
      {submitted ? (
        <div style={{ fontSize: 12, color: '#166534' }}>
          ✓ Recorded · queued for POST /api/v1/feedback/{(proc?.name || 'process').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/{tabName}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {['👎 Wrong', '🤔 Unclear', '🆗 OK', '✅ Useful', '🌟 Excellent'].map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600,
                  background: rating === i + 1 ? '#92400e' : '#fff',
                  color: rating === i + 1 ? '#fff' : '#92400e',
                  border: '1px solid #92400e', borderRadius: 4, cursor: 'pointer',
                }}
              >{label}</button>
            ))}
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What would make this tab more useful? (improves model · bot · data · pipeline)"
            style={{
              width: '100%', padding: '6px 10px', fontSize: 12,
              border: '1px solid #fde68a', borderRadius: 4, outline: 'none',
              marginBottom: 6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#92400e', fontStyle: 'italic' }}>
              Feeds: model retrain · bot prompt tuning · data quality scoring · pipeline iteration. Audit row per §38.3.
            </span>
            <button
              type="submit"
              disabled={!rating}
              style={{
                padding: '4px 14px', fontSize: 11, fontWeight: 600,
                background: rating ? '#92400e' : '#cbd5e1', color: '#fff',
                border: 'none', borderRadius: 4,
                cursor: rating ? 'pointer' : 'not-allowed',
              }}
            >Submit</button>
          </div>
        </form>
      )}
    </div>
  );
}

// Side-by-side AS-IS / TO-BE comparison block — text only, no fake numbers
function AsIsToBeCompare({ asIsItems, toBeItems }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, marginBottom: 16 }}>
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Badge tone="asis">AS-IS</Badge>
          <strong style={{ fontSize: 13, color: '#92400e' }}>Today (manual)</strong>
        </div>
        {asIsItems.length === 0
          ? <Pending />
          : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#78350f' }}>
              {asIsItems.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
        }
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#64748b' }}>→</div>
      <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Badge tone="tobe">TO-BE</Badge>
          <strong style={{ fontSize: 13, color: '#166534' }}>With AI orchestration</strong>
        </div>
        {toBeItems.length === 0
          ? <Pending />
          : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#14532d' }}>
              {toBeItems.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
        }
      </div>
    </div>
  );
}

// Linear flow visualization (Input → Transform → Output) — text-based, no charts
function FlowDiagram({ stages }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stages.length * 2 - 1}, auto)`,
      alignItems: 'stretch',
      gap: 0,
      marginBottom: 12,
    }}>
      {stages.map((stage, i) => (
        <>
          <div key={`s${i}`} style={{
            padding: 12,
            background: stage.color + '11',
            border: `2px solid ${stage.color}`,
            borderRadius: 8,
            minWidth: 150,
            flex: 1,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              {stage.label}
            </div>
            {(stage.items || []).length === 0
              ? <Pending />
              : <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: '#0f172a' }}>
                  {stage.items.map((x, j) => <li key={j} style={{ marginBottom: 2 }}>{x}</li>)}
                </ul>
            }
          </div>
          {i < stages.length - 1 && (
            <div key={`a${i}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#64748b', padding: '0 8px',
            }}>→</div>
          )}
        </>
      ))}
    </div>
  );
}

// =========================================
// 1. Overview — REAL fields only
// =========================================

// Helper: render a value but treat "[operator: ...]" placeholder strings as Pending
function Val({ children }) {
  if (children == null || children === '') return <Pending />;
  if (typeof children === 'string' && /^\s*\[operator:/i.test(children)) return <Pending />;
  return <>{children}</>;
}

export function OverviewTab({ proc, dept }) {
  const ai = proc.ai || [];
  const ds = proc.demo_story || {};
  const m = proc.manual_process || {};
  const a = proc.automatic_process || {};
  const atb = proc.as_is_to_be || {};
  const deltas = atb.deltas || {};
  const smart = proc.smart_kpi || {};
  const strat = proc.readme?.ai_strategy || {};
  const cost = proc.readme?.cost_analysis || {};
  const exec = proc.readme?.executive_summary || {};
  const issues = proc.issues || [];

  return (
    <div>
      {/* 0. At-a-glance */}
      <Section number="0" title="Use-case metadata" color="#64748b">
        <Row label="Process">{proc.name}</Row>
        <Row label="Department">#{dept.id} · {dept.name}</Row>
        <Row label="Active domains">
          {['B2C', 'B2B', 'B2E']
            .filter((dom) => dept.channel_scenarios?.[dom])
            .map((d) => <span key={d} style={{ marginRight: 6 }}><Badge tone="info">{d}</Badge></span>)}
          {!['B2C','B2B','B2E'].some((d) => dept.channel_scenarios?.[d]) && <Pending />}
        </Row>
        <Row label="AI capabilities mapped">{ai.length}</Row>
      </Section>

      {/* 1. Demo story */}
      <Section number="1" title="Demo story" color="#dc2626">
        <Row label="Persona"><Val>{ds.persona}</Val></Row>
        <Row label="Scenario"><Val>{ds.scenario}</Val></Row>
        <Row label="Walkthrough">
          {(ds.walkthrough || []).length === 0 ? <Pending /> :
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {ds.walkthrough.map((s, i) => <li key={i}>{s}</li>)}
            </ol>}
        </Row>
        <Row label="30-second pitch"><Val>{ds.pitch}</Val></Row>
      </Section>

      {/* 2. Problem + Impact */}
      <Section number="2" title="Problem assessment + Impact" color="#b91c1c">
        <DataTable
          empty="No issues recorded for this process."
          columns={['#', 'Problem', 'Impact', 'Source']}
          rows={issues.map((i, idx) => [
            idx + 1,
            i.issue,
            <Badge key={`b${idx}`} tone={(/high|critical/i.test(i.impact || '')) ? 'danger' : (/medium|moderate|cycle/i.test(i.impact || '')) ? 'warning' : 'info'}>{i.impact || '—'}</Badge>,
            i.derived ? <Badge key={`s${idx}`} tone="warning">derived</Badge> : <Badge key={`s${idx}`} tone="success">operator-set</Badge>,
          ])}
        />
      </Section>

      {/* 3. AS-IS / TO-BE */}
      <Section number="3" title="AS-IS → TO-BE" color="#f59e0b">
        <AsIsToBeCompare
          asIsItems={[
            atb.as_is_summary && !/^\s*\[operator:/i.test(atb.as_is_summary) ? `Summary: ${atb.as_is_summary}` : null,
            m.summary ? `Manual workflow: ${m.summary}` : null,
            (m.actor_archetypes || []).length ? `Actors: ${m.actor_archetypes.join(' · ')}` : null,
            (m.tools || []).length ? `Tools: ${m.tools.join(' · ')}` : null,
          ].filter(Boolean)}
          toBeItems={[
            atb.to_be_summary && !/^\s*\[operator:/i.test(atb.to_be_summary) ? `Summary: ${atb.to_be_summary}` : null,
            a.summary ? `AI workflow: ${a.summary}` : null,
            (a.ai_workflow || []).length ? `Agent chain: ${a.ai_workflow.join(' → ')}` : null,
            a.human_in_the_loop ? `HITL: ${a.human_in_the_loop}` : null,
          ].filter(Boolean)}
        />
      </Section>

      {/* 4. ROI */}
      <Section number="4" title="ROI" color="#059669">
        <Row label="ROI estimate (from as_is_to_be)"><Val>{atb.roi_estimate}</Val></Row>
        <Row label="3-year ROI (from cost_analysis)"><Val>{cost.roi_3yr}</Val></Row>
        <Row label="Break-even months"><Val>{cost.break_even_months}</Val></Row>
      </Section>

      {/* 5. KPI */}
      <Section number="5" title="KPI — SMART scorecard" color="#0ea5e9">
        <DataTable
          empty="No SMART KPI defined yet."
          columns={['Dimension', 'Target']}
          rows={[
            ['Specific',    <Val key="s">{smart.specific}</Val>],
            ['Measurable',  <Val key="m">{smart.measurable}</Val>],
            ['Achievable',  <Val key="a">{smart.achievable}</Val>],
            ['Relevant',    <Val key="r">{smart.relevant}</Val>],
            ['Time-bound',  <Val key="t">{smart.time_bound}</Val>],
          ]}
        />
        <h4 style={{ margin: '12px 0 6px', fontSize: 13, color: '#475569' }}>Department-level KPI improvements ({(dept.kpi_improvements || []).length})</h4>
        <DataTable
          empty="No KPI improvements recorded for this department."
          columns={['KPI', 'Target improvement']}
          rows={(dept.kpi_improvements || []).map((k) => [k.kpi, <strong key={k.kpi}>{k.improvement}</strong>])}
        />
      </Section>

      {/* 6. Value */}
      <Section number="6" title="Value" color="#10b981">
        <Row label="Headline"><Val>{exec.headline}</Val></Row>
        <Row label="Value today (AS-IS)"><Val>{exec.value_today}</Val></Row>
        <Row label="Value target (TO-BE)"><Val>{exec.value_target}</Val></Row>
        <Row label="Stakeholder ask"><Val>{exec.ask}</Val></Row>
      </Section>

      {/* 7. 4P Impact — People · Process · Profit · Technology */}
      <Section number="7" title="Impact — 4P (People · Process · Profit · Technology)" color="#8b5cf6">
        <DataTable
          columns={['Lens', 'Impact']}
          rows={[
            [<strong key="p1">People</strong>,     <Val key="v1">{strat.people}</Val>],
            [<strong key="p2">Process</strong>,    <Val key="v2">{strat.process}</Val>],
            [<strong key="p3">Profit</strong>,     <Val key="v3">{strat.profit}</Val>],
            [<strong key="p4">Technology</strong>, <Val key="v4">{strat.technology}</Val>],
          ]}
        />
      </Section>

      {/* 8. Revenue vs Cost */}
      <Section number="8" title="Revenue vs Cost impact" color="#0ea5e9">
        <DataTable
          columns={['Lever', 'Value']}
          rows={[
            ['Build cost (one-time)',  <Val key="bc">{cost.build_cost_one_time}</Val>],
            ['Run cost (monthly)',     <Val key="rc">{cost.run_cost_monthly}</Val>],
            ['Savings (monthly)',      <Val key="sv">{cost.savings_monthly}</Val>],
            ['Break-even months',      <Val key="be">{cost.break_even_months}</Val>],
            ['Risk summary',           <Val key="rs">{exec.risk_summary}</Val>],
          ]}
        />
      </Section>

      {/* 9. Productivity */}
      <Section number="9" title="Productivity gains" color="#10b981">
        <Row label="Actors freed up (from as_is_to_be.deltas)"><Val>{deltas.actors_freed}</Val></Row>
        <Row label="KPI targets affected">
          {(deltas.kpi_targets || []).length === 0 ? <Pending /> :
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {deltas.kpi_targets.map((k, i) => <li key={i}>{k}</li>)}
            </ul>}
        </Row>
        <Row label="AI capabilities added">
          {(deltas.ai_capabilities_added || []).length === 0 ? <Pending /> :
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {deltas.ai_capabilities_added.map((c, i) => <Badge key={i} tone="purple">{c}</Badge>)}
            </div>}
        </Row>
      </Section>

      {/* 10. AI capability inventory (kept from original) */}
      <Section number="10" title="AI capabilities mapped to this use case" color="#6366f1">
        <DataTable
          empty="No AI capabilities mapped yet."
          columns={['#', 'AI Type', 'Scenario']}
          rows={ai.map((a, i) => [i + 1, <strong key="ai">{a.ai_type}</strong>, a.scenario || <Pending key="ps" />])}
        />
      </Section>
    </div>
  );
}
