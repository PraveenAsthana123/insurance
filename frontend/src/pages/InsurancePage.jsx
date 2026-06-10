import { useState, useEffect } from 'react';

const departments = [
  {
    name: 'Sales and Distribution',
    channels: ['B2C', 'B2B', 'B2E'],
    processes: ['Lead capture', 'Needs analysis', 'Quote comparison', 'Proposal', 'Cross-sell'],
    stakeholders: ['Prospect', 'Agent', 'Broker', 'Employer HR', 'Relationship manager'],
    data: ['Customer master', 'Product catalog', 'Quote transaction', 'Consent', 'Campaign attribution'],
    ai: ['Conversational AI', 'Comparison AI', 'Generative AI', 'Decision AI'],
  },
  {
    name: 'Underwriting',
    channels: ['B2C', 'B2B'],
    processes: ['Eligibility', 'Risk scoring', 'Document verification', 'Referral', 'Bind decision'],
    stakeholders: ['Underwriter', 'Medical reviewer', 'Applicant', 'Agent', 'Reinsurer'],
    data: ['Condition data', 'Policy rules', 'Risk factors', 'Document data', 'Org appetite'],
    ai: ['Decision AI', 'Verification AI', 'Explainable AI', 'Ethical AI'],
  },
  {
    name: 'Policy Servicing',
    channels: ['B2C', 'B2B', 'B2E'],
    processes: ['Policy issue', 'Endorsement', 'Renewal', 'Cancellation', 'Beneficiary change'],
    stakeholders: ['Policyholder', 'Servicing agent', 'Operations user', 'Employer admin'],
    data: ['Policy master', 'Coverage data', 'Payment data', 'Service request', 'SLA data'],
    ai: ['Transactional AI', 'Performance AI', 'Governance AI', 'Secure AI'],
  },
  {
    name: 'Claims',
    channels: ['B2C', 'B2B'],
    processes: ['FNOL', 'Coverage check', 'Triage', 'Adjudication', 'Settlement', 'Recovery'],
    stakeholders: ['Claimant', 'Adjuster', 'Provider', 'Surveyor', 'Fraud analyst', 'Finance'],
    data: ['Claim transaction', 'Loss data', 'Medical bill', 'Repair estimate', 'Fraud signals'],
    ai: ['Decision AI', 'Analytical AI', 'Verification AI', 'Explainable AI', 'Responsible AI'],
  },
  {
    name: 'Finance and Billing',
    channels: ['B2C', 'B2B', 'B2E'],
    processes: ['Premium billing', 'Collection', 'Commission', 'Refund', 'Reconciliation'],
    stakeholders: ['Customer', 'Finance analyst', 'Agent', 'Employer payroll', 'Bank partner'],
    data: ['Invoice', 'Payment transaction', 'Commission rules', 'Ledger', 'Tax data'],
    ai: ['Transactional AI', 'Analytical AI', 'Performance AI', 'Verification AI'],
  },
  {
    name: 'Risk, Compliance and Audit',
    channels: ['B2B', 'B2E'],
    processes: ['KYC/AML', 'Consent audit', 'Regulatory reporting', 'Model governance', 'Incident review'],
    stakeholders: ['Compliance officer', 'Auditor', 'Regulator', 'DPO', 'Model risk committee'],
    data: ['Audit log', 'Consent ledger', 'Control evidence', 'Model card', 'Regulatory mapping'],
    ai: ['Governance AI', 'Ethical AI', 'Secure AI', 'Responsible AI', 'Verification AI'],
  },
];

const dataDomains = [
  ['Master data', 'Customer, policy, product, agent, provider, employer, branch, region'],
  ['Conditional data', 'Eligibility rules, underwriting conditions, exclusions, riders, risk appetite'],
  ['Organization data', 'Department, role, authority limit, SLA, queue, branch, approval hierarchy'],
  ['Product data', 'Plan, premium, coverage, benefits, exclusions, commission, renewal terms'],
  ['Transactional data', 'Quote, application, policy event, claim event, payment, endorsement, complaint'],
  ['Evidence data', 'Documents, images, medical records, call transcripts, emails, audit artifacts'],
];

const aiTypes = [
  'Transactional AI', 'Decision AI', 'Analytical AI', 'Explainable AI',
  'Responsible AI', 'Ethical AI', 'Secure AI', 'Governance AI',
  'Performance AI', 'Comparison AI', 'Verification AI', 'Generative AI',
  'Conversational AI',
];

const botTabs = [
  'Customer Bot', 'Agent Bot', 'Underwriter Bot',
  'Claims Bot', 'Compliance Bot', 'Manager Bot',
];

