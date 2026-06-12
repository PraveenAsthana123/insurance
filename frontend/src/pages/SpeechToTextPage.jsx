// Speech-to-Text · operator 2026-06-12 'video-to-text + audio-to-text'.
// Stage-1 functional · faster-whisper if installed · graceful scaffold otherwise.
import React, { useState } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function SpeechToTextPage() {
  const [mode, setMode] = useState('audio');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setErr(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${API}/api/v1/video-intel/${mode}-to-text`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager' },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail?.detail || j.detail || `HTTP ${r.status}`);
      setResult(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const FS = 13;
  return (
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🎙 Speech-to-Text</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          §128 STT POST · audio-to-text + video-to-text · Stage-1 wired to faster-whisper
        </div>
      </header>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {['audio', 'video'].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            background: mode === m ? '#10b981' : '#fff',
            color: mode === m ? '#fff' : '#1f2937',
            border: '1px solid #cbd5e1',
            padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>
            {m.charAt(0).toUpperCase() + m.slice(1)} → Text
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 6, padding: 16, marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                         color: '#475569', textTransform: 'uppercase',
                         letterSpacing: '0.05em', marginBottom: 8 }}>
          Upload {mode} file
        </label>
        <input type="file" accept={mode === 'audio' ? 'audio/*' : 'video/*'}
               onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div style={{ marginTop: 12 }}>
          <button onClick={send} disabled={!file || loading} style={{
            background: '#10b981', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            opacity: !file || loading ? 0.5 : 1,
          }}>
            {loading ? 'Transcribing…' : `Transcribe →`}
          </button>
        </div>
      </div>

      {err && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444',
                      color: '#991b1b', padding: 12, borderRadius: 4, marginBottom: 12 }}>
          {err}
        </div>
      )}

      {result && (
        <>
          <div style={{ background: result.scaffold ? '#fef3c7' : '#ecfdf5',
                        borderLeft: `4px solid ${result.scaffold ? '#f59e0b' : '#10b981'}`,
                        padding: 12, borderRadius: 4, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: result.scaffold ? '#92400e' : '#065f46' }}>
              <strong>{result.scaffold ? '⚠ Scaffold mode' : '✓ Real ASR'}</strong> ·
              backend: <code>{result.asr_backend}</code> ·
              size: <code>{result.size_bytes}</code> bytes ·
              language: <code>{result.language}</code>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Transcript
            </div>
            <div style={{ fontSize: 13, color: '#1f2937', whiteSpace: 'pre-wrap',
                          minHeight: 80, background: '#fafbfc', padding: 12, borderRadius: 4 }}>
              {result.transcript || '(empty · no speech detected)'}
            </div>
          </div>
          {result.segments && result.segments.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569',
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Segments ({result.segments.length})
              </div>
              <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f1f5f9', color: '#475569' }}>
                  <tr>
                    <th style={{ padding: 6, textAlign: 'left' }}>Start</th>
                    <th style={{ padding: 6, textAlign: 'left' }}>End</th>
                    <th style={{ padding: 6, textAlign: 'left' }}>Speaker</th>
                    <th style={{ padding: 6, textAlign: 'left' }}>Confidence</th>
                    <th style={{ padding: 6, textAlign: 'left' }}>Transcript</th>
                  </tr>
                </thead>
                <tbody>
                  {result.segments.map((s, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 6 }}>{s.start}s</td>
                      <td style={{ padding: 6 }}>{s.end}s</td>
                      <td style={{ padding: 6 }}>{s.speaker}</td>
                      <td style={{ padding: 6 }}>{s.confidence ?? '-'}</td>
                      <td style={{ padding: 6 }}>{s.transcript}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 16, padding: 12,
                    background: '#faf5ff', borderLeft: '4px solid #a855f7',
                    borderRadius: 4, fontSize: 11, color: '#581c87' }}>
        ℹ️ §57.7 honest scaffold: when faster-whisper isn&apos;t installed,
        the endpoint returns the same shape with <code>scaffold: true</code>.
        Production wiring is one <code>pip install faster-whisper</code> away.
      </div>
    </div>
  );
}
