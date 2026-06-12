// §149.2 · Workspace Layout Demo · operator 2026-06-12
// Shows: resizable main+sub menu · fixed content · horizontal flow strip ·
// objective+todo block · glassmorphism · card color rotation.
//
// This is the reference implementation operators can copy into any page.
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';
import ResizableSplitter, { useResizableWidth } from '../components/ResizableSplitter';

const SUBMENU = [
  { id: 'overview',  label: 'Overview',     icon: '🏠' },
  { id: 'data',      label: 'Data',         icon: '📥' },
  { id: 'process',   label: 'Process',      icon: '⚙️' },
  { id: 'output',    label: 'Output',       icon: '📤' },
  { id: 'viz',       label: 'Visualization',icon: '📊' },
  { id: 'audit',     label: 'Audit Trail',  icon: '🔍' },
  { id: 'rai',       label: 'ResAI',        icon: '🛡️' },
  { id: 'xai',       label: 'ExpAI',        icon: '💡' },
];

const MAIN = [
  { id: 'workspace', label: 'Workspace',          icon: '🧪', color: '#10b981' },
  { id: 'reports',   label: 'Reports',            icon: '📈', color: '#3b82f6' },
  { id: 'agents',    label: 'Agents',             icon: '🤖', color: '#a855f7' },
  { id: 'tools',     label: 'Tools',              icon: '🛠', color: '#f59e0b' },
  { id: 'data',      label: 'Datasets',           icon: '📦', color: '#06b6d4' },
];

