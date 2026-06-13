// §149.2 · SVG-based simple charts · no library dependency.
// Operator 2026-06-12: "each tab is very important" → Visualization tab
// must render real charts, not text descriptions.

import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// BarChart · horizontal · single-series
// data = [{label, value, color?}, ...]
export function BarChart({ data, max, width = 480, barH = 22, gap = 6, formatValue }) {
  const peak = (max ?? Math.max(...data.map(d => Number(d.value) || 0), 0)) || 1;
  const fmt = formatValue || (v => v);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${data.length * (barH + gap)}`}
         style={{ background: 'rgba(255,255,255,0.4)', borderRadius: 6 }}>
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        const w = (v / peak) * (width - 180);
        const color = d.color || `hsl(${(i * 47) % 360}, 70%, 55%)`;
        return (
          <g key={d.label + i} transform={`translate(0, ${i * (barH + gap)})`}>
            <text x="2" y={barH * 0.7} fontSize="11" fill="#475569">{d.label}</text>
            <rect x="160" y="3" width={w} height={barH - 6} rx="3" fill={color} opacity="0.85" />
            <text x={160 + w + 6} y={barH * 0.7} fontSize="11" fill="#1f2937" fontWeight="600">
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RadarChart · 4-7 axes
// data = [{label, value (0..1)}, ...]
export function RadarChart({ data, size = 260, color = '#a855f7' }) {
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.4;
  const n = data.length || 4;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Concentric grid (4 rings)
  const grid = [0.25, 0.5, 0.75, 1].map(r => (
    Array.from({ length: n }, (_, i) => {
      const a = angle(i);
      return `${cx + Math.cos(a) * radius * r},${cy + Math.sin(a) * radius * r}`;
    }).join(' ')
  ));

  const polyPoints = data.map((d, i) => {
    const v = Math.max(0, Math.min(1, Number(d.value) || 0));
    const a = angle(i);
    return `${cx + Math.cos(a) * radius * v},${cy + Math.sin(a) * radius * v}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* grid */}
      {grid.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(148,163,184,0.4)" />
      ))}
      {/* axes */}
      {data.map((d, i) => {
        const a = angle(i);
        return (
          <line key={`axis-${i}`}
                x1={cx} y1={cy}
                x2={cx + Math.cos(a) * radius}
                y2={cy + Math.sin(a) * radius}
                stroke="rgba(148,163,184,0.4)" />
        );
      })}
      {/* data polygon */}
      <polygon points={polyPoints} fill={color} fillOpacity="0.25"
               stroke={color} strokeWidth="2" />
      {/* labels + points */}
      {data.map((d, i) => {
        const v = Math.max(0, Math.min(1, Number(d.value) || 0));
        const a = angle(i);
        const lx = cx + Math.cos(a) * (radius + 16);
        const ly = cy + Math.sin(a) * (radius + 16);
        const px = cx + Math.cos(a) * radius * v;
        const py = cy + Math.sin(a) * radius * v;
        const tAnchor = a > Math.PI / 2 ? 'end' : a < -Math.PI / 2 ? 'end' : 'start';
        return (
          <g key={`pt-${i}`}>
            <circle cx={px} cy={py} r="4" fill={color} />
            <text x={lx} y={ly} fontSize="10" fill="#475569" textAnchor={tAnchor}>
              {d.label} {(v * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sparkline · trend line
// values = [number, number, ...]
export function Sparkline({ values, width = 200, height = 50, color = '#10b981' }) {
  if (!values || values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ background: 'rgba(255,255,255,0.4)', borderRadius: 4 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      <circle cx={(values.length - 1) * step} cy={height - ((values[values.length - 1] - min) / range) * height}
              r="3" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ProgressBar · 0..1
export function ProgressBar({ value, label, color = '#10b981', height = 8, showPct = true }) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: '#475569' }}>{label}</span>
          {showPct && <strong style={{ color }}>{(v * 100).toFixed(0)}%</strong>}
        </div>
      )}
      <div style={{ width: '100%', height, background: 'rgba(15,23,42,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${v * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TreeView · simple hierarchy (1-level deep)
export function TreeView({ root, children, color = '#3b82f6' }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div style={{ position: 'relative', padding: '8px 12px', display: 'inline-block',
                    background: 'rgba(59,130,246,0.08)', borderLeft: `4px solid ${color}`,
                    borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
        🎯 {root}
      </div>
      <div style={{ marginLeft: 16, marginTop: 6 }}>
        {children.map((c, i) => (
          <div key={i} style={{ position: 'relative', padding: '6px 10px', margin: '4px 0',
                                 background: 'rgba(255,255,255,0.6)',
                                 borderLeft: `3px solid ${color}99`,
                                 borderRadius: 4, fontSize: 12 }}>
            ↳ {c}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PipelineSteps · horizontal arrow chain
export function PipelineSteps({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const isCurrent = current === s.id;
        const isPast = current && steps.findIndex(x => x.id === current) > i;
        const color = isCurrent ? '#10b981' : isPast ? '#06b6d4' : '#94a3b8';
        return (
          <React.Fragment key={s.id || i}>
            <div style={{
              padding: '8px 14px',
              background: isCurrent ? '#ecfdf5' : isPast ? '#ecfeff' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${color}`,
              borderRadius: 6, fontSize: 11, fontWeight: 600,
              color: isCurrent ? '#065f46' : isPast ? '#155e75' : '#475569',
            }}>
              {s.icon} {s.label}
            </div>
            {i < steps.length - 1 && (
              <div style={{ alignSelf: 'center', fontSize: 16, color: '#cbd5e1' }}>›</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
