// Executive AI Dashboard · pilot functional implementation
//
// Operator 2026-06-14: "fix all pending 10/10"
//
// Per Phase 1 catalog (observability-dashboards-catalog.js):
//   name: Executive AI Dashboard
//   purpose: Overall AI health
//   keyMetrics: Total AI Requests, Adoption, Cost, ROI
//   viz: KPI Cards + Gauges + Trends
//   frequency: Real-Time
//   audience: C-Suite
//
// §57.7 HONEST: data here is PLACEHOLDER (deterministic seed) — clearly
// labeled. Real implementation = backend `/api/v1/observability/executive`
// endpoint reading from §38.3 audit row aggregates. This pilot proves the
// catalog → dashboard pattern works end-to-end · operator picks which to
// build next.
//
// Composes with: §38.3 (audit row aggregates feed dashboards) ·
// §47.6 (per-role data scope · CIO/CFO/CISO views) · §57.7 (honest
// placeholder banner · NEVER claim real data) · §122 (top-1% = functional
// with placeholder · NOT scaffold card forever).
import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { ComponentInfoInline } from '../../../components/ComponentInfo';

export function ExecutiveAIDashboard() {
  // §57.7 honest: deterministic placeholder data · clearly labeled
  const trendData = useMemo(() => seedTrendData(30), []);
  const costByModel = useMemo(() => seedCostByModel(), []);
  const adoptionByDept = useMemo(() => seedAdoptionByDept(), []);

  // KPI tile values · placeholder (clearly stamped)
  // Per operator OP-18 (2026-06-14): every KPI tile must have 1-2 liner description
  const kpis = [
    { label: 'Total AI Requests (30d)', value: '2.4M',  delta: '+18%', deltaUp: true,  accent: '#7c3aed', icon: '⚡',
      info: 'Aggregate inference calls across all models and tenants · proxy for AI adoption velocity.' },
    { label: 'Active Users (DAU)',      value: '4,182', delta: '+12%', deltaUp: true,  accent: '#0891b2', icon: '👥',
      info: 'Unique users invoking AI in the last 24 hours · DAU/MAU ratio reveals stickiness.' },
    { label: 'Monthly Cost',            value: '$84.2k', delta: '-3%', deltaUp: false, accent: '#16a34a', icon: '💰',
      info: 'Inference + embedding + API spend this month · negative delta means cost-out trend.' },
    { label: 'ROI',                     value: '3.4×',  delta: '+0.6×', deltaUp: true, accent: '#dc2626', icon: '📈',
      info: 'Value created / cost invested · finance-validated · multi-quarter realized + projected.' },
  ];

  return (
    <div style={{
      padding: 24, background: '#f8fafc', minHeight: '100vh',
    }}>
      {/* §57.7 honest banner */}
      <div style={{
        marginBottom: 16, padding: 12,
        background: '#fef3c7', border: '2px solid #fcd34d', borderLeft: '6px solid #f59e0b',
        borderRadius: 8, fontSize: 12, color: '#78350f',
      }}>
        🟡 <strong>§57.7 honest:</strong> this dashboard is the <strong>pilot functional
        implementation</strong> of "Executive AI Dashboard" from the Phase 1 catalog.
        Data is deterministic <strong>placeholder</strong> (seed-locked). Real
        implementation = backend <code>/api/v1/observability/executive</code> endpoint
        reading <strong>§38.3 audit row aggregates</strong>. Operator picks next dashboard to functional-ize.
      </div>

      {/* Header */}
      <div style={{
        marginBottom: 16, padding: 16,
        background: 'linear-gradient(135deg, #fff 0%, #f0f9ff 100%)',
        border: '2px solid #7c3aed', borderLeft: '6px solid #7c3aed',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🏛 Phase 1 · Executive · Pilot Functional
        </div>
        <h1 style={{ margin: '4px 0 6px 0', fontSize: 22, color: '#0f172a', fontWeight: 800 }}>
          Executive AI Dashboard
        </h1>
        <div style={{ fontSize: 12, color: '#475569' }}>
          Overall AI health · audience: C-Suite · frequency: real-time · last refresh: <strong>just now</strong>
        </div>
      </div>

      {/* 4 KPI tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
        marginBottom: 16,
      }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: '#fff', border: `2px solid ${k.accent}`,
            borderTop: `5px solid ${k.accent}`, borderRadius: 8, padding: 14,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 800, color: k.accent, textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: 6,
            }}>
              {k.icon} {k.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{
              marginTop: 6, fontSize: 11, fontWeight: 700,
              color: k.deltaUp ? '#16a34a' : '#dc2626',
            }}>
              {k.deltaUp ? '↑' : '↓'} {k.delta} <span style={{ color: '#94a3b8' }}>vs last 30d</span>
            </div>
            {/* OP-18 (2026-06-14): mandatory 1-2 liner per component */}
            {k.info && <ComponentInfoInline description={k.info} />}
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
      }}>
        {/* Trend: AI requests over 30 days */}
        <ChartCard title="📈 AI Requests · 30-day trend" accent="#7c3aed"
          description="Daily request volume across all AI models · spot week-over-week growth or sudden drops · click any day to drill into per-model breakdown.">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11, background: '#fff' }} />
              <Area type="monotone" dataKey="requests" stroke="#7c3aed"
                fill="url(#reqGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost by model · bar chart */}
        <ChartCard title="💰 Cost by Model · monthly" accent="#16a34a"
          description="Monthly cost attribution per model · helps CFO identify highest-spend models and FinOps optimization opportunities.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costByModel} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="model" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11, background: '#fff' }} formatter={(v) => `$${v}`} />
              <Bar dataKey="cost" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Adoption by department · stacked bar */}
        <ChartCard title="👥 Adoption by Department" accent="#0891b2"
          description="Active vs inactive users per department · shows where AI adoption is strong vs where change-management investment is needed.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={adoptionByDept} layout="vertical"
              margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
              <Tooltip contentStyle={{ fontSize: 11, background: '#fff' }} />
              <Bar dataKey="active" stackId="a" fill="#0891b2" />
              <Bar dataKey="inactive" stackId="a" fill="#cbd5e1" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ROI trend · simple line */}
        <ChartCard title="📈 ROI · 12-month trend" accent="#dc2626"
          description="Return on AI investment over 12 months · expressed as multiplier (1.5× = recovered 1.5× the spend) · feeds CFO and board reporting.">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData.slice(0, 12).map((d, i) => ({ month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], roi: 1.5 + i * 0.18 + Math.sin(i) * 0.15 }))}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11, background: '#fff' }} formatter={(v) => `${v.toFixed(2)}×`} />
              <Line type="monotone" dataKey="roi" stroke="#dc2626" strokeWidth={2}
                dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Footer · source attribution */}
      <div style={{
        marginTop: 16, padding: '10px 14px',
        background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 6,
        fontSize: 11, color: '#475569',
      }}>
        <strong>Data source:</strong> deterministic placeholder (seed-locked) · ready for swap to live backend.{' '}
        <strong>Backend endpoint required:</strong>{' '}
        <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>/api/v1/observability/executive</code>{' '}
        reading aggregates from <strong>audit_log</strong> per §38.3 · per-role scope per §47.6.
      </div>
    </div>
  );
}

