import { useEffect, useState } from 'react';
import { listSuppliers } from '../../../services/supplyChainApi';
import ExplainDrawer from '../../common/ExplainDrawer';

function scoreColor(score) {
  if (score > 70) return { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' };
  if (score >= 40) return { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' };
  return { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' };
}

export default function SupplierScorecardTab() {
  const [suppliers, setSuppliers] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSuppliers()
      .then((s) => { if (!cancelled) setSuppliers(s); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const openExplain = (s) => {
    setSelected(s);
    setExplainOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Supplier Scorecard</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Composite 0–100 score from defect rate, manufacturing lead-time, and inspection
        outcomes. Click a row to ask the assistant why. Backend:
        GET <code>/api/v1/supply-chain/suppliers</code>.
      </p>

      {error && (
        <div style={{
          padding: 12, background: '#fef2f2', color: '#991b1b',
          border: '1px solid #fecaca', borderRadius: 6, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {!suppliers && !error && (
        <div style={{ color: '#64748b', fontSize: 13 }}>Loading suppliers…</div>
      )}

      {suppliers && suppliers.length === 0 && (
        <div style={{ color: '#64748b', fontSize: 13 }}>No suppliers found.</div>
      )}

      {suppliers && suppliers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            fontSize: 13,
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <Th>Rank</Th>
                <Th>Supplier</Th>
                <Th>Location</Th>
                <Th style={{ textAlign: 'right' }}>Lead-time (d)</Th>
                <Th style={{ textAlign: 'right' }}>Score</Th>
                <Th>Sub-scores</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => {
                const c = scoreColor(s.score);
                return (
                  <tr
                    key={s.supplier_id}
                    onClick={() => openExplain(s)}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <Td style={{ fontWeight: 600 }}>#{idx + 1}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{s.supplier_name || s.supplier_id}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.supplier_id}</div>
                    </Td>
                    <Td>{s.location || '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>{s.manufacturing_lead_time_days ?? '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
                        borderRadius: 999, fontWeight: 700, fontSize: 12,
                      }}>
                        {s.score.toFixed(1)}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, color: '#475569' }}>
                        {Object.entries(s.sub_scores || {}).map(([k, v]) => (
                          <span key={k} style={{
                            padding: '2px 8px', background: '#f1f5f9',
                            border: '1px solid #e2e8f0', borderRadius: 4,
                          }}>
                            {k}: {Number(v).toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <button
                        onClick={(e) => { e.stopPropagation(); openExplain(s); }}
                        style={{
                          padding: '4px 10px', background: '#fff', color: '#3b82f6',
                          border: '1px solid #3b82f6', borderRadius: 6,
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >🤖 Explain</button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ExplainDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        context={selected && {
          screen: 'SupplierScorecardTab',
          supplier_id: selected.supplier_id,
          supplier_name: selected.supplier_name,
          score: selected.score,
        }}
      />
    </div>
  );
}

function Th({ children, style }) {
  return (
    <th style={{
      padding: '10px 12px', fontSize: 11, textTransform: 'uppercase',
      color: '#64748b', fontWeight: 600, ...style,
    }}>{children}</th>
  );
}

function Td({ children, style }) {
  return <td style={{ padding: '10px 12px', color: '#0f172a', ...style }}>{children}</td>;
}
