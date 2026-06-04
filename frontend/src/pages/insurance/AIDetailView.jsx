import { useParams, useOutletContext, useSearchParams, Link } from 'react-router-dom';
import { IPOSection, TransactionalHistory, OutputEvaluation, DerivedBadge } from './tabs/IPOLayout';

// Per §73.14 — 5 mandatory sub-sections in fixed order.
// Each maps to one phase of the AI lifecycle (Input → Process → Output → Govern).
const AI_SUBS = [
  { slug: 'data',        label: 'Data',        kind: 'input',   desc: 'Training + inference inputs · features · lineage · freshness SLA' },
  { slug: 'model',       label: 'Model',       kind: 'process', desc: 'Architecture · framework · version · prompt registry · runtime' },
  { slug: 'accuracy',    label: 'Accuracy',    kind: 'output',  desc: 'Hold-out metrics · per-segment · per-group · drift status' },
  { slug: 'benchmark',   label: 'Benchmark',   kind: 'output',  desc: 'vs prior version · vs industry · vs rule-only · vs human' },
  { slug: 'stakeholder', label: 'Stakeholder', kind: 'history', desc: 'Owner · sponsor · consumer · escalation · on-call' },
];

function findProcess(dept, processId) {
  if (!dept?.processes) return null;
  for (const p of dept.processes) {
    const pid = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (pid === decodeURIComponent(processId)) return p;
  }
  return null;
}

function KVTable({ data }) {
  if (!data) return <em>—</em>;
  const entries = Object.entries(data).filter(([k]) => !['derived', '_note'].includes(k));
  if (entries.length === 0) return <em>—</em>;
  return (
    <table className="insurance-matrix">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <th style={{ width: '30%' }}>{k.replace(/_/g, ' ')}</th>
            <td>{Array.isArray(v) ? v.join(' · ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AIDetailView() {
  const { bp } = useOutletContext();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSub = searchParams.get('sub') || 'data';

  const dept = bp.department_catalog?.find((d) => String(d.id) === params.deptId);
  const proc = findProcess(dept, params.processId);
  const aiType = decodeURIComponent(params.aiType || '');
  const aiRow = (bp.ai_opportunities || []).find((r) => r.ai_type === aiType);

  if (!aiRow) {
    return (
      <div className="insurance-empty-state">
        <strong>{aiType}</strong> not found in <code>blueprint.ai_opportunities[]</code>.
        Per §73.13 every AI reference must match a catalog entry.
        <br />
        <Link to={`/insurance/${params.deptId}/${params.domain}/${params.processId}`} style={{ color: 'var(--accent-primary)' }}>
          ← Back to process
        </Link>
      </div>
    );
  }

  const setSub = (slug) => {
    const p = new URLSearchParams(searchParams);
    p.set('sub', slug);
    setSearchParams(p);
  };

  return (
    <div>
      <p style={{ margin: '0 0 var(--spacing-xs)', fontSize: 'var(--font-size-xs)' }}>
        <Link to={`/insurance/${params.deptId}/${params.domain}/${params.processId}`} style={{ color: 'var(--accent-primary)' }}>
          ← Back to process
        </Link>
      </p>
      <h2 style={{ margin: '0 0 var(--spacing-xs)' }}>{aiType}</h2>
      <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Catalog scenario: <em>{aiRow.scenario}</em> · used by <strong>{proc?.name || 'this process'}</strong> in dept {dept?.id} ({dept?.name})
      </p>

      {/* Quick-jump sub-tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--spacing-md)' }}>
        {AI_SUBS.map((s) => (
          <button
            key={s.slug}
            className={`insurance-tab ${activeSub === s.slug ? 'active' : ''}`}
            onClick={() => setSub(s.slug)}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* IPO-style sections (same banking pattern as the 17 right-pane tabs) */}
      {AI_SUBS.map((s, idx) => activeSub === s.slug && (
        <div key={s.slug}>
          <IPOSection
            number={idx + 1}
            kind={s.kind}
            title={`${s.label} — ${s.desc.split('·')[0].trim()}`}
            subtitle={s.desc}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-xs)' }}>
              <DerivedBadge derived={aiRow[s.slug]?.derived} />
            </div>
            <KVTable data={aiRow[s.slug]} />
          </IPOSection>

          <TransactionalHistory rows={[]} tabName={`ai:${aiType}:${s.slug}`} />
          <OutputEvaluation metrics={{}} tabName={`ai:${aiType}:${s.slug}`} />
        </div>
      ))}

      <p style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        Source: <code>blueprint.ai_opportunities[]</code>.
        Edit <code>data/insurance/blueprint.json</code> on the host to replace
        derived skeletons with operator content (set <code>derived: false</code> when done).
      </p>
    </div>
  );
}
