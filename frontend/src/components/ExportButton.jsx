// ExportButton · P1 #19 · CSV/JSON export from any panel.
// Drop-in button on any panel · accepts {data, filenameBase}.

import { useState } from 'react';

export default function ExportButton({ data, filenameBase = 'export', accent = '#475569' }) {
  const [open, setOpen] = useState(false);

  function toCSV(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const esc = (v) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return cols.join(',') + '\n' + rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  }

  function download(content, mime, ext) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `${filenameBase}-${ts}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    download(JSON.stringify(data, null, 2), 'application/json', 'json');
    setOpen(false);
  }

  function exportCSV() {
    // Find a list to flatten as CSV · pick first array-valued key
    let rows = null;
    if (Array.isArray(data)) rows = data;
    else if (data && typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') { rows = v; break; }
      }
    }
    if (!rows) {
      alert('No tabular data found in this panel · use JSON export.');
      return;
    }
    download(toCSV(rows), 'text/csv', 'csv');
    setOpen(false);
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
        background: '#fff', color: accent,
        border: `1px solid ${accent}`, borderRadius: 3,
      }}>📥 Export</button>
      {open && (
        <span style={{
          position: 'absolute', top: '100%', right: 0,
          marginTop: 4, padding: 4, background: '#fff',
          border: '1px solid #cbd5e1', borderRadius: 4, zIndex: 100,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', gap: 2,
          minWidth: 120,
        }}>
          <button onClick={exportJSON} style={menuItem}>JSON</button>
          <button onClick={exportCSV} style={menuItem}>CSV</button>
        </span>
      )}
    </span>
  );
}

const menuItem = {
  padding: '4px 8px', fontSize: 11, cursor: 'pointer', textAlign: 'left',
  background: 'transparent', border: 'none', borderRadius: 3,
};
