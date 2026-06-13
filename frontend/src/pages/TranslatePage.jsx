// §F10 · Translation · operator 2026-06-12.
import React, { useEffect, useState } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function TranslatePage() {
  const [text, setText] = useState('The claim has been processed and the customer notified.');
  const [from, setFrom] = useState('en');
  const [to, setTo] = useState('es');
  const [langs, setLangs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/v1/translate/languages`, { headers: { 'X-Demo-Role': 'manager' } })
      .then(r => r.json())
      .then(d => setLangs(d.languages || []));
  }, []);

  const run = async () => {
    setBusy(true); setResult(null); setErr(null);
    try {
      const r = await fetch(`${API}/api/v1/translate/run`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source_lang: from, target_lang: to }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail?.detail || `HTTP ${r.status}`);
      setResult(j);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🌐 Translation</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F10 · POST `/api/v1/translate/run` · Stage-1 fallback chain: argos → transformers → scaffold
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="Translate any insurance content into 10 supported languages · honest scaffold when no lib installed."
        storageKey="translate"
        todos={[
          { id: 'tr1', label: 'Translation endpoint live (200)' },
          { id: 'tr2', label: 'Language picker · 10 languages' },
          { id: 'tr3', label: 'Backend honesty flag visible' },
          { id: 'tr4', label: 'Batch translate from CSV (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass-card card-input">
          <strong>📥 Source</strong>
          <div style={{ marginTop: 8 }}>
            <label className="subtle" style={{ fontSize: 10 }}>From</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
                    style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12,
                              border: '1px solid #cbd5e1', borderRadius: 4 }}>
              <option value="auto">Auto</option>
              {langs.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
                    style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 8,
                              border: '1px solid #cbd5e1', borderRadius: 4,
                              fontFamily: 'inherit' }} />
        </div>
        <div className="glass-card card-output">
          <strong>📤 Target</strong>
          <div style={{ marginTop: 8 }}>
            <label className="subtle" style={{ fontSize: 10 }}>To</label>
            <select value={to} onChange={e => setTo(e.target.value)}
                    style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12,
                              border: '1px solid #cbd5e1', borderRadius: 4 }}>
              {langs.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          {result ? (
            <>
              <div style={{ marginTop: 8, padding: 10, background: result.scaffold ? '#fef3c7' : '#ecfdf5',
                              borderLeft: `4px solid ${result.scaffold ? '#f59e0b' : '#10b981'}`,
                              borderRadius: 4, fontSize: 11 }}>
                <strong>{result.scaffold ? '⚠ Scaffold mode' : '✓ Real translation'}</strong> ·
                backend: <code>{result.backend_label}</code>
              </div>
              <pre style={{ fontSize: 13, marginTop: 8, padding: 10,
                              background: 'rgba(255,255,255,0.7)', borderRadius: 4,
                              maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {result.translation}
              </pre>
            </>
          ) : (
            <div className="subtle" style={{ marginTop: 30, textAlign: 'center' }}>
              Click Translate to see output
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button onClick={run} disabled={busy || !text.trim()}
                className="btn-glass btn-glass-primary">
          {busy ? 'Translating…' : `Translate ${from} → ${to} →`}
        </button>
      </div>
    </div>
  );
}
