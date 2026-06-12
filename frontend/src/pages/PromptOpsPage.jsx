// §EAOS-06 · PromptOps · operator 2026-06-12 23-level brief.
// Prompt registry + versioning + test + approval + rollback.
import React, { useEffect, useState, useCallback } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function PromptOpsPage() {
  const [prompts, setPrompts] = useState([]);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/prompts?limit=200`,
                            { headers: { 'X-Demo-Role': 'manager' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setPrompts(j.prompts || j.items || j.data || []);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const test = async () => {
    if (!selected || !testInput.trim()) return;
    setTestBusy(true);
    setTestResult(null);
    try {
      const r = await fetch(`${API}/api/v1/llm-gateway/chat`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: selected.prompt_id || selected.id,
          messages: [{ role: 'user', content: testInput }],
        }),
      });
      const j = await r.json();
      setTestResult(j);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTestBusy(false);
    }
  };

  const visible = prompts.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (p.prompt_id || p.id || p.name || '').toLowerCase().includes(q)
        || (p.description || p.purpose || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">📝 PromptOps</h1>
      <div className="subtle" style={{ marginBottom: 16 }}>
        Prompt registry · versioning · test · approval · rollback
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="One surface for every prompt template in production · operators can see version · test against any model · roll back instantly."
        storageKey="promptops"
        todos={[
          { id: 'p1', label: `${prompts.length} prompts registered` },
          { id: 'p2', label: 'Search/filter prompts by id or purpose' },
          { id: 'p3', label: 'Click prompt → test with custom input' },
          { id: 'p4', label: 'Version diff + rollback (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <div>
          <input type="search" placeholder="Filter prompts…" value={filter}
                 onChange={e => setFilter(e.target.value)}
                 style={{ padding: '8px 12px', fontSize: 12,
                          border: '1px solid #cbd5e1', borderRadius: 4,
                          width: '100%', marginBottom: 8 }} />
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {visible.map((p, i) => {
              const id = p.prompt_id || p.id || p.name;
              const isSel = selected && (selected.prompt_id || selected.id || selected.name) === id;
              return (
                <div key={id || i} onClick={() => setSelected(p)} className={`glass-card ${isSel ? 'card-2' : 'card-5'}`}
                     style={{ marginBottom: 6, cursor: 'pointer', padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{id}</div>
                  {(p.version || p.template_version) && (
                    <span style={{ fontSize: 10, padding: '2px 6px',
                                   background: 'rgba(0,0,0,0.06)', borderRadius: 3,
                                   marginTop: 4, display: 'inline-block' }}>
                      v{p.version || p.template_version}
                    </span>
                  )}
                  {(p.description || p.purpose) && (
                    <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                      {(p.description || p.purpose || '').slice(0, 70)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          {selected ? (
            <>
              <div className="glass-card card-5" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, margin: 0 }}>
                  {selected.prompt_id || selected.id || selected.name}
                </h3>
                <div className="subtle" style={{ marginTop: 4 }}>
                  {selected.description || selected.purpose}
                </div>
                {selected.template && (
                  <pre style={{ fontSize: 11, background: 'rgba(255,255,255,0.6)',
                                padding: 10, borderRadius: 4, marginTop: 10,
                                maxHeight: 200, overflow: 'auto',
                                whiteSpace: 'pre-wrap' }}>
                    {selected.template}
                  </pre>
                )}
              </div>

              <div className="glass-card card-3">
                <strong style={{ fontSize: 12 }}>⚡ Test the prompt</strong>
                <textarea value={testInput} onChange={e => setTestInput(e.target.value)}
                          rows={4} placeholder="Enter test input…"
                          style={{ width: '100%', padding: 8, fontSize: 12,
                                   border: '1px solid #cbd5e1', borderRadius: 4,
                                   marginTop: 8, fontFamily: 'inherit' }} />
                <button onClick={test} disabled={!testInput.trim() || testBusy}
                        className="btn-glass btn-glass-primary" style={{ marginTop: 8 }}>
                  {testBusy ? 'Testing…' : 'Run Test →'}
                </button>
              </div>

              {testResult && (
                <div className="glass-card card-2" style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 12 }}>Result</strong>
                  <pre style={{ fontSize: 11, background: 'rgba(255,255,255,0.7)',
                                padding: 10, borderRadius: 4, marginTop: 8,
                                maxHeight: 300, overflow: 'auto',
                                whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card" style={{ padding: 30, textAlign: 'center',
                                                   color: '#94a3b8' }}>
              ← Pick a prompt to inspect / test
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