function Metric({ label, value }) {
  return (
    <div className="insurance-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const STATUS_TONE = {
  'planned':     { color: 'var(--text-muted)',      bg: 'var(--bg-hover)',  label: 'planned' },
  'in-progress': { color: '#fff',                   bg: 'var(--accent-warning)', label: 'in progress' },
  'live':        { color: '#fff',                   bg: 'var(--accent-success)', label: 'live' },
  'deferred':    { color: '#fff',                   bg: 'var(--accent-danger)',  label: 'deferred' },
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.planned;
  return (
    <span
      title={`Status: ${tone.label}`}
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        borderRadius: 'var(--border-radius-sm)',
        background: tone.bg,
        color: tone.color,
        fontSize: 'var(--font-size-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.6,
      }}
    >
      {tone.label}
    </span>
  );
}

function useFetchJSON(url) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled && e.name !== 'AbortError') setErr(e.message); });
    return () => { cancelled = true; controller.abort(); };
  }, [url]);

  return { data, err };
}

const ratingTone = {
  High: 'var(--accent-success)',
  Medium: 'var(--accent-warning)',
  Low: 'var(--accent-danger)',
};

function BusinessModelCard({ modelKey, spec }) {
  return (
    <article className="insurance-card">
      <h3 className="insurance-card-title">{spec.label || modelKey}</h3>
      <p className="insurance-lede" style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
        {spec.objective}
      </p>
      <dl className="insurance-stack-list">
        <div>
          <dt>Autonomous departments</dt>
          <dd>
            {(spec.departments || []).map((d) => (
              <div key={d.name}>
                <strong>{d.name}</strong> — {d.goal}
              </div>
            ))}
          </dd>
        </div>
        <div>
          <dt>Agents ({(spec.agents || []).length})</dt>
          <dd>{(spec.agents || []).join(' · ')}</dd>
        </div>
        <div>
          <dt>Data sources</dt>
          <dd>
            {(spec.data_sources || []).map((src) => (
              <div key={src.category}>
                <strong>{src.category}:</strong> {(src.items || []).join(', ')}
              </div>
            ))}
          </dd>
        </div>
      </dl>
      <div className="insurance-card-footer">
        Flow: {(spec.human_less_flow || []).join(' → ')}
      </div>
    </article>
  );
}

