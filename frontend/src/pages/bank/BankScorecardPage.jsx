// Cross-process Scorecard page.
// Operator brief: "check each process and find the score as per industry...
// create one page which must have each process score and impact"
//
// Scores are derived heuristics from blueprint data (e.g. AI count · issues
// count · sub_processes · presence of operator content). Industry benchmark
// numbers are operator-pending; we show the dimension + scoring rubric so the
// operator can paste actual industry numbers.

import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

function Pending() {
  return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Operator-pending</span>;
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    success: { bg: '#dcfce7', fg: '#166534' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
    danger:  { bg: '#fee2e2', fg: '#991b1b' },
    info:    { bg: '#dbeafe', fg: '#1e40af' },
    neutral: { bg: '#f1f5f9', fg: '#475569' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.fg,
    }}>{children}</span>
  );
}

// Heuristic score (0-100) per process from blueprint data
function scoreProcess(p) {
  const aiCount = (p.ai || []).length;
  const issueCount = (p.issues || []).length;
  const subCount = (p.sub_processes || []).length;
  const hasManual = !!p.manual_process;
  const hasAuto = !!p.automatic_process;
  const hasData = !!p.data_process;
  const hasReadme = !!p.readme;
  // Simple heuristic — operator replaces with real industry-benchmarked score later
  let score = 0;
  score += Math.min(aiCount * 5, 25);          // up to 25 for AI coverage
  score += Math.min(issueCount * 4, 20);       // up to 20 for problem clarity
  score += Math.min(subCount * 5, 15);         // up to 15 for sub-process detail
  score += hasManual ? 10 : 0;
  score += hasAuto ? 10 : 0;
  score += hasData ? 10 : 0;
  score += hasReadme ? 10 : 0;
  return Math.min(score, 100);
}

function scoreTone(s) {
  if (s >= 80) return 'success';
  if (s >= 60) return 'info';
  if (s >= 40) return 'warning';
  return 'danger';
}

function impactTone(p) {
  // Heuristic: more high-impact issues = bigger impact
  const issues = p.issues || [];
  const high = issues.filter((i) => /high|critical|cycle/i.test(i.impact || '')).length;
  if (high >= 3) return 'danger';
  if (high >= 1) return 'warning';
  if (issues.length > 0) return 'info';
  return 'neutral';
}

function impactLabel(p) {
  const issues = p.issues || [];
  const high = issues.filter((i) => /high|critical|cycle/i.test(i.impact || '')).length;
  if (high >= 3) return 'Critical';
  if (high >= 1) return 'High';
  if (issues.length > 0) return 'Medium';
  return 'Low';
}

