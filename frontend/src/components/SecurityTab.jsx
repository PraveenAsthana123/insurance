/**
 * SecurityTab — per-dept security & attack-simulation surface per §64.32.
 *
 * Lists the 12 mandatory attack-class generators, on-demand corpus
 * generation (generator-only — executor is §42 gated), browse + drill
 * into past corpora with audit info.
 *
 * Endpoints (per backend/routers/holy.py):
 *   GET  /api/v1/holy/security/attack-classes
 *   POST /api/v1/holy/security/{dept}/generate-corpus  {attack_class, n?, seed?}
 *   GET  /api/v1/holy/security/{dept}/corpora?attack_class=
 *   GET  /api/v1/holy/security/{dept}/corpora/{class}/{corpus_id}
 */
import { useEffect, useState } from 'react';

const API = '/api/v1/holy/security';

const SEVERITY_COLOR = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
};

export default function SecurityTab({ dept }) {
  const [attackClasses, setAttackClasses] = useState([]);
  const [executorAuthorized, setExecutorAuthorized] = useState(false);
  const [selectedClass, setSelectedClass] = useState('sql_injection');
  const [n, setN] = useState(5);
  const [corpora, setCorpora] = useState([]);
  const [selectedCorpus, setSelectedCorpus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    Promise.all([
      fetch(`${API}/attack-classes`, { signal: ac.signal }).then((r) => r.json()),
      fetch(`${API}/${dept}/corpora`, { signal: ac.signal }).then((r) => r.json()),
    ])
      .then(([c, p]) => {
        if (cancelled) return;
        setAttackClasses(c.attack_classes || []);
        setExecutorAuthorized(c.executor_authorized || false);
        setCorpora(p.corpora || []);
      })
      .catch((e) => !cancelled && e.name !== 'AbortError' && setError(String(e)));
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [dept]);

  async function generateCorpus() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`${API}/${dept}/generate-corpus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_class: selectedClass, n, seed: 42 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const corpus = await r.json();
      // refresh corpora list
      const list = await fetch(`${API}/${dept}/corpora`).then((x) => x.json());
      setCorpora(list.corpora || []);
      setSelectedCorpus(corpus);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function loadCorpus(corpus_id, attack_class) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/${dept}/corpora/${attack_class}/${corpus_id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSelectedCorpus(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>🛡️ Security & Attack Simulation — {dept}</strong>
        <span style={executorAuthorized ? s.authBadge : s.unauthBadge}>
          {executorAuthorized ? '✓ EXECUTOR AUTHORIZED' : '⚠ EXECUTOR GATED (BEV_AUTHORIZED_ENV=0)'}
        </span>
      </div>

      <div style={s.policyNote}>
        Per global §64.32.3 + §42 — payload <strong>generation</strong> is always safe.
        Payload <strong>execution</strong> requires <code>BEV_AUTHORIZED_ENV=1</code>
        AND operator approval. This UI generates; it never auto-fires.
      </div>

      <div style={s.controls}>
        <label style={s.label}>
          Attack class:
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={s.select}
          >
            {attackClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.id}</option>
            ))}
          </select>
        </label>
        <label style={s.label}>
          # payloads:
          <input
            type="number"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(parseInt(e.target.value) || 5)}
            style={s.input}
          />
        </label>
        <button onClick={generateCorpus} disabled={generating} style={s.runBtn}>
          {generating ? '⏳ Generating…' : '🎯 Generate Corpus'}
        </button>
      </div>

      {error && <div style={s.error}>Error: {error}</div>}
      {loading && <div style={s.muted}>Loading corpus…</div>}

      <div style={s.layout}>
        {/* Left: corpora list */}
        <div style={s.leftPane}>
          <div style={s.sectionTitle}>Past corpora ({corpora.length})</div>
          {corpora.length === 0 && (
            <div style={s.muted}>No corpora generated for {dept} yet.</div>
          )}
          {corpora.slice(0, 30).map((c) => (
            <button
              key={c.corpus_id}
              onClick={() => loadCorpus(c.corpus_id, c.attack_class)}
              style={{
                ...s.corpusRow,
                ...(selectedCorpus?.corpus_id === c.corpus_id ? s.corpusRowActive : {}),
              }}
            >
              <div style={s.corpusClass}>{c.attack_class}</div>
              <div style={s.corpusMeta}>
                {c.n_payloads} payloads · {new Date(c.generated_at * 1000).toLocaleString()}
              </div>
              <div style={s.corpusId}>{c.corpus_id}</div>
            </button>
          ))}
        </div>

        {/* Right: corpus detail */}
        <div style={s.rightPane}>
          {!selectedCorpus && (
            <div style={s.empty}>Pick a corpus on the left or generate a new one.</div>
          )}
          {selectedCorpus && (
            <>
              <div style={s.detailHeader}>
                <strong>{selectedCorpus.attack_class}</strong>
                <span style={s.detailMeta}>
                  {selectedCorpus.n_payloads} payloads · seed {selectedCorpus.seed} ·
                  authorized={String(selectedCorpus.authorized_env)}
                </span>
              </div>
              <div style={s.notes}>{selectedCorpus.notes}</div>
              <div style={s.payloadList}>
                {(selectedCorpus.payloads || []).map((p) => (
                  <div
                    key={p.payload_id}
                    style={{
                      ...s.payloadCard,
                      borderLeftColor: SEVERITY_COLOR[p.severity] || '#888',
                    }}
                  >
                    <div style={s.payloadHeader}>
                      <span style={s.payloadId}>{p.payload_id}</span>
                      <span style={s.payloadKind}>{p.kind}</span>
                      <span
                        style={{
                          ...s.severityBadge,
                          background: SEVERITY_COLOR[p.severity] || '#888',
                        }}
                      >
                        {p.severity}
                      </span>
                      {p.cwe_id && <span style={s.cweBadge}>{p.cwe_id}</span>}
                    </div>
                    <div style={s.payloadBody}>
                      {typeof p.payload === 'string'
                        ? <code style={s.payloadCode}>{p.payload}</code>
                        : <pre style={s.payloadJson}>{JSON.stringify(p.payload, null, 2)}</pre>
                      }
                    </div>
                    <div style={s.payloadReject}>
                      <strong>Expected reject reason:</strong> {p.expected_reject_reason}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={s.footer}>
        12 attack classes ·
        backend: <code>backend/ml/reference/attack_simulators.py</code> ·
        executor gate: <code>BEV_AUTHORIZED_ENV</code>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  authBadge: { padding: '2px 8px', background: '#10b981', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 600 },
  unauthBadge: { padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 10, fontWeight: 600 },
  policyNote: { padding: 10, background: '#fef9c3', borderLeft: '4px solid #ca8a04', borderRadius: 4, fontSize: 12, marginBottom: 12, color: '#713f12' },
  controls: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: 8, background: '#f9fafb', borderRadius: 4 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  select: { padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontFamily: 'monospace', minWidth: 180 },
  input: { padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', width: 60 },
  runBtn: { padding: '6px 14px', background: '#dc2626', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  error: { color: '#c00', padding: 12, background: '#fff0f0', borderRadius: 4, marginBottom: 8 },
  muted: { color: '#888', padding: 12 },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12, minHeight: 400 },
  leftPane: { background: '#fafafa', borderRadius: 4, padding: 6, maxHeight: 500, overflowY: 'auto' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6, padding: 4 },
  corpusRow: { display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', padding: 6, marginBottom: 4, borderRadius: 4, cursor: 'pointer' },
  corpusRowActive: { borderColor: '#dc2626', background: '#fff0f0' },
  corpusClass: { fontSize: 11, fontWeight: 600, color: '#111' },
  corpusMeta: { fontSize: 10, color: '#666', marginTop: 2 },
  corpusId: { fontSize: 9, color: '#888', fontFamily: 'monospace', marginTop: 2 },
  rightPane: { background: '#fff', borderRadius: 4, padding: 8, border: '1px solid #e5e7eb' },
  empty: { color: '#888', padding: 16, textAlign: 'center' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #f0f0f0' },
  detailMeta: { fontSize: 10, color: '#666', fontFamily: 'monospace' },
  notes: { fontSize: 11, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  payloadList: { maxHeight: 420, overflowY: 'auto' },
  payloadCard: { padding: 8, background: '#fafafa', borderLeft: '4px solid', borderRadius: 4, marginBottom: 6 },
  payloadHeader: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  payloadId: { fontFamily: 'monospace', fontSize: 10, color: '#666' },
  payloadKind: { fontWeight: 600, fontSize: 11 },
  severityBadge: { padding: '1px 6px', color: '#fff', borderRadius: 3, fontSize: 9, fontWeight: 600, textTransform: 'uppercase' },
  cweBadge: { padding: '1px 6px', background: '#1e3a8a', color: '#fff', borderRadius: 3, fontSize: 9, fontWeight: 600 },
  payloadBody: { marginBottom: 4 },
  payloadCode: { display: 'block', padding: 6, background: '#1f2937', color: '#86efac', borderRadius: 3, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' },
  payloadJson: { padding: 6, background: '#1f2937', color: '#d1d5db', borderRadius: 3, fontSize: 10, margin: 0 },
  payloadReject: { fontSize: 10, color: '#666', borderTop: '1px dashed #ccc', paddingTop: 4 },
  footer: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 12 },
};
