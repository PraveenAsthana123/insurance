// Insurance AI Operating System shell:
//   Header (top) · Blue main menu · Maroon sub menu · Workspace
// Per operator's "Enterprise Insurance AI Operating System" design spec.

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BankHeader } from './BankHeader';
import { BankSidebar } from './BankSidebar';
import { BankSubMenu } from './BankSubMenu';

function useBlueprint() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch('/insurance-blueprint', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled && e.name !== 'AbortError') setErr(e.message); });
    return () => { cancelled = true; controller.abort(); };
  }, []);
  return { bp: data, err };
}

function LayoutInner({ bp, collapsed, onToggle }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh',  // full viewport — /bank is outside the global Layout
    }}>
      <BankHeader />
      <div style={{
        display: 'grid',
        gridTemplateColumns: collapsed ? '64px 260px 1fr' : '280px 260px 1fr',
        flex: 1, minHeight: 0,
        background: '#f8fafc',
        transition: 'grid-template-columns 0.2s',
      }}>
        <BankSidebar bp={bp} collapsed={collapsed} onToggle={onToggle} />
        <BankSubMenu bp={bp} />
        <div style={{ overflow: 'auto', padding: 'var(--spacing-md)' }}>
          <Outlet context={{ bp }} />
        </div>
      </div>
    </div>
  );
}

export function BankLayout() {
  const { bp, err } = useBlueprint();
  const [collapsed, setCollapsed] = useState(false);

  if (err) return <div style={{ padding: 24, color: '#dc2626' }}>Blueprint unavailable: {err}</div>;
  if (!bp) return <div style={{ padding: 24, color: '#64748b' }}>Loading insurance blueprint…</div>;

  return <LayoutInner bp={bp} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />;
}
