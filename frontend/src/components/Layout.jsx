// Unified layout — every non-/bank route now wears the same dark Header
// + dark dept sidebar so the project feels visually consistent.
//
// /bank routes are registered OUTSIDE this Layout in App.jsx and use
// BankLayout directly (which also includes BankHeader + BankSidebar +
// BankSubMenu). The chrome is identical; only the workspace content differs.

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BankHeader } from '../pages/bank/BankHeader';
import { BankSidebar } from '../pages/bank/BankSidebar';

function useBlueprint() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch('/insurance-blueprint', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (!cancelled) setData(j); })
      .catch(() => {});
    return () => { cancelled = true; controller.abort(); };
  }, []);
  return data;
}

export default function Layout() {
  const bp = useBlueprint();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh',
    }}>
      <BankHeader />
      <div style={{
        display: 'grid',
        gridTemplateColumns: collapsed ? '64px 1fr' : '280px 1fr',
        flex: 1, minHeight: 0,
        background: '#f8fafc',
        transition: 'grid-template-columns 0.2s',
      }}>
        {bp ? (
          <BankSidebar bp={bp} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        ) : (
          <aside style={{
            background: '#0f172a', color: '#cbd5e1',
            borderRight: '1px solid #1e293b',
            padding: 16, fontSize: 12, fontStyle: 'italic',
          }}>
            Loading blueprint…
          </aside>
        )}
        <main style={{ overflow: 'auto', background: '#f8fafc' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
