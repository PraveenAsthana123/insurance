import { useState } from 'react';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* =========================================================
   PROBLEM & USE CASE TAB — Data keyed by process ID
   ========================================================= */

const PROBLEM_DATA = {
  'demand-forecasting': {
    statement: {
      what: 'Inaccurate demand forecasts cause excess inventory or stockouts, leading to millions in lost revenue and write-offs annually across CPG SKUs and distribution channels.',
      why: 'A 5% improvement in forecast accuracy translates to ~$2M in reduced working capital and a 12% decrease in stockouts — directly impacting revenue, service levels, and customer satisfaction.',
      who: 'Demand Planners, Supply Chain Managers, Finance Analysts, Category Managers, Distribution Centre Operators, and Retail Partners.',
      painPoints: [
        'Manual Excel-based forecasting is error-prone and takes 2–3 days per cycle',
        'No seasonal or promotional uplift modelled — planners add adjustments by hand',
        'Forecast is at brand/week level; no SKU-level or store-level granularity',
        'Post-event review is manual; no automated accuracy tracking or drift detection',
        'No confidence intervals — planners cannot quantify uncertainty for budget planning',
        'New SKU cold-start has no data-driven approach; relies entirely on planner judgment',
      ],
    },
    fiveW: {
      who: ['Demand Planners (primary users)', 'Supply Chain Managers (decisions)', 'Finance & FP&A (budget planning)', 'Category Managers (assortment)', 'Distribution Centre staff (execution)', 'Retail Partners (service level expectations)'],
      what: ['30-day rolling SKU-level demand forecast', 'Promotional uplift quantification', 'Stockout risk scoring per SKU/store', 'Confidence bands (P10/P50/P90)', 'Model drift detection and retraining triggers'],
      when: ['Forecast generated every Monday (weekly cycle)', 'Promotional events require ad-hoc runs 2 weeks ahead', 'Holiday season planning starts 8 weeks in advance', 'New product launches need cold-start forecast at listing date'],
      where: ['Across 5 distribution regions (North, South, East, West, Central)', '3,200 active SKUs across 8 product categories', '850+ retail locations and 3 DTC channels', 'ERP integration: SAP S/4HANA and Oracle Planning Cloud'],
      why: ['Manual process cannot scale with SKU proliferation (+18% YoY)', 'Competitor AI adoption is eroding service-level advantage', 'Stockout rate at 4.3% vs industry target of <2%', 'CFO mandated 20% working capital reduction by Q4 2025'],
    },
    asisTobes: [
      { dimension: 'People', asis: '8 demand planners, manual adjustments, gut-feel for promotions', tobe: '3 planners overseeing AI outputs, exception-based management' },
      { dimension: 'Process', asis: '3-day weekly cycle, Excel-based, highly manual, no version control', tobe: '4-hour automated run, planner reviews exceptions only, full audit trail' },
      { dimension: 'Technology', asis: 'Excel + SAP extract, no ML, email-based collaboration', tobe: 'XGBoost + LightGBM ensemble, feature store, REST API to ERP' },
      { dimension: 'Data', asis: 'Brand/week level, 18 months history, no external signals', tobe: 'SKU/store/day level, 4 years history, weather, events, promotions' },
      { dimension: 'Cost', asis: '$340K/year in planner time + $2.1M in excess inventory write-offs', tobe: '$120K/year planner time + <$400K inventory write-offs (target)' },
      { dimension: 'Speed', asis: '3 days to generate a full forecast cycle', tobe: '<4 hours automated + <1 hour planner review' },
      { dimension: 'Accuracy', asis: 'MAPE 18–24% (brand/week level)', tobe: 'MAPE <10% (SKU/store/week level target)' },
    ],
    useCases: [
      {
        id: 'UC-01', title: 'Weekly SKU Demand Forecast', priority: 'P0',
        description: 'Generate 30-day rolling demand forecast at SKU × store × week granularity with confidence bands.',
        actors: ['Demand Planner', 'Forecast Engine', 'ERP System'],
        preconditions: ['Historical sales data ≥12 months available', 'Promotional calendar loaded', 'Feature pipeline executed'],
        postconditions: ['Forecast written to data warehouse', 'Alert fired if MAPE >12% on validation set', 'PDF report generated'],
      },
      {
        id: 'UC-02', title: 'Promotional Uplift Forecast', priority: 'P0',
        description: 'Predict incremental volume during promotional events (TPR, displays, coupons) for budget planning.',
        actors: ['Trade Marketing Manager', 'Promo Uplift Model', 'Category Manager'],
        preconditions: ['Promo event defined with depth and mechanic', 'Baseline forecast generated', 'Historical promo lift data available'],
        postconditions: ['Uplift volume quantified per SKU', 'ROI estimate produced', 'Cannibalization impact flagged'],
      },
      {
        id: 'UC-03', title: 'Stockout Risk Alert', priority: 'P1',
        description: 'Score each SKU-store combination for stockout risk given the current forecast vs. inventory on hand.',
        actors: ['Supply Chain Manager', 'Risk Scoring Engine', 'DC Operations'],
        preconditions: ['Current inventory levels synced from WMS', 'Demand forecast available', 'Lead time data loaded'],
        postconditions: ['Risk ranked list published to dashboard', 'Replenishment order recommendations generated', 'Planner notified for top-20 at-risk SKUs'],
      },
      {
        id: 'UC-04', title: 'New SKU Cold Start', priority: 'P1',
        description: 'Produce a launch forecast for a new SKU with no sales history using analogous SKU matching.',
        actors: ['Category Manager', 'Cold Start Model', 'Demand Planner'],
        preconditions: ['New SKU attributes defined (category, pack size, price point)', 'Analogous SKU selected or auto-matched'],
        postconditions: ['12-week launch forecast produced', 'Uncertainty flag shown (cold start)', 'Model auto-updated after first 4 weeks of actuals'],
      },
      {
        id: 'UC-05', title: 'Forecast Accuracy Audit', priority: 'P2',
        description: 'Compare forecast vs. actuals on a rolling 4-week holdout; track drift and trigger retraining.',
        actors: ['MLOps Engineer', 'Accuracy Monitor', 'Demand Planner'],
        preconditions: ['Actuals available for prior 4-week window', 'Forecast archive maintained'],
        postconditions: ['MAPE / BIAS / SMAPE metrics reported', 'Drift alert fired if MAPE rises >15%', 'Retraining job queued if threshold breached'],
      },
      {
        id: 'UC-06', title: 'What-If Scenario Planner', priority: 'P2',
        description: 'Allow planners to adjust promo depth, price, or external shocks and see demand impact instantly.',
        actors: ['Demand Planner', 'Finance Analyst', 'Scenario Engine'],
        preconditions: ['Baseline forecast available', 'Scenario parameters defined by user'],
        postconditions: ['Scenario demand curve generated', 'Financial P&L impact shown', 'Scenario saved and exportable'],
      },
    ],
    scenarios: [
      {
        id: 'S1', title: 'Normal Demand Week', trigger: 'No promotional events, no holidays, stable supply',
        expected: 'Model uses baseline demand pattern; ensemble of XGBoost + LightGBM weighted by recent accuracy.',
        kpiImpact: 'MAPE target <10%, Fill Rate >98%, Planner time <1 hr/week',
        aiResponse: 'Produces 30-day rolling forecast with P10/P50/P90 bands. Auto-approved if validation MAPE <8%.',
      },
      {
        id: 'S2', title: 'Promotion Week', trigger: 'TPR event with 20% price reduction on selected SKUs',
        expected: 'Promo uplift model activates. Historical lift multipliers applied. Cannibalization cross-checked.',
        kpiImpact: 'Uplift accuracy ±8% of actual; promotion ROI report generated within 2 hours of event end',
        aiResponse: 'Promo feature layer injected into feature store. Ensemble model retrained with promo flag. Residual volume attributed to promo vs. baseline.',
      },
      {
        id: 'S3', title: 'Holiday Season', trigger: 'Christmas / Diwali / Eid seasonal event, 8 weeks ahead',
        expected: 'Holiday demand spike modelled with 3-year seasonal decomposition; confidence bands widened ±20%.',
        kpiImpact: 'Avoid stockouts on top 200 holiday SKUs; excess inventory buffer optimised to <5% overage',
        aiResponse: 'Seasonal model weights increased. External calendar API enriches features. Planner override UI enabled for high-value SKUs.',
      },
      {
        id: 'S4', title: 'New Product Launch', trigger: 'New SKU listed with no sales history',
        expected: 'Cold-start model matches analogous SKU by category, pack size, and price index. 12-week ramp forecast produced.',
        kpiImpact: 'First-4-week forecast accuracy within 20% of actuals; model self-corrects by week 5',
        aiResponse: 'Analogous SKU auto-selected via cosine similarity on attribute embeddings. Bayesian prior set from analogous; updated weekly with actuals.',
      },
      {
        id: 'S5', title: 'Supply Disruption', trigger: 'Key ingredient shortage or DC outage, demand constrained',
        expected: 'Constrained forecast generated; unfulfillable volume reallocated to alternative SKUs or channels.',
        kpiImpact: 'Lost sales quantified within 4 hours; alternative SKU uplift forecast generated to partially offset shortfall',
        aiResponse: 'Supply constraint flag injected into planning horizon. Substitution demand model triggered for related SKUs. Alert escalated to Supply Chain Manager dashboard.',
      },
    ],
    value: {
      business: [
        { label: 'Revenue Protection', value: '+$3.2M/yr', detail: 'Avoiding stockouts on high-velocity SKUs' },
        { label: 'Inventory Reduction', value: '-$1.8M WC', detail: '20% reduction in excess stock write-offs' },
        { label: 'Planner Efficiency', value: '60% time saved', detail: 'From 3 days → <4 hours per weekly cycle' },
        { label: 'Service Level Improvement', value: '+2.3pp', detail: 'Fill rate from 95.7% → 98%+ target' },
      ],
      ai: [
        { label: 'Predict', detail: '30-day SKU-level demand with 90% confidence bands' },
        { label: 'Decide', detail: 'Auto-approve forecasts within accuracy gate; flag exceptions' },
        { label: 'Explain', detail: 'SHAP feature importance per SKU — planner-readable' },
        { label: 'Automate', detail: 'End-to-end pipeline: ingest → train → forecast → push to ERP' },
      ],
      operational: [
        { label: 'Speed', value: '18x faster', detail: '3 days → 4 hours forecast cycle' },
        { label: 'Accuracy', value: 'MAPE <10%', detail: 'From 18–24% manual baseline' },
        { label: 'Scale', value: '3,200 SKUs', detail: 'From brand-level to SKU×store×week' },
        { label: 'Coverage', value: '850+ stores', detail: 'Full network vs. top-50 manual coverage' },
      ],
    },
  },

  '__default__': {
    statement: {
      what: 'The current process relies on manual, rule-based methods that cannot scale, adapt to changing patterns, or provide decision-support at the speed the business requires.',
      why: 'Operational inefficiency is costing the organisation in time, headcount, and quality of decisions — introducing AI will unlock significant efficiency gains and risk reduction.',
      who: 'Business Analysts, Operations Managers, Data Teams, Finance, and senior leadership who rely on the outputs.',
      painPoints: [
        'Manual process is slow and inconsistent — heavily dependent on individual expertise',
        'No ability to detect patterns across thousands of variables simultaneously',
        'No confidence scoring — users cannot distinguish reliable outputs from guesses',
        'Process cannot scale with business growth without proportional headcount increase',
        'Audit trail is incomplete; difficult to explain decisions to stakeholders',
      ],
    },
    fiveW: {
      who: ['Business Analysts', 'Operations Managers', 'Data Teams', 'Finance', 'Leadership'],
      what: ['Automate manual decision-making process', 'Provide data-driven insights at scale', 'Generate confidence intervals and explainability'],
      when: ['Daily/weekly operational cycles', 'Ad-hoc business queries', 'Quarterly planning cycles'],
      where: ['Across primary business units', 'Core ERP and data warehouse systems', 'Reporting and planning tools'],
      why: ['Manual process cannot keep pace with data volume growth', 'Competitor adoption of AI is eroding market advantage', 'Board mandate for digital transformation'],
    },
    asisTobes: [
      { dimension: 'People', asis: 'Large team, manual work, expert-dependent', tobe: 'Smaller team managing exceptions, AI-assisted decisions' },
      { dimension: 'Process', asis: 'Manual, multi-day cycle, inconsistent quality', tobe: 'Automated pipeline, hours not days, consistent quality' },
      { dimension: 'Technology', asis: 'Spreadsheets, manual exports, email-based', tobe: 'ML pipeline, API integrations, real-time dashboard' },
      { dimension: 'Data', asis: 'Aggregated, delayed, incomplete', tobe: 'Granular, real-time, enriched with external signals' },
      { dimension: 'Cost', asis: 'High headcount cost, frequent errors and rework', tobe: 'Lower ops cost, fewer errors, faster time-to-insight' },
      { dimension: 'Speed', asis: 'Days per cycle', tobe: 'Hours per cycle' },
      { dimension: 'Accuracy', asis: 'Variable, person-dependent', tobe: 'Consistent, measurable, continuously improving' },
    ],
    useCases: [
      {
        id: 'UC-01', title: 'Primary Use Case', priority: 'P0',
        description: 'Core AI-powered automation of the primary business process.',
        actors: ['Business User', 'AI Engine', 'Backend System'],
        preconditions: ['Historical data available', 'Model trained and validated'],
        postconditions: ['Output generated', 'Results published to dashboard', 'Audit trail recorded'],
      },
    ],
    scenarios: [
      {
        id: 'S1', title: 'Normal Operations', trigger: 'Standard business cycle with no anomalies',
        expected: 'AI model produces standard output within SLA.',
        kpiImpact: 'Target accuracy met; operational KPIs within range.',
        aiResponse: 'Standard inference pipeline runs; results auto-published if within confidence threshold.',
      },
    ],
    value: {
      business: [
        { label: 'Efficiency Gain', value: '50%+', detail: 'Reduction in manual processing time' },
        { label: 'Cost Reduction', value: '30%', detail: 'Lower operational cost per decision' },
      ],
      ai: [
        { label: 'Predict', detail: 'Data-driven forecasting replacing manual estimation' },
        { label: 'Explain', detail: 'SHAP-based explainability for user trust' },
      ],
      operational: [
        { label: 'Speed', value: '5x faster', detail: 'Days to hours' },
        { label: 'Scale', value: '10x coverage', detail: 'More entities with same team size' },
      ],
    },
  },
};

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function SectionHeader({ title, subtitle }) {
  return (
    <div className="content-section-header">
      <span className="content-section-title">{title}</span>
      {subtitle && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{subtitle}</span>}
    </div>
  );
}

