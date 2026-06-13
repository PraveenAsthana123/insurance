// §F07 · Prompt Playground · operator 2026-06-12.
import React, { useState } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function PromptPlaygroundPage() {
  const [system, setSystem] = useState('You are a helpful insurance domain assistant.');
  const [user, setUser] = useState('Summarize the key risks of cyber liability insurance in 3 bullets.');
  const [model, setModel] = useState('llama3.2:3b');
  const [temperature, setTemperature] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);

  const run = async () => {
    setBusy(true); setOut(null); setErr(null);
    try {
      const r = await fetch(`${API}/api/v1/llm-gateway/chat`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail?.detail || j.detail || `HTTP ${r.status}`);
      setOut(j);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">🧪 Prompt Playground</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F07 · interactive prompt testing against any model · powered by /llm-gateway
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="Iterate on prompts in real time · compare outputs across models · log winners to PromptOps registry."
        storageKey="prompt-playground"
        todos={[
          { id: 'pp1', label: 'System + user prompt editable' },
          { id: 'pp2', label: 'Model + temperature pickers' },
          { id: 'pp3', label: 'Run + show raw response' },
          { id: 'pp4', label: 'Save as new PromptOps version (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass-card card-input">
          <strong>📥 Input</strong>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>System</label>
            <textarea value={system} onChange={e => setSystem(e.target.value)} rows={3}
                      style={{ width: '100%', padding: 8, fontSize: 12, marginTop: 4,
                               border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>User</label>
            <textarea value={user} onChange={e => setUser(e.target.value)} rows={4}
                      style={{ width: '100%', padding: 8, fontSize: 12, marginTop: 4,
                               border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Model</label>
              <input value={model} onChange={e => setModel(e.target.value)}
                     style={{ width: '100%', padding: 6, fontSize: 12, marginTop: 4,
                              border: '1px solid #cbd5e1', borderRadius: 4 }} />
            </div>
            <div style={{ width: 120 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Temp</label>
              <input type="number" min="0" max="2" step="0.1"
                     value={temperature}
                     onChange={e => setTemperature(parseFloat(e.target.value))}
                     style={{ width: '100%', padding: 6, fontSize: 12, marginTop: 4,
                              border: '1px solid #cbd5e1', borderRadius: 4 }} />
            </div>
          </div>
          <button onClick={run} disabled={busy} className="btn-glass btn-glass-primary"
                  style={{ marginTop: 12 }}>
            {busy ? 'Running…' : 'Run prompt →'}
          </button>
        </div>

        <div className="glass-card card-output">
          <strong>📤 Output</strong>
          {!out ? (
            <div style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>
              Run a prompt to see output
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                Model: <code>{out.model || model}</code> ·
                latency: <code>{out.latency_ms || '—'}ms</code> ·
                tokens: <code>{out.tokens_total || out.usage?.total_tokens || '—'}</code>
              </div>
              <pre style={{ fontSize: 12, background: 'rgba(255,255,255,0.7)',
                            padding: 10, borderRadius: 4, marginTop: 8,
                            maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {out.text || out.response || out.message?.content || JSON.stringify(out, null, 2)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
