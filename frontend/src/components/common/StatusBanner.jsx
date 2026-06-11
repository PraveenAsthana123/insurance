// StatusBanner.jsx · Iter 66 · §102.10 (mandatory 7-field workflow banner)
// Renders the canonical 7 fields ALWAYS visible per §102.

import React from 'react';

const WORKFLOW_STATES = [
  'CREATED', 'LOGGED', 'PLANNED', 'IN_PROGRESS', 'WAITING_APPROVAL',
  'BLOCKED', 'RETRYING', 'FAILED', 'RECOVERING', 'COMPLETED',
  'CANCELLED', 'ROLLED_BACK',
];

const STATE_COLOR = {
  CREATED: '#94a3b8',
  LOGGED: '#94a3b8',
  PLANNED: '#3b82f6',
  IN_PROGRESS: '#10b981',
  WAITING_APPROVAL: '#f59e0b',
  BLOCKED: '#ef4444',
  RETRYING: '#f59e0b',
  FAILED: '#ef4444',
  RECOVERING: '#3b82f6',
  COMPLETED: '#10b981',
  CANCELLED: '#94a3b8',
  ROLLED_BACK: '#a16207',
};

export default function StatusBanner({
  workflowId,
  status = 'CREATED',
  currentAgent = '—',
  currentStep = '—',
  progress = 0,
  lastUpdated = null,
  traceId = '—',
}) {
  const c = STATE_COLOR[status] || '#94a3b8';
  return (
    <div style={{
      padding: 10,
      background: `${c}15`,
      border: `1px solid ${c}80`,
      borderRadius: 4,
      marginBottom: 10,
      fontSize: 11,
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>WORKFLOW</div>
        <code style={{ fontSize: 11, fontWeight: 700 }}>{workflowId || 'WF-...'}</code>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>STATUS</div>
        <span style={{
          padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
          background: `${c}33`, color: c,
        }}>{status}</span>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>CURRENT AGENT</div>
        <code style={{ fontSize: 10 }}>{currentAgent}</code>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>STEP</div>
        <code style={{ fontSize: 10 }}>{currentStep}</code>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>PROGRESS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{ width: `${progress}%`, height: 6, background: c, borderRadius: 2 }} />
          </div>
          <code style={{ fontSize: 10 }}>{progress}%</code>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>LAST UPDATED</div>
        <code style={{ fontSize: 10 }}>{lastUpdated || '—'}</code>
      </div>
      <div>
        <div style={{ fontSize: 9, color: '#475569' }}>TRACE</div>
        <code style={{ fontSize: 10 }}>{(traceId || '').slice(0, 16)}</code>
      </div>
    </div>
  );
}

export { WORKFLOW_STATES };
