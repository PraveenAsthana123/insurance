// §149.2 · Objective + Todo banner per workspace page
// Operator 2026-06-12: "objective missing · to do list missing"
//
// Usage:
//   <PageObjective
//     objective="Close all pending L1 tickets in 24h"
//     todos={[
//       {id:'t1', label:'Triage incoming queue', done:true},
//       {id:'t2', label:'Group by department'},
//       {id:'t3', label:'Auto-route low-risk'},
//     ]}
//   />

import React, { useState, useEffect } from 'react';

export default function PageObjective({ objective, todos = [], storageKey, children }) {
  const [items, setItems] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`todos:${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // merge done state from saved into incoming todos
          return todos.map(t => ({
            ...t,
            done: parsed[t.id] ?? t.done ?? false,
          }));
        }
      } catch { /* noop */ }
    }
    return todos.map(t => ({ ...t, done: t.done ?? false }));
  });

  const toggle = (id) => {
    setItems(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      if (storageKey) {
        const map = Object.fromEntries(next.map(t => [t.id, t.done]));
        localStorage.setItem(`todos:${storageKey}`, JSON.stringify(map));
      }
      return next;
    });
  };

  const nDone = items.filter(t => t.done).length;
  const pct = items.length ? Math.round(100 * nDone / items.length) : 0;

  return (
    <div className="objective-block">
      <div className="objective-title">🎯 Objective</div>
      <div className="objective-text">{objective}</div>
      {items.length > 0 && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 12, marginBottom: 4,
          }}>
            <div className="objective-title" style={{ margin: 0 }}>
              ✓ To-do · {nDone}/{items.length} done · {pct}%
            </div>
            <div style={{ width: 120, height: 6, background: 'rgba(15, 23, 42, 0.08)',
                          borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <ul className="todo-list">
            {items.map(t => (
              <li key={t.id} className={`todo-item ${t.done ? 'done' : ''}`}>
                <input type="checkbox" checked={t.done}
                       onChange={() => toggle(t.id)} />
                <span style={{ flex: 1 }}>{t.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {children}
    </div>
  );
}
