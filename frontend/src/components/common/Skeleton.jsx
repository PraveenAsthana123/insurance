// Skeleton.jsx · Iter 64 · §102.6 (no blank white screen)
// Inline animated divs · no external CSS · pure React + inline style.

import React, { useEffect, useState } from 'react';

// Drive shimmer via JS pulse (avoids inline <style> hooks)
function usePulse(period = 1400) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(prev => (prev + 50) % period), 50);
    return () => clearInterval(id);
  }, [period]);
  return t / period;  // 0..1
}

function bg(phase) {
  // shimmer · slide gradient stop across
  const pct = Math.round(phase * 200 - 50);
  return `linear-gradient(90deg, #f1f5f9 ${pct}%, #e2e8f0 ${pct + 25}%, #f1f5f9 ${pct + 50}%)`;
}

const baseStyle = (phase) => ({
  background: bg(phase),
  borderRadius: 4,
});

export function SkeletonText({ lines = 3, width = '100%' }) {
  const phase = usePulse();
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          ...baseStyle(phase), height: 12, marginBottom: 8,
          width: i === lines - 1 ? '60%' : width,
        }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ count = 1 }) {
  const phase = usePulse();
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          padding: 12, background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 6, marginBottom: 8,
        }}>
          <div style={{ ...baseStyle(phase), height: 14, width: '40%', marginBottom: 8 }} />
          <div style={{ ...baseStyle(phase), height: 10, width: '100%', marginBottom: 6 }} />
          <div style={{ ...baseStyle(phase), height: 10, width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  const phase = usePulse();
  return (
    <div>
      <div style={{
        background: '#f1f5f9', padding: 8, borderRadius: '4px 4px 0 0',
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8,
      }}>
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} style={{ ...baseStyle(phase), height: 10 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          padding: 8, borderTop: '1px solid #f1f5f9',
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8,
        }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} style={{ ...baseStyle(phase), height: 10 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatusBanner() {
  const phase = usePulse();
  return (
    <div style={{
      padding: 10, background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 4, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ ...baseStyle(phase), height: 14, width: 80 }} />
      <div style={{ ...baseStyle(phase), height: 14, width: 60 }} />
      <div style={{ ...baseStyle(phase), height: 14, width: 100 }} />
      <div style={{ ...baseStyle(phase), height: 14, width: 120 }} />
    </div>
  );
}

export default {
  Text: SkeletonText,
  Card: SkeletonCard,
  Table: SkeletonTable,
  StatusBanner: SkeletonStatusBanner,
};
