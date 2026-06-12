// §149.2 · Resizable splitter handle (vertical drag bar)
// Operator 2026-06-12: "only sub menu should be resizable or Main menu also resizable"
//                     "content/workspace remain fixed"
//
// Wrap a column with this splitter to let the user drag-resize ONLY the column's width.
// The content area is NEVER wrapped so it stays at its computed flex: 1 width.
//
// Usage:
//   const [w, setW] = useResizableWidth({ storageKey: 'mainmenu', defaultPx: 240, min: 180, max: 420 });
//   <aside style={{ width: w }}>main menu...</aside>
//   <ResizableSplitter onDrag={(dx) => setW(w + dx)} />

import React, { useEffect, useRef, useState, useCallback } from 'react';

export function useResizableWidth({ storageKey, defaultPx = 240, min = 180, max = 480 }) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      try {
        const v = localStorage.getItem(`splitter:${storageKey}`);
        if (v) {
          const n = parseInt(v, 10);
          if (n >= min && n <= max) return n;
        }
      } catch { /* noop */ }
    }
    return defaultPx;
  });

  const setClamped = useCallback((px) => {
    const w = Math.max(min, Math.min(max, px));
    setWidth(w);
    if (storageKey) {
      try { localStorage.setItem(`splitter:${storageKey}`, String(w)); }
      catch { /* noop */ }
    }
  }, [storageKey, min, max]);

  return [width, setClamped];
}

export default function ResizableSplitter({ widthRef, onResize, min = 180, max = 480 }) {
  // widthRef holds the current width; onResize(newWidth) updates parent state
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, w: 0 });

  const onMouseDown = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, w: widthRef.current };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const newW = startRef.current.w + (e.clientX - startRef.current.x);
      onResize(Math.max(min, Math.min(max, newW)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, onResize, min, max]);

  return (
    <div
      className={`splitter-handle ${dragging ? 'dragging' : ''}`}
      onMouseDown={onMouseDown}
      title="Drag to resize"
      role="separator"
      aria-orientation="vertical"
    />
  );
}