function Tag({ children, color = 'var(--accent-primary)', bg }) {
  const bgVal = bg || `${color}18`;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: bgVal, color, fontSize: 10, fontWeight: 700,
      border: `1px solid ${color}33`,
    }}>{children}</span>
  );
}

function ProblemStatement({ stmt }) {
  const cards = [
    { icon: '❓', label: 'What is the Problem?', text: stmt.what, color: 'var(--accent-primary)' },
    { icon: '💥', label: 'Why Does It Matter?', text: stmt.why, color: 'var(--accent-danger)' },
    { icon: '👥', label: 'Who is Affected?', text: stmt.who, color: 'var(--accent-purple)' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
            background: `${c.color}08`, border: `1px solid ${c.color}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: c.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{c.text}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔴</span> Current Pain Points
        </div>
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stmt.painPoints.map((pt, i) => (
            <li key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{pt}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FiveWGrid({ fiveW }) {
  const items = [
    { key: 'who', label: 'WHO', icon: '👥', color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.07)' },
    { key: 'what', label: 'WHAT', icon: '🎯', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.07)' },
    { key: 'when', label: 'WHEN', icon: '⏱️', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.07)' },
    { key: 'where', label: 'WHERE', icon: '📍', color: 'var(--accent-purple)', bg: 'rgba(139,92,246,0.07)' },
    { key: 'why', label: 'WHY', icon: '💡', color: 'var(--accent-pink)', bg: 'rgba(236,72,153,0.07)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
      {items.map((item) => (
        <div key={item.key} style={{
          padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
          background: item.bg, border: `1px solid ${item.color}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span style={{
              fontWeight: 800, fontSize: 13, color: item.color,
              letterSpacing: '0.08em',
            }}>{item.label}</span>
          </div>
          <ul style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {fiveW[item.key].map((pt, i) => (
              <li key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{pt}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AsIsToBeTable({ rows }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderRadius: 'var(--border-radius)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Dimension</div>
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.07)', fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>🔴 AS-IS (Current State)</div>
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.07)', fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>🟢 TO-BE (Target State)</div>

        {/* Rows */}
        {rows.map((row, i) => (
          <>
            <div key={`dim-${i}`} style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-color)' : 'none', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)', background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>{row.dimension}</div>
            <div key={`asis-${i}`} style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-color)' : 'none', borderLeft: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, background: i % 2 === 0 ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.06)' }}>{row.asis}</div>
            <div key={`tobe-${i}`} style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-color)' : 'none', borderLeft: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, background: i % 2 === 0 ? 'rgba(16,185,129,0.03)' : 'rgba(16,185,129,0.06)' }}>{row.tobe}</div>
          </>
        ))}
      </div>
    </div>
  );
}

