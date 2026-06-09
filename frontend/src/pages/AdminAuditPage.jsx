// AdminAuditPage — operator UI for the 3 audit reports.
// Consumes /api/v1/insur/audit/* (built in commit bf038b1).
// Per §47.6 + §68.3 + §70 audit triad.

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const AUDIT_LABELS = {
  'recommender-flavors': {
    name: 'Recommender flavors per dept',
    spec: '§64.22',
    description: '21 canonical depts · per-dept HOLY_RECOMMENDATION.md flavor coverage',
  },
  'dept-artifacts': {
    name: 'Department mandatory §64 artifacts',
    spec: '§64.29',
    description: '21 depts × 15 mandatory HOLY_*.md = 315 cells',
  },
  'folder-readmes': {
    name: 'ai-agents/ folder README convention',
    spec: '§58 + §63',
    description: '50 tools × 4 invariants (README · DEEP_DIVE · install.sh · §-refs)',
  },
  'voice-ai-artifacts': {
    name: 'Voice AI E2E demo completeness',
    spec: '§90 L15 + §92',
    description: '7 backend modules + migration + 3 frontends + DEMO_STORY w/ 14 sections',
  },
  'section-92-compliance': {
    name: '§92 compliance · ai-agents/ mandate',
    spec: '§92',
    description: '19 mandatory paths: tree · scripts · CI · API surface',
  },
  'marketing-campaigns-artifacts': {
    name: 'Marketing campaigns module (4 channels)',
    spec: '§64.13 + §90 L13/L14',
    description: 'Email · Banner · Survey · Form · modules + seeds + public endpoints (16 cells)',
  },
  'marketing-e2e-flow': {
    name: 'E2E consumer flow (12 assertions)',
    spec: '§47.6 + §57.7 + §64.13',
    description: 'Full path: create → execute → preview → submit → status verify · DLP gate · anti-replay · metrics aggregate',
  },
  'marketing-advanced': {
    name: 'Advanced suite · multi-channel + autonomous AI (8 tests)',
    spec: '§47.6 + §76 + §82.21',
    description: '4-channel · 5-shape DLP · concurrency · autonomous decision loop · RAI fairness gate · anti-replay · invalid channel · channel help',
  },
  'marketing-100-customers': {
    name: '100-customer scale E2E (9 assertions)',
    spec: '§47.6 + §75 + §76 + §82.7',
    description: '100+ pool · segment execute · timing · correlation_id · metrics aggregate · cohort_distribution · fairness DI · cleanup',
  },
  'schedule-executor': {
    name: 'Schedule executor (cadence + tenant + monthly math)',
    spec: '§41.3 + §47.6 + §70',
    description: 'Cron executor invariants · 12 assertions (monthly Dec→Jan · cadence · EOM sentinel · 0/1-due cases · per-tenant · last_run/next_run state update)',
  },
  'postings-executor': {
    name: 'Postings executor (cron */30 publish loop)',
    spec: '§38.3 + §41.3 + §70 + T2.4',
    description: 'Content posting scheduler · 7 assertions (tenant discovery · 0/1-due cases · draft→published · TTP + quality_score · operation_log + per-platform runs)',
  },
  'multi-cohort-fairness': {
    name: '§76 multi-cohort RAI fairness (T3.2)',
    spec: '§76 + T3.2',
    description: 'Verifies RAI gate actually triggers · 9 assertions (DI math · cross-cohort halt · single-cohort baseline · rai_halt in decisions chain)',
  },
  'attribution-math': {
    name: 'Attribution math · 5 models (T5.9)',
    spec: '§75 + T5.9',
    description: 'Multi-touch attribution math invariants · 15 assertions (per-model splits + revenue conservation + compare endpoint + cohort sum)',
  },
  'presidio-adoption': {
    name: 'Presidio Stage-1 DLP adapter (T6.10)',
    spec: '§56 + §82.21 + T6.10',
    description: '12-entity PII coverage · 8 assertions (status · entity detection · multi-entity · clean negative)',
  },
};

