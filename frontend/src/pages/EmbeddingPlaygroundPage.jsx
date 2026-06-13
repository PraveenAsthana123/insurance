// §F14 · Embedding Playground · operator 2026-06-12.
import React, { useEffect, useState } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';
import { BarChart } from '../components/SimpleCharts';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function EmbeddingPlaygroundPage() {
  const [text, setText] = useState('Claim was denied because the policy lapsed before the loss date.');
  const [model, setModel] = useState('bge-m3');
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/embeddings/health`, { headers: { 'X-Demo-Role': 'manager' } })
      .then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true); setResult(null); setErr(null);
    try {
      const r = await fetch(`${API}/api/v1/embeddings/run`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail?.detail || `HTTP ${r.status}`);
      setResult(j);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🔢 Embedding Playground</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F14 · POST `/api/v1/embeddings/run` · Ollama-backed (bge-m3 / nomic-embed / etc)
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="Test any text against any embedding model · inspect dim / norm / sample values."
        storageKey="embeddings"
        todos={[
          { id: 'e1', label: 'Ollama health checked', done: health?.ollama_reachable },
          { id: 'e2', label: 'Text → vector via /embeddings/run' },
          { id: 'e3', label: 'Compare 2 vectors with cosine (next iter)' },
          { id: 'e4', label: 'Persist vectors to chosen Vector DB' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      {health && (
        <div className="glass-card" style={{
          background: health.ollama_reachable ? '#ecfdf5' : '#fef3c7',
          borderLeft: `4px solid ${health.ollama_reachable ? '#10b981' : '#f59e0b'}`,
          marginBottom: 12, fontSize: 12,
        }}>
          <strong>{health.ollama_reachable ? '✓ Ollama reachable' : '⚠ Ollama unreachable'}</strong> ·
          <code style={{ marginLeft: 6 }}>{health.url}</code> ·
          Supported: {(health.supported_models || []).join(', ')}
        </div>
      )}

      <div className="glass-card card-input" style={{ marginBottom: 12 }}>
        <strong>📥 Input</strong>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                  style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 8,
                            border: '1px solid #cbd5e1', borderRadius: 4,
                            fontFamily: 'inherit' }} />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="subtle" style={{ fontSize: 10 }}>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 12,
                            border: '1px solid #cbd5e1', borderRadius: 4 }}>
            {(health?.supported_models || ['bge-m3']).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={run} disabled={busy || !text.trim()}
                  className="btn-glass btn-glass-primary" style={{ marginLeft: 'auto' }}>
            {busy ? 'Computing…' : 'Embed →'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="glass-card" style={{
            background: result.scaffold ? '#fef3c7' : '#ecfdf5',
            borderLeft: `4px solid ${result.scaffold ? '#f59e0b' : '#10b981'}`,
            marginBottom: 12,
          }}>
            <strong>{result.scaffold ? '⚠ Scaffold mode' : '✓ Real embedding'}</strong> ·
            backend: <code>{result.backend}</code> ·
            dim: <code>{result.vector_full_count || result.dim}</code> ·
            norm: <code>{result.norm ?? '—'}</code> ·
            min: <code>{result.min ?? '—'}</code> ·
            max: <code>{result.max ?? '—'}</code>
          </div>
          {result.vector?.length > 0 && (
            <div className="glass-card card-output">
              <strong>📤 First 32 dimensions</strong>
              <div style={{ marginTop: 12 }}>
                <BarChart data={result.vector.slice(0, 32).map((v, i) => ({
                  label: `d${i}`, value: Math.abs(v),
                  color: v >= 0 ? '#10b981' : '#ef4444',
                }))} formatValue={v => v.toFixed(4)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
