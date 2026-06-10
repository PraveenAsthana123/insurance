// PermalinkShare · Iter 21 · drop-in button that copies current URL.
// Optional state object encoded as query params for shareable deep-links.

import { useState } from 'react';

export default function PermalinkShare({ panelId, processId, accent = '#475569', state = null }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = new URL(window.location.href);
    if (panelId) url.searchParams.set('panel', panelId);
    if (processId) url.searchParams.set('process', processId);
    if (state && typeof state === 'object') {
      try {
        url.searchParams.set('state', btoa(JSON.stringify(state)));
      } catch { /* skip if too large */ }
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button onClick={copyLink} style={{
      padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
      background: copied ? '#dcfce7' : '#fff',
      color: copied ? '#166534' : accent,
      border: `1px solid ${copied ? '#16a34a' : accent}`, borderRadius: 3,
    }}>
      {copied ? '✓ Copied' : '🔗 Share'}
    </button>
  );
}
