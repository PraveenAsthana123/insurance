import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
} from 'recharts';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ================================================================
   STRATEGY TAB — 8 sub-tabs
   People | Process | Profit | Technology | Change Management |
   Value Realization | Qualitative | Quantitative
   ================================================================ */

const STRATEGY_TABS = [
  { id: 'people',      label: 'People Strategy',       icon: '👥' },
  { id: 'process',     label: 'Process Strategy',      icon: '⚙️' },
  { id: 'profit',      label: 'Profit & ROI',          icon: '💰' },
  { id: 'technology',  label: 'Technology Strategy',   icon: '🔧' },
  { id: 'change',      label: 'Change Management',     icon: '🔄' },
  { id: 'value',       label: 'Value Realization',     icon: '💎' },
  { id: 'qualitative', label: 'Qualitative Analysis',  icon: '🔍' },
  { id: 'quant',       label: 'Quantitative Analysis', icon: '📊' },
];

/* ── helpers ── */
const statusBadge = (s) => {
  const map = {
    Complete: { bg: '#d1fae5', color: '#065f46' },
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    Planned: { bg: '#dbeafe', color: '#1e40af' },
    High: { bg: '#fee2e2', color: '#991b1b' },
    Medium: { bg: '#fef3c7', color: '#92400e' },
    Low: { bg: '#d1fae5', color: '#065f46' },
    Pass: { bg: '#d1fae5', color: '#065f46' },
    Fail: { bg: '#fee2e2', color: '#991b1b' },
    Green: { bg: '#d1fae5', color: '#065f46' },
    Amber: { bg: '#fef3c7', color: '#92400e' },
    Red: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = map[s] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color,
    }}>{s}</span>
  );
};

const ProgressBar = ({ value, max = 100, color = 'var(--accent-primary)' }) => (
  <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
  </div>
);

