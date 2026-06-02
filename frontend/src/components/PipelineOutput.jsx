/**
 * PipelineOutput — renders the latest run of a INSUR reference pipeline:
 *   - metrics row (accuracy / F1 / RMSE / etc.)
 *   - benchmark table (baseline vs candidates)
 *   - plot grid (EDA + eval + SHAP PNGs)
 *   - hyperparam config
 *   - chunking / RAG eval when present
 *
 * Fetches:
 *   GET /api/v1/insur/eval/{dept}/{pipeline}/runs
 *   GET /api/v1/insur/eval/{dept}/{pipeline}/runs/{run_id}/manifest
 *   GET /api/v1/insur/eval/{dept}/{pipeline}/runs/{run_id}/plots/{name}
 */
import { useEffect, useState } from 'react';

const API_BASE = '/api/v1/insur/eval';

export default function PipelineOutput({ dept, pipeline }) {
  const [runs, setRuns] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${API_BASE}/${dept}/${pipeline}/runs`, { signal: ac.signal });
        if (!r.ok) throw new Error(`runs HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        setRuns(data.runs || []);
        if (data.runs?.length) {
          const m = await fetch(
            `${API_BASE}/${dept}/${pipeline}/runs/${data.runs[0].run_id}/manifest`,
            { signal: ac.signal }
          );
          if (!m.ok) throw new Error(`manifest HTTP ${m.status}`);
          const mj = await m.json();
          if (!cancelled) setManifest(mj);
        }
      } catch (e) {
        if (!cancelled && e.name !== 'AbortError') setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [dept, pipeline]);

  if (loading) return <div style={s.muted}>Loading pipeline output…</div>;
  if (error) return <div style={s.error}>Error: {error}</div>;
  if (!runs.length)
    return (
      <div style={s.empty}>
        <strong>No runs yet for {dept}/{pipeline}.</strong>
        <div style={s.hint}>
          Trigger one: <code>celery -A workers.celery_app call insur.run_structured_lifecycle</code>
          {' '}or wait for the daily beat schedule.
        </div>
      </div>
    );
  if (!manifest) return <div style={s.muted}>Loading manifest…</div>;

  const plotUrl = (name) =>
    `${API_BASE}/${dept}/${pipeline}/runs/${manifest.run_id}/plots/${name}`;

  // Metrics — adapt to whichever shape (structured ML vs RAG)
  const metrics = manifest.metrics || manifest.eval || {};
  const numericMetrics = Object.entries(metrics).filter(
    ([_, v]) => typeof v === 'number'
  );

  return (
    <div style={s.root}>
      <div style={s.header}>
        <strong>Pipeline Output — {dept}/{pipeline}</strong>
        <span style={s.runId}>run {manifest.run_id} • {manifest.duration_seconds}s</span>
      </div>

      {/* Metrics row */}
      {numericMetrics.length > 0 && (
        <div style={s.metricsRow}>
          {numericMetrics.map(([k, v]) => (
            <div key={k} style={s.metricCard}>
              <div style={s.metricLabel}>{k}</div>
              <div style={s.metricValue}>{Number(v).toFixed(4)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Benchmark table */}
      {manifest.benchmark?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Benchmark vs baseline</div>
          <table style={s.table}>
            <thead>
              <tr>
                {Object.keys(manifest.benchmark[0]).map((c) => (
                  <th key={c} style={s.th}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manifest.benchmark.map((row, i) => (
                <tr key={i} style={row.model?.includes('Baseline') ? s.baselineRow : null}>
                  {Object.entries(row).map(([k, v]) => (
                    <td key={k} style={s.td}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hyperparams */}
      {manifest.hyperparams?.best_params && (
        <div style={s.section}>
          <div style={s.sectionTitle}>
            Best hyperparameters ({manifest.hyperparams.n_trials} Optuna trials,
            {' '}sampler: {manifest.hyperparams.sampler})
          </div>
          <table style={s.table}>
            <tbody>
              {Object.entries(manifest.hyperparams.best_params).map(([k, v]) => (
                <tr key={k}>
                  <td style={s.tdKey}>{k}</td>
                  <td style={s.td}>{typeof v === 'number' ? v.toFixed(4) : String(v)}</td>
                </tr>
              ))}
              <tr>
                <td style={s.tdKey}>loss_function</td>
                <td style={s.td}>{manifest.loss_function || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* RAG eval */}
      {manifest.chunks_summary && (
        <div style={s.section}>
          <div style={s.sectionTitle}>RAG — chunking + retrieval</div>
          <div style={s.ragGrid}>
            <div><strong>Strategy</strong>: {manifest.chunks_summary.chosen_strategy}</div>
            <div><strong>Chunks</strong>: {manifest.chunks_summary.n_chunks}</div>
            <div><strong>Avg tokens</strong>: {manifest.chunks_summary.avg_tokens?.toFixed(1)}</div>
            <div><strong>Embedding</strong>: {manifest.embedding_model}</div>
            <div><strong>Vector DB</strong>: {manifest.vector_db}</div>
            <div><strong>LLM</strong>: {manifest.llm_model}</div>
            <div><strong>Precision@k</strong>: {manifest.eval?.precision_at_k_mean}</div>
            <div><strong>MRR</strong>: {manifest.eval?.mrr}</div>
            <div><strong>Circuit breaker</strong>: <code>{manifest.circuit_breaker_state}</code></div>
          </div>
        </div>
      )}

      {/* Plot grid */}
      {manifest.plots && Object.keys(manifest.plots).length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Plots ({Object.keys(manifest.plots).length})</div>
          <div style={s.plotGrid}>
            {Object.entries(manifest.plots).map(([name, rel]) => {
              const fileName = rel.replace('plots/', '');
              return (
                <figure key={name} style={s.figure}>
                  <img
                    src={plotUrl(fileName)}
                    alt={name}
                    loading="lazy"
                    style={s.plotImg}
                  />
                  <figcaption style={s.caption}>{name}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      )}

      {/* RAG sample answers */}
      {manifest.queries?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Sample RAG answers</div>
          {manifest.queries.slice(0, 3).map((q, i) => (
            <div key={i} style={s.queryBlock}>
              <div><strong>Q:</strong> {q.query}</div>
              <div style={s.answer}>
                <strong>A:</strong> {q.answer?.slice(0, 400)}
                {q.answer?.length > 400 ? '…' : ''}
              </div>
              <div style={s.citations}>
                {q.citations?.length
                  ? `${q.citations.length} citation${q.citations.length === 1 ? '' : 's'}`
                  : 'no citations'}
                {' • '}
                <code>{q.llm_duration_seconds}s</code>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.footer}>
        {runs.length} run{runs.length === 1 ? '' : 's'} total ·
        latest: <code>{manifest.run_id}</code>
      </div>
    </div>
  );
}

const s = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginTop: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  runId: { fontSize: 11, color: '#888', fontFamily: 'monospace' },
  muted: { color: '#888', padding: 16 },
  error: { color: '#c00', padding: 16, background: '#fff0f0', borderRadius: 4 },
  empty: { padding: 16, background: '#fafafa', borderRadius: 4, color: '#555' },
  hint: { fontSize: 11, marginTop: 6, color: '#888' },
  metricsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  metricCard: { flex: '1 1 120px', padding: 10, background: '#f6f8fa', borderRadius: 6, border: '1px solid #e1e4e8' },
  metricLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase' },
  metricValue: { fontSize: 18, fontWeight: 600, color: '#111', marginTop: 4 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 8px', background: '#f6f8fa', borderBottom: '2px solid #e1e4e8' },
  td: { padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace' },
  tdKey: { padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 },
  baselineRow: { background: '#fafafa', fontStyle: 'italic', color: '#666' },
  ragGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, fontSize: 12 },
  plotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  figure: { margin: 0, padding: 6, background: '#fafafa', borderRadius: 4, border: '1px solid #e8e8e8' },
  plotImg: { width: '100%', height: 'auto', borderRadius: 4, display: 'block' },
  caption: { fontSize: 11, color: '#666', textAlign: 'center', marginTop: 4, fontFamily: 'monospace' },
  queryBlock: { padding: 8, background: '#fafafa', borderRadius: 4, marginBottom: 8, fontSize: 12 },
  answer: { marginTop: 4, color: '#333' },
  citations: { fontSize: 10, color: '#888', marginTop: 4 },
  footer: { fontSize: 11, color: '#888', textAlign: 'right', marginTop: 12 },
};
