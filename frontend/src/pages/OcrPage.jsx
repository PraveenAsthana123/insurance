// §F11 · Functional OCR · operator 2026-06-12.
import React, { useState } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function OcrPage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const run = async () => {
    if (!file) return;
    setBusy(true); setResult(null); setErr(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API}/api/v1/image-clean/ocr`, {
        method: 'POST',
        headers: { 'X-Demo-Role': 'manager' },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail?.detail || `HTTP ${r.status}`);
      setResult(j);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">👁 Functional OCR</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F11 · POST `/api/v1/image-clean/ocr` · pytesseract / EasyOCR fallback
      </div>

      <PageHeaderFlow active="process" />

      <PageObjective
        objective="Extract text + per-region boxes from any image (claim photo · scanned doc · invoice)."
        storageKey="ocr"
        todos={[
          { id: 'o1', label: 'Image upload accepted' },
          { id: 'o2', label: 'Backend OCR returns text + regions' },
          { id: 'o3', label: 'Per-region confidence visible' },
          { id: 'o4', label: 'Image preview with box overlay (next iter)' },
        ]}
      />

      {err && <div className="glass-card card-4">⚠ {err}</div>}

      <div className="glass-card card-input" style={{ marginBottom: 12 }}>
        <strong>📥 Upload image</strong>
        <div style={{ marginTop: 8 }}>
          <input type="file" accept="image/*"
                 onChange={e => setFile(e.target.files?.[0] || null)} />
          <button onClick={run} disabled={busy || !file}
                  className="btn-glass btn-glass-primary"
                  style={{ marginLeft: 12 }}>
            {busy ? 'Running OCR…' : 'Extract text →'}
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
            <strong>{result.scaffold ? '⚠ Scaffold mode' : '✓ Real OCR'}</strong> ·
            backend: <code>{result.backend_label}</code> ·
            size: <code>{result.size_bytes}</code> bytes
          </div>
          <div className="glass-card card-output" style={{ marginBottom: 12 }}>
            <strong>📤 Extracted text</strong>
            <pre style={{ marginTop: 8, padding: 12, background: 'rgba(255,255,255,0.7)',
                            borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap',
                            maxHeight: 300, overflow: 'auto' }}>
              {result.text || '(empty)'}
            </pre>
          </div>
          {result.regions?.length > 0 && (
            <div className="glass-card glass-strong">
              <strong>🔍 Regions ({result.regions.length})</strong>
              <table style={{ width: '100%', fontSize: 11, marginTop: 8, borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
                  <tr>
                    {['Text', 'Confidence', 'X', 'Y', 'W', 'H'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: 6,
                                             fontSize: 10, color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.regions.slice(0, 50).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 6 }}>{r.text}</td>
                      <td style={{ padding: 6 }}>{r.confidence}%</td>
                      <td style={{ padding: 6 }}>{r.x ?? '—'}</td>
                      <td style={{ padding: 6 }}>{r.y ?? '—'}</td>
                      <td style={{ padding: 6 }}>{r.w ?? '—'}</td>
                      <td style={{ padding: 6 }}>{r.h ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