function BlueprintSections() {
  const { data: bp, err } = useFetchJSON('/insurance-blueprint');
  const { data: capState } = useFetchJSON('/insurance-state/capability_status.json');
  const { data: matState } = useFetchJSON('/insurance-state/maturity_state.json');
  const { data: implState } = useFetchJSON('/insurance-state/implementation_state.json');

  const statusOf = (name) => capState?.statuses?.[name]?.status || 'planned';
  const maturityOf = (deptId) => matState?.depts?.[String(deptId)]?.current_level || 'L0';
  const stepStatusOf = (name) => implState?.step_status?.[name]?.status || 'planned';
  const currentStepIdx = implState?.current_step_index ?? 0;

  if (err) {
    return (
      <section className="insurance-section">
        <p className="insurance-eyebrow">Blueprint</p>
        <h2 className="section-title">Autonomous insurance blueprint</h2>
        <div className="insurance-card" style={{ borderColor: 'var(--accent-warning)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            Blueprint not available: {err}. Source: <code>data/insurance/blueprint.json</code>.
          </span>
        </div>
      </section>
    );
  }
  if (!bp) {
    return (
      <section className="insurance-section">
        <p className="insurance-eyebrow">Blueprint</p>
        <h2 className="section-title">Autonomous insurance blueprint</h2>
        <div className="insurance-card">
          <span style={{ color: 'var(--text-secondary)' }}>Loading blueprint…</span>
        </div>
      </section>
    );
  }

  const modelOrder = ['B2C', 'B2B', 'B2E'];
  const aiMatrix = bp.ai_matrix || [];
  const maturity = bp.maturity || [];
  const phases = bp.implementation_phases || [];
  const sequence = bp.implementation_sequence || [];
  const missing = bp.missing_capabilities || [];
  const org = bp.autonomous_org || [];
  const loop = bp.closed_loop || [];
  const top20 = bp.top20_roi || [];
  const opportunities = bp.ai_opportunities || [];
  const arch = bp.enterprise_architecture || {};
  const archLayers = arch.layers || [];
  const archLineage = arch.lineage || [];
  const top50 = bp.top50_missing_ai || [];
  const enterpriseMissing = bp.enterprise_missing_layers || [];
  const catalog = bp.department_catalog || [];

  return (
    <>
      <section id="business-models" className="insurance-section">
        <p className="insurance-eyebrow">Business models</p>
        <h2 className="section-title">B2C · B2B · B2E — distinct stakeholders, processes, agents</h2>
        <div className="insurance-dept-grid">
          {modelOrder.map((k) => (
            <BusinessModelCard key={k} modelKey={k} spec={bp.business_models?.[k] || {}} />
          ))}
        </div>
      </section>

      <section id="ai-matrix" className="insurance-section">
        <p className="insurance-eyebrow">AI × business model</p>
        <h2 className="section-title">Capability importance per channel</h2>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>AI capability</th>
                <th>B2C</th>
                <th>B2B</th>
                <th>B2E</th>
              </tr>
            </thead>
            <tbody>
              {aiMatrix.map((row) => (
                <tr key={row.capability}>
                  <td>{row.capability}</td>
                  {modelOrder.map((k) => (
                    <td key={k}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: ratingTone[row[k]] || 'var(--bg-hover)',
                        color: '#fff',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 700,
                      }}>
                        {row[k] || '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="maturity" className="insurance-section">
        <p className="insurance-eyebrow">Maturity ladder</p>
        <h2 className="section-title">L0 manual → L6 self-learning department</h2>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Level</th>
                <th>Stage</th>
                <th>Human involvement</th>
              </tr>
            </thead>
            <tbody>
              {maturity.map((m) => (
                <tr key={m.level}>
                  <td><strong>{m.level}</strong></td>
                  <td>{m.stage}</td>
                  <td>{m.human_involvement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="phases" className="insurance-section">
        <p className="insurance-eyebrow">Implementation phases</p>
        <h2 className="section-title">5-phase ramp — content → claims</h2>
        <div className="insurance-dept-grid">
          {phases.map((p) => (
            <article key={p.phase} className="insurance-card">
              <h3 className="insurance-card-title">Phase {p.phase} · {p.name}</h3>
              <dl className="insurance-stack-list">
                <div><dt>Objective</dt><dd>{p.objective}</dd></div>
                <div><dt>Key components</dt><dd>{(p.key_components || []).join(' · ')}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section id="implementation-sequence" className="insurance-section">
        <p className="insurance-eyebrow">Implementation sequence</p>
        <h2 className="section-title">12-step ramp — current step: {sequence[currentStepIdx] || '—'}</h2>
        <ol style={{ margin: 0, paddingLeft: 'var(--spacing-md)' }}>
          {sequence.map((step, i) => {
            const isCurrent = i === currentStepIdx;
            const isDone = i < currentStepIdx;
            return (
              <li key={step} style={{
                padding: 'var(--spacing-xs) 0',
                fontWeight: isCurrent ? 700 : 500,
                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: isDone ? 'line-through' : 'none',
              }}>
                <span style={{
                  display: 'inline-block', width: 22, textAlign: 'center',
                  marginRight: 8,
                  color: isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                }}>
                  {isCurrent ? '▶' : isDone ? '✓' : i + 1}
                </span>
                {step}
                <StatusPill status={stepStatusOf(step)} />
              </li>
            );
          })}
        </ol>
        <p className="insurance-lede" style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
          State source: <code>data/insurance/implementation_state.json</code> · edit to advance <code>current_step_index</code> or update per-step <code>status</code>.
        </p>
      </section>

      <section id="missing" className="insurance-section">
        <p className="insurance-eyebrow">Missing capabilities</p>
        <h2 className="section-title">20 AI layers most insurers skip</h2>
        <div className="insurance-dept-grid">
          {missing.map((m) => (
            <article key={m.id} className="insurance-card">
              <h3 className="insurance-card-title">
                {m.id}. {m.name}
                <StatusPill status={statusOf(m.name)} />
              </h3>
              <dl className="insurance-stack-list">
                <div><dt>Examples</dt><dd>{(m.examples || []).join(' · ')}</dd></div>
                <div><dt>Components</dt><dd>{(m.components || []).join(', ')}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section id="autonomous-org" className="insurance-section">
        <p className="insurance-eyebrow">Autonomous org</p>
        <h2 className="section-title">AI C-suite → autonomous department</h2>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Autonomous executive</th>
                <th>Autonomous department</th>
              </tr>
            </thead>
            <tbody>
              {org.map((row) => (
                <tr key={row.executive}>
                  <td><strong>{row.executive}</strong></td>
                  <td>{row.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="closed-loop" className="insurance-section">
        <p className="insurance-eyebrow">Closed loop</p>
        <h2 className="section-title">Goals → Planning → … → Continuous Improvement</h2>
        <div className="insurance-ai-grid">
          {loop.map((step, i) => (
            <span key={step} className="insurance-ai-pill" style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', top: 4, right: 8,
                fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
              }}>
                {i + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section id="top20" className="insurance-section">
        <p className="insurance-eyebrow">Top 20 ROI</p>
        <h2 className="section-title">Highest-ROI AI opportunities by department</h2>
        <p className="insurance-lede" style={{ fontSize: 'var(--font-size-sm)' }}>
          Click any row to jump to the matching department deep-dive below.
        </p>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>AI opportunity</th>
                <th>Department</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {top20.map((row) => {
                const tier = row.rank <= 5 ? 'top5' : row.rank <= 10 ? 'top10' : 'rest';
                const tierColor = tier === 'top5'
                  ? 'var(--accent-success)'
                  : tier === 'top10'
                  ? 'var(--accent-warning)'
                  : 'var(--text-muted)';
                return (
                  <tr
                    key={row.rank}
                    onClick={() => {
                      const target = document.getElementById('dept-catalog');
                      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    style={{ cursor: 'pointer' }}
                    title={`Jump to dept catalog`}
                  >
                    <td>
                      <span style={{
                        display: 'inline-block', width: 32, textAlign: 'center',
                        padding: '2px 6px', borderRadius: 'var(--border-radius-sm)',
                        background: tierColor, color: '#fff',
                        fontWeight: 700, fontSize: 'var(--font-size-xs)',
                      }}>
                        {row.rank}
                      </span>
                    </td>
                    <td><strong>{row.ai_opportunity}</strong></td>
                    <td>{row.department}</td>
                    <td><StatusPill status={statusOf(row.ai_opportunity)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <OpportunitiesSection opportunities={opportunities} />

      <section id="enterprise-arch" className="insurance-section">
        <p className="insurance-eyebrow">Enterprise architecture</p>
        <h2 className="section-title">{arch.title || '13-layer enterprise architecture'}</h2>
        {archLineage.length > 0 && (
          <p className="insurance-lede" style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Lineage:</strong> {archLineage.join(' → ')}
          </p>
        )}
        <div className="insurance-dept-grid">
          {archLayers.map((layer) => (
            <article key={layer.id} className="insurance-card">
              <h3 className="insurance-card-title">
                Layer {layer.id} · {layer.name}
                <StatusPill status={statusOf(layer.name)} />
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {layer.mission}
              </p>
              <dl className="insurance-stack-list">
                <div><dt>Inputs</dt><dd>{(layer.inputs || []).join(' · ')}</dd></div>
                <div><dt>Outputs</dt><dd>{(layer.outputs || []).join(' · ')}</dd></div>
                {layer.technologies && (
                  <div><dt>Technologies</dt><dd>{layer.technologies.join(' · ')}</dd></div>
                )}
                <div><dt>Missing AI</dt><dd>
                  {(layer.missing_ai || []).map((m, i) => (
                    <span key={m} style={{ marginRight: 6 }}>
                      {m}<StatusPill status={statusOf(m)} />{i < (layer.missing_ai.length - 1) ? ' · ' : ''}
                    </span>
                  ))}
                </dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section id="enterprise-missing" className="insurance-section">
        <p className="insurance-eyebrow">Enterprise missing layers</p>
        <h2 className="section-title">20 AI layers usually still absent</h2>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Missing AI layer</th>
                <th>Purpose</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {enterpriseMissing.map((row) => (
                <tr key={row.layer}>
                  <td><strong>{row.layer}</strong></td>
                  <td>{row.purpose}</td>
                  <td><StatusPill status={statusOf(row.layer)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Top50Section top50={top50} />

      <DepartmentCatalogSection catalog={catalog} maturityOf={maturityOf} statusOf={statusOf} />
    </>
  );
}

function Top50Section({ top50 }) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const filtered = q ? top50.filter((t) => t.toLowerCase().includes(q)) : top50;
  return (
    <section id="top50" className="insurance-section">
      <p className="insurance-eyebrow">Top 50</p>
      <h2 className="section-title">Top 50 AI types usually missing in "humanless insurance"</h2>
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter the 50… (try ops, intelligence, autonomous)"
          aria-label="Filter top-50 missing AI"
          style={{
            width: '100%', maxWidth: 480,
            padding: 'var(--spacing-sm) var(--spacing-md)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-sm)',
            font: 'inherit',
          }}
        />
        <span style={{
          marginLeft: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
        }}>
          {filtered.length} of {top50.length}
        </span>
      </div>
      <div className="insurance-ai-grid">
        {filtered.map((name, i) => (
          <span key={name} className="insurance-ai-pill" style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', top: 4, right: 8,
              fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
            }}>
              {top50.indexOf(name) + 1}
            </span>
            {name}
          </span>
        ))}
        {filtered.length === 0 && (
          <span style={{ color: 'var(--text-secondary)' }}>No matches.</span>
        )}
      </div>
    </section>
  );
}

function DepartmentDetailCard({ dept, maturity, statusOf }) {
  const [expanded, setExpanded] = useState(false);
  const scenarios = dept.channel_scenarios || {};
  const maturityColor = maturity === 'L0' ? 'var(--text-muted)'
    : maturity === 'L6' ? 'var(--accent-success)'
    : maturity >= 'L4' ? 'var(--accent-warning)'
    : 'var(--text-secondary)';
  const isPartial = !!dept.partial;
  return (
    <article className="insurance-card" style={{
      borderLeft: isPartial
        ? '4px solid var(--accent-warning)'
        : '4px solid var(--accent-success)',
    }}>
      <h3 className="insurance-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <span>Dept {dept.id} · {dept.name}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {isPartial && (
            <span
              title={dept.partial_note || 'Partial dept — some operator-provided sections missing'}
              style={{
                padding: '2px 10px',
                borderRadius: 'var(--border-radius-sm)',
                background: 'var(--accent-warning)',
                color: '#fff',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'help',
              }}
            >
              PARTIAL
            </span>
          )}
          <span
            title={`Current maturity level`}
            style={{
              padding: '2px 10px',
              borderRadius: 'var(--border-radius-sm)',
              background: maturityColor,
              color: '#fff',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 700,
            }}
          >
            {maturity}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-hover)',
              padding: '2px 10px',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              font: 'inherit',
            }}
            aria-expanded={expanded}
          >
            {expanded ? '▾ collapse' : '▸ expand'}
          </button>
        </span>
      </h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {dept.tagline}
      </p>
      {isPartial && dept.partial_note && (
        <p style={{
          margin: '4px 0 0',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid var(--accent-warning)',
          borderRadius: 'var(--border-radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-size-xs)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--accent-warning)' }}>Pending from operator:</strong> {dept.partial_note}
        </p>
      )}
      <dl className="insurance-stack-list">
        <div><dt>Mission</dt><dd>{dept.mission}</dd></div>
        <div><dt>L1 processes ({(dept.processes || []).length})</dt>
          <dd>{(dept.processes || []).map((p) => p.name).join(' · ')}</dd>
        </div>
        <div><dt>Channel scenarios</dt><dd>
          {['B2C', 'B2B', 'B2E'].map((k) => scenarios[k] ? (
            <div key={k}><strong>{k}:</strong> {scenarios[k].label} — AI: {(scenarios[k].ai || []).join(', ')}</div>
          ) : null)}
        </dd></div>
        <div><dt>Agents ({(dept.agents || []).length})</dt>
          <dd>{(dept.agents || []).join(' · ')}</dd>
        </div>
        <div><dt>Systems</dt><dd>{(dept.systems || []).join(' · ')}</dd></div>
        <div><dt>Workflow</dt><dd>{(dept.human_less_workflow || []).join(' → ')}</dd></div>
      </dl>

      {expanded && (
        <>
          <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Per-process AI opportunities
          </h4>
          <div className="insurance-table-wrap">
            <table className="insurance-matrix">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Process</th>
                  <th style={{ width: '35%' }}>Current issues</th>
                  <th>AI opportunities</th>
                </tr>
              </thead>
              <tbody>
                {(dept.processes || []).map((p) => (
                  <tr key={p.name}>
                    <td><strong>{p.name}</strong></td>
                    <td>{(p.issues || []).map((i) => i.issue).join(' · ') || '—'}</td>
                    <td>{(p.ai || []).map((a) => `${a.ai_type} (${a.scenario})`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            KPI improvement
          </h4>
          <div className="insurance-table-wrap">
            <table className="insurance-matrix">
              <thead>
                <tr><th>KPI</th><th>Expected improvement</th></tr>
              </thead>
              <tbody>
                {(dept.kpi_improvements || []).map((k) => (
                  <tr key={k.kpi}><td>{k.kpi}</td><td><strong>{k.improvement}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Top missing capabilities
          </h4>
          <div className="insurance-ai-grid">
            {(dept.top_missing_capabilities || []).map((c) => (
              <span key={c} className="insurance-ai-pill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-xs)' }}>
                <span>{c}</span>
                <StatusPill status={statusOf ? statusOf(c) : 'planned'} />
              </span>
            ))}
          </div>

          <ProcessEnrichmentPanel processes={dept.processes || []} />
        </>
      )}
    </article>
  );
}

function ProcessEnrichmentPanel({ processes }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  if (!processes.length) return null;
  const p = processes[selectedIdx] || processes[0];
  const derivedBadge = (field) => {
    const v = p?.[field];
    if (!v) return <StatusPill status="deferred" />;
    return v.derived ? (
      <span style={{
        padding: '1px 6px', borderRadius: 'var(--border-radius-sm)',
        background: 'var(--bg-hover)', color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-xs)', fontWeight: 600,
      }}>derived</span>
    ) : (
      <StatusPill status="live" />
    );
  };
  const card = (label, field) => {
    const v = p?.[field];
    if (!v) return null;
    return (
      <div key={field} style={{
        padding: 'var(--spacing-sm)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-sm)',
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <strong style={{ fontSize: 'var(--font-size-sm)' }}>{label}</strong>
          {derivedBadge(field)}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {v.summary || v.specific || v.global_policy || v.decision_layer || JSON.stringify(v).slice(0, 200)}
        </div>
      </div>
    );
  };
  return (
    <>
      <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
        Per-process governance (manual / auto / data / ExpAI / ResAI / Gov / SMART)
      </h4>
      <div style={{ marginBottom: 'var(--spacing-sm)' }}>
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          style={{
            padding: '4px 8px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            font: 'inherit',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {processes.map((proc, i) => (
            <option key={proc.name + i} value={i}>{proc.name}</option>
          ))}
        </select>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--spacing-sm)',
      }}>
        {card('Manual process', 'manual_process')}
        {card('Automatic process', 'automatic_process')}
        {card('Data process', 'data_process')}
        {card('Explainable AI', 'explainable_ai')}
        {card('Responsible AI', 'responsible_ai')}
        {card('Governance AI', 'governance_ai')}
        {card('SMART KPI', 'smart_kpi')}
      </div>
      <p style={{
        marginTop: 'var(--spacing-sm)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-muted)',
      }}>
        Cards marked <em>derived</em> are auto-generated skeletons from global §38/§40/§48. Edit
        <code> data/insurance/blueprint.json</code> on the host to replace per-process specifics; re-run
        <code> scripts/insurance_enrich_processes.py</code> after edits to refill any missing skeletons (it never overwrites operator content).
      </p>
    </>
  );
}

function DepartmentCatalogSection({ catalog, maturityOf, statusOf }) {
  if (!catalog.length) return null;
  const present = new Set(catalog.map((d) => d.id));
  const expected = new Set(Array.from({ length: 22 }, (_, i) => i + 1));
  const missing = [...expected].filter((id) => !present.has(id)).sort((a, b) => a - b);
  const completeCount = catalog.filter((d) => !d.partial).length;
  const partialCount = catalog.filter((d) => d.partial).length;
  const sortedPresentIds = catalog.map((d) => d.id).sort((a, b) => a - b);

  return (
    <section id="dept-catalog" className="insurance-section">
      <p className="insurance-eyebrow">Department catalog</p>
      <h2 className="section-title">
        Department deep dive — {catalog.length} of 22
      </h2>

      <div className="insurance-kpi-grid" style={{ margin: '0 0 var(--spacing-md)' }}>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-success)' }}>
          <span>Complete</span>
          <strong style={{ color: 'var(--accent-success)' }}>{completeCount}</strong>
        </div>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-warning)' }}>
          <span>Partial</span>
          <strong style={{ color: 'var(--accent-warning)' }}>{partialCount}</strong>
        </div>
        <div className="insurance-metric" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
          <span>Missing</span>
          <strong style={{ color: 'var(--accent-danger)' }}>{missing.length}</strong>
        </div>
        <div className="insurance-metric">
          <span>Coverage</span>
          <strong>{Math.round(100 * catalog.length / 22)}%</strong>
        </div>
      </div>

      <p className="insurance-lede" style={{ fontSize: 'var(--font-size-sm)' }}>
        Present: {sortedPresentIds.join(', ')}
        {missing.length > 0 && (
          <>
            {' · '}
            <strong style={{ color: 'var(--accent-danger)' }}>Missing: {missing.join(', ')}</strong>
          </>
        )}
        {' · '}
        Maturity chip per card reflects <code>data/insurance/maturity_state.json</code>.
      </p>
      <div className="insurance-dept-grid" style={{ gridTemplateColumns: '1fr' }}>
        {catalog.map((dept) => (
          <DepartmentDetailCard
            key={dept.id}
            dept={dept}
            maturity={maturityOf ? maturityOf(dept.id) : 'L0'}
            statusOf={statusOf}
          />
        ))}
      </div>
    </section>
  );
}

function OpportunitiesSection({ opportunities }) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? opportunities.filter(
        (o) =>
          o.ai_type.toLowerCase().includes(q) || o.scenario.toLowerCase().includes(q),
      )
    : opportunities;

  return (
    <section id="opportunities" className="insurance-section">
      <p className="insurance-eyebrow">Opportunities matrix</p>
      <h2 className="section-title">
        Enterprise insurance AI opportunities ({opportunities.length} types)
      </h2>
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by AI type or scenario… (e.g. fraud, claims, RAG)"
          aria-label="Filter AI opportunities"
          style={{
            width: '100%', maxWidth: 480,
            padding: 'var(--spacing-sm) var(--spacing-md)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-sm)',
            font: 'inherit',
          }}
        />
        <span style={{
          marginLeft: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
        }}>
          {filtered.length} of {opportunities.length}
        </span>
      </div>
      <div className="insurance-table-wrap" style={{ maxHeight: 600, overflow: 'auto' }}>
        <table className="insurance-matrix">
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ width: '30%' }}>AI type</th>
              <th>Insurance scenario</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="2" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                  No matches for &ldquo;{filter}&rdquo;
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.ai_type}>
                <td><strong>{row.ai_type}</strong></td>
                <td>{row.scenario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DownloadBar() {
  const items = [
    { url: '/insurance-blueprint',                                      name: 'blueprint.json',          desc: 'Full 21-dept catalog + 13 arch layers + 147 opportunities + Top-20 ROI' },
    { url: '/insurance-audit/insurance_alignment_latest.json',          name: 'audit-latest.json',       desc: '265-row audit report (machine-readable)' },
    { url: '/insurance-audit/insurance_alignment_latest.md',            name: 'audit-latest.md',         desc: '265-row audit report (human-readable)' },
    { url: '/insurance-state/capability_status.json',                   name: 'capability_status.json',  desc: '262 AI capabilities × status (planned/in-progress/live/deferred)' },
    { url: '/insurance-state/maturity_state.json',                      name: 'maturity_state.json',     desc: 'Per-dept maturity L0..L6' },
    { url: '/insurance-state/implementation_state.json',                name: 'implementation_state.json', desc: '12-step implementation sequence + current step + per-step status' },
  ];
  return (
    <div className="insurance-card" style={{ marginTop: 'var(--spacing-md)' }}>
      <h3 className="insurance-card-title" style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-base)' }}>
        Download data
      </h3>
      <p style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
        Every artifact below is operator-editable on the host. Edits land in the next audit run (hourly at minute 12) + rollup (minute 13). Right-click → "Save link as" or click to open inline.
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--spacing-sm)',
      }}>
        {items.map((it) => (
          <a
            key={it.url}
            href={it.url}
            download={it.name}
            style={{
              display: 'block',
              padding: 'var(--spacing-sm)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              borderLeft: '3px solid var(--accent-primary)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>↓ {it.name}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {it.desc}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function CatalogSnapshotBanner() {
  const { data: bp, err } = useFetchJSON('/insurance-blueprint');
  if (err || !bp) return null;
  const catalog = bp.department_catalog || [];
  if (!catalog.length) return null;
  const present = new Set(catalog.map((d) => d.id));
  const expected = Array.from({ length: 22 }, (_, i) => i + 1);
  const missing = expected.filter((id) => !present.has(id));
  const partial = catalog.filter((d) => d.partial).length;
  const complete = catalog.length - partial;
  const coveragePct = Math.round(100 * catalog.length / 22);
  return (
    <div
      className="insurance-card"
      style={{
        marginTop: 'var(--spacing-md)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <span style={{
          padding: '4px 12px', borderRadius: 'var(--border-radius-sm)',
          background: 'var(--accent-success)', color: '#fff',
          fontWeight: 700, fontSize: 'var(--font-size-xs)',
        }}>
          {complete} COMPLETE
        </span>
        {partial > 0 && (
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--border-radius-sm)',
            background: 'var(--accent-warning)', color: '#fff',
            fontWeight: 700, fontSize: 'var(--font-size-xs)',
          }}>
            {partial} PARTIAL
          </span>
        )}
        {missing.length > 0 && (
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--border-radius-sm)',
            background: 'var(--accent-danger)', color: '#fff',
            fontWeight: 700, fontSize: 'var(--font-size-xs)',
          }}>
            {missing.length} MISSING
          </span>
        )}
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        Catalog coverage: <strong style={{ color: 'var(--text-primary)' }}>{coveragePct}%</strong>
        {' '}({catalog.length} of 22 depts)
        {missing.length > 0 && (
          <>
            {' · '}
            <strong style={{ color: 'var(--accent-danger)' }}>Missing: {missing.join(', ')}</strong>
          </>
        )}
      </div>
      <a
        href="#dept-catalog"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('dept-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        style={{
          padding: '4px 12px',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          border: '1px solid var(--border-color)',
        }}
      >
        Jump to catalog ▾
      </a>
    </div>
  );
}

function AuditPanel() {
  const { data, err } = useFetchJSON('/insurance-audit/insurance_alignment_latest.json');

  if (err) {
    return (
      <div className="insurance-card" style={{ borderColor: 'var(--accent-warning)' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
          Audit report not available yet: {err}. Run <code>scripts/insurance_alignment_audit.py</code>.
        </span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="insurance-card">
        <span style={{ color: 'var(--text-secondary)' }}>Loading latest audit…</span>
      </div>
    );
  }

  const total = data.summary?.total ?? 0;
  const failed = data.summary?.failed ?? 0;
  const status = failed === 0 ? 'pass' : 'fail';
  const statusColor = failed === 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
  const failedChecks = (data.checks || []).filter((c) => c.status !== 'pass');

  return (
    <div className="insurance-card" style={{ borderLeft: `4px solid ${statusColor}` }}>
      <h3 className="insurance-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Hourly alignment audit</span>
        <span style={{ color: statusColor, fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase' }}>
          {status}
        </span>
      </h3>
      <dl className="insurance-stack-list">
        <div>
          <dt>Generated</dt>
          <dd>{new Date(data.generated_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Checks</dt>
          <dd>{total - failed} pass · {failed} fail · {total} total</dd>
        </div>
        {failedChecks.length > 0 && (
          <div>
            <dt>Red rows</dt>
            <dd>
              <ul style={{ margin: 0, paddingLeft: 'var(--spacing-md)' }}>
                {failedChecks.map((c, i) => (
                  <li key={i}>{c.scope} · {c.check} · {c.detail}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <div className="insurance-card-footer">
        Source: <code>jobs/reports/insurance/insurance_alignment_latest.md</code> · cron at minute 12 hourly
      </div>
    </div>
  );
}

export default function InsurancePage() {
  const [activeBot, setActiveBot] = useState(0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Insurance operating model</h1>
          <p className="page-subtitle">
            Department, channel, data, AI, and bot alignment — B2C, B2B, B2E.
          </p>
        </div>
      </div>

      <section className="insurance-section" aria-labelledby="insurance-title">
        <p className="insurance-eyebrow">Insurance operating model</p>
        <h2 id="insurance-title" className="section-title">Department, channel, data, AI, and bot alignment</h2>
        <p className="insurance-lede">
          A single control surface for B2C, B2B, and B2E insurance processes: sales, underwriting,
          servicing, claims, finance, compliance, analytics, and governance.
        </p>
        <div className="insurance-kpi-grid">
          <Metric label="Departments" value="6" />
          <Metric label="Channels" value="B2C / B2B / B2E" />
          <Metric label="Data domains" value="6" />
          <Metric label="AI types" value="13" />
        </div>
        <AuditPanel />
        <CatalogSnapshotBanner />
        <DownloadBar />
      </section>

      <section id="departments" className="insurance-section">
        <p className="insurance-eyebrow">Department map</p>
        <h2 className="section-title">Process and sub-process alignment</h2>
        <div className="insurance-dept-grid">
          {departments.map((dept) => (
            <article key={dept.name} className="insurance-card">
              <h3 className="insurance-card-title">{dept.name}</h3>
              <dl className="insurance-stack-list">
                <div>
                  <dt>Channels</dt>
                  <dd>{dept.channels.join(' / ')}</dd>
                </div>
                <div>
                  <dt>Sub-processes</dt>
                  <dd>{dept.processes.join(' → ')}</dd>
                </div>
                <div>
                  <dt>Stakeholders</dt>
                  <dd>{dept.stakeholders.join(', ')}</dd>
                </div>
                <div>
                  <dt>Data used</dt>
                  <dd>{dept.data.join(', ')}</dd>
                </div>
              </dl>
              <div className="insurance-card-footer">{dept.ai.join(' | ')}</div>
            </article>
          ))}
        </div>
      </section>

      <section id="data" className="insurance-section">
        <p className="insurance-eyebrow">Data control</p>
        <h2 className="section-title">Master, conditional, organization, product, and transaction data</h2>
        <div className="insurance-table-wrap">
          <table className="insurance-matrix">
            <thead>
              <tr>
                <th>Data class</th>
                <th>Insurance examples</th>
                <th>Governance requirement</th>
              </tr>
            </thead>
            <tbody>
              {dataDomains.map(([name, example]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{example}</td>
                  <td>Owner, source, quality score, retention rule, privacy classification</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="ai" className="insurance-section">
        <p className="insurance-eyebrow">AI catalog</p>
        <h2 className="section-title">AI capabilities required for insurance operations</h2>
        <div className="insurance-ai-grid">
          {aiTypes.map((name) => (
            <span key={name} className="insurance-ai-pill">{name}</span>
          ))}
        </div>
      </section>

      <BlueprintSections />

      <section id="bot" className="insurance-section">
        <p className="insurance-eyebrow">Bot UI</p>
        <h2 className="section-title">Role-aware insurance assistant</h2>
        <div className="insurance-bot-shell">
          <aside className="insurance-bot-rail" aria-label="Bot role tabs">
            {botTabs.map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={i === activeBot ? 'insurance-bot-active' : ''}
                onClick={() => setActiveBot(i)}
                aria-pressed={i === activeBot}
              >
                {tab}
              </button>
            ))}
          </aside>
          <div className="insurance-bot-panel">
            <div className="insurance-chat-user">
              Check claim eligibility and required documents.
            </div>
            <div className="insurance-chat-bot">
              I will verify policy status, coverage, exclusions, claim event, KYC, prior claims,
              fraud indicators, and document completeness before recommending next action.
            </div>
            <div className="insurance-bot-actions">
              <button type="button">Run verification</button>
              <button type="button">Explain decision</button>
              <button type="button">Create audit row</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
