// useVirtualizedList.js · Iter 72 · §102.12.8 (large table virtualization)
// Simple windowing · render only visible slice + N before/after.

import { useState, useEffect, useRef } from 'react';

export function useVirtualizedList({
  total,
  itemHeight = 30,
  bufferSize = 10,
  containerHeight = 500,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const end = Math.min(total, start + visibleCount + 2 * bufferSize);

  return {
    containerRef,
    visibleRange: [start, end],
    spacerBefore: start * itemHeight,
    spacerAfter: (total - end) * itemHeight,
    containerStyle: { height: containerHeight, overflowY: 'auto' },
  };
}
