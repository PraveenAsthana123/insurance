// /bank/framework — Top-1% Enterprise AI OS Reference (operator 2026-06-05).
// Single bookmarkable page surfacing 9 framework dimensions:
//   1. Top-1% capabilities (20)
//   2. 16-stage SDLC
//   3. 12 delivery phases × 7 steps × teams
//   4. Build-order pyramid (5 tiers)
//   5. 15 Ops domains
//   6. Final 9-layer mental model (StrategyOps → ValueOps)
//   7. Agent architecture patterns (15 + 4 operator-new) with USE/KNOW/SKIP tags
//   8. Spec-driven dev stack (6 tools) with USE/KNOW/SKIP tags
//   9. Agentic runtime 5-OS + CUA (14 tools) with USE/KNOW/SKIP tags
// + aggregate readiness score + anchor links (#sdlc-<id>, #ops-<id>, etc.)
// + per-tab chips in TabHeaderRibbon link here.
//
// Composes with: §75 (maturity), §76 (runtime layers), §77 (program delivery),
//                §64.43 (15 patterns), §64.44 (14 tools), §67 (5-OS).

import { useState } from 'react';
import {
  TOP1_CAPABILITIES, CAP_DOMAIN_COLOR,
  SDLC_LIFECYCLE, DELIVERY_PHASES,
  BUILD_ORDER, OPS_DOMAINS, MENTAL_MODEL,
  AGENT_PATTERNS, SPEC_DRIVEN, AGENTIC_RUNTIME,
  OBSERVABILITY_STACK, TOOL_DETAILS,
  WORKSPACE_TAB_ALIGNMENT, NAVIGATION_DEPTH_RULE, UNIVERSAL_FOOTER_WIDGETS,
  FORCED_SEQUENCE, GOLDEN_RULE_AUDIT_ROW, AGENT_SUPERVISOR_ROUTE,
  statusColor, readinessScore,
} from './BankFrameworkData';

const REL_COLOR = {
  USE:  { bg: '#16a34a', label: '🟢 USE' },
  KNOW: { bg: '#f59e0b', label: '🟡 KNOW' },
  SKIP: { bg: '#94a3b8', label: '🔴 SKIP' },
};

