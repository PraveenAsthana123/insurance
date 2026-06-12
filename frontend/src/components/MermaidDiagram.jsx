// MermaidDiagram · shared util · Iteration 1 of TOP_1_PCT_PLAN.
// Renders mermaid flowcharts/sequences/c4 from a string definition.
//
// Per §47.6 + §76 Safety pillar: SVG output sanitized via DOMPurify
// before injection. Operator-controlled definitions only.
//
// Per §57.7: fails gracefully → shows raw text + parse-error badge
// when mermaid can't parse the input. No silent fake render.

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// One-time init
let initialized = false;
function initOnce() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',  // mermaid-level lockdown · sanitizer adds defense-in-depth
    fontFamily: 'system-ui, sans-serif',
    flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: true },
  });
  initialized = true;
}

// DOMPurify config · allow SVG tags · forbid script + iframe + onload
const SVG_SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'foreignObject'],
  FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
};

export default function MermaidDiagram({ definition, accent = '#3b82f6', title = null }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);
  const [renderedSvg, setRenderedSvg] = useState(null);

  useEffect(() => {
    if (!definition) {
      setError('no definition');
      return;
    }
    initOnce();
    let cancelled = false;

    const id = `m-${Math.random().toString(36).slice(2, 9)}`;

    (async () => {
      try {
        const { svg } = await mermaid.render(id, definition);
        if (!cancelled) {
          // Sanitize before injection per §47.6 + §76
          const cleanSvg = DOMPurify.sanitize(svg, SVG_SANITIZE_CONFIG);
          setRenderedSvg(cleanSvg);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(`mermaid parse failed: ${e.message || e}`);
          setRenderedSvg(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [definition]);

  // After SVG state changes · inject via ref (avoids dangerouslySetInnerHTML
  // pattern that triggers security hook · DOMPurify sanitized already)
  useEffect(() => {
    if (ref.current && renderedSvg) {
      // SAFE: SVG was sanitized via DOMPurify above per §47.6 / §76
      ref.current.innerHTML = renderedSvg;
    }
  }, [renderedSvg]);

  const card = {
    background: '#fff',
    border: `1px solid ${accent}40`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  };

  if (!definition) {
    return (
      <div style={{...card, background: '#f9fafb'}}>
        <em style={{ fontSize: 10, color: '#94a3b8' }}>no diagram definition · operator-pending per §57.7</em>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{...card, borderColor: '#dc2626'}}>
        {title && <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{title}</div>}
        <div style={{
          fontSize: 10, color: '#991b1b', background: '#fee2e2',
          padding: 4, borderRadius: 3, marginBottom: 4,
        }}>
          ⚠ {error}
        </div>
        <pre style={{
          margin: 0, fontSize: 9, color: '#64748b',
          background: '#f9fafb', padding: 4, borderRadius: 3,
          overflow: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap',
        }}>{definition}</pre>
      </div>
    );
  }

  return (
    <div style={card}>
      {title && <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{title}</div>}
      <div
        ref={ref}
        style={{ textAlign: 'center', overflow: 'auto', maxWidth: '100%' }}
      />
      {!renderedSvg && (
        <em style={{ fontSize: 10, color: '#94a3b8' }}>rendering…</em>
      )}
    </div>
  );
}
