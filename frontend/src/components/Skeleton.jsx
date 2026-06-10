// Skeleton · Iter 22 · animated placeholder boxes · replaces "Loading…" text.
// Drop in any panel during async load.

export default function Skeleton({ width = '100%', height = 12, count = 1, gap = 6, rounded = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, padding: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            width: typeof width === 'string' ? width : `${width}px`,
            height,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'insur-skeleton 1.5s ease-in-out infinite',
            borderRadius: rounded,
          }}
        />
      ))}
      <style>{`
        @keyframes insur-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonRow({ cols = 6, rows = 3 }) {
  return (
    <div role="status" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 6 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={10} />
          ))}
        </div>
      ))}
    </div>
  );
}
