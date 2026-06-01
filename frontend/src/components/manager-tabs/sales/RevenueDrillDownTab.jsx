import { useEffect, useMemo, useState } from 'react';
import { listStores } from '../../../services/salesApi';
import ExplainDrawer from '../../common/ExplainDrawer';

const TYPE_LABEL = { a: 'Type A', b: 'Type B', c: 'Type C', d: 'Type D' };
const ASSORT_LABEL = { a: 'Basic', b: 'Extra', c: 'Extended' };

export default function RevenueDrillDownTab() {
  const [stores, setStores] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listStores()
      .then((s) => { if (!cancelled) setStores(s); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const byType = useMemo(() => {
    const out = {};
    for (const s of stores) {
      const t = s.store_type;
      out[t] = out[t] || { type: t, count: 0, assortments: {} };
      out[t].count += 1;
      out[t].assortments[s.assortment] = (out[t].assortments[s.assortment] || 0) + 1;
    }
    return Object.values(out).sort((a, b) => b.count - a.count);
  }, [stores]);

  if (error) {
    return (
      <div style={{ padding: 24, color: '#991b1b' }}>
        Couldn't load stores: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Sales hierarchy — {stores.length} stores</h3>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: 13 }}>
        Phase ε renders store-type × assortment distribution from dim_store.
        Live revenue aggregation ships when /api/v1/sales/revenue-tree is built
        (currently served from mock JSON in Phase ε).
      </p>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 10 }}>Store type</th>
              <th style={{ textAlign: 'right', padding: 10 }}># stores</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Assortment split</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {byType.map((row) => (
              <tr key={row.type} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{TYPE_LABEL[row.type] || row.type}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{row.count}</td>
                <td style={{ padding: 10 }}>
                  {Object.entries(row.assortments).map(([k, v]) => (
                    <span key={k} style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      background: '#eef2ff', color: '#3730a3', fontSize: 11, marginRight: 4,
                    }}>
                      {ASSORT_LABEL[k] || k}: {v}
                    </span>
                  ))}
                </td>
                <td style={{ padding: 10 }}>
                  <button
                    onClick={() => { setSelected(row); setExplainOpen(true); }}
                    style={{
                      padding: '4px 10px', background: '#fff', border: '1px solid #3b82f6',
                      color: '#3b82f6', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}
                  >🤖 Explain</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ExplainDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        context={selected && { screen: 'RevenueDrillDownTab', store_type: selected.type, count: selected.count }}
      />
    </div>
  );
}
