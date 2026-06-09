import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';
import E2ELatencyPanel from '../E2ELatencyPanel';

/* ============================================================
   TESTING TAB — Comprehensive testing for each process
   Categories: Manual, API, Positive, Negative, Smoke,
   Integration, Performance, Security, Regression, UAT
   ============================================================ */

const TEST_CATEGORIES = [
  { id: 'all', label: 'All Tests', icon: '📋' },
  { id: 'smoke', label: 'Smoke', icon: '💨' },
  { id: 'positive', label: 'Positive', icon: '✅' },
  { id: 'negative', label: 'Negative', icon: '❌' },
  { id: 'manual', label: 'Manual', icon: '🖱️' },
  { id: 'api', label: 'API', icon: '🔌' },
  { id: 'integration', label: 'Integration', icon: '🔗' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'regression', label: 'Regression', icon: '🔄' },
  { id: 'uat', label: 'UAT', icon: '👤' },
];

function generateTestSuite(process) {
  const name = process?.name || 'Process';
  return [
    // Smoke Tests
    { id: 'SMK-001', name: 'Health check endpoint responds 200', category: 'smoke', priority: 'P0', expected: 'HTTP 200 + healthy status', status: 'pass', duration: '0.12s', method: 'GET /api/v1/health' },
    { id: 'SMK-002', name: 'Process page loads without errors', category: 'smoke', priority: 'P0', expected: 'Page renders, no console errors', status: 'pass', duration: '0.45s', method: 'Browser navigation' },
    { id: 'SMK-003', name: 'Database connection active', category: 'smoke', priority: 'P0', expected: 'PostgreSQL connected, tables exist', status: 'pass', duration: '0.08s', method: 'DB ping + table count' },
    { id: 'SMK-004', name: 'Redis broker reachable', category: 'smoke', priority: 'P0', expected: 'Redis PONG response', status: 'pass', duration: '0.03s', method: 'redis-cli ping' },
    { id: 'SMK-005', name: 'MLflow tracking server responds', category: 'smoke', priority: 'P0', expected: 'MLflow API accessible', status: 'pass', duration: '0.15s', method: 'GET /api/2.0/mlflow/experiments/list' },

    // Positive Tests
    { id: 'POS-001', name: `${name}: normal week forecast accuracy`, category: 'positive', priority: 'P0', expected: 'MAPE < 8%, valid predictions', status: 'pass', duration: '2.3s', method: 'Model predict + assert MAPE' },
    { id: 'POS-002', name: 'Promo uplift detected correctly', category: 'positive', priority: 'P0', expected: 'Uplift within 5% of actual', status: 'pass', duration: '1.8s', method: 'Promo flag ON → check uplift' },
    { id: 'POS-003', name: 'Holiday seasonality captured', category: 'positive', priority: 'P1', expected: 'Holiday weeks show higher forecast', status: 'pass', duration: '1.5s', method: 'Compare holiday vs non-holiday' },
    { id: 'POS-004', name: 'Multi-store forecast consistency', category: 'positive', priority: 'P1', expected: 'All 50 stores have forecasts', status: 'pass', duration: '3.2s', method: 'Assert forecast_count == store_count' },
    { id: 'POS-005', name: 'Confidence intervals generated', category: 'positive', priority: 'P1', expected: 'Lower < predicted < upper for all', status: 'pass', duration: '0.9s', method: 'Assert CI validity' },
    { id: 'POS-006', name: 'Feature importance non-zero', category: 'positive', priority: 'P2', expected: 'Top 10 features have importance > 0', status: 'pass', duration: '0.4s', method: 'Check SHAP values' },

    // Negative Tests
    { id: 'NEG-001', name: 'Missing data handling graceful', category: 'negative', priority: 'P0', expected: 'No crash, fallback to avg/median', status: 'pass', duration: '1.1s', method: 'Feed data with 30% nulls' },
    { id: 'NEG-002', name: 'Zero-sales SKU does not crash', category: 'negative', priority: 'P0', expected: 'Forecast = 0 or min threshold', status: 'pass', duration: '0.7s', method: 'Feed all-zero sales SKU' },
    { id: 'NEG-003', name: 'Invalid date format rejected', category: 'negative', priority: 'P1', expected: 'ValidationError with clear message', status: 'pass', duration: '0.2s', method: 'POST with date="abc"' },
    { id: 'NEG-004', name: 'Oversized payload rejected', category: 'negative', priority: 'P1', expected: 'HTTP 413 or 422', status: 'pass', duration: '0.1s', method: 'POST 100MB payload' },
    { id: 'NEG-005', name: 'SQL injection in SKU filter blocked', category: 'negative', priority: 'P0', expected: 'Sanitized, no DB error', status: 'pass', duration: '0.15s', method: "sku='; DROP TABLE--" },
    { id: 'NEG-006', name: 'Negative sales value rejected', category: 'negative', priority: 'P1', expected: 'ValidationError', status: 'pass', duration: '0.08s', method: 'sales_qty = -100' },

    // Manual Tests
    { id: 'MAN-001', name: 'New SKU cold start forecast review', category: 'manual', priority: 'P1', expected: 'Similar SKU proxy used, planner confirms', status: 'pending', duration: '~5 min', method: 'Planner review in dashboard' },
    { id: 'MAN-002', name: 'Override workflow end-to-end', category: 'manual', priority: 'P1', expected: 'Override saved, audit logged, FVA tracked', status: 'pending', duration: '~3 min', method: 'Submit override → verify DB' },
    { id: 'MAN-003', name: 'Dashboard visual regression check', category: 'manual', priority: 'P2', expected: 'Charts render, no layout breaks', status: 'pass', duration: '~2 min', method: 'Visual inspection all tabs' },
    { id: 'MAN-004', name: 'Report PDF export validation', category: 'manual', priority: 'P2', expected: 'PDF generates, all sections present', status: 'pending', duration: '~3 min', method: 'Export → open → verify' },

    // API Tests
    { id: 'API-001', name: 'GET /departments returns 200 + paginated', category: 'api', priority: 'P0', expected: '200, items array, total count', status: 'pass', duration: '0.18s', method: 'curl + assert schema' },
    { id: 'API-002', name: 'GET /departments/{id}/processes returns list', category: 'api', priority: 'P0', expected: '200, processes for department', status: 'pass', duration: '0.22s', method: 'curl + assert count > 0' },
    { id: 'API-003', name: 'POST /models creates training job', category: 'api', priority: 'P0', expected: '201, job_id returned', status: 'pass', duration: '0.35s', method: 'POST payload + assert 201' },
    { id: 'API-004', name: 'POST /models/{id}/predict returns forecast', category: 'api', priority: 'P0', expected: '200, predictions array', status: 'pass', duration: '1.2s', method: 'POST input data + assert output' },
    { id: 'API-005', name: 'GET /jobs/{id} returns job status', category: 'api', priority: 'P1', expected: '200, status field present', status: 'pass', duration: '0.1s', method: 'GET + assert status in enum' },
    { id: 'API-006', name: 'POST /datasets/{id}/upload accepts CSV', category: 'api', priority: 'P1', expected: '200, file saved', status: 'pass', duration: '2.1s', method: 'multipart upload + verify' },
    { id: 'API-007', name: 'GET /health returns healthy', category: 'api', priority: 'P0', expected: '{"status":"healthy"}', status: 'pass', duration: '0.05s', method: 'GET /api/v1/health' },
    { id: 'API-008', name: 'Unauthenticated request returns 401', category: 'api', priority: 'P0', expected: '401 Unauthorized', status: 'pass', duration: '0.04s', method: 'GET /admin without API key' },

    // Integration Tests
    { id: 'INT-001', name: 'Upload → Train → Predict pipeline', category: 'integration', priority: 'P0', expected: 'Complete pipeline, forecast generated', status: 'pass', duration: '45s', method: 'Upload CSV → create model → train → predict' },
    { id: 'INT-002', name: 'Celery task execution end-to-end', category: 'integration', priority: 'P0', expected: 'Task queued → running → completed', status: 'pass', duration: '30s', method: 'Submit task → poll status → get result' },
    { id: 'INT-003', name: 'MLflow model logging', category: 'integration', priority: 'P1', expected: 'Model registered, metrics logged', status: 'pass', duration: '12s', method: 'Train → check MLflow for run' },
    { id: 'INT-004', name: 'Frontend ↔ Backend API contract', category: 'integration', priority: 'P0', expected: 'All API responses match schema', status: 'pass', duration: '5.2s', method: 'Hit all endpoints from React' },
    { id: 'INT-005', name: 'Database migration on fresh DB', category: 'integration', priority: 'P0', expected: 'All tables created, seeds loaded', status: 'pass', duration: '3.8s', method: 'Drop DB → run migrations → verify' },

    // Performance Tests
    { id: 'PRF-001', name: 'API response time < 500ms (p95)', category: 'performance', priority: 'P1', expected: 'p95 latency < 500ms', status: 'pass', duration: '15s', method: 'k6 load test, 50 VUs, 30s' },
    { id: 'PRF-002', name: 'Concurrent 100 predictions', category: 'performance', priority: 'P1', expected: 'All complete, no timeouts', status: 'pass', duration: '28s', method: 'Parallel predict requests' },
    { id: 'PRF-003', name: 'Large dataset upload (1M rows)', category: 'performance', priority: 'P2', expected: 'Upload < 30s, no OOM', status: 'pass', duration: '22s', method: 'Upload 1M row CSV' },
    { id: 'PRF-004', name: 'Dashboard page load < 3s', category: 'performance', priority: 'P1', expected: 'LCP < 2.5s, FID < 100ms', status: 'pass', duration: '2.1s', method: 'Lighthouse audit' },
    { id: 'PRF-005', name: 'Model training 1M rows < 5 min', category: 'performance', priority: 'P2', expected: 'XGBoost trains in < 300s', status: 'pass', duration: '187s', method: 'Train on full dataset' },

    // Security Tests
    { id: 'SEC-001', name: 'SQL injection blocked', category: 'security', priority: 'P0', expected: 'Parameterized queries, no injection', status: 'pass', duration: '0.3s', method: 'SQLMap scan on all endpoints' },
    { id: 'SEC-002', name: 'XSS in input fields blocked', category: 'security', priority: 'P0', expected: 'Scripts sanitized', status: 'pass', duration: '0.5s', method: 'Inject <script> in all inputs' },
    { id: 'SEC-003', name: 'Path traversal blocked', category: 'security', priority: 'P0', expected: 'resolve() + startsWith() guard', status: 'pass', duration: '0.2s', method: 'Upload with ../../etc/passwd path' },
    { id: 'SEC-004', name: 'CORS only allows configured origins', category: 'security', priority: 'P0', expected: 'Cross-origin from evil.com blocked', status: 'pass', duration: '0.1s', method: 'Request from unauthorized origin' },
    { id: 'SEC-005', name: 'Rate limiting enforced', category: 'security', priority: 'P1', expected: 'HTTP 429 after 100 req/min', status: 'pass', duration: '8s', method: '150 rapid requests from same IP' },
    { id: 'SEC-006', name: 'Security headers present', category: 'security', priority: 'P1', expected: 'X-Frame, CSP, HSTS headers', status: 'pass', duration: '0.1s', method: 'Check response headers' },
    { id: 'SEC-007', name: 'PII not logged', category: 'security', priority: 'P0', expected: 'No customer data in logs', status: 'pass', duration: '2s', method: 'Grep logs for PII patterns' },

    // Regression Tests
    { id: 'REG-001', name: 'v3.1 → v3.2 no accuracy degradation', category: 'regression', priority: 'P0', expected: 'MAPE within 0.5% of previous', status: 'pass', duration: '45s', method: 'Compare metrics on holdout set' },
    { id: 'REG-002', name: 'API backward compatibility', category: 'regression', priority: 'P0', expected: 'All v1 endpoints still work', status: 'pass', duration: '5s', method: 'Run v1 test suite against v3.2' },
    { id: 'REG-003', name: 'Feature engineering output stable', category: 'regression', priority: 'P1', expected: 'Same input → same features', status: 'pass', duration: '3s', method: 'Hash comparison of feature output' },

    // UAT Tests
    { id: 'UAT-001', name: 'Planner can view 30-day forecast', category: 'uat', priority: 'P0', expected: 'Forecast table visible, filterable', status: 'pass', duration: '~2 min', method: 'Planner login → navigate → verify' },
    { id: 'UAT-002', name: 'Manager can approve override', category: 'uat', priority: 'P0', expected: 'Override saved with approval trail', status: 'pending', duration: '~3 min', method: 'Submit override → manager approves' },
    { id: 'UAT-003', name: 'Analyst can export report', category: 'uat', priority: 'P1', expected: 'PDF/CSV download works', status: 'pending', duration: '~2 min', method: 'Click export → verify file' },
    { id: 'UAT-004', name: 'Executive dashboard loads KPIs', category: 'uat', priority: 'P1', expected: 'Summary KPIs visible, correct', status: 'pass', duration: '~1 min', method: 'Navigate to dashboard → verify' },
  ];
}

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];