const PRIORITY_COLORS = { P0: 'var(--accent-danger)', P1: 'var(--accent-warning)', P2: 'var(--accent-primary)' };

function UseCaseGrid({ cases }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
        {cases.map((uc) => {
          const isSelected = selected === uc.id;
          const pc = PRIORITY_COLORS[uc.priority] || 'var(--text-muted)';
          return (
            <div
              key={uc.id}
              onClick={() => setSelected(isSelected ? null : uc.id)}
              style={{
                padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
                border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: isSelected ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.15)' : 'var(--shadow-card)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{uc.id}</span>
                <Tag color={pc}>{uc.priority}</Tag>
              </div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginBottom: 6 }}>{uc.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{uc.description}</div>

              {isSelected && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actors</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {uc.actors.map((a, i) => <Tag key={i} color="var(--accent-purple)">{a}</Tag>)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pre-conditions</span>
                    <ul style={{ paddingLeft: 14, marginTop: 4 }}>
                      {uc.preconditions.map((p, i) => <li key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Post-conditions</span>
                    <ul style={{ paddingLeft: 14, marginTop: 4 }}>
                      {uc.postconditions.map((p, i) => <li key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 9, color: 'var(--accent-primary)', fontWeight: 600, marginTop: 4 }}>
                {isSelected ? '▲ Collapse' : '▼ View Details'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BusinessScenarios({ scenarios }) {
  const [activeId, setActiveId] = useState(scenarios[0]?.id);

  const colors = [
    'var(--accent-primary)', 'var(--accent-success)', 'var(--accent-warning)',
    'var(--accent-purple)', 'var(--accent-pink)',
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 'var(--spacing-md)' }}>
      {/* Sidebar list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {scenarios.map((s, i) => {
          const color = colors[i % colors.length];
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              style={{
                padding: '8px 12px', borderRadius: 'var(--border-radius)', border: '1px solid',
                borderColor: isActive ? color : 'var(--border-color)',
                background: isActive ? `${color}12` : 'var(--bg-card)',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 800, color: isActive ? color : 'var(--text-muted)', letterSpacing: '0.08em' }}>{s.id}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {scenarios.map((s, i) => {
        if (s.id !== activeId) return null;
        const color = colors[i % colors.length];
        return (
          <div key={s.id} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: `1px solid ${color}30`, background: `${color}06` }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginBottom: 12 }}>
              <span style={{ color }}>{s.id}</span>: {s.title}
            </div>
            {[
              { label: 'Trigger', value: s.trigger, icon: '⚡' },
              { label: 'Expected Behavior', value: s.expected, icon: '🎯' },
              { label: 'KPI Impact', value: s.kpiImpact, icon: '📊' },
              { label: 'AI Response', value: s.aiResponse, icon: '🤖' },
            ].map((row, ri) => (
              <div key={ri} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.9rem' }}>{row.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 20 }}>{row.value}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ValueProposition({ value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
      {/* Business Value */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-md)' }}>
          <span style={{ fontSize: '1.2rem' }}>💰</span>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--accent-success)' }}>Business Value</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {value.business.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--border-radius)', background: 'rgba(16,185,129,0.08)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)' }}>{v.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{v.detail}</div>
              </div>
              {v.value && <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--accent-success)', whiteSpace: 'nowrap', marginLeft: 8 }}>{v.value}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* AI Value */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-md)' }}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--accent-primary)' }}>AI Value</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {value.ai.map((v, i) => {
            const aiColors = ['var(--accent-primary)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-success)'];
            const c = aiColors[i % aiColors.length];
            return (
              <div key={i} style={{ padding: '10px', borderRadius: 'var(--border-radius)', background: `${c}10`, border: `1px solid ${c}25`, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: c, marginBottom: 4 }}>{v.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{v.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Value */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-md)' }}>
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--accent-purple)' }}>Operational Value</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {value.operational.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--border-radius)', background: 'rgba(139,92,246,0.08)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)' }}>{v.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{v.detail}</div>
              </div>
              {v.value && <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--accent-purple)', whiteSpace: 'nowrap', marginLeft: 8 }}>{v.value}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NEW SECTIONS: A–E
   ========================================================= */

const NOT_DOING_DATA = [
  { title: 'Real-time Store-level Replenishment', impact: 'DC teams manually calculate reorder quantities — 6-8 hour lag between signal and purchase order creation, causing avoidable stockouts.' },
  { title: 'Multi-echelon Inventory Optimisation', impact: 'Safety stock is set at DC level only — no cross-DC balancing or retail shelf optimisation, leaving $0.8M in avoidable holding costs.' },
  { title: 'Causal Machine Learning (Why demand changes)', impact: 'Model identifies that demand rose but cannot distinguish competitor OOS from genuine trend — causal inference not yet implemented.' },
  { title: 'New Market / Greenfield Forecast', impact: 'No capability to forecast demand for new geographies or new retail partners — currently 100% human estimation with high error rates.' },
  { title: 'Autonomous Promotional ROI Optimisation', impact: 'Promotional plans are drafted by Trade Marketing without AI input — post-hoc ROI analysis only, no upfront optimisation.' },
];

const DOING_DATA = [
  { title: 'Weekly SKU-level Demand Forecasting', status: 'Active', detail: 'XGBoost + LightGBM ensemble producing 30-day rolling forecasts for 3,200 SKUs across 850+ stores at SKU×store×week granularity.' },
  { title: 'Promotional Uplift Modelling', status: 'Active', detail: 'Promo uplift model quantifies incremental volume for trade promotions (TPR, displays, coupons) within 8% accuracy.' },
  { title: 'Stockout Risk Scoring', status: 'Active', detail: 'Risk engine scores each SKU-store daily, surfacing top-20 at-risk items to planners for proactive replenishment action.' },
  { title: 'New SKU Cold Start via Analogous SKU', status: 'Active', detail: 'Cosine similarity on product attributes finds the 3 most analogous SKUs — Bayesian prior set for launch forecast.' },
  { title: 'Drift Detection & Auto-Retraining', status: 'Planned', detail: 'PSI monitoring triggers automatic model retraining when feature drift exceeds 0.2 threshold — scheduled for Q3 2025.' },
];

const OBJECTIVES_DATA = [
  {
    title: 'Achieve <10% MAPE at SKU×store×week granularity by Q3 2025',
    specific:    'Reduce Mean Absolute Percentage Error from the current 18–24% to below 10% measured at SKU × store × week resolution.',
    measurable:  'MAPE tracked weekly in Grafana dashboard; alert fires if MAPE exceeds 10% for 2 consecutive weeks.',
    achievable:  'Industry benchmark for ML-based demand forecasting is 8–12% MAPE; current infrastructure and data quality support this target.',
    relevant:    'A 5% MAPE improvement translates to ~$2M reduction in working capital and 12% fewer stockouts — directly tied to CFO mandate.',
    timeBound:   'Target reached by 30 September 2025 (Q3 2025); intermediate milestone of <14% MAPE by Q2 2025.',
  },
  {
    title: 'Reduce forecast cycle time from 3 days to <4 hours by Q2 2025',
    specific:    'Fully automate the weekly forecast generation cycle — data ingestion → feature computation → inference → ERP push — with zero manual steps.',
    measurable:  'Cycle time logged in Airflow; P95 end-to-end time must be <4 hours measured over 8 consecutive weeks.',
    achievable:  'Pipeline prototype completed; primary bottleneck (ERP batch pull) resolved with OData streaming API.',
    relevant:    'Planner time freed from forecast generation can be redirected to exception management and scenario planning.',
    timeBound:   'Full automation deployed to production by 30 June 2025.',
  },
  {
    title: 'Reach 85% planner adoption rate by Q2 2025',
    specific:    'At least 85% of weekly forecast cycles require zero manual override by planners (i.e., planner approves forecast without editing).',
    measurable:  'Override rate tracked per planner per cycle; aggregate override rate reported monthly to VP Operations.',
    achievable:  'Current override rate 12%; target 8%; prior pilot showed override reduced to 6% after 4 weeks of model exposure.',
    relevant:    'High override rate signals low model trust — reducing it unlocks the full automation value and validates model quality.',
    timeBound:   'Sustained <8% override rate for 6 consecutive weeks by 30 June 2025.',
  },
  {
    title: 'Protect $3.5M in annual revenue by reducing high-velocity SKU stockouts to <2% by Q4 2025',
    specific:    'Reduce stockout rate on top-500 high-velocity SKUs from 4.3% to <2% — measured as percentage of SKU-store-weeks where on-shelf availability <95%.',
    measurable:  'Stockout rate computed weekly from WMS + POS data; tracked in KPI dashboard with drill-down by region and category.',
    achievable:  'Stockout risk scoring model now active; 6-month pilot showed 2.1pp reduction in stockout rate for pilot stores.',
    relevant:    'High-velocity SKU stockouts cause immediate lost revenue and long-term customer loyalty damage at retail.',
    timeBound:   'Target stockout rate <2% sustained for 8 weeks by 31 December 2025.',
  },
];

const PROPOSED_SOLUTION = {
  overview: 'The proposed solution is an end-to-end AI-powered demand intelligence platform that replaces the manual Excel-based forecasting process with a fully automated ML pipeline. The platform ingests data from SAP, Oracle, POS systems, and external signals (weather, promotions, social trends), engineers features in a centralised feature store, trains a stacking ensemble of XGBoost, LightGBM, and Prophet models, and delivers SKU-level forecasts with explainability via a planner-facing dashboard and ERP API push.',
  components: [
    { component: 'Data Ingestion Layer',     tech: 'Kafka + Airflow',      purpose: 'Stream ERP/POS events; schedule batch pulls from WMS and reference data', priority: 'P0' },
    { component: 'Feature Store',            tech: 'Feast + Redis + PG',   purpose: 'Centralised feature registry with online (Redis) and offline (PG) serving', priority: 'P0' },
    { component: 'Forecast Engine',          tech: 'XGBoost + LightGBM + Prophet', purpose: 'Stacking ensemble for demand forecasting at SKU×store×week granularity', priority: 'P0' },
    { component: 'Explainability Layer',     tech: 'SHAP',                 purpose: 'Feature importance per SKU — planner-readable "why" for every forecast', priority: 'P0' },
    { component: 'MLOps Platform',           tech: 'MLflow + Prometheus',  purpose: 'Experiment tracking, model registry, drift detection, auto-retraining', priority: 'P1' },
    { component: 'Planner Dashboard',        tech: 'React + Recharts',     purpose: 'Exception management UI, override workflow, scenario planner', priority: 'P1' },
    { component: 'ERP Integration API',      tech: 'FastAPI + OData',      purpose: 'Push approved forecasts to SAP S/4HANA Planning module automatically', priority: 'P1' },
    { component: 'Audit & Compliance Layer', tech: 'PostgreSQL + dbt',     purpose: 'Full lineage, override log, model decision record for governance', priority: 'P2' },
  ],
  architecture: 'Source systems (SAP, Oracle, POS, WMS) publish events to Kafka and Airflow triggers hourly batch pulls. dbt transforms raw data into analytics-ready tables in PostgreSQL, where Great Expectations validates quality at each stage. Feast materialises features from PostgreSQL into Redis for low-latency online serving. The training pipeline retrieves historical features from the offline store and trains the XGBoost + LightGBM + Prophet stacking ensemble weekly. MLflow registers model versions and manages staging → production promotion. The FastAPI serving layer exposes /forecast, /score, and /explain endpoints; approved forecasts are pushed to SAP via OData API. Planners interact with the React dashboard for exception review, what-if scenarios, and override decisions. All overrides are logged to the audit table for governance review.',
  outcomes: [
    'MAPE reduced from 18–24% to <10% at SKU×store×week granularity — exceeding industry benchmark',
    'Forecast cycle time cut from 3 days to <4 hours — 18x productivity improvement',
    '$3.2M in annual revenue protected through stockout prevention on high-velocity SKUs',
    '$1.8M in working capital released through 20% reduction in excess inventory write-offs',
    'Full explainability via SHAP — planners understand and trust AI outputs, driving 85%+ adoption',
  ],
};

const MULTI_DATA = {
  overview: 'Demand forecasting is not a single-model problem. A single SKU may be affected by structured sales data (CSV), images of store shelf conditions (CV), text from promotional descriptions (NLP), sensor data from smart shelf systems (time series), and semi-structured product attributes (JSON). Each data type requires a different model type; their outputs are then combined via an ensemble strategy.',
  models: [
    { dataType: 'CSV (Structured)',      format: 'Tabular rows',    modelType: 'Gradient Boosting', algorithm: 'XGBoost / LightGBM',     purpose: 'Core demand forecasting from sales history, pricing, and promo features' },
    { dataType: 'Images (CV)',           format: 'JPEG/PNG',        modelType: 'Convolutional Net', algorithm: 'ResNet-50 / YOLOv8',     purpose: 'Shelf compliance detection — out-of-stock identification from store cameras' },
    { dataType: 'Text / Logs (NLP)',     format: 'Plain text',      modelType: 'Transformer (NER)', algorithm: 'BERT / spaCy NER',        purpose: 'Extract promo description features; parse ERP change logs for supply alerts' },
    { dataType: 'Sensor (Time Series)', format: 'IoT JSON stream',  modelType: 'Recurrent Net',     algorithm: 'LSTM / TCN',              purpose: 'Smart shelf weight sensors → real-time on-shelf availability signal' },
    { dataType: 'JSON (Semi-structured)',format: 'Nested JSON',     modelType: 'Rule Engine + ML',  algorithm: 'JSONPath + XGBoost',      purpose: 'Product attribute validation; new SKU attribute extraction for cold start' },
  ],
  integration: 'Each model runs in its own pipeline and outputs a feature vector or probability score. These are aggregated into a shared decision context: (1) XGBoost base forecast, (2) adjusted upward if CV model detects full shelf compliance, (3) adjusted downward if NLP detects supply risk keywords in ERP logs, (4) LSTM provides a real-time demand signal that overrides the weekly forecast during flash events, (5) JSON rule engine validates all attribute inputs and flags anomalies before they enter the feature store.',
  ensemble: [
    { strategy: 'Stacking',          desc: 'XGBoost base forecast + Prophet seasonal adjustment combined via a meta-learner (Ridge Regression) trained on holdout data.' },
    { strategy: 'Weighted Average',  desc: 'CV model shelf compliance score weighted at 0.15 into the final forecast adjustment factor; weight learned from historical correlation.' },
    { strategy: 'Override / Gating', desc: 'LSTM real-time signal gates the weekly forecast during flash sales — if LSTM detects 3σ demand spike, it overrides the batch forecast.' },
    { strategy: 'Sequential (NLP)',  desc: 'NLP supply risk score applied as a multiplicative constraint: forecast × (1 − risk_score). Applied post-ensemble before ERP push.' },
  ],
};

/* ── NEW SECTION COMPONENTS ── */

function WhatNotDoing({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>🚫</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-danger)', lineHeight: 1.4 }}>{item.title}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 28 }}>
            <strong style={{ color: 'var(--accent-danger)' }}>Impact: </strong>{item.impact}
          </div>
        </div>
      ))}
    </div>
  );
}

function WhatDoing({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
      {items.map((item, i) => {
        const isActive = item.status === 'Active';
        return (
          <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: isActive ? 'rgba(16,185,129,0.05)' : 'rgba(139,92,246,0.05)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.25)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{isActive ? '✅' : '🗓️'}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: isActive ? 'var(--accent-success)' : 'var(--accent-purple)', lineHeight: 1.4 }}>{item.title}</span>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isActive ? '#d1fae5' : '#ede9fe', color: isActive ? '#065f46' : '#5b21b6', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>{item.status}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 28 }}>{item.detail}</div>
          </div>
        );
      })}
    </div>
  );
}

function ObjectivesSection({ objectives }) {
  const [openIdx, setOpenIdx] = useState(null);
  const colors = ['var(--accent-primary)', 'var(--accent-success)', 'var(--accent-warning)', 'var(--accent-purple)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {objectives.map((obj, i) => {
        const color = colors[i % colors.length];
        const isOpen = openIdx === i;
        return (
          <div key={i} style={{ borderRadius: 'var(--border-radius-lg)', border: `1px solid ${color}30`, background: `${color}06`, overflow: 'hidden' }}>
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              style={{ width: '100%', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color, minWidth: 24 }}>O{i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{obj.title}</span>
              </div>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${color}20`, padding: '14px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {[
                    { key: 'S', label: 'Specific',    value: obj.specific,    color: '#3b82f6' },
                    { key: 'M', label: 'Measurable',  value: obj.measurable,  color: '#10b981' },
                    { key: 'A', label: 'Achievable',  value: obj.achievable,  color: '#f59e0b' },
                    { key: 'R', label: 'Relevant',    value: obj.relevant,    color: '#8b5cf6' },
                    { key: 'T', label: 'Time-bound',  value: obj.timeBound,   color: '#ef4444' },
                  ].map((dim) => (
                    <div key={dim.key} style={{ padding: '10px 12px', borderRadius: 'var(--border-radius)', background: `${dim.color}10`, border: `1px solid ${dim.color}25` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: dim.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dim.key}</span>
                        <span style={{ fontWeight: 700, fontSize: 11, color: dim.color }}>{dim.label}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{dim.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProposedSolutionSection({ solution }) {
  const priorityColor = (p) => {
    if (p === 'P0') return { bg: '#fee2e2', color: '#991b1b' };
    if (p === 'P1') return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#dbeafe', color: '#1e40af' };
  };

  return (
    <div>
      {/* Overview */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-primary)', marginBottom: 8 }}>Solution Overview</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{solution.overview}</p>
      </div>

      {/* Components table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Component', 'Technology', 'Purpose', 'Priority'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {solution.components.map((c, i) => {
              const pc = priorityColor(c.priority);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{c.component}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{c.tech}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)' }}>{c.purpose}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: pc.bg, color: pc.color, fontWeight: 700 }}>{c.priority}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Architecture description */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-success)', marginBottom: 8 }}>Solution Architecture</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{solution.architecture}</p>
      </div>

      {/* Expected outcomes */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-purple)', marginBottom: 10 }}>Expected Outcomes</div>
        <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, margin: 0 }}>
          {solution.outcomes.map((o, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{o}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MultiDataSection({ data }) {
  return (
    <div>
      {/* Intro */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 'var(--spacing-md)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{data.overview}</p>
      </div>

      {/* Models per data type */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>Models Required per Data Type</div>
        <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data Type', 'Format', 'Model Type', 'Algorithm', 'Purpose'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.models.map((m, i) => {
                const rowColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
                const col = rowColors[i % rowColors.length];
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: col }}>{m.dataType}</span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{m.format}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>{m.modelType}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{m.algorithm}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)' }}>{m.purpose}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration */}
      <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.25)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#06b6d4', marginBottom: 8 }}>Integration Strategy — How Outputs Combine</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{data.integration}</p>
      </div>

      {/* Ensemble strategies */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>Ensemble Strategies</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
          {data.ensemble.map((e, i) => {
            const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
            const col = bgColors[i % bgColors.length];
            return (
              <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', background: `${col}08`, border: `1px solid ${col}30` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: col, marginBottom: 6 }}>{e.strategy}</div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{e.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN EXPORT
   ========================================================= */

export default function ProcessProblemTab({ process }) {
  const data = PROBLEM_DATA[process.id] || PROBLEM_DATA['__default__'];

  <TabShell
      tabName="problem"
      title="Problem & Use Case · 5W + AS-IS + use cases"
      phase="Understand"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P0"
      information="5W grid · AS-IS/TO-BE · use case list · stakeholders"
      operation="read-only · 21 of 22 procs need data wiring"
      accent="#ef4444"
      todos={[]}
    >
      return (
    <div>
      {/* A. Problem Statement */}
      <div className="content-section">
        <SectionHeader title="❓ Problem Statement" subtitle="Business context, impact & affected stakeholders" />
        <ProblemStatement stmt={data.statement} />
      </div>

      {/* NEW: What We Are NOT Doing */}
      <div className="content-section">
        <SectionHeader title="🚫 What We Are NOT Doing" subtitle="Current capability gaps and their business impact" />
        <WhatNotDoing items={NOT_DOING_DATA} />
      </div>

      {/* NEW: What We ARE Doing */}
      <div className="content-section">
        <SectionHeader title="✅ What We ARE Doing" subtitle="Active capabilities and planned initiatives" />
        <WhatDoing items={DOING_DATA} />
      </div>

      {/* B. 5W Analysis */}
      <div className="content-section">
        <SectionHeader title="🔍 5W Analysis" subtitle="Who · What · When · Where · Why" />
        <FiveWGrid fiveW={data.fiveW} />
      </div>

      {/* C. AS-IS vs TO-BE */}
      <div className="content-section">
        <SectionHeader title="🔄 AS-IS vs TO-BE" subtitle="Current state vs. target AI-powered state across key dimensions" />
        <AsIsToBeTable rows={data.asisTobes} />
      </div>

      {/* NEW: Objectives (SMART) */}
      <div className="content-section">
        <SectionHeader title="🎯 Objectives" subtitle="SMART objectives — click to expand each dimension" />
        <ObjectivesSection objectives={OBJECTIVES_DATA} />
      </div>

      {/* NEW: Proposed Solution */}
      <div className="content-section">
        <SectionHeader title="💡 Proposed Solution" subtitle="Solution overview, components, architecture, and expected outcomes" />
        <ProposedSolutionSection solution={PROPOSED_SOLUTION} />
      </div>

      {/* D. Use Cases */}
      <div className="content-section">
        <SectionHeader title="📋 Use Cases" subtitle="Click a card to expand actors, pre-conditions & post-conditions" />
        <UseCaseGrid cases={data.useCases} />
      </div>

      {/* E. Business Scenarios */}
      <div className="content-section">
        <SectionHeader title="🎬 Business Scenarios" subtitle="How the AI responds in each real-world situation" />
        <BusinessScenarios scenarios={data.scenarios} />
      </div>

      {/* F. Value Proposition */}
      <div className="content-section">
        <SectionHeader title="💎 Value Proposition" subtitle="Business, AI, and operational returns" />
        <ValueProposition value={data.value} />
      </div>

      {/* NEW: Multi-Data Type Challenge */}
      <div className="content-section">
        <SectionHeader title="🧩 Multi-Data Type Challenge" subtitle="One problem — multiple data types — multiple models — one ensemble decision" />
        <MultiDataSection data={MULTI_DATA} />
      </div>
    </div>
    </TabShell>
  );
}