const TableWrapper = ({ children }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      {children}
    </table>
  </div>
);
const Th = ({ children, style: s }) => (
  <th style={{ padding: '8px 10px', textAlign: 'left', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', ...s }}>{children}</th>
);
const Td = ({ children, style: s }) => (
  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle', ...s }}>{children}</td>
);

/* ================================================================
   SUB-TAB 1: PEOPLE STRATEGY
   ================================================================ */
const RACI_ROWS = [
  { activity: 'Data Collection', responsible: 'Data Scientist', accountable: 'VP Operations', consulted: 'Domain Expert', informed: 'CISO' },
  { activity: 'Model Building', responsible: 'Data Scientist', accountable: 'ML Engineer', consulted: 'Business Analyst', informed: 'VP Operations' },
  { activity: 'Model Validation', responsible: 'Business Analyst', accountable: 'Data Scientist', consulted: 'Domain Expert', informed: 'VP Operations' },
  { activity: 'Deployment', responsible: 'ML Engineer', accountable: 'ML Engineer', consulted: 'Data Scientist', informed: 'VP Operations' },
  { activity: 'Monitoring', responsible: 'ML Engineer', accountable: 'VP Operations', consulted: 'Data Scientist', informed: 'CISO' },
  { activity: 'Business Review', responsible: 'Business Analyst', accountable: 'VP Operations', consulted: 'Data Scientist', informed: 'Planner' },
  { activity: 'Override Decisions', responsible: 'Domain Expert', accountable: 'VP Operations', consulted: 'Data Scientist', informed: 'Planner' },
  { activity: 'Compliance Review', responsible: 'CISO', accountable: 'CISO', consulted: 'Business Analyst', informed: 'VP Operations' },
];

const ORG_CARDS = [
  { group: 'Core Team', color: '#3b82f6', members: [
    { role: 'Data Scientist', fte: '2.0', resp: 'Model development, feature engineering' },
    { role: 'ML Engineer', fte: '1.0', resp: 'MLOps, deployment, CI/CD' },
    { role: 'Business Analyst', fte: '1.0', resp: 'Requirements, validation, reporting' },
  ]},
  { group: 'Extended Team', color: '#8b5cf6', members: [
    { role: 'Domain Expert (SME)', fte: '0.5', resp: 'Domain knowledge, data validation' },
    { role: 'DevOps / MLOps', fte: '1.0', resp: 'Infrastructure, pipelines, monitoring' },
    { role: 'QA Engineer', fte: '0.5', resp: 'Testing, model validation, sign-off' },
  ]},
  { group: 'Stakeholders', color: '#10b981', members: [
    { role: 'VP Operations', fte: 'Sponsor', resp: 'Executive oversight, go/no-go decisions' },
    { role: 'CFO', fte: 'Sponsor', resp: 'Budget approval, ROI tracking' },
    { role: 'CISO', fte: 'Advisor', resp: 'Security, compliance, governance' },
  ]},
];

const SKILLS_MATRIX = [
  { skill: 'Python / ML', required: 4, current: 3, gap: -1, plan: 'Advanced ML bootcamp (Q2 2025)' },
  { skill: 'Cloud / Docker', required: 3, current: 2, gap: -1, plan: 'AWS + Docker training (Q1 2025)' },
  { skill: 'Domain Knowledge', required: 4, current: 4, gap: 0, plan: 'On track — no action needed' },
  { skill: 'Statistics', required: 4, current: 3, gap: -1, plan: 'Stats workshop (Q1 2025)' },
  { skill: 'Communication', required: 3, current: 3, gap: 0, plan: 'Sufficient — continue coaching' },
  { skill: 'MLOps', required: 3, current: 1, gap: -2, plan: 'MLflow + Kubeflow training (Q2 2025)' },
];

const CAPACITY = [
  { phase: 'Discovery (2w)', ds: 1.5, mle: 0.5, ba: 1.0, devops: 0.0, total: 3.0 },
  { phase: 'Development (6w)', ds: 2.0, mle: 1.0, ba: 0.5, devops: 0.5, total: 4.0 },
  { phase: 'Testing (2w)', ds: 1.0, mle: 1.0, ba: 1.0, devops: 0.5, total: 3.5 },
  { phase: 'Deployment (1w)', ds: 0.5, mle: 1.0, ba: 0.5, devops: 1.0, total: 3.0 },
  { phase: 'Operations (ongoing)', ds: 0.5, mle: 0.5, ba: 0.5, devops: 0.5, total: 2.0 },
];

function PeopleStrategy() {
  return (
    <div>
      {/* RACI */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">👥 RACI Matrix</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Activity</Th>
              <Th>Responsible</Th>
              <Th>Accountable</Th>
              <Th>Consulted</Th>
              <Th>Informed</Th>
            </tr>
          </thead>
          <tbody>
            {RACI_ROWS.map((r) => (
              <tr key={r.activity} style={{ background: 'var(--bg-card)' }}>
                <Td><strong>{r.activity}</strong></Td>
                <Td><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: 8, fontSize: 11 }}>{r.responsible}</span></Td>
                <Td><span style={{ background: '#fce7f3', color: '#9d174d', padding: '2px 7px', borderRadius: 8, fontSize: 11 }}>{r.accountable}</span></Td>
                <Td><span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 7px', borderRadius: 8, fontSize: 11 }}>{r.consulted}</span></Td>
                <Td><span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 8, fontSize: 11 }}>{r.informed}</span></Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Org Chart */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🏗️ Team Structure</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
          {ORG_CARDS.map((group) => (
            <div key={group.group} style={{ border: `2px solid ${group.color}20`, borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
              <div style={{ background: group.color, color: '#fff', padding: '8px 12px', fontWeight: 600, fontSize: 12 }}>{group.group}</div>
              {group.members.map((m) => (
                <div key={m.role} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{m.role}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{m.resp}</div>
                  <span style={{ background: `${group.color}20`, color: group.color, padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>FTE: {m.fte}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Skills Matrix */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📚 Skills Matrix</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Skill</Th>
              <Th>Required Level (1-5)</Th>
              <Th>Current Level (1-5)</Th>
              <Th>Gap</Th>
              <Th>Training Plan</Th>
            </tr>
          </thead>
          <tbody>
            {SKILLS_MATRIX.map((s) => (
              <tr key={s.skill}>
                <Td><strong>{s.skill}</strong></Td>
                <Td><ProgressBar value={s.required} max={5} color="#3b82f6" /> <span style={{ fontSize: 11 }}>{s.required}/5</span></Td>
                <Td><ProgressBar value={s.current} max={5} color={s.gap < 0 ? '#f59e0b' : '#10b981'} /> <span style={{ fontSize: 11 }}>{s.current}/5</span></Td>
                <Td>{statusBadge(s.gap < 0 ? (s.gap < -1 ? 'High' : 'Medium') : 'Low')}</Td>
                <Td style={{ fontSize: 11 }}>{s.plan}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Capacity Planning */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📅 Capacity Planning (FTE)</span>
        </div>
        <div style={{ height: 260, marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CAPACITY} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="phase" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'FTE', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ds" name="Data Scientist" fill="#3b82f6" />
              <Bar dataKey="mle" name="ML Engineer" fill="#8b5cf6" />
              <Bar dataKey="ba" name="Business Analyst" fill="#10b981" />
              <Bar dataKey="devops" name="DevOps" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Phase</Th>
              <Th>Data Scientist</Th>
              <Th>ML Engineer</Th>
              <Th>BA</Th>
              <Th>DevOps</Th>
              <Th>Total FTE</Th>
            </tr>
          </thead>
          <tbody>
            {CAPACITY.map((r) => (
              <tr key={r.phase}>
                <Td><strong>{r.phase}</strong></Td>
                <Td>{r.ds}</Td>
                <Td>{r.mle}</Td>
                <Td>{r.ba}</Td>
                <Td>{r.devops}</Td>
                <Td><strong style={{ color: 'var(--accent-primary)' }}>{r.total}</strong></Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 2: PROCESS STRATEGY
   ================================================================ */
const MATURITY_LEVELS = [
  { level: 1, name: 'Ad-hoc', desc: 'Manual, no standard process', color: '#ef4444', current: false, target: false },
  { level: 2, name: 'Defined', desc: 'Documented SOPs in place', color: '#f59e0b', current: true, target: false },
  { level: 3, name: 'Managed', desc: 'Metrics tracked, controlled', color: '#3b82f6', current: false, target: false },
  { level: 4, name: 'Optimized', desc: 'AI-assisted, continuous improvement', color: '#8b5cf6', current: false, target: true },
  { level: 5, name: 'Autonomous', desc: 'AI-driven, human oversight only', color: '#10b981', current: false, target: false },
];

const MATURITY_RADAR = [
  { area: 'Data Management', score: 60 }, { area: 'Model Lifecycle', score: 55 },
  { area: 'Monitoring', score: 45 }, { area: 'Collaboration', score: 70 },
  { area: 'Documentation', score: 65 }, { area: 'Automation', score: 40 },
];

const PROCESS_ROADMAP = [
  { quarter: 'Q1 2025', current: 'Manual forecast review weekly', target: 'Daily automated anomaly alerts', initiatives: 'Alert framework, SOP docs', deps: 'Data pipeline stable' },
  { quarter: 'Q2 2025', current: 'Excel-based reporting', target: 'Live dashboard adoption', initiatives: 'Dashboard rollout, training', deps: 'Q1 alert framework live' },
  { quarter: 'Q3 2025', current: 'Model retrain quarterly', target: 'Automated monthly retrain', initiatives: 'MLflow + Celery pipelines', deps: 'MLOps team onboard' },
  { quarter: 'Q4 2025', current: 'Manual override logging', target: 'Structured override capture + RL', initiatives: 'Feedback loop, RLHF module', deps: 'Q3 pipelines complete' },
];

const PROCESS_KPIS = [
  { kpi: 'Forecast Cycle Time', baseline: '5 days', target: '1 day', current: '2 days', progress: 75, status: 'Green' },
  { kpi: 'Manual Override Rate', baseline: '32%', target: '8%', current: '18%', progress: 55, status: 'Amber' },
  { kpi: 'Data Pipeline SLA', baseline: '82%', target: '99%', current: '94%', progress: 65, status: 'Amber' },
  { kpi: 'Stakeholder Satisfaction', baseline: '3.1/5', target: '4.5/5', current: '3.9/5', progress: 57, status: 'Amber' },
  { kpi: 'Alert Response Time', baseline: '4 hrs', target: '30 min', current: '1.5 hrs', progress: 60, status: 'Amber' },
  { kpi: 'Model Retrain Frequency', baseline: 'Quarterly', target: 'Monthly', current: 'Monthly', progress: 100, status: 'Green' },
  { kpi: 'Docs Coverage', baseline: '40%', target: '90%', current: '72%', progress: 65, status: 'Amber' },
  { kpi: 'Automated Test Coverage', baseline: '0%', target: '80%', current: '55%', progress: 69, status: 'Amber' },
];

const DMAIC = [
  { phase: 'Define', icon: '🎯', items: ['Business problem scoped', 'SIPOC diagram complete', 'VOC captured'], status: 'Complete' },
  { phase: 'Measure', icon: '📏', items: ['Baseline forecast error: 18%', 'Data quality audit done', 'Process map created'], status: 'Complete' },
  { phase: 'Analyze', icon: '🔬', items: ['Root causes identified', 'Statistical analysis run', 'Gap analysis complete'], status: 'In Progress' },
  { phase: 'Improve', icon: '🚀', items: ['XGBoost model deployed', 'Automation pipeline built', 'SOP updated'], status: 'In Progress' },
  { phase: 'Control', icon: '🛡️', items: ['Control charts set up', 'Alert thresholds defined', 'Governance framework'], status: 'Planned' },
];

function ProcessStrategy() {
  return (
    <div>
      {/* Maturity Model */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🎯 Process Maturity Model</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {MATURITY_LEVELS.map((l) => (
            <div key={l.level} style={{
              border: `2px solid ${l.current ? l.color : l.target ? l.color + '80' : 'var(--border-color)'}`,
              borderRadius: 'var(--border-radius)', padding: 14, textAlign: 'center',
              background: l.current ? `${l.color}18` : l.target ? `${l.color}08` : 'var(--bg-card)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: l.color }}>{l.level}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{l.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.desc}</div>
              {l.current && <div style={{ marginTop: 8, background: l.color, color: '#fff', borderRadius: 8, fontSize: 10, padding: '2px 6px' }}>CURRENT</div>}
              {l.target && <div style={{ marginTop: 8, background: `${l.color}30`, color: l.color, borderRadius: 8, fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>TARGET</div>}
            </div>
          ))}
        </div>
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={MATURITY_RADAR}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Maturity Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Roadmap */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🗺️ Process Improvement Roadmap</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Quarter</Th><Th>Current State</Th><Th>Target State</Th><Th>Key Initiatives</Th><Th>Dependencies</Th>
            </tr>
          </thead>
          <tbody>
            {PROCESS_ROADMAP.map((r) => (
              <tr key={r.quarter}>
                <Td><strong style={{ color: 'var(--accent-primary)' }}>{r.quarter}</strong></Td>
                <Td style={{ color: '#ef4444', fontSize: 11 }}>{r.current}</Td>
                <Td style={{ color: '#10b981', fontSize: 11 }}>{r.target}</Td>
                <Td style={{ fontSize: 11 }}>{r.initiatives}</Td>
                <Td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.deps}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* KPIs */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 Process KPIs</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>KPI</Th><Th>Baseline</Th><Th>Target</Th><Th>Current</Th><Th style={{ minWidth: 120 }}>Progress</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {PROCESS_KPIS.map((k) => (
              <tr key={k.kpi}>
                <Td><strong>{k.kpi}</strong></Td>
                <Td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.baseline}</Td>
                <Td style={{ fontSize: 11 }}>{k.target}</Td>
                <Td style={{ fontSize: 11, fontWeight: 600 }}>{k.current}</Td>
                <Td>
                  <ProgressBar value={k.progress} color={k.progress >= 80 ? '#10b981' : '#f59e0b'} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.progress}%</span>
                </Td>
                <Td>{statusBadge(k.status)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* DMAIC */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">⚡ Lean / Six Sigma — DMAIC Mapping</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {DMAIC.map((d) => (
            <div key={d.phase} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: d.status === 'Complete' ? '#d1fae5' : d.status === 'In Progress' ? '#fef3c7' : '#dbeafe', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 16 }}>{d.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{d.phase}</div>
                <div>{statusBadge(d.status)}</div>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {d.items.map((item) => (
                  <div key={item} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 10, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--accent-primary)' }}>•</span>{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 3: PROFIT & ROI
   ================================================================ */
const PNL_DATA = [
  { item: 'Revenue', before: 48.2, after: 51.6, delta: 3.4, pct: 7.1 },
  { item: 'COGS', before: 31.4, after: 29.8, delta: -1.6, pct: -5.1 },
  { item: 'Gross Margin', before: 16.8, after: 21.8, delta: 5.0, pct: 29.8 },
  { item: 'OpEx', before: 8.2, after: 7.6, delta: -0.6, pct: -7.3 },
  { item: 'Net Profit', before: 8.6, after: 14.2, delta: 5.6, pct: 65.1 },
];

const COST_BENEFIT = [
  { category: 'Infrastructure', y1c: 280, y2c: 120, y3c: 120, total: 520, type: 'cost' },
  { category: 'Licenses', y1c: 150, y2c: 150, y3c: 150, total: 450, type: 'cost' },
  { category: 'People', y1c: 420, y2c: 380, y3c: 380, total: 1180, type: 'cost' },
  { category: 'Training', y1c: 80, y2c: 30, y3c: 10, total: 120, type: 'cost' },
  { category: 'Maintenance', y1c: 60, y2c: 80, y3c: 90, total: 230, type: 'cost' },
  { category: 'Revenue Uplift', y1c: 340, y2c: 680, y3c: 1020, total: 2040, type: 'benefit' },
  { category: 'Cost Reduction', y1c: 480, y2c: 620, y3c: 720, total: 1820, type: 'benefit' },
  { category: 'Productivity', y1c: 120, y2c: 180, y3c: 220, total: 520, type: 'benefit' },
  { category: 'Risk Reduction', y1c: 90, y2c: 150, y3c: 180, total: 420, type: 'benefit' },
];

const BREAKEVEN_DATA = (() => {
  let cumCost = 0; let cumBenefit = 0;
  return Array.from({ length: 37 }, (_, i) => {
    const m = i;
    const monthlyCost = m === 0 ? 480 : m <= 12 ? 80 : 55;
    const monthlyBenefit = m < 3 ? 0 : m < 12 ? 65 : m < 24 ? 165 : 190;
    cumCost += monthlyCost;
    cumBenefit += monthlyBenefit;
    return { month: `M${m}`, cumCost: Math.round(cumCost), cumBenefit: Math.round(cumBenefit) };
  });
})();

const breakEvenMonth = BREAKEVEN_DATA.findIndex((d) => d.cumBenefit >= d.cumCost);

function ROICalculator() {
  const [forecastGain, setForecastGain] = useState(12);
  const [stockoutRed, setStockoutRed] = useState(35);
  const [prodGain, setProdGain] = useState(20);

  const annualSavings = Math.round(forecastGain * 28000 + stockoutRed * 45000 + prodGain * 18000);
  const totalInvestment = 990000;
  const roi = Math.round(((annualSavings - totalInvestment / 3) / (totalInvestment / 3)) * 100);
  const payback = (totalInvestment / annualSavings).toFixed(1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          {[
            { label: 'Forecast Accuracy Improvement (%)', val: forecastGain, set: setForecastGain, min: 0, max: 30 },
            { label: 'Stockout Reduction (%)', val: stockoutRed, set: setStockoutRed, min: 0, max: 60 },
            { label: 'Productivity Gain (%)', val: prodGain, set: setProdGain, min: 0, max: 40 },
          ].map(({ label, val, set, min, max }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{label}</span>
                <strong style={{ color: 'var(--accent-primary)' }}>{val}%</strong>
              </div>
              <input type="range" min={min} max={max} value={val} onChange={(e) => set(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Annual Savings', value: `$${(annualSavings / 1000).toFixed(0)}K`, color: '#10b981' },
            { label: 'ROI', value: `${roi}%`, color: '#3b82f6' },
            { label: 'Payback Period', value: `${payback} years`, color: '#8b5cf6' },
            { label: 'Total Investment', value: '$990K', color: '#f59e0b' },
          ].map((m) => (
            <div key={m.label} style={{ border: `1px solid ${m.color}40`, borderRadius: 'var(--border-radius)', padding: '12px 16px', background: `${m.color}08` }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfitROI() {
  return (
    <div>
      {/* P&L Impact */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">💹 P&L Impact Model ($M)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <TableWrapper>
            <thead>
              <tr>
                <Th>Line Item</Th><Th>Before AI</Th><Th>After AI</Th><Th>Delta</Th><Th>% Change</Th>
              </tr>
            </thead>
            <tbody>
              {PNL_DATA.map((r) => (
                <tr key={r.item}>
                  <Td><strong>{r.item}</strong></Td>
                  <Td>${r.before}M</Td>
                  <Td style={{ color: '#10b981', fontWeight: 600 }}>${r.after}M</Td>
                  <Td style={{ color: r.delta > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{r.delta > 0 ? '+' : ''}${r.delta}M</Td>
                  <Td style={{ color: r.pct > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{r.pct > 0 ? '+' : ''}{r.pct}%</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PNL_DATA} margin={{ top: 4, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="item" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `$${v}M`} />
                <Legend />
                <Bar dataKey="before" name="Before AI" fill="#6b7280" />
                <Bar dataKey="after" name="After AI" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🧮 Interactive ROI Calculator</span>
        </div>
        <ROICalculator />
      </div>

      {/* Cost-Benefit */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 Cost-Benefit Analysis ($K)</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Category</Th><Th>Type</Th><Th>Year 1</Th><Th>Year 2</Th><Th>Year 3</Th><Th>3-Year Total</Th>
            </tr>
          </thead>
          <tbody>
            {COST_BENEFIT.map((r) => (
              <tr key={r.category}>
                <Td><strong>{r.category}</strong></Td>
                <Td><span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: r.type === 'cost' ? '#fee2e2' : '#d1fae5', color: r.type === 'cost' ? '#991b1b' : '#065f46' }}>{r.type === 'cost' ? 'Cost' : 'Benefit'}</span></Td>
                <Td style={{ color: r.type === 'cost' ? '#ef4444' : '#10b981' }}>{r.type === 'cost' ? '-' : '+'}${r.y1c}K</Td>
                <Td style={{ color: r.type === 'cost' ? '#ef4444' : '#10b981' }}>{r.type === 'cost' ? '-' : '+'}${r.y2c}K</Td>
                <Td style={{ color: r.type === 'cost' ? '#ef4444' : '#10b981' }}>{r.type === 'cost' ? '-' : '+'}${r.y3c}K</Td>
                <Td style={{ fontWeight: 700 }}>{r.type === 'cost' ? '-' : '+'}${r.total}K</Td>
              </tr>
            ))}
            <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
              <Td colSpan={2}><strong>NPV (10% discount rate)</strong></Td>
              <Td colSpan={3} />
              <Td style={{ color: '#10b981', fontSize: 14 }}>$2.18M</Td>
            </tr>
            <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
              <Td colSpan={2}><strong>IRR</strong></Td>
              <Td colSpan={3} />
              <Td style={{ color: '#3b82f6', fontSize: 14 }}>38.4%</Td>
            </tr>
          </tbody>
        </TableWrapper>
      </div>

      {/* Break-even */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📈 Break-even Analysis (36 months, $K)</span>
          <span style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 600 }}>Break-even: Month {breakEvenMonth}</span>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={BREAKEVEN_DATA} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={5} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}K`} />
              <Tooltip formatter={(v) => `$${v}K`} />
              <Legend />
              <ReferenceLine x={`M${breakEvenMonth}`} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Break-even', fontSize: 10, fill: '#10b981' }} />
              <Line type="monotone" dataKey="cumCost" name="Cumulative Cost" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cumBenefit" name="Cumulative Benefit" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 4: TECHNOLOGY STRATEGY
   ================================================================ */
const TECH_STACK = [
  { component: 'Data Platform', current: 'Excel + CSV files', proposed: 'PostgreSQL + S3', rationale: 'Scalable, queryable, versioned', risk: 'Low', cost: '$8K/yr' },
  { component: 'ML Framework', current: 'Scikit-learn (local)', proposed: 'XGBoost + LightGBM', rationale: 'Better accuracy, faster training', risk: 'Low', cost: 'Open source' },
  { component: 'Model Serving', current: 'Manual scripts', proposed: 'FastAPI + Docker', rationale: 'REST API, containerized, scalable', risk: 'Medium', cost: '$4K/yr infra' },
  { component: 'Monitoring', current: 'None', proposed: 'MLflow + Prometheus', rationale: 'Drift detection, alerting, lineage', risk: 'Low', cost: '$3K/yr' },
  { component: 'CI/CD', current: 'None', proposed: 'GitHub Actions', rationale: 'Automated testing and deployment', risk: 'Low', cost: 'Free tier' },
  { component: 'Database', current: 'SQLite (local)', proposed: 'PostgreSQL (cloud)', rationale: 'Concurrent access, ACID compliance', risk: 'Low', cost: '$12K/yr' },
  { component: 'Cache', current: 'None', proposed: 'Redis', rationale: 'Sub-ms latency for hot data', risk: 'Low', cost: '$2.4K/yr' },
  { component: 'LLM', current: 'None', proposed: 'Ollama (local LLM)', rationale: 'Data privacy, no API costs', risk: 'Medium', cost: 'GPU infra $15K' },
];

const BUILD_BUY = [
  { capability: 'Demand Forecasting Engine', build: 'Custom XGBoost pipeline, full control', buy: 'Llamasoft, O9 Solutions ($120K+/yr)', rec: 'Build', reason: 'Core IP, domain specific' },
  { capability: 'Data Ingestion Pipeline', build: '3-month effort, flexible', buy: 'Airbyte / Fivetran ($20K/yr)', rec: 'Buy', reason: 'Commodity, save dev time' },
  { capability: 'Model Monitoring', build: 'Custom dashboards, 2-month effort', buy: 'WhyLabs / Arize ($18K/yr)', rec: 'Buy', reason: 'Best-in-class, rapid value' },
  { capability: 'LLM / NLP Narrative', build: 'Ollama self-hosted, full privacy', buy: 'OpenAI API ($8K+/yr)', rec: 'Build', reason: 'Data privacy requirement' },
  { capability: 'BI Reporting', build: 'Custom React dashboard', buy: 'Power BI / Tableau ($24K/yr)', rec: 'Build', reason: 'Already built, tailored' },
  { capability: 'Orchestration', build: 'Custom Celery, flexible', buy: 'Airflow managed ($15K/yr)', rec: 'Build', reason: 'Lower TCO for our scale' },
];

const TECH_ROADMAP = [
  { phase: 'Phase 1: Foundation', duration: 'Q1 2025 (3 months)', tech: 'Docker, PostgreSQL, FastAPI, React, GitHub Actions', deliverables: 'Core API, DB schema, CI/CD pipeline, dev environment' },
  { phase: 'Phase 2: ML Pipeline', duration: 'Q2 2025 (3 months)', tech: 'XGBoost, MLflow, Celery, Redis, Prometheus', deliverables: 'Trained model v1, automated retraining, monitoring dashboard' },
  { phase: 'Phase 3: Advanced AI', duration: 'Q3 2025 (3 months)', tech: 'Ollama, ChromaDB (vector), RAG pipeline, RLHF feedback', deliverables: 'LLM narrative engine, RAG Q&A, override feedback loop' },
  { phase: 'Phase 4: Scale', duration: 'Q4 2025 (3 months)', tech: 'Kubernetes, Grafana, auto-scaling, blue-green deploy', deliverables: 'Production-grade infra, SLA >99.5%, zero-downtime deploys' },
];

const ARCH_DECISIONS = [
  { decision: 'SQLite vs PostgreSQL for production', alternatives: 'SQLite, MySQL, MongoDB', chosen: 'PostgreSQL', tradeoffs: 'More setup complexity but critical for concurrent access and ACID compliance' },
  { decision: 'Self-hosted LLM vs API-based', alternatives: 'OpenAI API, Anthropic API, Cohere', chosen: 'Ollama (self-hosted)', tradeoffs: 'GPU infrastructure cost but zero data egress risk, no per-token cost at scale' },
  { decision: 'Microservices vs Monolith', alternatives: 'Microservices, Serverless', chosen: 'Modular monolith', tradeoffs: 'Simpler ops now, extract services later when team grows' },
  { decision: 'XGBoost vs Deep Learning', alternatives: 'LSTM, Transformer, N-BEATS', chosen: 'XGBoost + LightGBM ensemble', tradeoffs: 'Lower compute cost, interpretable, better for tabular CPG data at this scale' },
];

function TechStrategy() {
  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🔧 Technology Stack Assessment</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Component</Th><Th>Current</Th><Th>Proposed</Th><Th>Rationale</Th><Th>Risk</Th><Th>Cost</Th>
            </tr>
          </thead>
          <tbody>
            {TECH_STACK.map((r) => (
              <tr key={r.component}>
                <Td><strong>{r.component}</strong></Td>
                <Td style={{ color: '#ef4444', fontSize: 11 }}>{r.current}</Td>
                <Td style={{ color: '#10b981', fontWeight: 600, fontSize: 11 }}>{r.proposed}</Td>
                <Td style={{ fontSize: 11 }}>{r.rationale}</Td>
                <Td>{statusBadge(r.risk)}</Td>
                <Td style={{ fontSize: 11 }}>{r.cost}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">⚖️ Build vs Buy Analysis</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Capability</Th><Th>Build (Custom)</Th><Th>Buy (SaaS)</Th><Th>Recommendation</Th><Th>Reason</Th>
            </tr>
          </thead>
          <tbody>
            {BUILD_BUY.map((r) => (
              <tr key={r.capability}>
                <Td><strong>{r.capability}</strong></Td>
                <Td style={{ fontSize: 11 }}>{r.build}</Td>
                <Td style={{ fontSize: 11 }}>{r.buy}</Td>
                <Td><span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: r.rec === 'Build' ? '#dbeafe' : '#d1fae5', color: r.rec === 'Build' ? '#1e40af' : '#065f46' }}>{r.rec}</span></Td>
                <Td style={{ fontSize: 11 }}>{r.reason}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🗺️ Technology Roadmap</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {TECH_ROADMAP.map((r, i) => (
            <div key={r.phase} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 14, borderLeft: `4px solid ${['#3b82f6','#8b5cf6','#10b981','#f59e0b'][i]}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: ['#3b82f6','#8b5cf6','#10b981','#f59e0b'][i] }}>{r.phase}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{r.duration}</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>Tech:</strong> {r.tech}</div>
              <div style={{ fontSize: 11 }}><strong>Deliverables:</strong> {r.deliverables}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🏛️ Architecture Decision Summary</span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {ARCH_DECISIONS.map((d) => (
            <div key={d.decision} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📌 {d.decision}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 11 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Alternatives:</span> {d.alternatives}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Chosen:</span> <strong style={{ color: '#10b981' }}>{d.chosen}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Trade-offs:</span> {d.tradeoffs}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 5: CHANGE MANAGEMENT
   ================================================================ */
const ADKAR = [
  { phase: 'Awareness', icon: '👁️', desc: 'Communicate why change is needed and the risks of the status quo', activities: ['Town halls', 'Executive comms', 'FAQ document', 'Intranet page'], metrics: '85% employees aware of initiative', status: 'Complete', progress: 100 },
  { phase: 'Desire', icon: '💡', desc: 'Create motivation to support and participate in the change', activities: ['Benefits workshops', '1:1 with resistors', 'Quick wins demo', 'Champion network'], metrics: '70% expressing positive intent', status: 'In Progress', progress: 70 },
  { phase: 'Knowledge', icon: '📚', desc: 'Provide knowledge on how to change — skills and behaviors', activities: ['Role-specific training', 'User manuals', 'Sandbox environment', 'Video tutorials'], metrics: '80% training completion', status: 'In Progress', progress: 55 },
  { phase: 'Ability', icon: '🛠️', desc: 'Support and practice to develop skills and behaviors', activities: ['Supervised practice', 'Coaching sessions', 'Hypercare period', 'Helpdesk'], metrics: '90% proficiency sign-off', status: 'Planned', progress: 20 },
  { phase: 'Reinforcement', icon: '🎯', desc: 'Sustain and reinforce the change post go-live', activities: ['Recognition program', 'Regular audits', 'Performance reviews', 'Success stories'], metrics: 'Zero regression in KPIs', status: 'Planned', progress: 0 },
];

const STAKEHOLDER_IMPACT = [
  { stakeholder: 'Demand Planners', current: 'Manual forecast creation', impact: 'High', resistance: 'Medium', mitigation: 'Upskilling program, reposition as AI supervisors' },
  { stakeholder: 'Supply Chain Managers', current: 'Weekly manual review', impact: 'High', resistance: 'Low', mitigation: 'Early involvement, provide dashboard access' },
  { stakeholder: 'VP Operations', current: 'Monthly report consumer', impact: 'Medium', resistance: 'Low', mitigation: 'Executive dashboard, ROI visibility' },
  { stakeholder: 'IT Department', current: 'Ad-hoc data requests', impact: 'High', resistance: 'Medium', mitigation: 'Clear ownership model, self-service tools' },
  { stakeholder: 'Finance Team', current: 'Manual budget reconciliation', impact: 'Medium', resistance: 'Medium', mitigation: 'Integration with finance reporting tools' },
  { stakeholder: 'Sales Team', current: 'Disconnected promo planning', impact: 'Low', resistance: 'Low', mitigation: 'Show promo lift impact, give read access' },
  { stakeholder: 'CFO', current: 'Cost center view', impact: 'High', resistance: 'Low', mitigation: 'ROI monthly reporting, board-level summaries' },
  { stakeholder: 'CISO', current: 'Security audits annually', impact: 'Medium', resistance: 'Medium', mitigation: 'Security architecture review, encryption docs' },
];

const TRAINING_PLAN = [
  { audience: 'Demand Planners', type: 'Role-specific hands-on', duration: '16 hrs', format: 'Instructor-led + sandbox', schedule: 'Mar-Apr 2025', status: 'Planned' },
  { audience: 'Supply Chain Managers', type: 'Dashboard orientation', duration: '4 hrs', format: 'Live demo + self-paced', schedule: 'Apr 2025', status: 'Planned' },
  { audience: 'Data Team', type: 'Technical deep-dive', duration: '32 hrs', format: 'Technical workshop', schedule: 'Feb 2025', status: 'In Progress' },
  { audience: 'Executives', type: 'Executive briefing', duration: '2 hrs', format: 'Presentation + Q&A', schedule: 'Mar 2025', status: 'Planned' },
];

const ADOPTION_METRICS = [
  { metric: 'Active Daily Users', target: 45, current: 28, unit: 'users', trend: '▲' },
  { metric: 'Feature Adoption Rate', target: 80, current: 52, unit: '%', trend: '▲' },
  { metric: 'Model Override Rate', target: 10, current: 22, unit: '%', trend: '▼' },
  { metric: 'User Satisfaction Score', target: 4.2, current: 3.6, unit: '/5', trend: '▲' },
  { metric: 'Support Tickets / Week', target: 2, current: 8, unit: 'tickets', trend: '▼' },
];

function ChangeManagement() {
  const overallReadiness = Math.round(ADKAR.reduce((s, a) => s + a.progress, 0) / ADKAR.length);
  return (
    <div>
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🔄 ADKAR Change Readiness Model</span>
          <span style={{ fontWeight: 700, color: '#3b82f6' }}>Overall Readiness: {overallReadiness}%</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <ProgressBar value={overallReadiness} color="#3b82f6" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {ADKAR.map((a) => (
            <div key={a.phase} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', background: a.status === 'Complete' ? '#d1fae5' : a.status === 'In Progress' ? '#fef3c7' : '#dbeafe' }}>
                <div style={{ fontSize: 20 }}>{a.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.phase}</div>
                <div style={{ marginTop: 4 }}>{statusBadge(a.status)}</div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{a.desc}</div>
                <ProgressBar value={a.progress} color={a.progress > 70 ? '#10b981' : '#f59e0b'} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, marginBottom: 8 }}>{a.progress}% complete</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Target: {a.metrics}</div>
                {a.activities.map((act) => (
                  <div key={act} style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 10, position: 'relative', marginTop: 3 }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>{act}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">👥 Stakeholder Impact Assessment</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Stakeholder</Th><Th>Current Role</Th><Th>Impact Level</Th><Th>Resistance Risk</Th><Th>Mitigation Strategy</Th>
            </tr>
          </thead>
          <tbody>
            {STAKEHOLDER_IMPACT.map((r) => (
              <tr key={r.stakeholder}>
                <Td><strong>{r.stakeholder}</strong></Td>
                <Td style={{ fontSize: 11 }}>{r.current}</Td>
                <Td>{statusBadge(r.impact)}</Td>
                <Td>{statusBadge(r.resistance)}</Td>
                <Td style={{ fontSize: 11 }}>{r.mitigation}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 Training Plan</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Audience</Th><Th>Training Type</Th><Th>Duration</Th><Th>Format</Th><Th>Schedule</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_PLAN.map((r) => (
              <tr key={r.audience}>
                <Td><strong>{r.audience}</strong></Td>
                <Td style={{ fontSize: 11 }}>{r.type}</Td>
                <Td>{r.duration}</Td>
                <Td style={{ fontSize: 11 }}>{r.format}</Td>
                <Td style={{ fontSize: 11 }}>{r.schedule}</Td>
                <Td>{statusBadge(r.status)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 Adoption Metrics</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Metric</Th><Th>Target</Th><Th>Current</Th><Th>Progress</Th><Th>Trend</Th>
            </tr>
          </thead>
          <tbody>
            {ADOPTION_METRICS.map((m) => {
              const goodUp = m.metric !== 'Model Override Rate' && m.metric !== 'Support Tickets / Week';
              const progress = goodUp
                ? Math.min(100, Math.round((m.current / m.target) * 100))
                : Math.min(100, Math.round((m.target / m.current) * 100));
              return (
                <tr key={m.metric}>
                  <Td><strong>{m.metric}</strong></Td>
                  <Td>{m.target}{m.unit}</Td>
                  <Td style={{ fontWeight: 600 }}>{m.current}{m.unit}</Td>
                  <Td style={{ minWidth: 120 }}>
                    <ProgressBar value={progress} color={progress >= 80 ? '#10b981' : '#f59e0b'} />
                    <span style={{ fontSize: 10 }}>{progress}%</span>
                  </Td>
                  <Td style={{ fontSize: 16, color: m.trend === '▲' ? (goodUp ? '#10b981' : '#ef4444') : (goodUp ? '#ef4444' : '#10b981') }}>{m.trend}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrapper>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 6: VALUE REALIZATION
   ================================================================ */
const VALUE_STREAMS = [
  { stream: 'Forecast-to-Order', input: 'Historical sales + promo data', process: 'AI demand forecast', output: 'Optimized purchase orders', valueAdded: '3.2 hrs', nonValue: '18.4 hrs', improvement: 'Automate order trigger from forecast' },
  { stream: 'Demand-to-Replenishment', input: 'Store-level sell-through', process: 'Replenishment signal generation', output: 'SKU-level reorder signals', valueAdded: '1.8 hrs', nonValue: '12.2 hrs', improvement: 'Direct integration with ERP' },
  { stream: 'Promo-to-Forecast', input: 'Promo calendar + baseline', process: 'Promo uplift modeling', output: 'Adjusted forecast', valueAdded: '2.4 hrs', nonValue: '9.6 hrs', improvement: 'ML promo detection + auto-adjust' },
  { stream: 'Exception-to-Resolution', input: 'Forecast alerts', process: 'Planner investigation', output: 'Corrective action', valueAdded: '0.8 hrs', nonValue: '6.2 hrs', improvement: 'AI-suggested resolution + auto-escalation' },
  { stream: 'Report-to-Decision', input: 'KPI dashboards', process: 'Management review cycle', output: 'Strategic decisions', valueAdded: '2.0 hrs', nonValue: '22.0 hrs', improvement: 'Self-serve narrative AI, weekly auto-digest' },
];

const VALUE_LEVERS = [
  { lever: 'Forecast Accuracy Improvement', desc: 'Reduce MAPE from 18% to 6%', impact: '$1.2M/yr', confidence: 'High', timeline: 'Q2 2025' },
  { lever: 'Stockout Cost Reduction', desc: 'Reduce stockout events by 40%', impact: '$0.8M/yr', confidence: 'High', timeline: 'Q2 2025' },
  { lever: 'Inventory Holding Cost', desc: 'Reduce excess stock by 25%', impact: '$0.5M/yr', confidence: 'Medium', timeline: 'Q3 2025' },
  { lever: 'Planner Productivity', desc: 'Reduce manual time by 60%', impact: '$0.3M/yr', confidence: 'High', timeline: 'Q2 2025' },
  { lever: 'Waste / Obsolescence', desc: 'Reduce end-of-life write-offs by 30%', impact: '$0.2M/yr', confidence: 'Medium', timeline: 'Q4 2025' },
  { lever: 'Customer Service Level', desc: 'Improve fill rate from 91% to 97%', impact: '$0.1M/yr', confidence: 'Medium', timeline: 'Q3 2025' },
];

const BENEFITS_TRACKING = [
  { month: 'Jan', planned: 80, actual: 0 },
  { month: 'Feb', planned: 160, actual: 40 },
  { month: 'Mar', planned: 280, actual: 120 },
  { month: 'Apr', planned: 420, actual: 240 },
  { month: 'May', planned: 560, actual: 380 },
  { month: 'Jun', planned: 700, actual: 520 },
  { month: 'Jul', planned: 860, actual: 680 },
  { month: 'Aug', planned: 1040, actual: 820 },
  { month: 'Sep', planned: 1240, actual: 980 },
  { month: 'Oct', planned: 1460, actual: 1140 },
  { month: 'Nov', planned: 1680, actual: 1380 },
  { month: 'Dec', planned: 1900, actual: 1580 },
];

function ValueRealization() {
  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Planned Benefits', value: '$3.1M', color: '#3b82f6', sub: 'Full year target' },
          { label: 'Realized to Date', value: '$1.8M', color: '#10b981', sub: 'YTD actual' },
          { label: 'Realization Rate', value: '58%', color: '#8b5cf6', sub: 'vs plan' },
          { label: 'At Risk', value: '$0.4M', color: '#ef4444', sub: 'Contingency flagged' },
        ].map((c) => (
          <div key={c.label} style={{ border: `1px solid ${c.color}40`, borderRadius: 'var(--border-radius)', padding: '16px 18px', background: `${c.color}08` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Benefits tracking chart */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📈 Benefits Tracking ($K) — Planned vs Actual</span>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={BENEFITS_TRACKING} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}K`} />
              <Tooltip formatter={(v) => `$${v}K`} />
              <Legend />
              <Line type="monotone" dataKey="planned" name="Planned" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Value Streams */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🗺️ Value Stream Mapping</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Value Stream</Th><Th>Input</Th><Th>Process</Th><Th>Output</Th><Th>Value Added</Th><Th>Non-Value Added</Th><Th>Improvement</Th>
            </tr>
          </thead>
          <tbody>
            {VALUE_STREAMS.map((r) => (
              <tr key={r.stream}>
                <Td><strong>{r.stream}</strong></Td>
                <Td style={{ fontSize: 11 }}>{r.input}</Td>
                <Td style={{ fontSize: 11 }}>{r.process}</Td>
                <Td style={{ fontSize: 11 }}>{r.output}</Td>
                <Td style={{ color: '#10b981', fontWeight: 600, fontSize: 11 }}>{r.valueAdded}</Td>
                <Td style={{ color: '#ef4444', fontWeight: 600, fontSize: 11 }}>{r.nonValue}</Td>
                <Td style={{ fontSize: 11 }}>{r.improvement}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Value Levers */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🎯 Value Levers</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Value Lever</Th><Th>Description</Th><Th>Quantified Impact</Th><Th>Confidence</Th><Th>Timeline</Th>
            </tr>
          </thead>
          <tbody>
            {VALUE_LEVERS.map((r) => (
              <tr key={r.lever}>
                <Td><strong>{r.lever}</strong></Td>
                <Td style={{ fontSize: 11 }}>{r.desc}</Td>
                <Td style={{ color: '#10b981', fontWeight: 700 }}>{r.impact}</Td>
                <Td>{statusBadge(r.confidence)}</Td>
                <Td style={{ fontSize: 11 }}>{r.timeline}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Governance */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🏛️ Value Governance</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { title: 'Monthly Value Review', icon: '📅', desc: 'VP Operations chairs monthly benefits tracking meeting. P&L comparison vs baseline, exception escalation.' },
            { title: 'Escalation Path', icon: '⬆️', desc: 'Benefit Owner → Program Manager → VP Operations → CFO → Board. SLA: <48hrs for escalation response.' },
            { title: 'Benefit Owner Assignments', icon: '👤', desc: 'Each value lever has a named benefit owner accountable for delivery. Reviewed quarterly in performance cycle.' },
          ].map((g) => (
            <div key={g.title} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 16 }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{g.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{g.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 7: QUALITATIVE ANALYSIS
   ================================================================ */
const SWOT = {
  strengths: ['Strong domain expertise in CPG operations', 'Rich historical data spanning 7+ years', 'Executive sponsorship at VP level', 'Proven ML model with 92% accuracy on holdout', 'Existing data infrastructure in place'],
  weaknesses: ['Limited MLOps capability in current team', 'Siloed data across multiple legacy systems', 'Low initial user adoption (52% feature usage)', 'No formal model governance process', 'Dependency on single ML engineer'],
  opportunities: ['Industry trend toward AI-driven supply chains', 'Competitor disadvantage — most peers manual', 'Regulation driving transparency requirements', 'Cost of compute dropping 30%/year', 'Potential to license model to sister brands'],
  threats: ['Data privacy regulation (GDPR, CCPA) changes', 'Key talent attrition risk (ML engineer)', 'ERP system upgrade could break integrations', 'Model drift in volatile markets', 'Scope creep beyond core use case'],
};

const PESTEL = [
  { factor: 'Political', icon: '🏛️', items: [{ desc: 'AI regulation (EU AI Act)', impact: 'Medium' }, { desc: 'Trade policy affecting supply chains', impact: 'Low' }] },
  { factor: 'Economic', icon: '💰', items: [{ desc: 'Inflationary pressure on COGS', impact: 'High' }, { desc: 'Consumer spending shift to private label', impact: 'Medium' }] },
  { factor: 'Social', icon: '👥', items: [{ desc: 'Workforce upskilling demand', impact: 'High' }, { desc: 'Consumer transparency expectations', impact: 'Medium' }] },
  { factor: 'Technological', icon: '🔬', items: [{ desc: 'Gen-AI commoditizing forecasting tools', impact: 'High' }, { desc: 'Edge computing enabling real-time decisions', impact: 'Medium' }] },
  { factor: 'Environmental', icon: '🌿', items: [{ desc: 'ESG pressure reducing waste targets', impact: 'Medium' }, { desc: 'Carbon footprint of data centers', impact: 'Low' }] },
  { factor: 'Legal', icon: '⚖️', items: [{ desc: 'GDPR data retention requirements', impact: 'High' }, { desc: 'Model audit requirements emerging', impact: 'Medium' }] },
];

const PORTER = [
  { force: 'Supplier Power', icon: '🏭', strength: 'Medium', factors: ['3 major data vendors', 'Switching cost moderate', 'Open-source alternatives growing'] },
  { force: 'Buyer Power', icon: '🛒', strength: 'High', factors: ['Retailers control shelf space', 'Private label substitution rising', 'Price transparency online'] },
  { force: 'Competitive Rivalry', icon: '⚔️', strength: 'High', factors: ['Top 3 CPG peers investing in AI', '10+ niche AI forecasting vendors', 'Innovation pace accelerating'] },
  { force: 'Threat of Substitution', icon: '🔄', strength: 'Medium', factors: ['Manual planning remains viable small-scale', 'Generic ML models commoditizing', 'ERP vendors adding AI natively'] },
  { force: 'Threat of New Entry', icon: '🚪', strength: 'Low', factors: ['High data barrier to entry', 'Domain expertise required', 'Regulatory complexity filters startups'] },
];

const STAKEHOLDER_SENTIMENT = [
  { group: 'Champions', sentiment: '😃 Enthusiastic', concerns: 'Want faster rollout, more features', strategy: 'Leverage as internal advocates, early access' },
  { group: 'Supporters', sentiment: '🙂 Positive', concerns: 'Reliability of system, training timing', strategy: 'Regular progress updates, quick wins' },
  { group: 'Neutral', sentiment: '😐 Wait and see', concerns: 'Does it actually work? ROI unclear?', strategy: 'Demonstrate value with live data, involve in testing' },
  { group: 'Skeptics', sentiment: '😕 Doubtful', concerns: 'Accuracy concerns, job impact fears', strategy: '1:1 engagement, address concerns directly, pilot data' },
  { group: 'Resistors', sentiment: '😠 Opposed', concerns: 'Loss of control, distrust of AI', strategy: 'Executive intervention, include in design decisions' },
];

const RISK_MATRIX_DATA = [
  { id: 'R1', risk: 'Data quality issues', likelihood: 4, impact: 4, color: '#ef4444' },
  { id: 'R2', risk: 'Key talent loss', likelihood: 2, impact: 5, color: '#ef4444' },
  { id: 'R3', risk: 'Low user adoption', likelihood: 3, impact: 4, color: '#ef4444' },
  { id: 'R4', risk: 'ERP integration failure', likelihood: 2, impact: 4, color: '#f59e0b' },
  { id: 'R5', risk: 'Model drift', likelihood: 3, impact: 3, color: '#f59e0b' },
  { id: 'R6', risk: 'Regulatory change', likelihood: 2, impact: 3, color: '#f59e0b' },
  { id: 'R7', risk: 'Scope creep', likelihood: 4, impact: 2, color: '#f59e0b' },
  { id: 'R8', risk: 'Budget overrun', likelihood: 2, impact: 2, color: '#10b981' },
  { id: 'R9', risk: 'Security breach', likelihood: 1, impact: 5, color: '#f59e0b' },
  { id: 'R10', risk: 'Vendor lock-in', likelihood: 2, impact: 2, color: '#10b981' },
];

function RiskMatrix() {
  return (
    <div style={{ position: 'relative', marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, position: 'relative' }}>
        {[5, 4, 3, 2, 1].map((likel) =>
          [1, 2, 3, 4, 5].map((imp) => {
            const score = likel * imp;
            const bg = score >= 15 ? '#fee2e2' : score >= 8 ? '#fef3c7' : '#d1fae5';
            const risks = RISK_MATRIX_DATA.filter((r) => r.likelihood === likel && r.impact === imp);
            return (
              <div key={`${likel}-${imp}`} style={{ height: 64, background: bg, border: '1px solid #e5e7eb', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                {risks.map((r) => (
                  <div key={r.id} style={{ fontSize: 9, background: r.color, color: '#fff', borderRadius: 4, padding: '1px 4px', margin: 1, textAlign: 'center', fontWeight: 700 }} title={r.risk}>{r.id}</div>
                ))}
              </div>
            );
          })
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
        {['Low Impact', '', '', '', 'High Impact'].map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Risk Legend:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {RISK_MATRIX_DATA.map((r) => (
            <span key={r.id} style={{ fontSize: 10, background: r.color + '20', color: r.color === '#10b981' ? '#065f46' : r.color === '#f59e0b' ? '#92400e' : '#991b1b', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
              {r.id}: {r.risk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function QualitativeAnalysis() {
  return (
    <div>
      {/* SWOT */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">⚡ SWOT Analysis</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Strengths', key: 'strengths', bg: '#d1fae5', color: '#065f46', icon: '💪' },
            { label: 'Weaknesses', key: 'weaknesses', bg: '#fee2e2', color: '#991b1b', icon: '⚠️' },
            { label: 'Opportunities', key: 'opportunities', bg: '#dbeafe', color: '#1e40af', icon: '🚀' },
            { label: 'Threats', key: 'threats', bg: '#fef3c7', color: '#92400e', icon: '⛔' },
          ].map((q) => (
            <div key={q.label} style={{ background: q.bg, borderRadius: 'var(--border-radius)', padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: q.color, marginBottom: 10 }}>{q.icon} {q.label}</div>
              {SWOT[q.key].map((item) => (
                <div key={item} style={{ fontSize: 12, color: q.color, marginBottom: 6, paddingLeft: 14, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, fontWeight: 700 }}>•</span>{item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* PESTEL */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🌐 PESTEL Analysis</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {PESTEL.map((p) => (
            <div key={p.factor} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{p.icon} {p.factor}</div>
              {p.items.map((item) => (
                <div key={item.desc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11 }}>{item.desc}</span>
                  {statusBadge(item.impact)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Porter's Five Forces */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🏆 Porter's Five Forces</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {PORTER.map((p) => (
            <div key={p.force} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{p.force}</div>
              <div style={{ marginBottom: 8 }}>{statusBadge(p.strength)}</div>
              {p.factors.map((f) => (
                <div key={f} style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textAlign: 'left', paddingLeft: 8, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{f}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Stakeholder Sentiment */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">💬 Stakeholder Sentiment Analysis</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Stakeholder Group</Th><Th>Sentiment</Th><Th>Key Concerns</Th><Th>Engagement Strategy</Th>
            </tr>
          </thead>
          <tbody>
            {STAKEHOLDER_SENTIMENT.map((r) => (
              <tr key={r.group}>
                <Td><strong>{r.group}</strong></Td>
                <Td style={{ fontSize: 13 }}>{r.sentiment}</Td>
                <Td style={{ fontSize: 11 }}>{r.concerns}</Td>
                <Td style={{ fontSize: 11 }}>{r.strategy}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Risk Matrix */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🎯 Risk Assessment Matrix (Likelihood × Impact)</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginRight: 4 }}>← High Likelihood / Low Likelihood →</div>
              <div style={{ flex: 1 }}><RiskMatrix /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-TAB 8: QUANTITATIVE ANALYSIS
   ================================================================ */
const STATS_SUMMARY = [
  { metric: 'Weekly Sales ($K)', mean: 842, median: 798, std: 214, cv: '25.4%', skewness: 0.62 },
  { metric: 'Forecast Error (MAPE %)', mean: 12.4, median: 9.8, std: 8.2, cv: '66.1%', skewness: 1.45 },
  { metric: 'Stockout Events / Week', mean: 4.2, median: 3.0, std: 3.8, cv: '90.5%', skewness: 1.82 },
  { metric: 'Inventory Days on Hand', mean: 28.4, median: 26.2, std: 9.1, cv: '32.0%', skewness: 0.41 },
  { metric: 'Promo Uplift (%)', mean: 34.2, median: 28.4, std: 22.1, cv: '64.6%', skewness: 0.88 },
  { metric: 'Order Fill Rate (%)', mean: 91.4, median: 93.1, std: 5.2, cv: '5.7%', skewness: -1.12 },
];

const HYPOTHESIS_TESTS = [
  { hypothesis: 'AI forecast accuracy > manual (MAPE < 10%)', test: 'One-sample t-test', pValue: '0.0023', result: 'Pass', implication: 'AI model meets accuracy threshold' },
  { hypothesis: 'Promo uplift differs by region', test: 'One-way ANOVA', pValue: '0.0341', result: 'Pass', implication: 'Regional promotion strategies needed' },
  { hypothesis: 'Forecast error is normally distributed', test: 'Shapiro-Wilk', pValue: '0.0812', result: 'Fail', implication: 'Use non-parametric methods for error analysis' },
  { hypothesis: 'Stockouts correlate with forecast error', test: 'Pearson correlation', pValue: '<0.0001', result: 'Pass', implication: 'Improving accuracy directly reduces stockouts' },
  { hypothesis: 'Override rate differs by planner', test: 'Chi-square test', pValue: '0.0089', result: 'Pass', implication: 'Planner-specific coaching required' },
  { hypothesis: 'Sales are seasonal (weekly pattern)', test: 'Augmented Dickey-Fuller', pValue: '0.0012', result: 'Pass', implication: 'Include day-of-week as feature' },
  { hypothesis: 'Model accuracy stable over 12 months', test: 'CUSUM control chart', pValue: '0.1240', result: 'Fail', implication: 'Monthly retraining required to prevent drift' },
  { hypothesis: 'Inventory reduction = cost savings (linear)', test: 'Linear regression', pValue: '0.0001', result: 'Pass', implication: 'R²=0.87 confirms strong relationship' },
];

const TORNADO_DATA = [
  { variable: 'Forecast Accuracy +5pp', low: -120, high: 420 },
  { variable: 'Adoption Rate +10%', low: -80, high: 310 },
  { variable: 'Data Quality +15%', low: -60, high: 240 },
  { variable: 'Promo Depth ±20%', low: -150, high: 200 },
  { variable: 'Model Complexity', low: -40, high: 140 },
  { variable: 'Infrastructure Cost ±30%', low: -90, high: 90 },
].sort((a, b) => (b.high - b.low) - (a.high - a.low));

const MONTE_CARLO = (() => {
  const data = [];
  for (let bucket = -50; bucket <= 250; bucket += 20) {
    const center = 120;
    const spread = 60;
    const freq = Math.round(1000 * Math.exp(-0.5 * Math.pow((bucket - center) / spread, 2)) / (spread * Math.sqrt(2 * Math.PI)) * 20);
    data.push({ roi: `${bucket}%`, frequency: Math.max(0, freq) });
  }
  return data;
})();

const SCENARIOS = [
  { scenario: 'Best Case', prob: '20%', revenue: '+$5.2M', cost: '-$1.8M', net: '+$3.4M', color: '#10b981' },
  { scenario: 'Base Case', prob: '55%', revenue: '+$3.1M', cost: '-$0.9M', net: '+$2.2M', color: '#3b82f6' },
  { scenario: 'Worst Case', prob: '20%', revenue: '+$0.8M', cost: '+$0.2M', net: '+$0.6M', color: '#f59e0b' },
  { scenario: 'Black Swan', prob: '5%', revenue: '-$0.5M', cost: '+$1.2M', net: '-$1.7M', color: '#ef4444' },
];

const CORRELATION_MATRIX = [
  { metric: 'Revenue ($K)', sales: 1.00, accuracy: 0.74, stockouts: -0.68, inventory: 0.42, promo: 0.58 },
  { metric: 'Forecast Accuracy', sales: 0.74, accuracy: 1.00, stockouts: -0.82, inventory: 0.35, promo: 0.21 },
  { metric: 'Stockout Events', sales: -0.68, accuracy: -0.82, stockouts: 1.00, inventory: -0.44, promo: -0.18 },
  { metric: 'Inventory DoH', sales: 0.42, accuracy: 0.35, stockouts: -0.44, inventory: 1.00, promo: 0.12 },
  { metric: 'Promo Uplift', sales: 0.58, accuracy: 0.21, stockouts: -0.18, inventory: 0.12, promo: 1.00 },
];

const corrColor = (v) => {
  if (v === 1.00) return { bg: '#e5e7eb', color: '#374151' };
  if (v >= 0.7) return { bg: '#d1fae5', color: '#065f46' };
  if (v >= 0.4) return { bg: '#dbeafe', color: '#1e40af' };
  if (v >= 0) return { bg: '#f3f4f6', color: '#374151' };
  if (v >= -0.4) return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#fee2e2', color: '#991b1b' };
};

function QuantitativeAnalysis() {
  return (
    <div>
      {/* Stats Summary */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 Statistical Summary of Key Business Metrics</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Metric</Th><Th>Mean</Th><Th>Median</Th><Th>Std Dev</Th><Th>CV</Th><Th>Skewness</Th>
            </tr>
          </thead>
          <tbody>
            {STATS_SUMMARY.map((r) => (
              <tr key={r.metric}>
                <Td><strong>{r.metric}</strong></Td>
                <Td>{r.mean}</Td>
                <Td>{r.median}</Td>
                <Td>{r.std}</Td>
                <Td>{r.cv}</Td>
                <Td style={{ color: Math.abs(r.skewness) > 1 ? '#ef4444' : '#374151' }}>{r.skewness > 0 ? '+' : ''}{r.skewness}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Hypothesis Tests */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🧪 Hypothesis Testing Results</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Hypothesis</Th><Th>Test Used</Th><Th>p-value</Th><Th>Result</Th><Th>Business Implication</Th>
            </tr>
          </thead>
          <tbody>
            {HYPOTHESIS_TESTS.map((r) => (
              <tr key={r.hypothesis}>
                <Td style={{ fontSize: 11 }}>{r.hypothesis}</Td>
                <Td style={{ fontSize: 11 }}>{r.test}</Td>
                <Td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.pValue}</Td>
                <Td>{statusBadge(r.result)}</Td>
                <Td style={{ fontSize: 11 }}>{r.implication}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Tornado Chart + Monte Carlo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🌪️ Sensitivity (Tornado) Chart ($K Impact on ROI)</span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TORNADO_DATA} layout="vertical" margin={{ top: 4, right: 20, left: 120, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}K`} />
                <YAxis type="category" dataKey="variable" tick={{ fontSize: 10 }} width={115} />
                <Tooltip formatter={(v) => `$${v}K`} />
                <Bar dataKey="high" name="Upside" fill="#10b981" />
                <Bar dataKey="low" name="Downside" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🎲 Monte Carlo — ROI Distribution (1,000 simulations)</span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTE_CARLO} margin={{ top: 4, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="roi" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="frequency" name="Simulations" fill="#8b5cf6" />
                <ReferenceLine x="20%" stroke="#ef4444" label={{ value: 'P10', fontSize: 9 }} />
                <ReferenceLine x="100%" stroke="#3b82f6" label={{ value: 'P50', fontSize: 9 }} />
                <ReferenceLine x="180%" stroke="#10b981" label={{ value: 'P90', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            {[{ label: 'P10 (Pessimistic)', value: '22%', color: '#ef4444' }, { label: 'P50 (Base)', value: '118%', color: '#3b82f6' }, { label: 'P90 (Optimistic)', value: '196%', color: '#10b981' }].map((p) => (
              <div key={p.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.value} ROI</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🎬 Scenario Analysis</span>
        </div>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Scenario</Th><Th>Probability</Th><Th>Revenue Impact</Th><Th>Cost Impact</Th><Th>Net Impact</Th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((r) => (
              <tr key={r.scenario}>
                <Td><span style={{ fontWeight: 700, color: r.color }}>{r.scenario}</span></Td>
                <Td>{r.prob}</Td>
                <Td style={{ color: r.revenue.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{r.revenue}</Td>
                <Td style={{ color: r.cost.startsWith('-') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{r.cost}</Td>
                <Td style={{ fontWeight: 700, color: r.net.startsWith('+') ? '#10b981' : '#ef4444', fontSize: 14 }}>{r.net}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Correlation Matrix */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🔗 Correlation Matrix (Key Business Metrics)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 500 }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 10px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>Metric</th>
                {['Revenue', 'Accuracy', 'Stockouts', 'Inv. DoH', 'Promo Uplift'].map((h) => (
                  <th key={h} style={{ padding: '6px 10px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, textAlign: 'center', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CORRELATION_MATRIX.map((row) => (
                <tr key={row.metric}>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11 }}>{row.metric}</td>
                  {[row.sales, row.accuracy, row.stockouts, row.inventory, row.promo].map((v, i) => {
                    const c = corrColor(v);
                    return (
                      <td key={i} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', background: c.bg, color: c.color, fontWeight: 600 }}>{v.toFixed(2)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
          {[{ label: 'Strong positive (≥0.7)', bg: '#d1fae5', color: '#065f46' }, { label: 'Moderate (0.4–0.7)', bg: '#dbeafe', color: '#1e40af' }, { label: 'Weak (0–0.4)', bg: '#f3f4f6', color: '#374151' }, { label: 'Moderate negative', bg: '#fef3c7', color: '#92400e' }, { label: 'Strong negative (≤-0.4)', bg: '#fee2e2', color: '#991b1b' }].map((l) => (
            <span key={l.label} style={{ padding: '2px 8px', borderRadius: 8, background: l.bg, color: l.color, fontWeight: 600 }}>{l.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function ProcessStrategyTab({ process, dept }) {
  const [activeSubTab, setActiveSubTab] = useState('people');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'people': return <PeopleStrategy />;
      case 'process': return <ProcessStrategy />;
      case 'profit': return <ProfitROI />;
      case 'technology': return <TechStrategy />;
      case 'change': return <ChangeManagement />;
      case 'value': return <ValueRealization />;
      case 'qualitative': return <QualitativeAnalysis />;
      case 'quant': return <QuantitativeAnalysis />;
      default: return null;
    }
  };

  return (
    <TabShell
      tabName="strategy"
      title="Strategy · 4P framework + 12-month roadmap"
      phase="Orient"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P2"
      information="4P (people · process · profit · tech) · dependencies · risks"
      operation="read-only · per-proc 4P pending"
      accent="#8b5cf6"
      todos={[]}
    >
    <div>
      {/* Header */}
      <div className="content-section" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>♟️ Strategy Framework — {process?.name || 'CPG Demand Forecasting'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Comprehensive people, process, profit, technology, change management, value realization, and analytical strategy</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[{ label: 'ROI', value: '312%' }, { label: 'Payback', value: '14 mo' }, { label: 'Maturity', value: 'L2→L4' }, { label: 'Readiness', value: '49%' }].map((kpi) => (
              <div key={kpi.label} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '6px 12px', textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{kpi.label}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-primary)' }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)' }}>
        {STRATEGY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: activeSubTab === tab.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: activeSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeSubTab === tab.id ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
    </TabShell>
  );
}
