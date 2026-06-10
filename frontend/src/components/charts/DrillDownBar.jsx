// DrillDownBar · Iter 30 · G2 closure.
// Click any bar → reveal underlying rows. Wraps RechartsBarHorizontal.

import { useState } from 'react';
import RechartsBarHorizontal from './RechartsBarHorizontal';

export default function DrillDownBar({
  data,
  onDrillDown,            // (key) => Promise<rows[]>
  rowKeys = null,         // optional column names for the drill-down table
  height = 280,
  accent = '#3b82f6',
}) {
  const [active, setActive] = useState(null);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function drill(name) {
    if (!onDrillDown) return;
    setActive(name);
    setBusy(true);
    setError(null);
    setRows(null);
    try {
      const r = await onDrillDown(name);
      setRows(Array.isArray(r) ? r : []);
    } catch (e) { setError(`drill-down failed: ${e.message}`); }
    finally { setBusy(false); }
  }

  function close() { setActive(null); setRows(null); setError(null); }

  // Inject onClick into each bar by augmenting data
  const annotatedData = (data || []).map((d) => ({ ...d, _onClick: () => drill(d.name) }));

  return (
    <div>
      <div onClick={(e) => {
        // recharts forwards click to data point via Cell · we handle parent click as fallback
        const target = e.target;
        const text = target?.textContent;
        if (text && data?.find((d) => d.name === text)) drill(text);
      }}>
        <RechartsBarHorizontal data={annotatedData} height={height} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
        {data.map((d) => (
          <button key={d.name} onClick={() => drill(d.name)}
            aria-label={`Drill into ${d.name}`}
            style={{
              padding: '2px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer',
              background: active === d.name ? accent : '#fff',
              color: active === d.name ? '#fff' : accent,
              border: `1px solid ${accent}`, borderRadius: 3,
            }}>
            ▼ {d.name}
          </button>
        ))}
      </div>

      {active && (
        <div style={{
          marginTop: 8, padding: 10,
          background: '#f9fafb', border: `1px solid ${accent}40`, borderRadius: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 11, color: accent }}>▼ {active} · rows</strong>
            <button onClick={close} aria-label="Close drill-down"
              style={{
                marginLeft: 'auto', padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                background: '#fff', color: '#475569',
                border: '1px solid #cbd5e1', borderRadius: 3,
              }}>✗ Close</button>
          </div>
          {busy && <em style={{ fontSize: 10, color: '#94a3b8' }}>Loading rows…</em>}
          {error && <div style={{ fontSize: 10, color: '#991b1b' }}>{error}</div>}
          {rows && rows.length === 0 && (
            <em style={{ fontSize: 10, color: '#94a3b8' }}>No rows for {active}</em>
          )}
          {rows && rows.length > 0 && (
            <table style={{ width: '100%', fontSize: 10 }}>
              <thead>
                <tr style={{ color: '#64748b' }}>
                  {(rowKeys || Object.keys(rows[0])).map((k) => (
                    <th key={k} style={{ padding: 4, textAlign: 'left' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    {(rowKeys || Object.keys(rows[0])).map((k) => (
                      <td key={k} style={{ padding: 4 }}>{String(r[k] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
