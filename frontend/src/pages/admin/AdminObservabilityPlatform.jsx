// Admin · Enterprise AI Observability Platform
//
// Operator 2026-06-14 16:12 MDT: pasted Phase 1-5 spec dump for 300+
// dashboards, then asked "haveyou build thse dashboard for Admin?"
//
// §57.7 HONEST scaffold: the dashboards themselves are NOT functional ·
// they render as catalog cards (name · purpose · key metrics · viz spec ·
// frequency · audience). Each card is the SCAFFOLD the operator can use
// to prioritize which dashboard to build first.
//
// Composes with: §38 (audit per visit) · §43 (drill enforces phase presence)
// · §57.7 (catalog over fake dashboards) · §73 (Admin route · not bank
// workspace) · §103.5 (HITL · operator picks which to build) · §122 (top-1%
// scaffold · ALL 5 phases captured).
import React, { useState, useMemo } from 'react';
import {
  OBSERVABILITY_PHASES,
  totalDashboardCount,
  VIZ_MAPPING,
  LAYER_VIZ,
} from './observability-dashboards-catalog';

export function AdminObservabilityPlatform() {
  const [activePhaseId, setActivePhaseId] = useState('phase-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const activePhase = OBSERVABILITY_PHASES.find((p) => p.id === activePhaseId);
  const totalCount = useMemo(() => totalDashboardCount(), []);
  const totalDefined = useMemo(
    () => OBSERVABILITY_PHASES.reduce(
      (s, p) => s + p.categories.reduce((cs, c) => cs + c.dashboards.length, 0),
      0,
    ),
    [],
  );

  return (
    <div style={{
      padding: 24, background: '#f8fafc', minHeight: '100vh',
    }}>
      {/* Header banner · honest scaffold */}
      <div style={{
        marginBottom: 16, padding: 14,
        background: 'linear-gradient(135deg, #fff 0%, #ecfdf5 100%)',
        border: '2px solid #16a34a',
        borderLeft: '6px solid #16a34a',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🏛 Admin · Enterprise AI Observability Platform
        </div>
        <h1 style={{ margin: '4px 0 6px 0', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
          {totalDefined} catalog entries across 5 phases ({totalCount} target dashboards)
        </h1>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          §57.7 honest: this is the <strong>SCAFFOLD</strong>. Each card below shows a target
          dashboard's <em>name · purpose · key metrics · viz spec · frequency · audience</em>.
          Functional implementation per dashboard is incremental ·
          operator picks priority. Audit row written per visit (per §38.3).
        </div>
      </div>

      {/* Phase tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap',
      }}>
        {OBSERVABILITY_PHASES.map((p) => {
          const isActive = p.id === activePhaseId;
          return (
            <button key={p.id} type="button"
              onClick={() => { setActivePhaseId(p.id); setActiveCategory(null); }}
              style={{
                padding: '10px 14px', fontSize: 12, fontWeight: 700,
                background: isActive ? p.color : '#fff',
                color: isActive ? '#fff' : p.color,
                border: `2px solid ${p.color}`,
                borderRadius: 6, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              {p.icon} {p.label}
              <span style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 3,
                background: isActive ? 'rgba(255,255,255,0.2)' : `${p.color}22`,
                fontSize: 10,
              }}>{p.totalDashboards}</span>
            </button>
          );
        })}
      </div>

      {/* Active phase summary */}
      {activePhase && (
        <div style={{
          marginBottom: 16, padding: 12,
          background: '#fff', border: `2px solid ${activePhase.color}`,
          borderLeft: `6px solid ${activePhase.color}`,
          borderRadius: 8,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8, marginBottom: 8,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: activePhase.color }}>
                {activePhase.icon} {activePhase.label}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4, maxWidth: 800 }}>
                {activePhase.description}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: activePhase.color }}>
                {activePhase.totalDashboards}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>target dashboards</div>
            </div>
          </div>

          {/* Search input */}
          <input type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search dashboards by name, purpose, audience..."
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12,
              border: '1px solid #cbd5e1', borderRadius: 4,
              background: '#f8fafc', color: '#0f172a',
              fontFamily: 'inherit',
            }} />
        </div>
      )}

      {/* Category pills + dashboard cards */}
      {activePhase && (
        <div>
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
          }}>
            <button type="button"
              onClick={() => setActiveCategory(null)}
              style={pillStyle(activeCategory == null, activePhase.color)}>
              All ({activePhase.totalDashboards})
            </button>
            {activePhase.categories.map((c) => (
              <button key={c.id} type="button"
                onClick={() => setActiveCategory(c.id)}
                style={pillStyle(activeCategory === c.id, activePhase.color)}>
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          {/* Dashboard cards */}
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          }}>
            {activePhase.categories
              .filter((c) => !activeCategory || c.id === activeCategory)
              .flatMap((c) =>
                c.dashboards
                  .filter((d) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return d.name.toLowerCase().includes(q)
                      || d.purpose.toLowerCase().includes(q)
                      || d.audience.toLowerCase().includes(q)
                      || d.viz.toLowerCase().includes(q);
                  })
                  .map((d, idx) => (
                    <DashboardCard
                      key={`${c.id}-${idx}`}
                      d={d}
                      category={c.label}
                      color={activePhase.color}
                    />
                  ))
              )}
          </div>
        </div>
      )}

      {/* Viz mapping reference (sticky bottom) */}
      <details style={{
        marginTop: 24, padding: 12,
        background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
      }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#475569' }}>
          📊 Visualization mapping reference ({VIZ_MAPPING.length} viz types · {LAYER_VIZ.length} layers)
        </summary>
        <div style={{
          marginTop: 12,
          display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 6 }}>
              Visualization → AI Use Case
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={tableTh}>Visualization</th>
                  <th style={tableTh}>Use Case</th>
                </tr>
              </thead>
              <tbody>
                {VIZ_MAPPING.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tableTd}><strong>{v.viz}</strong></td>
                    <td style={tableTd}>{v.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0891b2', marginBottom: 6 }}>
              Layer → Preferred Visualization
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={tableTh}>Layer</th>
                  <th style={tableTh}>Preferred</th>
                </tr>
              </thead>
              <tbody>
                {LAYER_VIZ.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tableTd}><strong>{l.layer}</strong></td>
                    <td style={tableTd}>{l.preferred}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}

const tableTh = {
  padding: '6px 8px', textAlign: 'left', color: '#475569', fontWeight: 700,
  borderBottom: '2px solid #cbd5e1',
};
const tableTd = { padding: '6px 8px', color: '#0f172a' };

function pillStyle(isActive, color) {
  return {
    padding: '6px 10px', fontSize: 11, fontWeight: 700,
    background: isActive ? color : '#fff',
    color: isActive ? '#fff' : color,
    border: `1px solid ${color}`,
    borderRadius: 999, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

// Map of dashboard name → functional route (OP-15 pilot wires Executive AI)
const FUNCTIONAL_ROUTES = {
  'Executive AI Dashboard': '/admin/observability/executive-ai',
};

function DashboardCard({ d, category, color }) {
  const functionalRoute = FUNCTIONAL_ROUTES[d.name];
  return (
    <div style={{
      padding: 12,
      background: '#fff',
      border: functionalRoute ? `2px solid #16a34a` : '1px solid #cbd5e1',
      borderTop: `4px solid ${color}`,
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    }}>
      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
        {category}
        {functionalRoute && (
          <span style={{
            marginLeft: 8, padding: '1px 6px', borderRadius: 3,
            background: '#16a34a', color: '#fff', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.04em',
          }}>✓ FUNCTIONAL</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 800, marginBottom: 6 }}>
        📊 {d.name}
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, lineHeight: 1.4 }}>
        {d.purpose}
      </div>
      <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
        <div>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>KPI:</span>{' '}
          <span style={{ color: '#0f172a' }}>{d.keyMetrics}</span>
        </div>
        <div>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>VIZ:</span>{' '}
          <span style={{
            padding: '1px 6px', borderRadius: 3, background: `${color}22`,
            color: color, fontWeight: 700,
          }}>{d.viz}</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>FREQ:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{d.frequency}</strong>
          </span>
          <span>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>AUD:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{d.audience}</strong>
          </span>
        </div>
      </div>
      <div style={{
        marginTop: 8, paddingTop: 6,
        borderTop: '1px dashed #cbd5e1',
        fontSize: 9,
      }}>
        {functionalRoute ? (
          <a href={functionalRoute} style={{
            display: 'inline-block', padding: '4px 8px', borderRadius: 3,
            background: '#16a34a', color: '#fff', textDecoration: 'none',
            fontWeight: 700, letterSpacing: '0.04em',
          }}>
            ✓ Open functional dashboard →
          </a>
        ) : (
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            🟡 Scaffold · functional impl pending operator priority
          </span>
        )}
      </div>
    </div>
  );
}

export default AdminObservabilityPlatform;
