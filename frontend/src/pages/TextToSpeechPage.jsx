// §F01 · TTS · operator 2026-06-12 'create plan · cron'.
// Stage-1: text input + voice/speed picker + play synthesized audio.
import React, { useState, useEffect } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function TextToSpeechPage() {
  const [text, setText] = useState('Hello from the insur platform. This is a text to speech test.');
  const [voice, setVoice] = useState('en');
  const [speed, setSpeed] = useState(1.0);
  const [voices, setVoices] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/voice-ai/text-to-speech/voices`, {
      headers: { 'X-Demo-Role': 'manager' },
    })
      .then(r => r.json())
      .then(d => setVoices(d.voices || []))
      .catch(e => setErr(e.message));
  }, []);

  const synthesize = async () => {
    setLoading(true);
    setResult(null);
    setErr(null);
    try {
      const r = await fetch(`${API}/api/v1/voice-ai/text-to-speech`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed, format: 'wav' }),
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
    <div style={{ padding: 24, fontSize: FS, color: '#1f2937', maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>🔊 Text-to-Speech</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          §F01 · POST `/api/v1/voice-ai/text-to-speech` · Stage-1 with gTTS/pyttsx3/Coqui fallback chain
        </div>
      </header>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 6, padding: 16, marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
                         color: '#475569', textTransform: 'uppercase',
                         letterSpacing: '0.05em', marginBottom: 6 }}>
          Text to synthesize
        </label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
                  style={{ width: '100%', padding: 10, fontSize: 13,
                           border: '1px solid #cbd5e1', borderRadius: 4,
                           fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#475569' }}>Voice</label><br/>
            <select value={voice} onChange={e => setVoice(e.target.value)}
                    style={{ padding: 6, fontSize: 12, border: '1px solid #cbd5e1',
                             borderRadius: 4, minWidth: 180 }}>
              {voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#475569' }}>Speed</label><br/>
            <input type="range" min="0.5" max="2" step="0.1" value={speed}
                   onChange={e => setSpeed(parseFloat(e.target.value))} />
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>{speed.toFixed(1)}×</span>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={synthesize} disabled={!text.trim() || loading} style={{
            background: '#10b981', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            opacity: !text.trim() || loading ? 0.5 : 1,
          }}>
            {loading ? 'Synthesizing…' : 'Synthesize →'}
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
              <strong>{result.scaffold ? '⚠ Scaffold mode (chirp)' : '✓ Real TTS'}</strong> ·
              backend: <code>{result.backend_label}</code> ·
              {result.size_bytes} bytes
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: 16 }}>
            <audio controls
                   src={`data:${result.content_type};base64,${result.audio_b64}`}
                   style={{ width: '100%' }} />
            <a href={`data:${result.content_type};base64,${result.audio_b64}`}
               download={`tts.${result.format}`}
               style={{ display: 'inline-block', marginTop: 10, fontSize: 12,
                        color: '#2563eb', textDecoration: 'none' }}>
              Download {result.format.toUpperCase()} →
            </a>
          </div>
        </>
      )}

      <div style={{ marginTop: 16, padding: 12,
                    background: '#faf5ff', borderLeft: '4px solid #a855f7',
                    borderRadius: 4, fontSize: 11, color: '#581c87' }}>
        ℹ️ §57.7 honest scaffold: when no TTS lib is installed,
        you'll hear a chirp instead of speech with <code>scaffold: true</code>.
        Install with: <code>pip install gtts</code> (online · easy) or
        <code> pip install pyttsx3</code> (offline · system voice).
      </div>
    </div>
  );
}
