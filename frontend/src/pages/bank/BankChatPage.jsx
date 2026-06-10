// Cross-department conversation UI.
// Operator brief: "conversation UI module where each department team member
// should able to chat with each other".
//
// Design surface only — message persistence + WebSocket wiring pending.
// Per §57.7 no fabricated messages.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

export function BankChatPage() {
  const { bp } = useOutletContext();
  const depts = bp?.department_catalog || [];
  const [activeChannel, setActiveChannel] = useState(depts[0] ? `dept-${depts[0].id}` : null);
  const [msg, setMsg] = useState('');
  const [drafts, setDrafts] = useState([]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setDrafts((d) => [...d, { id: Date.now(), channel: activeChannel, text: msg, status: 'pending' }]);
    setMsg('');
  };

  const channels = [
    { id: 'all-hands',    icon: '📣', label: '#all-hands',    desc: 'Org-wide announcements' },
    { id: 'cross-dept',   icon: '🔀', label: '#cross-dept',   desc: 'Cross-department coordination' },
    { id: 'ai-council',   icon: '🤖', label: '#ai-council',   desc: 'AI governance + reviews' },
    { id: 'incidents',    icon: '🚨', label: '#incidents',    desc: 'Live incident response' },
    { id: 'on-call',      icon: '📟', label: '#on-call',      desc: 'On-call rotation' },
    ...depts.map((d) => ({
      id: `dept-${d.id}`,
      icon: '🏢',
      label: `#dept-${d.id}-${(d.name || '').toLowerCase().split(/[^a-z0-9]+/)[0]}`,
      desc: d.name,
    })),
  ];

  const activeMeta = channels.find((c) => c.id === activeChannel);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr 240px',
      height: 'calc(100vh - 60px - 32px)',
      gap: 0, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff',
    }}>
      {/* LEFT: channel list */}
      <aside style={{
        background: '#0f172a', color: '#e2e8f0',
        borderRight: '1px solid #1e293b',
        overflow: 'auto',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <strong style={{ fontSize: 13, color: '#fff' }}>💬 Insurance Enterprise</strong>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            {channels.length} channels · {depts.length} dept rooms
          </div>
        </div>
        <div style={{ padding: '4px 0' }}>
          {channels.map((c) => {
            const isActive = activeChannel === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveChannel(c.id)}
                title={c.desc}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '6px 16px',
                  background: isActive ? '#1e293b' : 'transparent',
                  border: 'none',
                  color: isActive ? '#fff' : '#cbd5e1',
                  fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                }}
              >
                <span>{c.icon}</span>
                <span style={{ flex: 1 }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER: message stream + composer */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Channel header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>{activeMeta?.label}</strong>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{activeMeta?.desc}</div>
        </div>

        {/* Message stream */}
        <div style={{
          flex: 1, overflow: 'auto', padding: 16,
          background: '#fff',
        }}>
          <div style={{
            padding: 12, background: '#dbeafe', borderRadius: 6,
            border: '1px solid #93c5fd', fontSize: 12, color: '#1e40af',
            marginBottom: 12,
          }}>
            💡 <strong>Channel intro:</strong> {activeMeta?.desc}.
            All messages logged per §38.3 decision audit + §47.6 SOC2 CC6.2 tenant isolation.
          </div>

          {drafts.filter((d) => d.channel === activeChannel).length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 40 }}>
              No messages yet in <strong>{activeMeta?.label}</strong>.<br/>
              Type below to draft a message. Message persistence is operator-pending until <code>POST /api/v1/chat/messages</code> is wired.
            </div>
          )}

          {drafts
            .filter((d) => d.channel === activeChannel)
            .map((d) => (
              <div key={d.id} style={{
                marginBottom: 12, padding: '8px 12px',
                background: '#f1f5f9', borderLeft: '3px solid #f59e0b',
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 12, color: '#0f172a' }}>You</strong>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>just now</span>
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: '#fef3c7', color: '#92400e', fontWeight: 700,
                  }}>DRAFT</span>
                </div>
                <div style={{ fontSize: 13, color: '#0f172a' }}>{d.text}</div>
              </div>
            ))}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} style={{
          display: 'flex', gap: 8, padding: 12,
          borderTop: '1px solid #e2e8f0', background: '#f8fafc',
        }}>
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder={`Message ${activeMeta?.label}…`}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 13,
              border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 600,
            background: '#1e40af', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}>
            Send
          </button>
        </form>
      </div>

      {/* RIGHT: members + info */}
      <aside style={{
        background: '#f8fafc', borderLeft: '1px solid #e2e8f0',
        overflow: 'auto', padding: '14px 12px',
      }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Members
        </h4>
        <div style={{ fontSize: 12, color: '#0f172a' }}>
          <Pending />
          <p style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
            Wire to <code>GET /api/v1/chat/channels/{activeChannel}/members</code>
          </p>
        </div>

        <h4 style={{ margin: '16px 0 8px', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick actions
        </h4>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#475569' }}>
          <li style={{ marginBottom: 4 }}>📌 Pin a message</li>
          <li style={{ marginBottom: 4 }}>🧵 Start a thread</li>
          <li style={{ marginBottom: 4 }}>🔔 Notify on-call</li>
          <li style={{ marginBottom: 4 }}>🤖 Ask the cross-dept bot</li>
          <li style={{ marginBottom: 4 }}>📋 Generate progress report</li>
        </ul>

        <h4 style={{ margin: '16px 0 8px', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Compliance
        </h4>
        <div style={{ fontSize: 10, color: '#64748b' }}>
          All messages: persisted 7 years per §38.3 · tenant-isolated · PII redaction on read · legal-hold ready.
        </div>
      </aside>
    </div>
  );
}
