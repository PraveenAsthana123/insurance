// ModelCardPanel · P1 #14 · full §48.3 model card per model.
// Wired to /api/v1/ml/models/{m}/card · plus promote/rollback buttons (P1 #11).

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const STAGE_TONE = {
  Staging:    { bg: '#fef3c7', fg: '#92400e', border: '#d97706' },
  Production: { bg: '#dcfce7', fg: '#166534', border: '#16a34a' },
  Archived:   { bg: '#f1f5f9', fg: '#475569', border: '#94a3b8' },
};

export default function ModelCardPanel({ accent = '#8b5cf6', modelName = 'fraud-ring-detection-v1' }) {
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/ml/models/${modelName}/card`);
      if (!r.ok) throw new Error(`${r.status}`);
      setCard(await r.json());
    } catch (e) { setError(`load failed: ${e.message}`); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [modelName]);

  async function act(action, stage = null) {
    setActionBusy(true);
    try {
      const url = action === 'promote'
        ? `${API_BASE}/api/v1/ml/models/${modelName}/promote?to_stage=${stage}`
        : `${API_BASE}/api/v1/ml/models/${modelName}/rollback`;
      const r = await fetch(url, { method: 'POST' });
      if (!r.ok) throw new Error(`${r.status}`);
      await load();
    } catch (e) { setError(`${action} failed: ${e.message}`); }
    finally { setActionBusy(false); }
  }

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };

  if (busy) return <div style={cardStyle}><em style={{fontSize: 11, color: '#94a3b8'}}>Loading model card…</em></div>;
  if (error) return <div style={{...cardStyle, borderLeftColor: '#dc2626', background: '#fef2f2'}}><div style={{fontSize: 11, color: '#991b1b'}}>{error}</div></div>;
  if (!card) return null;

  const stageTone = STAGE_TONE[card.current_stage] || STAGE_TONE.Staging;
  const perf = card.performance || {};
  const fair = card.fairness || {};

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>📇</span>
        <strong style={{ fontSize: 13, color: accent }}>Model Card · {card.model_name} v{card.version}</strong>
        <span style={{
          marginLeft: 'auto',
          background: stageTone.bg, color: stageTone.fg,
          border: `1px solid ${stageTone.border}`,
          padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700,
        }}>{card.current_stage || 'Staging'}</span>
      </div>

      {/* P1 #11 · Stage promotion + rollback buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {['Staging', 'Production', 'Archived'].map((s) => (
          <button key={s} onClick={() => act('promote', s)}
            disabled={actionBusy || card.current_stage === s}
            style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 700,
              background: card.current_stage === s ? '#94a3b8' : (STAGE_TONE[s].border),
              color: '#fff', border: 'none', borderRadius: 3,
              cursor: actionBusy || card.current_stage === s ? 'wait' : 'pointer',
            }}>
            ↑ Promote → {s}
          </button>
        ))}
        <button onClick={() => act('rollback')} disabled={actionBusy || !card.stage_history?.length}
          style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700,
            background: card.stage_history?.length ? '#dc2626' : '#94a3b8',
            color: '#fff', border: 'none', borderRadius: 3, marginLeft: 'auto',
            cursor: actionBusy ? 'wait' : 'pointer',
          }}>
          ↩ Rollback
        </button>
      </div>

      {/* Performance + fairness tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        <Tile label="ACCURACY" value={`${(perf.accuracy * 100).toFixed(1)}%`} accent="#16a34a" />
        <Tile label="AUC" value={`${(perf.auc * 100).toFixed(1)}%`} accent="#3b82f6" />
        <Tile label="F1" value={`${(perf.f1 * 100).toFixed(1)}%`} accent="#8b5cf6" />
        <Tile label="DI" value={fair.disparate_impact?.toFixed(2)} accent={fair.pass ? '#16a34a' : '#dc2626'} />
      </div>

      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>
        <strong>Intended use:</strong> {card.intended_use}
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>
        <strong>Owner:</strong> {card.owner} · <strong>Last review:</strong> {card.last_review_date}
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>
        <strong>Regulatory:</strong> {card.regulatory_class}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer', fontSize: 11, color: accent, fontWeight: 600 }}>
          ▼ Details · limitations · history
        </summary>
        <div style={{ padding: 6, fontSize: 10, color: '#475569' }}>
          <div style={{ marginBottom: 4 }}><strong>Limitations:</strong>
            <ul style={{ margin: '2px 0 0 16px' }}>
              {(card.limitations || []).map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
          <div style={{ marginBottom: 4 }}><strong>Out of scope:</strong>
            <ul style={{ margin: '2px 0 0 16px' }}>
              {(card.out_of_scope || []).map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
          {card.stage_history?.length > 0 && (
            <div>
              <strong>Stage history:</strong>
              <table style={{ width: '100%', fontSize: 9, marginTop: 2 }}>
                <thead><tr><th align="left">When</th><th align="left">From</th><th align="left">To</th><th align="left">Action</th></tr></thead>
                <tbody>
                  {card.stage_history.map((h, i) => (
                    <tr key={i}><td>{h.timestamp?.slice(0, 19)}</td><td>{h.from_stage}</td><td>{h.to_stage}</td><td>{h.action}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Source · GET /api/v1/ml/models/{modelName}/card · §48.3 model card · P1 #14 + #11
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{ padding: 6, background: '#fff', border: `1px solid ${accent}`, borderRadius: 4, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
    </div>
  );
}
