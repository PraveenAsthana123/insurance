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
};

export default function AdminAuditPage() {
  const [audits, setAudits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
        fetchJSON(`/api/v1/insur/audit/${kind}/history?n=10`),
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
                return (
                  <div key={i}
                       title={`${formatTime(h.run_at)} · ${h.size_bytes} B`}
                       style={{
                         flex: 1,
                         minWidth: 8,
                         height: `${heightPct}%`,
                         background: '#1e40af',
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
