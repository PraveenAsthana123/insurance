// DataPipelinePanel · comprehensive Data-tab structure per process.
// Wired to /api/v1/data-pipeline/* (backend in this commit).
//
// Per operator brief 2026-06-09:
//   - data list of data types · AS-IS viz
//   - EDA: feature evaluation + selection
//   - balance/imbalance + SMOTE + normalize + standardize + missing + special-char
//   - image: noise + denoise + viz
//   - other formats: conversion to text/image then above
//   - one row = one task
//   - info card (white) vs action card (light-tinted)
//   - journey flow horizontal
//   - flowchart + IPO + status one-liner

import { useEffect, useState } from 'react';
import MermaidDiagram from './MermaidDiagram';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const STATUS_TONE = {
  complete: { bg: '#dcfce7', fg: '#166534', dot: '#16a34a' },
  running:  { bg: '#dbeafe', fg: '#1e40af', dot: '#3b82f6' },
  pending:  { bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
  scaffold: { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
};

const PHASE_COLOR = {
  Inventory:  '#0ea5e9',
  EDA:        '#8b5cf6',
  Quality:    '#f59e0b',
  Image:      '#10b981',
  Conversion: '#dc2626',
};


// Convert a list of step strings into a mermaid flowchart definition.
// Per §57.7: deterministic + escapes labels.
function buildFlowchartMermaid(steps, taskId) {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  const prefix = `n_${taskId.replace(/[^a-z0-9]/gi, '_')}`;
  const lines = ['flowchart LR'];
  steps.forEach((step, i) => {
    const safe = String(step).replace(/[\[\]"]/g, '').slice(0, 40);
    lines.push(`  ${prefix}_${i}["${safe}"]`);
    if (i > 0) lines.push(`  ${prefix}_${i - 1} --> ${prefix}_${i}`);
  });
  return lines.join('\n');
}

export default function DataPipelinePanel({ accent = '#0ea5e9', processId = 'fraud-ring-detection' }) {
  const [data, setData] = useState(null);
  const [journey, setJourney] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});  // task_id → bool

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const [t, j] = await Promise.all([
          fetch(`${API_BASE}/api/v1/data-pipeline/${processId}/tasks`).then(r => r.json()),
          fetch(`${API_BASE}/api/v1/data-pipeline/${processId}/summary/journey-flow`).then(r => r.json()),
        ]);
        if (!cancelled) { setData(t); setJourney(j); }
      } catch (e) { if (!cancelled) setError(`data-pipeline wire failed: ${e.message}`); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [processId]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={card}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading data pipeline…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{fontSize: 11, color: '#991b1b'}}><strong>Data pipeline wire unavailable.</strong> {error}</div>
      </div>
    );
  }
  const tasks = data?.tasks || [];
  const byPhase = (data?.by_phase) || {};
  const byStatus = (data?.by_status) || {};
  const phases = journey?.phases || ['Inventory', 'EDA', 'Quality', 'Image', 'Conversion'];

  // Group tasks by phase
  const grouped = phases.map((phase) => ({
    phase,
    color: PHASE_COLOR[phase] || accent,
    tasks: tasks.filter((t) => t.phase === phase),
  }));

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🗂</span>
        <strong style={{ fontSize: 13, color: accent }}>Data Pipeline · {processId} · one row per task</strong>
        <span style={{
          marginLeft: 'auto',
          background: '#3b82f6', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>
          {data?.n_libraries_installed || 0}/{data?.n_tasks || 0} LIBS · score {((data?.aggregate_score || 0) * 100).toFixed(1)}%
        </span>
      </div>

      {/* Journey flow · horizontal phase strip */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 10, padding: 6,
        background: '#f9fafb', borderRadius: 4, overflowX: 'auto',
      }}>
        {phases.map((p, i) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              padding: '3px 8px', fontSize: 11, fontWeight: 600,
              background: PHASE_COLOR[p] || '#94a3b8', color: '#fff',
              borderRadius: 4,
            }}>
              {i + 1}. {p}
              <span style={{
                marginLeft: 4, padding: '0 4px', borderRadius: 2,
                background: '#fff', color: PHASE_COLOR[p] || '#94a3b8',
                fontSize: 9, fontWeight: 700,
              }}>
                {byPhase[p] || 0}
              </span>
            </div>
            {i < phases.length - 1 && <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="TASKS" value={data?.n_tasks || 0} accent={accent} />
        <Tile label="COMPLETE" value={byStatus.complete || 0} accent="#16a34a" />
        <Tile label="RUNNING" value={byStatus.running || 0} accent="#3b82f6" />
        <Tile label="PENDING" value={byStatus.pending || 0} accent="#d97706" />
        <Tile label="SCAFFOLD" value={byStatus.scaffold || 0} accent="#94a3b8" />
      </div>

      {/* Rows · grouped by phase */}
      {grouped.map(({ phase, color, tasks: phaseTasks }) => phaseTasks.length > 0 && (
        <div key={phase} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>
            ▸ {phase} ({phaseTasks.length} tasks)
          </div>
          {phaseTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isOpen={!!expanded[task.id]}
              onToggle={() => setExpanded({...expanded, [task.id]: !expanded[task.id]})}
            />
          ))}
        </div>
      ))}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/data-pipeline/{processId}/tasks · operator brief: one row per task · info vs action card · IPO + status
      </div>
    </div>
  );
}