function Chip({ children, bg = '#0f172a', fg = '#fff', small }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 3, background: bg, color: fg,
      fontSize: small ? 9 : 10, fontWeight: 700,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Section({ id, icon, title, subtitle, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} style={{
      marginBottom: 16, scrollMarginTop: 80,
      background: '#fff', border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`,
      borderRadius: 6,
    }}>
      <button type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '12px 14px', background: 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
        <span style={{
          width: 22, height: 22, borderRadius: 4,
          background: color, color: '#fff',
          fontSize: 14, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{open ? '−' : '+'}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <strong style={{ fontSize: 15, color: '#0f172a' }}>{title}</strong>
        {subtitle && <span style={{ fontSize: 11, color: '#64748b' }}>· {subtitle}</span>}
        <span style={{ flex: 1 }} />
        <a href={`#${id}`} title="Anchor link"
           onClick={(e) => e.stopPropagation()}
           style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'none' }}>#{id}</a>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' }}>
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Section 1: Top-1% capabilities (20 rows) ───
function CapabilitiesSection() {
  const total = TOP1_CAPABILITIES.length;
  const present = TOP1_CAPABILITIES.filter((c) => c.status === true || c.status === 'present').length;
  const partial = TOP1_CAPABILITIES.filter((c) => c.status === 'partial').length;
  const missing = total - present - partial;
  return (
    <Section id="cap" icon="🎯" title="Top-1% capabilities" color="#0f172a"
             subtitle={`20 rows · ${present}✓ · ${partial}◐ · ${missing}✗`}>
      <div style={{
        marginBottom: 10, padding: '6px 10px',
        background: '#f1f5f9', borderRadius: 4, fontSize: 11, color: '#475569',
      }}>
        Capabilities most enterprises don't have. Operator 2026-06-05.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Capability', 'Domain', 'Status'].map((h) => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TOP1_CAPABILITIES.map((c) => {
            const st = statusColor(c.status);
            const dc = CAP_DOMAIN_COLOR[c.domain] || '#475569';
            return (
              <tr key={c.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '4px 8px' }}><Chip bg={dc} small>{c.domain}</Chip></td>
                <td style={{ padding: '4px 8px' }}><Chip bg={st.bg} small>{st.label}</Chip></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Section 2: 16-stage SDLC ───
function SdlcSection() {
  const present = SDLC_LIFECYCLE.filter((s) => s.present === true).length;
  const partial = SDLC_LIFECYCLE.filter((s) => s.present === 'partial').length;
  return (
    <Section id="sdlc" icon="🔄" title="16-stage SDLC" color="#0ea5e9"
             subtitle={`${present}✓ · ${partial}◐ · ${SDLC_LIFECYCLE.length - present - partial}✗`}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4,
      }}>
        {SDLC_LIFECYCLE.map((s, i) => {
          const st = statusColor(s.present);
          return (
            <div key={s.id} id={`sdlc-${s.id}`} style={{
              padding: '6px 8px',
              background: `${s.color}11`, border: `1px solid ${s.color}55`, borderLeft: `3px solid ${s.color}`,
              borderRadius: 4, minWidth: 110,
            }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>{i + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                {s.icon} {s.label}
              </div>
              <Chip bg={st.bg} small>{st.label}</Chip>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ─── Section 3: 12 delivery phases × 7 steps × teams ───
function PhasesSection() {
  return (
    <Section id="phases" icon="📋" title="12 delivery phases" color="#7c3aed"
             subtitle="84 steps · 12 team configurations" defaultOpen={false}>
      {DELIVERY_PHASES.map((p) => (
        <details key={p.id} id={`phase-${p.id}`} style={{
          marginBottom: 8,
          background: `${p.color}08`, border: `1px solid ${p.color}55`, borderLeft: `3px solid ${p.color}`,
          borderRadius: 4,
        }}>
          <summary style={{
            cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#0f172a' }}>{p.label}</span>
            <Chip bg={p.color} small>{p.id.toUpperCase()}</Chip>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Teams: {p.teams.join(' · ')}</span>
          </summary>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
            <thead>
              <tr style={{ background: '#fff' }}>
                {['#', 'Activity', 'Deliverable'].map((h) => (
                  <th key={h} style={{ padding: '3px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.steps.map((s) => (
                <tr key={s.n} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '3px 8px', color: '#94a3b8', fontWeight: 700 }}>{s.n}</td>
                  <td style={{ padding: '3px 8px', color: '#0f172a' }}>{s.activity}</td>
                  <td style={{ padding: '3px 8px', color: '#475569', fontFamily: 'monospace', fontSize: 10 }}>{s.deliverable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </Section>
  );
}

// ─── Section 4: Build-order pyramid (5 tiers) ───
function BuildOrderSection() {
  return (
    <Section id="tier" icon="🏗" title="Build-order pyramid" color="#dc2626"
             subtitle="Foundation → Autonomous · 5 tiers">
      {BUILD_ORDER.map((t) => {
        const present = t.components.filter((c) => c.present === true).length;
        const partial = t.components.filter((c) => c.present === 'partial').length;
        return (
          <div key={t.id} id={`tier-${t.id}`} style={{
            marginBottom: 10,
            background: `${t.color}11`, border: `1px solid ${t.color}55`, borderLeft: `4px solid ${t.color}`,
            borderRadius: 4, padding: '8px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Chip bg={t.color} small>L{t.tier}</Chip>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{t.label}</strong>
              <Chip bg="#475569" small>{t.months}</Chip>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {present}✓ · {partial}◐ · {t.components.length - present - partial}✗
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {t.components.map((c) => {
                const st = statusColor(c.present);
                return (
                  <span key={c.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 6px',
                    background: '#fff', border: `1px solid ${st.bg}55`, borderRadius: 3,
                    fontSize: 10,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.bg }} />
                    {c.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </Section>
  );
}

// ─── Section 5: 15 Ops domains ───
function OpsSection() {
  return (
    <Section id="ops" icon="⚙" title="15 Ops domains" color="#f59e0b"
             subtitle="Lifecycle ops per layer · §77.5">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Domain', 'Tier', 'Scope', 'Status', 'Owns runtime'].map((h) => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OPS_DOMAINS.map((o) => {
            const st = statusColor(o.status);
            return (
              <tr key={o.id} id={`ops-${o.id}`} style={{ borderBottom: '1px solid #f1f5f9', scrollMarginTop: 80 }}>
                <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 600 }}>{o.name}</td>
                <td style={{ padding: '4px 8px' }}><Chip bg="#475569" small>{o.tier}</Chip></td>
                <td style={{ padding: '4px 8px', color: '#475569', fontSize: 10 }}>{o.scope}</td>
                <td style={{ padding: '4px 8px' }}><Chip bg={st.bg} small>{st.label}</Chip></td>
                <td style={{ padding: '4px 8px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }}>
                  {o.owns_layers.length ? o.owns_layers.join(', ') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Section 6: Final 9-layer mental model ───
function MentalModelSection() {
  return (
    <Section id="mental" icon="🧠" title="Final top-1% mental model" color="#7c3aed"
             subtitle="StrategyOps → ValueOps · 9-layer chain">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MENTAL_MODEL.map((m, i) => {
          const st = statusColor(m.present);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 4,
                background: m.color, color: '#fff',
                fontSize: 14, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{m.icon}</span>
              <div style={{ flex: 1, padding: '6px 10px', background: `${m.color}0d`, borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 12, color: '#0f172a' }}>{m.label}</strong>
                  <Chip bg={st.bg} small>{st.label}</Chip>
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>{m.why}</div>
              </div>
              {i < MENTAL_MODEL.length - 1 && (
                <span style={{ position: 'absolute', marginLeft: 14, marginTop: 38, fontSize: 14, color: '#94a3b8' }}>↓</span>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// Per-row deep-dive panel — renders the 5-field architect detail
// (helps · how_to_use · benefit · architect · integration · value)
// from TOOL_DETAILS[id]. Only USE-tagged tools have detail.
function ToolDetailPanel({ id, color }) {
  const d = TOOL_DETAILS[id];
  if (!d) return (
    <div style={{ padding: '6px 10px', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
      No deep-dive yet for this tool. Add to <code>TOOL_DETAILS</code> in BankFrameworkData.jsx.
    </div>
  );
  const rows = [
    ['🎯 How it helps',    d.helps,       '#0ea5e9'],
    ['🔧 How to use',      d.how_to_use,  '#16a34a'],
    ['💎 Benefit',         d.benefit,     '#7c3aed'],
    ['🏛 Architect view',  d.architect,   '#8b5cf6'],
    ['🔗 Integration',     d.integration, '#0891b2'],
    ['💰 Value on the table', d.value,    '#f59e0b'],
  ];
  return (
    <div style={{
      padding: 10, background: `${color}0a`, border: `1px solid ${color}44`, borderRadius: 4,
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6,
    }}>
      {rows.map(([label, body, c]) => (
        <div key={label} style={{
          padding: '6px 8px', background: '#fff',
          border: `1px solid ${c}44`, borderLeft: `3px solid ${c}`,
          borderRadius: 3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: '#0f172a', lineHeight: 1.45 }}>{body}</div>
        </div>
      ))}
    </div>
  );
}

function TaggedRow({ it, color, anchorPrefix, hasDetail }) {
  const [open, setOpen] = useState(false);
  const rel = REL_COLOR[it.relevance || 'KNOW'];
  const st = statusColor(it.present);
  return (
    <>
      <tr id={`${anchorPrefix}-${it.id}`}
          style={{
            borderBottom: '1px solid #f1f5f9', scrollMarginTop: 80,
            background: open ? `${color}11` : 'transparent',
            cursor: hasDetail ? 'pointer' : 'default',
          }}
          onClick={() => hasDetail && setOpen((v) => !v)}>
        <td style={{ padding: '4px 8px' }}><Chip bg={rel.bg} small>{rel.label}</Chip></td>
        <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 600 }}>
          {hasDetail && <span style={{ marginRight: 4, color, fontWeight: 800 }}>{open ? '▼' : '▶'}</span>}
          {it.name}
        </td>
        <td style={{ padding: '4px 8px' }}>
          <Chip bg="#475569" small>{it.family || it.layer || it.mode}</Chip>
        </td>
        <td style={{ padding: '4px 8px' }}><Chip bg={st.bg} small>{st.label}</Chip></td>
        <td style={{ padding: '4px 8px', color: '#475569', fontSize: 10, maxWidth: 380 }}>
          {it.best_for || it.why}
        </td>
        <td style={{ padding: '4px 8px', color: '#94a3b8', fontSize: 9, fontStyle: 'italic' }}>
          {it.source || it.evaluation}
        </td>
      </tr>
      {open && hasDetail && (
        <tr style={{ background: '#fafbff' }}>
          <td colSpan={6} style={{ padding: '6px 8px 10px' }}>
            <ToolDetailPanel id={it.id} color={color} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Sections 7, 8, 9 — USE/KNOW/SKIP tagged + per-row deep dive ───
function TaggedListSection({ id, icon, title, color, items, columns, anchorPrefix, subtitle }) {
  const [showAll, setShowAll] = useState(false);
  const grouped = { USE: [], KNOW: [], SKIP: [] };
  items.forEach((it) => grouped[it.relevance || 'KNOW'].push(it));
  const visible = showAll ? items : items.filter((it) => it.relevance !== 'SKIP');
  const detailCount = items.filter((it) => TOOL_DETAILS[it.id]).length;
  return (
    <Section id={id} icon={icon} title={title} color={color}
             subtitle={`${subtitle} · ${grouped.USE.length}🟢 USE · ${grouped.KNOW.length}🟡 KNOW · ${grouped.SKIP.length}🔴 SKIP · ${detailCount} with deep-dive`}>
      <div style={{
        marginBottom: 8, fontSize: 10, color: '#64748b',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span>🟢 = adopt now · 🟡 = vocabulary only · 🔴 = not for this domain · click ▶ for deep-dive</span>
        <span style={{ flex: 1 }} />
        <button type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            padding: '2px 8px', fontSize: 10, fontWeight: 700,
            background: '#fff', color, border: `1px solid ${color}55`,
            borderRadius: 3, cursor: 'pointer',
          }}>
          {showAll ? '— Hide SKIP' : `+ Show ${grouped.SKIP.length} SKIP`}
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map((c) => (
              <th key={c} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((it) => (
            <TaggedRow key={it.id} it={it} color={color} anchorPrefix={anchorPrefix} hasDetail={!!TOOL_DETAILS[it.id]} />
          ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Section 10: Observability + Resilience (architect flow) ───
function ObservabilitySection() {
  return (
    <Section id="observ" icon="🔭" title="Observability + Resilience · architect flow" color="#dc2626"
             subtitle="Service Discovery · Circuit Breaker · Istio · Kiali · OTel · Prom · Loki">
      <div style={{
        marginBottom: 10, padding: '6px 10px',
        background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '3px solid #dc2626',
        borderRadius: 4, fontSize: 11, color: '#7f1d1d',
      }}>
        ⚠ <strong>Why this section exists:</strong> tools from sections 7-9 add capability; this section adds <strong>resilience + visibility</strong>.
        Without these, the agent fleet works in clear weather and fails silently in production.
      </div>
      {/* Architect flow diagram (ASCII) */}
      <div style={{
        padding: 12, marginBottom: 10, background: '#f8fafc', color: '#1f2937', border: '1px solid #e5e7eb',
        borderRadius: 4, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5,
        whiteSpace: 'pre',
      }}>
{`User → API Gateway ───────────────────────────────────────────────────┐
                                                                       │
        ┌─── Istio sidecar (mTLS + per-route CB + retry) ──┐           │
        ↓                                                  │           │
    ┌────────┐    Service Discovery (Consul / k8s DNS)     │           │
    │ Agent  │ ←──────────────────────────────────────────┐│           │
    │Runtime │                                            ││           │
    └────┬───┘ ── Circuit Breaker → MCP Server (registered)│           │
         │                                                 │           │
         ├── OpenTelemetry trace (request_id baggage) ────┼─→ Tempo  ─┤
         ├── Prometheus /metrics (latency · cost · err) ──┼─→ Grafana ─┤
         ├── Structured log (JSON · canonical fields)  ──┼─→ Loki    ─┤
         │                                                 │           │
    Kiali visualizes Istio topology ←──────────────────────┘           │
                                                                       │
                                                              Operator dashboard`}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Tool', 'Family', 'Status', 'How it helps'].map((h) => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OBSERVABILITY_STACK.map((o) => (
            <ObservabilityRow key={o.id} o={o} />
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function ObservabilityRow({ o }) {
  const [open, setOpen] = useState(false);
  const st = statusColor(o.present);
  return (
    <>
      <tr id={`observ-${o.id}`}
          style={{
            borderBottom: '1px solid #f1f5f9', scrollMarginTop: 80,
            background: open ? '#fef2f211' : 'transparent', cursor: 'pointer',
          }}
          onClick={() => setOpen((v) => !v)}>
        <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 600 }}>
          <span style={{ marginRight: 4, color: '#dc2626', fontWeight: 800 }}>{open ? '▼' : '▶'}</span>
          {o.name}
        </td>
        <td style={{ padding: '4px 8px' }}><Chip bg="#475569" small>{o.family}</Chip></td>
        <td style={{ padding: '4px 8px' }}><Chip bg={st.bg} small>{st.label}</Chip></td>
        <td style={{ padding: '4px 8px', color: '#475569', fontSize: 10, maxWidth: 480 }}>{o.helps}</td>
      </tr>
      {open && (
        <tr style={{ background: '#fafbff' }}>
          <td colSpan={4} style={{ padding: '6px 8px 10px' }}>
            <div style={{
              padding: 10, background: '#dc262611', border: '1px solid #fca5a5', borderRadius: 4,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6,
            }}>
              {[
                ['🔧 How to use',         o.how_to_use,  '#16a34a'],
                ['💎 Benefit',            o.benefit,     '#7c3aed'],
                ['🏛 Architect view',     o.architect,   '#8b5cf6'],
                ['🔗 Integration',        o.integration, '#0891b2'],
                ['💰 Value on the table', o.value,       '#f59e0b'],
              ].map(([label, body, c]) => (
                <div key={label} style={{
                  padding: '6px 8px', background: '#fff',
                  border: `1px solid ${c}44`, borderLeft: `3px solid ${c}`,
                  borderRadius: 3,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: '#0f172a', lineHeight: 1.45 }}>{body}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Top score banner ───
function ScoreBanner() {
  const { score, max, pct } = readinessScore();
  const tier = pct >= 75 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626';
  const maturity = pct >= 80 ? 'L8–L10 Top 1%' :
                   pct >= 60 ? 'L5–L7 Integrated' :
                   pct >= 40 ? 'L3–L4 Platform' :
                   pct >= 20 ? 'L2 Projects' : 'L1 Experiments';
  return (
    <div style={{
      marginBottom: 14, padding: '12px 14px',
      background: `linear-gradient(135deg, ${tier}11, ${tier}22)`,
      border: `1px solid ${tier}55`, borderLeft: `4px solid ${tier}`,
      borderRadius: 6,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: tier, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, flexShrink: 0,
      }}>{pct}%</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
          Framework readiness · {score.toFixed(1)} / {max}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          Maturity band: <strong style={{ color: tier }}>{maturity}</strong> · per §75.2 15-level model.
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
          Score = (Σ present×1 + partial×0.5) / total. Across 9 dimensions: capabilities · SDLC · build-order · ops · mental model · patterns · spec-driven · agentic runtime.
        </div>
      </div>
    </div>
  );
}

// ─── Top nav anchors ───
function TopAnchors() {
  const anchors = [
    ['cap',     '🎯 Capabilities'],
    ['sdlc',    '🔄 SDLC'],
    ['phases',  '📋 Phases'],
    ['tier',    '🏗 Build Order'],
    ['ops',     '⚙ Ops'],
    ['mental',  '🧠 Mental Model'],
    ['patterns','🤖 Patterns'],
    ['spec',    '📜 Spec-Driven'],
    ['runtime', '🏛 Agentic Runtime'],
    ['observ',  '🔭 Observability'],
    ['align',   '📐 Workspace Alignment'],
    ['sequence','🔀 Forced Sequence'],
  ];
  return (
    <div style={{
      marginBottom: 14, padding: '8px 10px',
      background: '#f1f5f9', borderRadius: 4,
      display: 'flex', flexWrap: 'wrap', gap: 4,
    }}>
      <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, padding: '2px 6px' }}>JUMP TO →</span>
      {anchors.map(([id, label]) => (
        <a key={id} href={`#${id}`} style={{
          padding: '2px 8px', fontSize: 10, fontWeight: 700,
          background: '#fff', color: '#0f172a', textDecoration: 'none',
          border: '1px solid #cbd5e1', borderRadius: 3,
        }}>{label}</a>
      ))}
    </div>
  );
}

// ─── Section 11: Workspace Tab Alignment (from BANKING_TAB_ALIGNMENT.md) ───
function WorkspaceAlignmentSection() {
  return (
    <Section id="align" icon="📐" title="Workspace tab alignment standard" color="#0891b2"
             subtitle="9-tab horizontal layout · §73 + parallel session 2026-06-05">
      <div style={{
        marginBottom: 10, padding: '6px 10px',
        background: '#ecfeff', border: '1px solid #67e8f9', borderLeft: '3px solid #0891b2',
        borderRadius: 4, fontSize: 11, color: '#0e7490',
      }}>
        📐 Per <code>docs/BANKING_TAB_ALIGNMENT.md</code> — the canonical 9-tab horizontal workspace layout.
        Depth rule: <strong>{NAVIGATION_DEPTH_RULE.allowed}</strong> ({NAVIGATION_DEPTH_RULE.max_depth} levels max).
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['#', 'Tab', 'Sub-tabs', 'Components / purpose'].map((h) => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WORKSPACE_TAB_ALIGNMENT.map((t) => (
            <tr key={t.id} id={`align-${t.id}`} style={{ borderBottom: '1px solid #f1f5f9', scrollMarginTop: 80 }}>
              <td style={{ padding: '4px 8px', color: '#94a3b8', fontWeight: 700 }}>{t.order}</td>
              <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 700 }}>{t.label}</td>
              <td style={{ padding: '4px 8px', fontSize: 10, color: '#475569' }}>
                {t.subtabs.length === 0 ? (
                  <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>None</span>
                ) : (
                  t.subtabs.map((s) => (
                    <Chip key={s} bg="#0891b2" small>{s}</Chip>
                  )).reduce((acc, el, i) => acc.length === 0 ? [el] : [...acc, ' ', el], [])
                )}
              </td>
              <td style={{ padding: '4px 8px', fontSize: 10, color: '#64748b' }}>{t.components}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, fontSize: 11, color: '#475569' }}>
        <strong>Universal footer widgets</strong> (every tab/sub-tab body appends these):
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {UNIVERSAL_FOOTER_WIDGETS.map((w) => (
          <span key={w.name} title={w.purpose} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px',
            background: '#fff', border: '1px solid #cbd5e1', borderRadius: 3,
            fontSize: 10, color: '#0f172a', fontFamily: 'monospace',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0891b2' }} />
            {w.name}
          </span>
        ))}
      </div>
    </Section>
  );
}

// ─── Section 12: 18-Step Forced Sequence (§83.5) ───
function ForcedSequenceSection() {
  return (
    <Section id="sequence" icon="🔀" title="18-step forced sequence" color="#dc2626"
             subtitle="No agent can directly answer the user · §83.5">
      <div style={{
        marginBottom: 10, padding: '8px 12px',
        background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626',
        borderRadius: 4, fontSize: 12, color: '#7f1d1d',
      }}>
        ⚠ <strong>The brutal rule:</strong> No agent can directly answer the user.
        Every response MUST pass: <strong>Security → Retrieval → Evaluation → Review → Compliance → Audit</strong>.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {FORCED_SEQUENCE.map((step) => {
          const isGate = [2, 3, 5, 10, 11, 13, 14, 16, 17].includes(step.n);
          const tierColor = step.n === 14 ? '#dc2626' :
                            step.n === 16 ? '#7c3aed' :
                            step.n === 17 ? '#f59e0b' :
                            isGate ? '#0891b2' : '#0f172a';
          return (
            <div key={step.n} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px',
              background: isGate ? `${tierColor}11` : '#fff',
              border: `1px solid ${tierColor}55`, borderLeft: `4px solid ${tierColor}`,
              borderRadius: 4, fontSize: 11,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 3,
                background: tierColor, color: '#fff',
                fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{step.n}</span>
              <strong style={{ color: '#0f172a', minWidth: 200 }}>{step.name}</strong>
              <span style={{ flex: 1, color: '#475569', fontSize: 10 }}>{step.purpose}</span>
              <Chip bg="#475569" small>{step.owner}</Chip>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{
          fontSize: 10, color: '#dc2626', fontWeight: 700, marginBottom: 4,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>🔐 The 16-field golden-rule audit row (§83.6 + §57.6.1)</div>
        <div style={{
          padding: 10, background: '#f8fafc', color: '#475569', border: '1px solid #e5e7eb',
          borderRadius: 4, fontFamily: 'monospace', fontSize: 10,
          display: 'flex', flexWrap: 'wrap', gap: 4,
        }}>
          {GOLDEN_RULE_AUDIT_ROW.map((f) => (
            <span key={f} style={{
              padding: '2px 8px', borderRadius: 2,
              background: 'rgba(255,255,255,0.08)', color: '#fff',
            }}>{f}</span>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
          Missing ANY of these 16 fields for a regulated decision = the row is a tombstone (per §48.11), not an audit row.
        </div>
      </div>
    </Section>
  );
}

// ─── Cross-link banner to /agent-supervisor ───
function AgentSupervisorCrossLink() {
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px',
      background: 'linear-gradient(135deg, #16a34a11, #16a34a22)',
      border: '1px solid #16a34a55', borderLeft: '4px solid #16a34a',
      borderRadius: 6,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 24 }}>🔭</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          See live state at <code>/agent-supervisor</code>
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          This page is the FRAMEWORK REFERENCE (the WHAT + WHY). For live operational state — live agents, queue depth, durable traces, failure taxonomy, schedule history — open the Agent Supervisor cockpit.
        </div>
      </div>
      <a href={AGENT_SUPERVISOR_ROUTE} style={{
        padding: '8px 14px', borderRadius: 4,
        background: '#16a34a', color: '#fff',
        textDecoration: 'none', fontSize: 12, fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>Open cockpit →</a>
    </div>
  );
}

function FooterCatalog() {
  return (
    <div style={{
      marginTop: 16, padding: '10px 14px',
      background: '#f8fafc', color: '#475569', border: '1px solid #e5e7eb',
      borderRadius: 4, fontSize: 11,
    }}>
      <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        📚 Full catalogs in <code>~/.claude/policies/</code> + this project's CLAUDE.md
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>· §64.43 — 15 agent architecture patterns</span>
        <span>· §64.44 — 14 agentic platform tools (Hermes / OpenClaw / Kilo Code / Descript ... )</span>
        <span>· §67   — 5-OS canonical layering (MCP / Paperclip / OpenClaw / Harness / PoliAI)</span>
        <span>· §75   — Strategic phases 31–45 + 15-level maturity model</span>
        <span>· §76   — 9 technical runtime layers · 164 components</span>
        <span>· §77   — Program delivery (16-stage SDLC × 12 phases × build order × 15 ops × 4 foundation failures)</span>
        <span style={{ marginTop: 4 }}>External: <code>github.com/sipyourdrink-ltd/bernstein</code> · audit-grade multi-agent CLI orchestrator</span>
      </div>
    </div>
  );
}

export function BankFrameworkPage() {
  return (
    <div style={{
      padding: 16, maxWidth: 1400, margin: '0 auto',
      background: '#f1f5f9', minHeight: '100%',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 14, padding: '12px 14px',
        background: '#fff', border: '1px solid #e2e8f0',
        borderLeft: '4px solid #0f172a', borderRadius: 6,
      }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
          🏛 Top-1% Enterprise AI OS · Framework Reference
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
          Operator's canonical reference for this insur project. 9 dimensions in one bookmarkable page.
          Per-tab chips in `/bank/dept/*/*/*` link to anchors here.
        </p>
      </div>

      <ScoreBanner />
      <TopAnchors />

      <CapabilitiesSection />
      <SdlcSection />
      <PhasesSection />
      <BuildOrderSection />
      <OpsSection />
      <MentalModelSection />

      <TaggedListSection
        id="patterns" icon="🤖" title="Agent architecture patterns" color="#8b5cf6"
        items={AGENT_PATTERNS} anchorPrefix="pattern"
        columns={['Relevance', 'Pattern', 'Family', 'Status', 'Best for / failure', 'Source']}
        subtitle="15 from §64.43 + 4 operator-new"
      />
      <TaggedListSection
        id="spec" icon="📜" title="Spec-driven development stack" color="#0891b2"
        items={SPEC_DRIVEN} anchorPrefix="spec"
        columns={['Relevance', 'Name', 'Mode', 'Status', 'Why', 'Evaluation']}
        subtitle="OpenSpec · AWS Kiro · GitHub Spec Kit · BMAD · Augment · Bernstein"
      />
      <TaggedListSection
        id="runtime" icon="🏛" title="Agentic runtime 5-OS + CUA" color="#16a34a"
        items={AGENTIC_RUNTIME} anchorPrefix="runtime"
        columns={['Relevance', 'Tool', 'Layer', 'Status', 'Why', 'Source']}
        subtitle="MCP · Paperclip · OpenClaw · Harness · PoliAI · Stagehand · Playwright · Temporal · LangGraph"
      />

      <ObservabilitySection />

      <WorkspaceAlignmentSection />
      <ForcedSequenceSection />

      <AgentSupervisorCrossLink />

      <FooterCatalog />
    </div>
  );
}