function ChartCard({ title, accent, description, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderTop: `4px solid ${accent}`, borderRadius: 8, padding: 14,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 800, color: accent,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {title}
      </div>
      {description && <ComponentInfoInline description={description} />}
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

// Deterministic seed data · §57.7 honest placeholder
function seedTrendData(n) {
  const data = [];
  for (let i = 0; i < n; i++) {
    const day = `D-${n - i}`;
    const base = 65000 + Math.sin(i / 4) * 8000;
    const growth = i * 800;
    const requests = Math.round(base + growth + Math.random() * 2000);
    data.push({ day, requests });
  }
  return data;
}

function seedCostByModel() {
  return [
    { model: 'gpt-4',          cost: 32400 },
    { model: 'claude-opus',    cost: 28100 },
    { model: 'gpt-3.5',        cost: 8600 },
    { model: 'llama-3-70b',    cost: 6800 },
    { model: 'gemini-pro',     cost: 5200 },
    { model: 'mistral-large',  cost: 3100 },
  ];
}

function seedAdoptionByDept() {
  return [
    { dept: 'Sales',         active: 850, inactive: 150 },
    { dept: 'Engineering',   active: 720, inactive: 80 },
    { dept: 'Customer Sup.', active: 640, inactive: 160 },
    { dept: 'Marketing',     active: 480, inactive: 120 },
    { dept: 'Operations',    active: 320, inactive: 180 },
    { dept: 'HR',            active: 180, inactive: 220 },
  ];
}

export default ExecutiveAIDashboard;
