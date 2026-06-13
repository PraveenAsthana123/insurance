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

const MAIN_MENU_WIDTH_KEY = 'bank.mainMenu.width';
const SUB_MENU_HEIGHT_KEY = 'bank.subMenu.height';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function readStoredNumber(key, fallback) {
  try {
    const parsed = Number(localStorage.getItem(key));
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function LayoutInner({ bp, collapsed, onToggle }) {
  const width = useViewportWidth();
  const isCompact = width < 700;
  const isTablet = width >= 700 && width < 1100;
  const effectiveCollapsed = isTablet ? true : collapsed;
  const [mainMenuWidth, setMainMenuWidth] = useState(() => readStoredNumber(MAIN_MENU_WIDTH_KEY, 320));
  const [subMenuHeight, setSubMenuHeight] = useState(() => readStoredNumber(SUB_MENU_HEIGHT_KEY, 220));
  const [resizing, setResizing] = useState(null);

  const resizeHandleSize = 8;
  // Keep the workspace boundary fixed. Menu resizing only reallocates width
  // inside this navigation band: main menu <-> sub-menu.
  const navBandWidth = isTablet ? 384 : 628;
  const minMainMenuWidth = effectiveCollapsed ? 72 : 240;
  const maxMainMenuWidth = effectiveCollapsed ? 72 : Math.min(400, navBandWidth - resizeHandleSize - 240);
  const clampedMainMenuWidth = effectiveCollapsed
    ? 72
    : clamp(mainMenuWidth, minMainMenuWidth, maxMainMenuWidth);
  const clampedSubMenuWidth = navBandWidth - clampedMainMenuWidth - resizeHandleSize;
  const clampedSubMenuHeight = clamp(subMenuHeight, 160, 360);

  useEffect(() => {
    if (!resizing) return undefined;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = resizing === 'menuSplit' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (event) => {
      if (resizing === 'menuSplit') {
        const next = clamp(event.clientX - (resizeHandleSize / 2), minMainMenuWidth, maxMainMenuWidth);
        setMainMenuWidth(next);
        try { localStorage.setItem(MAIN_MENU_WIDTH_KEY, String(Math.round(next))); } catch (e) { /* swallow */ }
      } else {
        const headerHeight = 56;
        const mainMenuHeight = collapsed ? 64 : 260;
        const nextHeight = event.clientY - headerHeight - mainMenuHeight;
        const next = clamp(nextHeight, 160, 360);
        setSubMenuHeight(next);
        try { localStorage.setItem(SUB_MENU_HEIGHT_KEY, String(Math.round(next))); } catch (e) { /* swallow */ }
      }
    };
    const onPointerUp = () => setResizing(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [collapsed, maxMainMenuWidth, minMainMenuWidth, resizeHandleSize, resizing]);

  const shellGrid = isCompact
    ? {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: `${collapsed ? 64 : 260}px ${clampedSubMenuHeight}px 8px minmax(0, 1fr)`,
      }
    : {
        gridTemplateColumns: `${navBandWidth}px minmax(0, 1fr)`,
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
        transition: resizing ? 'none' : 'grid-template-columns 0.2s, grid-template-rows 0.2s',
        overflow: 'hidden',
      }}>
        {isCompact ? (
          <>
            <BankSidebar bp={bp} collapsed={collapsed} onToggle={onToggle} />
            <BankSubMenu bp={bp} />
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize sub-menu height"
              title="Drag to resize sub-menu height"
              onPointerDown={(event) => {
                event.preventDefault();
                setResizing('height');
              }}
              onDoubleClick={() => {
                setSubMenuHeight(220);
                try { localStorage.setItem(SUB_MENU_HEIGHT_KEY, '220'); } catch (e) { /* swallow */ }
              }}
              style={{
                background: resizing ? '#2563eb' : '#cbd5e1',
                cursor: 'row-resize', minWidth: 0, minHeight: resizeHandleSize,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                touchAction: 'none', zIndex: 2,
              }}
            >
              <span style={{
                width: 42, height: 3, borderRadius: 999,
                background: resizing ? '#fff' : '#64748b', opacity: 0.9,
              }} />
            </div>
          </>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${clampedMainMenuWidth}px ${resizeHandleSize}px ${clampedSubMenuWidth}px`,
            gridTemplateRows: 'minmax(0, 1fr)',
            minWidth: 0, minHeight: 0, overflow: 'hidden',
          }}>
            <BankSidebar bp={bp} collapsed={effectiveCollapsed} onToggle={onToggle} />
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize main menu and sub-menu without changing workspace"
              title="Drag to resize menu split; workspace stays fixed"
              onPointerDown={(event) => {
                event.preventDefault();
                setResizing('menuSplit');
              }}
              onDoubleClick={() => {
                setMainMenuWidth(isTablet ? 72 : 320);
                try { localStorage.setItem(MAIN_MENU_WIDTH_KEY, String(isTablet ? 72 : 320)); } catch (e) { /* swallow */ }
              }}
              style={{
                background: resizing ? '#2563eb' : '#cbd5e1',
                cursor: 'col-resize', minWidth: resizeHandleSize, minHeight: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                touchAction: 'none', zIndex: 2,
              }}
            >
              <span style={{
                width: 3, height: 42, borderRadius: 999,
                background: resizing ? '#fff' : '#64748b', opacity: 0.9,
              }} />
            </div>
            <BankSubMenu bp={bp} />
          </div>
        )}
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