export default function WorkspaceDemoPage() {
  const [mainW, setMainW] = useResizableWidth({ storageKey: 'demo:main', defaultPx: 220, min: 160, max: 320 });
  const [subW,  setSubW]  = useResizableWidth({ storageKey: 'demo:sub',  defaultPx: 240, min: 180, max: 380 });
  const mainWRef = useRef(mainW);
  const subWRef  = useRef(subW);
  mainWRef.current = mainW; subWRef.current = subW;

  return (
    <div className="workspace-fixed" style={{
      display: 'flex',
      padding: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* ---- MAIN MENU · resizable ---- */}
      <aside style={{
        width: mainW,
        background: 'linear-gradient(180deg, #1e3a8a, #1e40af)',
        color: '#dbeafe',
        padding: '16px 0',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '0 18px 12px', fontSize: 12, fontWeight: 700,
          color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          Main Menu
        </div>
        {MAIN.map(m => (
          <div key={m.id} style={{
            padding: '10px 18px', borderLeft: `3px solid ${m.color}`,
            margin: '4px 0', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>{m.icon}</span><span>{m.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 24, padding: '0 18px', fontSize: 10,
                      color: '#93c5fd', borderTop: '1px solid rgba(255,255,255,0.1)',
                      paddingTop: 10 }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={mainWRef} onResize={setMainW} min={160} max={320} />

      {/* ---- SUB MENU · resizable ---- */}
      <aside style={{
        width: subW,
        background: '#f8fafc',
        borderRight: '1px solid #e5e7eb',
        padding: '16px 12px',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '4px 8px 10px', fontSize: 11, fontWeight: 700,
          color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Sub Menu
        </div>
        {SUBMENU.map(s => (
          <div key={s.id} style={{
            padding: '8px 10px', margin: '3px 0',
            background: '#fff', borderRadius: 6, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #e5e7eb', cursor: 'pointer',
          }}>
            <span>{s.icon}</span><span>{s.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: 8, fontSize: 10,
                      color: '#94a3b8', textAlign: 'center' }}>
          ⟷ Drag right edge to resize
        </div>
      </aside>
      <ResizableSplitter widthRef={subWRef} onResize={setSubW} min={180} max={380} />

      {/* ---- CONTENT / WORKSPACE · FIXED · NEVER resizes ---- */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <h1 className="h-glass">Workspace Demo · §149.2 Layout Pattern</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Reference implementation: resizable main + sub menu · fixed workspace ·
          horizontal flow strip · objective+todo banner · glassmorphism cards
        </div>

        <PageHeaderFlow active="process" />

        <PageObjective
          objective="Demonstrate the new §149.2 layout pattern · operators can copy this into any page · drag menu edges to resize."
          storageKey="workspace-demo"
          todos={[
            { id: 'd1', label: 'Confirm main menu resizes (drag right edge)',     done: true },
            { id: 'd2', label: 'Confirm sub menu resizes (drag right edge)',      done: true },
            { id: 'd3', label: 'Verify content stays fixed-width while resizing', done: true },
            { id: 'd4', label: 'Check 8-color card palette below differentiates' },
            { id: 'd5', label: 'Toggle a checkbox · refresh page · state persists (localStorage)' },
            { id: 'd6', label: 'Copy <PageObjective/> + <PageHeaderFlow/> into your own page' },
          ]}
        />

        {/* IPO+V quad · semantic cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 12, marginBottom: 16 }}>
          <div className="glass-card card-input">
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📥 INPUT</div>
            <div style={{ fontSize: 12 }}>Operator query · upload data · select dataset</div>
          </div>
          <div className="glass-card card-process">
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚙️ PROCESS</div>
            <div style={{ fontSize: 12 }}>Pipeline runs · LLM call · vector search · transform</div>
          </div>
          <div className="glass-card card-output">
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📤 OUTPUT</div>
            <div style={{ fontSize: 12 }}>Predicted class · score · structured response · audit row</div>
          </div>
          <div className="glass-card card-visualization">
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📊 VISUALIZATION</div>
            <div style={{ fontSize: 12 }}>Heat map · confusion matrix · SHAP plot · drift chart</div>
          </div>
        </div>

        {/* Info vs Action cards · operator color-differentiation contract */}
        <h2 style={{ fontSize: 16, margin: '20px 0 10px', color: '#0f172a' }}>
          Card differentiation · info vs action
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12, marginBottom: 16 }}>
          <div className="glass-card card-info">
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px',
                           background: 'rgba(168, 85, 247, 0.15)', borderRadius: 4 }}>
              ℹ️ INFO
            </span>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Process Catalog</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Reference content · click to view detail</div>
          </div>
          <div className="glass-card card-action">
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px',
                           background: 'rgba(16, 185, 129, 0.15)', borderRadius: 4 }}>
              ⚡ ACTION
            </span>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Run Pipeline</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Click to trigger backend execution</div>
          </div>
        </div>

        {/* 8-color palette demo with auto-rotation */}
        <h2 style={{ fontSize: 16, margin: '20px 0 10px', color: '#0f172a' }}>
          8-color card palette · auto-rotating (use .card-rotate parent)
        </h2>
        <div className="card-rotate" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8,
        }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i}>
              <strong style={{ fontSize: 12 }}>Card #{i + 1}</strong>
              <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                hue rotates 1→8 then wraps
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: 14,
                      background: 'rgba(168, 85, 247, 0.08)',
                      borderLeft: '5px solid #a855f7', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#581c87', marginBottom: 6, fontSize: 12 }}>
            📋 Copy these components into your page
          </div>
          <div style={{ fontSize: 12 }}>
            <code>import PageHeaderFlow from '../components/PageHeaderFlow';</code><br/>
            <code>import PageObjective from '../components/PageObjective';</code><br/>
            <code>import ResizableSplitter, &#123; useResizableWidth &#125; from '../components/ResizableSplitter';</code><br/>
            CSS classes available in <code>styles/glass.css</code>:
            <code> .glass-card</code> ·
            <code> .card-info / .card-action</code> ·
            <code> .card-input / .card-process / .card-output / .card-visualization</code> ·
            <code> .card-1 ... .card-8</code> ·
            <code> .card-rotate (parent · auto-applies palette to children)</code> ·
            <code> .flow-strip</code> ·
            <code> .h-glass</code> ·
            <code> .btn-glass</code>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn-glass" style={{ textDecoration: 'none', color: '#1f2937' }}>
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