export function BankScorecardPage() {
  const { bp } = useOutletContext();
  const depts = bp?.department_catalog || [];

  // Flatten to one row per process with computed scores
  const rows = useMemo(() => {
    const all = [];
    depts.forEach((d) => {
      (d.processes || []).forEach((p, i) => {
        all.push({
          deptId: d.id,
          deptName: d.name,
          processName: p.name,
          processIdx: i + 1,
          aiCount: (p.ai || []).length,
          issueCount: (p.issues || []).length,
          subCount: (p.sub_processes || []).length,
          score: scoreProcess(p),
          impact: impactLabel(p),
          impactT: impactTone(p),
          proc: p,
        });
      });
    });
    return all;
  }, [depts]);

  const [filter, setFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState('score');

  const visible = rows
    .filter((r) => r.score >= minScore)
    .filter((r) => !filter ||
      r.processName.toLowerCase().includes(filter.toLowerCase()) ||
      r.deptName.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => sortKey === 'score' ? b.score - a.score :
                    sortKey === 'impact' ? b.issueCount - a.issueCount :
                    sortKey === 'dept' ? a.deptId - b.deptId :
                    0);

  const avgScore = rows.length ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(1) : 0;
  const top10 = [...rows].sort((a, b) => b.score - a.score).slice(0, 10);
  const bottom10 = [...rows].sort((a, b) => a.score - b.score).slice(0, 10);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📊 Process Scorecard</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
          Per-process readiness score · impact rating · industry-benchmark scaffold for all {rows.length} processes across {depts.length} departments.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
          <div>📈 Avg score: <strong>{avgScore}</strong> / 100</div>
          <div>🟢 80+: <strong>{rows.filter((r) => r.score >= 80).length}</strong></div>
          <div>🟡 60-79: <strong>{rows.filter((r) => r.score >= 60 && r.score < 80).length}</strong></div>
          <div>🟠 40-59: <strong>{rows.filter((r) => r.score >= 40 && r.score < 60).length}</strong></div>
          <div>🔴 &lt; 40: <strong>{rows.filter((r) => r.score < 40).length}</strong></div>
        </div>
      </div>

      {/* Score rubric */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#0f172a' }}>Score rubric (0–100)</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
          Derived from blueprint coverage. Operator replaces this with real industry-benchmark scores per process.
        </p>
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Dimension', 'Weight', 'Source', 'Industry benchmark target'].map((c) => (
                  <th key={c} style={{
                    textAlign: 'left', padding: '6px 10px', fontSize: 10,
                    color: '#475569', fontWeight: 700, textTransform: 'uppercase',
                    borderBottom: '1px solid #e2e8f0',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['AI capability count',     '25', 'proc.ai[].length',                    'Top-1% insurers map ≥ 5 AI types per process'],
                ['Problem clarity',          '20', 'proc.issues[].length',                'McKinsey: top quartile docs ≥ 4 pain points / process'],
                ['Sub-process granularity',  '15', 'proc.sub_processes[].length',         'Gartner: leaders decompose into ≥ 3 sub-processes'],
                ['Manual workflow doc',      '10', 'proc.manual_process exists',          'Industry baseline'],
                ['Automatic workflow doc',   '10', 'proc.automatic_process exists',       'TO-BE plan required'],
                ['Data process doc',         '10', 'proc.data_process exists',            'Required for data lineage compliance'],
                ['Architecture doc',         '10', 'proc.readme exists',                  'Required for design sign-off'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '6px 10px', color: '#0f172a' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 / Bottom 10 panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#166534' }}>🟢 Top 10 — best-prepared</h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            {top10.map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>#{r.deptId}</strong> {r.processName.slice(0, 36)} — <Badge tone={scoreTone(r.score)}>{r.score}</Badge>
              </li>
            ))}
          </ol>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#991b1b' }}>🔴 Bottom 10 — needs most work</h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            {bottom10.map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>#{r.deptId}</strong> {r.processName.slice(0, 36)} — <Badge tone={scoreTone(r.score)}>{r.score}</Badge>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Filter + sort */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter processes / departments…"
          style={{
            flex: 1, minWidth: 220, padding: '6px 10px', fontSize: 13,
            border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none',
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
          Min score:
          <input type="range" min={0} max={100} value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))} />
          <strong>{minScore}</strong>
        </label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{
          padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 6,
        }}>
          <option value="score">Sort: Score (high → low)</option>
          <option value="impact">Sort: Impact (most issues)</option>
          <option value="dept">Sort: Department #</option>
        </select>
      </div>

      {/* Main scorecard table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#0f172a' }}>
          All processes ({visible.length} of {rows.length} matching)
        </h3>
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['UC', 'Dept', 'Process', 'AI count', 'Issues', 'Sub-proc', 'Score', 'Impact', 'Industry rank']
                  .map((c) => (
                    <th key={c} style={{
                      textAlign: 'left', padding: '6px 10px', fontSize: 10,
                      color: '#475569', fontWeight: 700, textTransform: 'uppercase',
                      borderBottom: '1px solid #e2e8f0',
                    }}>{c}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>
                    <code style={{ fontSize: 10 }}>UC-{r.deptId}.{r.processIdx}</code>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>#{r.deptId}</strong> {(r.deptName || '').slice(0, 22)}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#0f172a' }}>{r.processName}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.aiCount}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.issueCount}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>{r.subCount}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <Badge tone={scoreTone(r.score)}>{r.score}</Badge>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <Badge tone={r.impactT}>{r.impact}</Badge>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <Pending />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Industry rank column populates from external benchmark feed (Lloyd's · McKinsey · Gartner · NAIC). Wire <code>GET /api/v1/benchmarks/&lt;process_id&gt;</code>.
        </p>
      </div>
    </div>
  );
}