function TaskRow({ task, isOpen, onToggle }) {
  const tone = STATUS_TONE[task.status] || STATUS_TONE.scaffold;
  // Per operator brief: info card = white · action card = light-tinted
  const cardBg = task.card_kind === 'info' ? '#ffffff' : `${PHASE_COLOR[task.phase] || '#0ea5e9'}10`;
  const cardBorder = task.card_kind === 'info'
    ? '1px solid #e5e7eb'
    : `1px solid ${PHASE_COLOR[task.phase] || '#0ea5e9'}40`;

  return (
    <div style={{
      background: cardBg,
      border: cardBorder,
      borderRadius: 4,
      padding: 8,
      marginBottom: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Card-kind badge · INFO vs ACTION (per operator brief) */}
        <span style={{
          padding: '1px 6px', borderRadius: 3,
          background: task.card_kind === 'info' ? '#f1f5f9' : '#fef3c7',
          color: task.card_kind === 'info' ? '#475569' : '#92400e',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {task.card_kind === 'info' ? 'INFO' : 'ACTION'}
        </span>

        {/* Status dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: tone.dot,
        }} />

        <strong style={{ flex: 1, fontSize: 12 }}>{task.title}</strong>

        {/* Score */}
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
          {(task.score * 100).toFixed(0)}%
        </span>

        {/* Status tag */}
        <span style={{
          padding: '1px 6px', borderRadius: 3,
          background: tone.bg, color: tone.fg,
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {task.status}
        </span>

        <button onClick={onToggle} style={{
          padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
          background: '#fff', color: '#475569',
          border: '1px solid #cbd5e1', borderRadius: 3,
        }}>
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* One-liner status update · per operator brief */}
      <div style={{ marginTop: 4, fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
        💬 {task.one_liner}
      </div>

      {isOpen && (
        <div style={{ marginTop: 6, padding: 6, background: '#f9fafb', borderRadius: 3 }}>
          {/* IPO breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
            <IPO label="📥 Input" value={task.input} color="#0ea5e9" />
            <IPO label="⚙ Process" value={task.process} color="#8b5cf6" />
            <IPO label="📤 Output" value={task.output} color="#10b981" />
          </div>

          {/* Library + state */}
          <div style={{ fontSize: 10, marginBottom: 6 }}>
            <strong>📚 Library:</strong> {task.library}
            <span style={{
              marginLeft: 6, padding: '0 4px', borderRadius: 2, fontSize: 9, fontWeight: 700,
              background: task.library_state?.installed ? '#dcfce7' : '#fee2e2',
              color: task.library_state?.installed ? '#166534' : '#991b1b',
            }}>
              {task.library_state?.installed ? 'INSTALLED' : 'NOT INSTALLED'}
            </span>
          </div>

          {/* Flowchart · rendered Mermaid (Iteration 1 P0 #1) */}
          {task.flowchart && task.flowchart.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginBottom: 2 }}>🔁 Flow</div>
              <MermaidDiagram
                definition={buildFlowchartMermaid(task.flowchart, task.id)}
                accent={PHASE_COLOR[task.phase] || '#0ea5e9'}
              />
            </div>
          )}

          {/* Status summary · one-liner per operator brief */}
          <div style={{
            padding: 4, background: '#fff',
            border: `1px solid ${STATUS_TONE[task.status]?.dot || '#94a3b8'}40`,
            borderRadius: 3, fontSize: 9, color: '#64748b',
          }}>
            <strong>📊 Status:</strong> {task.status_one_liner}
          </div>
        </div>
      )}
    </div>
  );
}

function IPO({ label, value, color }) {
  return (
    <div style={{ padding: 4, background: '#fff', border: `1px solid ${color}40`, borderRadius: 3 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{
      padding: 6, background: '#fff',
      border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
