// UseCasePanel · §94 · 17-section Use Case structure per process.
// Wired to /api/v1/use-cases/* (backend in this commit).
//
// Layout: 5 expandable parts (A Problem · B Solution · C Analysis ·
// D Data · E Transformation) with all 17 sections rendered.

import { useEffect, useState } from 'react';
import MermaidDiagram from './MermaidDiagram';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const PARTS = [
  { id: 'problem',        label: 'A · Problem (AS-IS · sub · impact)',           color: '#dc2626' },
  { id: 'solution',       label: 'B · Solution (TO-BE · AI · flow · journey)',   color: '#10b981' },
  { id: 'analysis',       label: 'C · Analysis (SWOT · 1st-principles · AI · E2E)', color: '#8b5cf6' },
  { id: 'data',           label: 'D · Data (types · goal)',                       color: '#0ea5e9' },
  { id: 'transformation', label: 'E · Transformation (4P · 6σ · stake · KPI/ROI)', color: '#f59e0b' },
];

export default function UseCasePanel({ accent = '#3b82f6', processId = 'fraud-ring-detection' }) {
  const [uc, setUc] = useState(null);
  const [score, setScore] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({problem: true});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const [u, s] = await Promise.all([
          fetch(`${API_BASE}/api/v1/use-cases/${processId}`).then(r => r.json()),
          fetch(`${API_BASE}/api/v1/use-cases/${processId}/score`).then(r => r.json()),
        ]);
        if (!cancelled) { setUc(u); setScore(s); }
      } catch (e) { if (!cancelled) setError(`use-case wire failed: ${e.message}`); }
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

  if (busy) return <div style={card}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading use case…</em></div>;
  if (error) {
    return (
      <div style={{...card, borderLeftColor: '#dc2626', background: '#fef2f2'}}>
        <div style={{fontSize: 11, color: '#991b1b'}}><strong>Use case wire unavailable.</strong> {error}</div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <strong style={{ fontSize: 13, color: accent }}>§94 · Process Use Case · {processId}</strong>
        {uc?.demo && (
          <span style={{
            background: '#fef3c7', color: '#92400e',
            padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
          }}>DEMO</span>
        )}
        <span style={{
          marginLeft: 'auto',
          background: score?.completeness_pct >= 80 ? '#16a34a' : score?.completeness_pct >= 40 ? '#d97706' : '#dc2626',
          color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
        }}>
          {score?.completeness_score || 0} / 17 · {(score?.completeness_pct || 0).toFixed(0)}%
        </span>
      </div>

      {PARTS.map((part) => {
        const partData = uc?.[part.id] || {};
        const populated = Object.values(partData).filter((v) => v != null && v !== '').length;
        const totalSections = Object.keys(partData).length;
        const isOpen = !!expanded[part.id];
        return (
          <div key={part.id} style={{ marginBottom: 6, border: `1px solid ${part.color}40`, borderRadius: 4 }}>
            <button
              onClick={() => setExpanded({...expanded, [part.id]: !isOpen})}
              style={{
                width: '100%', textAlign: 'left',
                padding: '6px 10px', background: `${part.color}10`,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              <span style={{ fontSize: 13 }}>{isOpen ? '▼' : '▶'}</span>
              <strong style={{ flex: 1, fontSize: 12, color: part.color }}>{part.label}</strong>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 3,
                background: populated === totalSections ? '#dcfce7' : '#fef3c7',
                color: populated === totalSections ? '#166534' : '#92400e',
              }}>{populated}/{totalSections}</span>
            </button>
            {isOpen && (
              <div style={{ padding: 10 }}>
                {Object.entries(partData).map(([key, val]) => (
                  <Section
                    key={key}
                    name={key}
                    value={val}
                    accent={part.color}
                    partId={part.id}
                    processId={processId}
                    onSaved={(updated) => setUc(updated)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/use-cases/{processId} · §94 · 17-section mandatory structure
      </div>
    </div>
  );
}

function Section({ name, value, accent, partId, processId, onSaved }) {
  const isNull = value == null || value === '';
  // P0 #7 · inline edit
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const card = {
    padding: 6, marginBottom: 6,
    background: isNull ? '#f9fafb' : '#fff',
    border: `1px solid ${isNull ? '#e5e7eb' : `${accent}40`}`,
    borderRadius: 3,
  };

  function startEdit() {
    setDraft(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    setEditing(true);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // Parse draft · accept string for narrative fields, JSON for object/list fields
      let parsedValue = draft;
      if (draft.trim().startsWith('{') || draft.trim().startsWith('[')) {
        try { parsedValue = JSON.parse(draft); }
        catch (e) { throw new Error(`JSON parse failed: ${e.message}`); }
      }
      const body = { sections: { [partId]: { [name]: parsedValue } } };
      const r = await fetch(`${API_BASE}/api/v1/use-cases/${processId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const updated = await r.json();
      onSaved?.(updated);
      setEditing(false);
    } catch (e) { setError(`save failed: ${e.message}`); }
    finally { setBusy(false); }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <strong style={{ fontSize: 11, fontFamily: 'monospace', color: accent }}>{name}</strong>
        {isNull && !editing && <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>· operator-pending per §57.7</span>}
        <span style={{ flex: 1 }} />
        {editing ? (
          <>
            <button onClick={save} disabled={busy} style={editBtn('#16a34a', busy)}>
              {busy ? '⏳' : '💾 Save'}
            </button>
            <button onClick={() => setEditing(false)} disabled={busy} style={editBtn('#94a3b8', busy)}>
              ✗ Cancel
            </button>
          </>
        ) : (
          <button onClick={startEdit} style={editBtn(accent, false)}>
            ✎ Edit
          </button>
        )}
      </div>
      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b', fontSize: 9,
          padding: 3, borderRadius: 3, marginBottom: 4,
        }}>✗ {error}</div>
      )}
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          style={{
            width: '100%', padding: 6, fontSize: 10,
            fontFamily: 'monospace', border: '1px solid #cbd5e1',
            borderRadius: 3, resize: 'vertical',
          }}
        />
      ) : !isNull ? (
        name === 'flowchart_mermaid' && typeof value === 'string' ? (
          <MermaidDiagram definition={value} accent={accent} title="Solution flowchart" />
        ) : (
          <pre style={{
            margin: 0, padding: 4, background: '#f8fafc',
            fontSize: 10, color: '#475569',
            overflow: 'auto', maxHeight: 220,
            whiteSpace: 'pre-wrap',
          }}>
            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          </pre>
        )
      ) : null}
    </div>
  );
}

function editBtn(color, busy) {
  return {
    padding: '2px 6px', fontSize: 9, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    background: color, color: '#fff', border: 'none', borderRadius: 3,
  };
}