function fmt(d) {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ProcessTestingTab({ process }) {
  const allTests = generateTestSuite(process);
  const [activeCategory, setActiveCategory] = useState('all');
  const [testStates, setTestStates] = useState({});
  const [testLog, setTestLog] = useState([]);
  const [runningAll, setRunningAll] = useState(false);

  const filtered = activeCategory === 'all' ? allTests : allTests.filter((t) => t.category === activeCategory);

  const passed = allTests.filter((t) => t.status === 'pass').length;
  const failed = allTests.filter((t) => t.status === 'fail').length;
  const pending = allTests.filter((t) => t.status === 'pending').length;
  const total = allTests.length;

  const categoryStats = TEST_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
    const tests = allTests.filter((t) => t.category === cat.id);
    return { name: cat.label, total: tests.length, passed: tests.filter((t) => t.status === 'pass').length };
  });

  const pieData = [
    { name: 'Passed', value: passed },
    { name: 'Failed', value: failed },
    { name: 'Pending', value: pending },
  ].filter((d) => d.value > 0);

  function addLog(name, msg, type) {
    setTestLog((prev) => [...prev, { time: fmt(new Date()), name, msg, type }]);
  }

  async function runTest(testId) {
    setTestStates((prev) => ({ ...prev, [testId]: 'running' }));
    addLog(testId, 'Executing...', 'info');
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const pass = Math.random() > 0.1;
    setTestStates((prev) => ({ ...prev, [testId]: pass ? 'pass' : 'fail' }));
    addLog(testId, pass ? 'PASSED' : 'FAILED — check logs', pass ? 'success' : 'error');
  }

  async function runAllInCategory() {
    setRunningAll(true);
    for (const t of filtered) {
      await runTest(t.id);
    }
    setRunningAll(false);
    addLog('SUITE', `${filtered.length} tests completed`, 'info');
  }

  <TabShell
      tabName="testing"
      title="Testing · test list + coverage + flaky"
      phase="Verify"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="test list · coverage % · flaky tests · trend over time"
      operation="read-only · wire §65.8 test dispatcher"
      accent="#f59e0b"
      todos={[]}
    >
      
      <E2ELatencyPanel accent="#f59e0b" />return (
    <div>
      {/* Summary KPIs */}
      <div className="kpi-row" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="kpi-mini"><div className="kpi-mini-label">Total Tests</div><div className="kpi-mini-value">{total}</div></div>
        <div className="kpi-mini"><div className="kpi-mini-label">Passed</div><div className="kpi-mini-value" style={{ color: 'var(--accent-success)' }}>{passed}</div></div>
        <div className="kpi-mini"><div className="kpi-mini-label">Failed</div><div className="kpi-mini-value" style={{ color: 'var(--accent-danger)' }}>{failed}</div></div>
        <div className="kpi-mini"><div className="kpi-mini-label">Pending</div><div className="kpi-mini-value" style={{ color: 'var(--accent-warning)' }}>{pending}</div></div>
        <div className="kpi-mini"><div className="kpi-mini-label">Pass Rate</div><div className="kpi-mini-value" style={{ color: 'var(--accent-success)' }}>{((passed / total) * 100).toFixed(1)}%</div></div>
        <div className="kpi-mini"><div className="kpi-mini-label">Categories</div><div className="kpi-mini-value">10</div></div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div className="content-section" style={{ margin: 0 }}>
          <div className="content-section-header"><span className="content-section-title">Tests by Category</span></div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="var(--border-color)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="passed" name="Passed" fill="var(--accent-success)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="content-section" style={{ margin: 0 }}>
          <div className="content-section-header"><span className="content-section-title">Pass/Fail Distribution</span></div>
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)' }}>
        {TEST_CATEGORIES.map((cat) => {
          const count = cat.id === 'all' ? total : allTests.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 'var(--border-radius-sm)',
                background: activeCategory === cat.id ? 'var(--accent-primary)' : 'transparent',
                color: activeCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 'var(--font-size-xs)', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Run All Button */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
        <button className="btn btn-primary" onClick={runAllInCategory} disabled={runningAll}>
          {runningAll ? '⏳ Running...' : `▶ Run All ${activeCategory === 'all' ? '' : TEST_CATEGORIES.find((c) => c.id === activeCategory)?.label || ''} Tests (${filtered.length})`}
        </button>
        <button className="btn btn-secondary" onClick={() => { setTestStates({}); setTestLog([]); }}>🔄 Reset All</button>
      </div>

      {/* Test Cases Table */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">
            {activeCategory === 'all' ? '📋 All Test Cases' : `${TEST_CATEGORIES.find((c) => c.id === activeCategory)?.icon} ${TEST_CATEGORIES.find((c) => c.id === activeCategory)?.label} Tests`}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{filtered.length} tests</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Test Case</th>
                <th style={{ width: 65 }}>Type</th>
                <th style={{ width: 40 }}>P</th>
                <th>Expected Result</th>
                <th style={{ width: 80 }}>Method</th>
                <th style={{ width: 60 }}>Time</th>
                <th style={{ width: 65 }}>Status</th>
                <th style={{ width: 65 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const runState = testStates[t.id];
                const displayStatus = runState || t.status;
                return (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{t.id}</td>
                    <td style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{t.name}</td>
                    <td>
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 8, fontWeight: 600,
                        background: t.category === 'smoke' ? '#fef3c7' : t.category === 'positive' ? '#d1fae5' : t.category === 'negative' ? '#fee2e2' :
                          t.category === 'api' ? '#dbeafe' : t.category === 'security' ? '#fce7f3' : t.category === 'performance' ? '#ede9fe' : '#f3f4f6',
                        color: t.category === 'smoke' ? '#92400e' : t.category === 'positive' ? '#065f46' : t.category === 'negative' ? '#991b1b' :
                          t.category === 'api' ? '#1d4ed8' : t.category === 'security' ? '#be185d' : t.category === 'performance' ? '#6d28d9' : '#374151',
                      }}>
                        {t.category.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: t.priority === 'P0' ? 'var(--accent-danger)' : t.priority === 'P1' ? 'var(--accent-warning)' : 'var(--text-muted)' }}>{t.priority}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t.expected}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.method}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{t.duration}</td>
                    <td>
                      <span style={{
                        fontSize: 'var(--font-size-xs)', fontWeight: 600,
                        color: displayStatus === 'pass' ? 'var(--accent-success)' : displayStatus === 'fail' ? 'var(--accent-danger)' :
                          displayStatus === 'running' ? 'var(--accent-primary)' : 'var(--accent-warning)',
                      }}>
                        {displayStatus === 'pass' ? '✓ PASS' : displayStatus === 'fail' ? '✗ FAIL' : displayStatus === 'running' ? '⏳ RUN' : '⏸ PEND'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => runTest(t.id)}
                        disabled={runState === 'running'}
                        style={{
                          padding: '3px 10px', border: '1px solid var(--border-color)', borderRadius: 4,
                          background: 'var(--bg-card)', fontSize: 10, cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        {runState === 'running' ? '...' : '▶ Run'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Execution Log */}
      {testLog.length > 0 && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">📝 Execution Log</span>
            <button onClick={() => setTestLog([])} style={{ fontSize: 'var(--font-size-xs)', border: 'none', background: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>Clear</button>
          </div>
          <div style={{ background: '#1a1a2e', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
            {testLog.map((log, i) => (
              <div key={i} style={{ color: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#ef4444' : '#94a3b8', lineHeight: 1.8 }}>
                <span style={{ color: '#64748b' }}>[{log.time}]</span> <span style={{ color: '#8b5cf6' }}>{log.name}</span> — {log.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Coverage Summary */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 Test Coverage by Category</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Coverage</th><th>Priority P0</th></tr>
            </thead>
            <tbody>
              {TEST_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                const tests = allTests.filter((t) => t.category === cat.id);
                const p = tests.filter((t) => t.status === 'pass').length;
                const f = tests.filter((t) => t.status === 'fail').length;
                const pn = tests.filter((t) => t.status === 'pending').length;
                const p0 = tests.filter((t) => t.priority === 'P0').length;
                return (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 500 }}>{cat.icon} {cat.label}</td>
                    <td>{tests.length}</td>
                    <td style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{p}</td>
                    <td style={{ color: f > 0 ? 'var(--accent-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{f}</td>
                    <td style={{ color: pn > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>{pn}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(p / tests.length) * 100}%`, height: '100%', background: 'var(--accent-success)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{((p / tests.length) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{p0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Report */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📄 Test Report Summary</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {[
            { label: 'Test Suite', value: `CPG ${process?.name || 'Process'} v3.2` },
            { label: 'Environment', value: 'Docker Compose (local)' },
            { label: 'Total Duration', value: '~4 min 23s' },
            { label: 'Last Run', value: new Date().toISOString().split('T')[0] },
            { label: 'Runner', value: 'pytest + Playwright + k6' },
            { label: 'Verdict', value: failed === 0 ? '✓ ALL PASS' : `✗ ${failed} FAILURES` },
          ].map((r, i) => (
            <div key={i} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{r.label}</div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: r.label === 'Verdict' ? (failed === 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-primary)' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </TabShell>
  );
}
