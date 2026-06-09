// ConfusionMatrixHeatmap · Iteration 2 P0 #3.
// Renders a square grid · diagonal in green · off-diagonal in red intensity.

export default function ConfusionMatrixHeatmap({
  labels = ['Negative', 'Positive'],
  matrix = [[0, 0], [0, 0]],
  cellSize = 80,
}) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return <em style={{ fontSize: 10, color: '#94a3b8' }}>no matrix data</em>;
  }
  const max = Math.max(...matrix.flat(), 1);

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Top axis label */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
        Predicted →
      </div>
      <div style={{ display: 'flex' }}>
        {/* Left axis label · vertical */}
        <div style={{
          writingMode: 'vertical-rl',
          fontSize: 10, color: '#64748b',
          alignSelf: 'center', marginRight: 4,
        }}>
          ↓ Actual
        </div>

        <div>
          {/* Header row · predicted labels */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: cellSize, fontSize: 10, color: '#94a3b8' }} />
            {labels.map((l, j) => (
              <div key={j} style={{
                width: cellSize, textAlign: 'center',
                fontSize: 10, fontWeight: 600, color: '#475569',
                paddingBottom: 4,
              }}>{l}</div>
            ))}
          </div>

          {/* Body rows */}
          {matrix.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Row label */}
              <div style={{
                width: cellSize, fontSize: 10, fontWeight: 600,
                color: '#475569', textAlign: 'right', paddingRight: 4,
              }}>{labels[i]}</div>
              {/* Cells */}
              {row.map((v, j) => {
                const isDiag = i === j;
                const intensity = max > 0 ? v / max : 0;
                const alpha = Math.max(0.1, intensity);
                const bg = isDiag
                  ? `rgba(22, 163, 74, ${alpha})`     // green
                  : `rgba(220, 38, 38, ${alpha})`;    // red
                const fg = intensity > 0.5 ? '#fff' : '#1e293b';
                return (
                  <div key={j} style={{
                    width: cellSize, height: cellSize,
                    background: bg,
                    border: '1px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: fg }}>{v}</div>
                    <div style={{ fontSize: 9, color: fg, opacity: 0.8 }}>
                      {(intensity * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