export default function AdminAuditPage() {
  const [audits, setAudits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [historyWindow, setHistoryWindow] = useState(10);  // T2.1 · last X runs filter

  const fetchJSON = async (path, opts = {}) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`${r.status}: ${txt}`);
    }
    return r.json();
  };

  const loadList = async () => {
    try {
      const data = await fetchJSON('/api/v1/insur/audit/list');
      setAudits(data.audits || []);
      setError(null);
    } catch (e) {
      setError(`list failed: ${e.message}`);
    }
  };

  const loadReport = async (kind) => {
    setSelected(kind);
    setBusy(true);
    try {
      const [latest, hist] = await Promise.all([
        fetchJSON(`/api/v1/insur/audit/${kind}/latest`),
        fetchJSON(`/api/v1/insur/audit/${kind}/history?n=${historyWindow}`),
      ]);
      setReport(latest);
      setHistory(hist.history || []);
      setError(null);
    } catch (e) {
      setError(`load failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await fetchJSON(`/api/v1/insur/audit/${selected}/run`, { method: 'POST' });
      const display = `Exit ${result.exit_code} · ${result.passed ? 'PASS' : 'FAIL'}\n\n${result.stdout}\n\n--- stderr ---\n${result.stderr}`;
      setReport({
        kind: selected,
        spec: AUDIT_LABELS[selected]?.spec,
        report_path: '(live run · not persisted to file)',
        run_at: Date.now() / 1000,
        content: display,
        size_bytes: display.length,
        exit_code: result.exit_code,
        passed: result.passed,
      });
      loadList();
    } catch (e) {
      setError(`run failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { loadList(); }, []);
  // T2.1 · re-fetch history when window changes (operator slider)
  useEffect(() => { if (selected) loadReport(selected); }, [historyWindow]);

  const formatTime = (ts) => {
    if (!ts) return 'never';
    return new Date(ts * 1000).toLocaleString();
  };

  const passed = report?.content?.includes('21 / 315')
    ? null  // partial gradient
    : report?.exit_code === 0 || (report?.content && !report.content.toLowerCase().includes('fail'));

  // ── styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12,
      padding: 12, background: '#f8fafc', minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* ─── LEFT — audit list ─── */}
      <div>
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Audit triad</h3>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Per §47.6 (DevSecOps) + §70 (cron audit) + §68.3 (read-only API)
          </div>
          {audits.length === 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              No audits found. Backend may not be running.
            </div>
          )}
          {audits.map((a) => (
            <div
              key={a.kind}
              onClick={() => loadReport(a.kind)}
              style={{
                padding: 8, marginBottom: 6, borderRadius: 4, cursor: 'pointer',
                background: selected === a.kind ? '#dbeafe' : '#f8fafc',
                border: `1px solid ${selected === a.kind ? '#1e40af' : '#e2e8f0'}`,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {AUDIT_LABELS[a.kind]?.name || a.kind}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {a.spec} · last run: {formatTime(a.latest_run_at)}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {AUDIT_LABELS[a.kind]?.description || a.description}
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>How to read</h3>
          <ul style={{ fontSize: 11, margin: 0, paddingLeft: 16, color: '#475569' }}>
            <li>Click an audit to load its latest report.</li>
            <li>Use <strong>Run now</strong> to trigger live execution.</li>
            <li>Reports are tagged with cells covered + per-row status.</li>
            <li>CI gate fails the build if any audit exits non-zero.</li>
            <li>Cron: Mon 09:00 / 09:30 / 10:00 weekly.</li>
          </ul>
        </div>
      </div>

      {/* ─── RIGHT — report viewer ─── */}
      <div>
        <div style={card}>
          {!selected && (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              Pick an audit on the left to view its latest report.
            </div>
          )}
          {selected && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  {AUDIT_LABELS[selected]?.name} {' '}
                  <small style={{ color: '#64748b', fontSize: 11 }}>
                    {report?.spec}
                  </small>
                </h3>
                <div>
                  <button
                    onClick={runNow}
                    disabled={busy}
                    style={{
                      padding: '6px 12px', background: busy ? '#94a3b8' : '#1e40af',
                      color: '#fff', border: 'none', borderRadius: 4,
                      fontSize: 12, cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {busy ? 'Running...' : 'Run now'}
                  </button>
                </div>
              </div>

              {report && (
                <>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                    Report: <code>{report.report_path}</code> ·{' '}
                    {report.size_bytes} bytes · run: {formatTime(report.run_at)}
                    {report.exit_code != null && (
                      <span style={{
                        marginLeft: 8, padding: '2px 8px', borderRadius: 4,
                        background: report.passed ? '#dcfce7' : '#fee2e2',
                        color: report.passed ? '#15803d' : '#b91c1c', fontWeight: 600,
                      }}>
                        exit {report.exit_code} · {report.passed ? 'PASS' : 'FAIL'}
                      </span>
                    )}
                  </div>
                  <pre style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 11,
                    background: '#0f172a', color: '#e2e8f0', padding: 12,
                    borderRadius: 4, overflow: 'auto', maxHeight: '60vh',
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {report.content || '(empty)'}
                  </pre>
                </>
              )}
            </>
          )}
        </div>

        {selected && history.length > 0 && (
          <div style={card}>
            {/* Pass/fail summary tiles · operator-friendly aggregate over the window */}
            {(() => {
              const withExit = history.filter((h) => h.exit_code != null);
              const passed = withExit.filter((h) => h.exit_code === 0).length;
              const failed = withExit.length - passed;
              const passRate = withExit.length ? (passed / withExit.length) * 100 : null;
              const rateColor = passRate == null
                ? '#64748b' : passRate >= 90
                ? '#16a34a' : passRate >= 70
                ? '#d97706' : '#dc2626';
              // T2.2 · sparkline (cumulative PASS over time)
              // Oldest → newest left-to-right. Each step: +1 if exit_code===0
              const oldestFirst = [...history].reverse();
              let cum = 0;
              const sparkPoints = oldestFirst.map((h, i) => {
                if (h.exit_code === 0) cum++;
                return { i, cum };
              });
              const sparkMax = sparkPoints.length ? sparkPoints[sparkPoints.length - 1].cum : 1;
              const sparkPath = sparkPoints.length > 1
                ? sparkPoints.map((p, i) => {
                    const x = (i / (sparkPoints.length - 1)) * 60;
                    const y = 20 - (p.cum / Math.max(sparkMax, 1)) * 18;
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ')
                : null;
              return (
                <>
                {/* T2.1 · window picker */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Showing last {history.length} runs · pick a different window:
                  </span>
                  <select value={historyWindow}
                          onChange={(e) => setHistoryWindow(parseInt(e.target.value, 10))}
                          style={{
                            padding: '2px 6px', fontSize: 11, borderRadius: 4,
                            border: '1px solid #e2e8f0',
                          }}>
                    <option value="10">last 10 runs</option>
                    <option value="30">last 30 runs</option>
                    <option value="90">last 90 runs</option>
                    <option value="365">last year</option>
                  </select>
                </div>
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 8, fontSize: 11,
                }}>
                  <div style={{
                    flex: 1, padding: 6, background: '#f0fdf4',
                    border: '1px solid #16a34a', borderRadius: 4,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {sparkPath && (
                      <svg width="60" height="20"
                           style={{
                             position: 'absolute', top: 4, right: 4,
                             opacity: 0.5,
                           }}>
                        <path d={sparkPath} stroke="#15803d" strokeWidth="1.5"
                              fill="none" />
                      </svg>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                      {passed}
                    </div>
                    <div style={{ color: '#15803d' }}>PASS</div>
                  </div>
                  <div style={{
                    flex: 1, padding: 6, background: '#fef2f2',
                    border: '1px solid #dc2626', borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c' }}>
                      {failed}
                    </div>
                    <div style={{ color: '#b91c1c' }}>FAIL</div>
                  </div>
                  <div style={{
                    flex: 1, padding: 6, background: '#f8fafc',
                    border: `1px solid ${rateColor}`, borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: rateColor }}>
                      {passRate == null ? '—' : `${passRate.toFixed(0)}%`}
                    </div>
                    <div style={{ color: rateColor }}>RATE</div>
                  </div>
                  <div style={{
                    flex: 1, padding: 6, background: '#f8fafc',
                    border: '1px solid #94a3b8', borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
                      {history.length}
                    </div>
                    <div style={{ color: '#475569' }}>RUNS</div>
                  </div>
                </div>
                </>
              );
            })()}
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
              History (last {history.length}) · size trend
            </h3>
            {/* Bar trend graph · oldest → newest left-to-right.
                Bar height proportional to size_bytes (larger report often = more findings) */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 4, height: 80,
              padding: '8px 4px', background: '#f8fafc', borderRadius: 4, marginBottom: 8,
            }}>
              {[...history].reverse().map((h, i) => {
                const max = Math.max(...history.map((x) => x.size_bytes || 1), 1);
                const heightPct = Math.max(5, (h.size_bytes / max) * 100);
                // Heuristic: filename contains pass indicator OR exit_code===0
                const failed = h.exit_code != null
                  ? h.exit_code !== 0
                  : (h.path || '').toLowerCase().includes('fail');
                const passed = h.exit_code === 0;
                const color = passed ? '#16a34a' : failed ? '#dc2626' : '#1e40af';
                return (
                  <div key={i}
                       title={`${formatTime(h.run_at)} · ${h.size_bytes} B`
                              + (h.exit_code != null ? ` · exit ${h.exit_code}` : '')}
                       style={{
                         flex: 1,
                         minWidth: 8,
                         height: `${heightPct}%`,
                         background: color,
                         borderRadius: '2px 2px 0 0',
                         transition: 'height 0.3s',
                       }} />
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 8 }}>
              ← older · newer →
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: 4 }}>Run at</th>
                  <th style={{ padding: 4 }}>Size</th>
                  <th style={{ padding: 4 }}>Path</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 4 }}>{formatTime(h.run_at)}</td>
                    <td style={{ padding: 4 }}>{h.size_bytes} B</td>
                    <td style={{ padding: 4, fontFamily: 'ui-monospace', fontSize: 10 }}>
                      <code>{h.path}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626', color: '#b91c1c' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
