// Insurance AI Operating System shell:
//   Header (top) · Blue main menu · Maroon sub menu · Workspace
// Per operator's "Enterprise Insurance AI Operating System" design spec.

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BankHeader } from './BankHeader';
import { BankSidebar } from './BankSidebar';
import { BankSubMenu } from './BankSubMenu';

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

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
  const width = useViewportWidth();
  const isCompact = width < 700;
  const isTablet = width >= 700 && width < 1100;
  const effectiveCollapsed = isTablet ? true : collapsed;
  const shellGrid = isCompact
    ? {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: `${collapsed ? 64 : 260}px 220px minmax(0, 1fr)`,
      }
    : {
        gridTemplateColumns: effectiveCollapsed
          ? '72px 240px minmax(0, 1fr)'
          : '320px 300px minmax(0, 1fr)',
        gridTemplateRows: 'minmax(0, 1fr)',
      };

  const workspacePadding = isCompact ? 16 : 24;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh',  // full viewport — /bank is outside the global Layout
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <BankHeader />
      <div style={{
        display: 'grid',
        ...shellGrid,
        flex: 1, minHeight: 0, minWidth: 0,
        background: '#f8fafc',
        transition: 'grid-template-columns 0.2s, grid-template-rows 0.2s',
        overflow: 'hidden',
      }}>
        <BankSidebar bp={bp} collapsed={isCompact ? collapsed : effectiveCollapsed} onToggle={onToggle} />
        <BankSubMenu bp={bp} />
        <div data-workspace style={{ overflow: 'auto', padding: workspacePadding, minWidth: 0, minHeight: 0 }}>
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
