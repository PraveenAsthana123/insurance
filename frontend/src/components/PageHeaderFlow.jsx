// §149.2 · Horizontal Input → Process → Output → Visualization strip
// Operator 2026-06-12: "horizental flow missing on top"
//
// Usage:
//   <PageHeaderFlow active="process" />
//   <PageHeaderFlow active="output" steps={['input','process','output','visualization','audit']} />

import React from 'react';

const DEFAULT_STEPS = [
  { id: 'input',         label: 'Input',         icon: '📥' },
  { id: 'process',       label: 'Process',       icon: '⚙️' },
  { id: 'output',        label: 'Output',        icon: '📤' },
  { id: 'visualization', label: 'Visualization', icon: '📊' },
];

export default function PageHeaderFlow({ active, steps }) {
  const items = (steps || []).length
    ? steps.map(s => typeof s === 'string'
        ? DEFAULT_STEPS.find(d => d.id === s) || { id: s, label: s, icon: '•' }
        : s)
    : DEFAULT_STEPS;

  return (
    <div className="flow-strip">
      {items.map(s => (
        <div key={s.id} className={`flow-step ${active === s.id ? `active ${s.id}` : ''}`}>
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
