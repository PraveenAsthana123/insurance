import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Sample Data ─────────────────────────────────────────── */

const ALL_JOBS = [
  { process: 'Demand Forecasting', name: 'Daily Forecast Refresh', type: 'Prediction', schedule: '0 6 * * *', nextRun: '2026-04-19 06:00', status: 'Active', priority: 'High', successRate: 98.2 },
  { process: 'Demand Forecasting', name: 'Weekly Model Retrain', type: 'Training', schedule: '0 2 * * 0', nextRun: '2026-04-20 02:00', status: 'Active', priority: 'Medium', successRate: 95.0 },
  { process: 'Demand Forecasting', name: 'Hourly Drift Check', type: 'Drift Check', schedule: '0 * * * *', nextRun: '2026-04-18 15:00', status: 'Active', priority: 'High', successRate: 99.7 },
  { process: 'Pricing Optimization', name: 'Competitor Price Scrape', type: 'Data Refresh', schedule: '0 */4 * * *', nextRun: '2026-04-18 16:00', status: 'Active', priority: 'Medium', successRate: 91.3 },
  { process: 'Pricing Optimization', name: 'Price Optimization Run', type: 'Prediction', schedule: '30 5 * * *', nextRun: '2026-04-19 05:30', status: 'Active', priority: 'High', successRate: 96.1 },
  { process: 'Promotions', name: 'Promo Lift Model Retrain', type: 'Training', schedule: '0 3 * * 1', nextRun: '2026-04-21 03:00', status: 'Paused', priority: 'Medium', successRate: 88.5 },
  { process: 'Promotions', name: 'Post-Promo Report', type: 'Report Generation', schedule: '0 8 1 * *', nextRun: '2026-05-01 08:00', status: 'Active', priority: 'Low', successRate: 100 },
  { process: 'Inventory', name: 'Inventory ETL Pipeline', type: 'ETL Pipeline', schedule: '0 4 * * *', nextRun: '2026-04-19 04:00', status: 'Active', priority: 'Critical', successRate: 97.4 },
  { process: 'Inventory', name: 'Stock Alert Check', type: 'Drift Check', schedule: '*/30 * * * *', nextRun: '2026-04-18 14:30', status: 'Active', priority: 'Critical', successRate: 99.2 },
  { process: 'Supply Chain', name: 'Supplier Data Sync', type: 'Data Refresh', schedule: '0 2 * * *', nextRun: '2026-04-19 02:00', status: 'Active', priority: 'High', successRate: 94.8 },
  { process: 'Supply Chain', name: 'Lead Time Prediction', type: 'Prediction', schedule: '0 7 * * 1-5', nextRun: '2026-04-19 07:00', status: 'Active', priority: 'Medium', successRate: 93.2 },
  { process: 'Customer Insights', name: 'Churn Scoring Run', type: 'Prediction', schedule: '0 5 * * *', nextRun: '2026-04-19 05:00', status: 'Active', priority: 'High', successRate: 97.8 },
  { process: 'Customer Insights', name: 'Segment Model Refresh', type: 'Training', schedule: '0 1 * * 0', nextRun: '2026-04-20 01:00', status: 'Active', priority: 'Medium', successRate: 92.6 },
  { process: 'Sales Analytics', name: 'Daily Sales ETL', type: 'ETL Pipeline', schedule: '0 0 * * *', nextRun: '2026-04-19 00:00', status: 'Active', priority: 'Critical', successRate: 98.9 },
  { process: 'Sales Analytics', name: 'Weekly Sales Report', type: 'Report Generation', schedule: '0 9 * * 1', nextRun: '2026-04-21 09:00', status: 'Active', priority: 'Low', successRate: 100 },
];

const CALENDAR_DATA = [
  { day: 'Mon', jobs: 18 }, { day: 'Tue', jobs: 22 }, { day: 'Wed', jobs: 19 },
  { day: 'Thu', jobs: 24 }, { day: 'Fri', jobs: 21 }, { day: 'Sat', jobs: 10 }, { day: 'Sun', jobs: 14 },
];

const PROCESS_DEPS = [
  { from: 'Demand Forecasting', to: 'Inventory' },
  { from: 'Demand Forecasting', to: 'Pricing Optimization' },
  { from: 'Inventory', to: 'Supply Chain' },
  { from: 'Pricing Optimization', to: 'Promotions' },
  { from: 'Sales Analytics', to: 'Customer Insights' },
];

/* ─── Helpers ─────────────────────────────────────────────── */

const STATUS_COLOR = {
  Active: '#10b981', Paused: '#f59e0b', Failed: '#ef4444', Completed: '#6366f1',
};

const PRIORITY_COLOR = {
  Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#6366f1',
};

function Badge({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{text}</span>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export default function SchedulingTab({ dept }) {
  const deptJobs = ALL_JOBS; // In a real app, filter by dept.id
  const activeCount = deptJobs.filter((j) => j.status === 'Active').length;
  const pausedCount = deptJobs.filter((j) => j.status === 'Paused').length;
  const failedCount = deptJobs.filter((j) => j.status === 'Failed').length;
  const avgSuccess = (deptJobs.reduce((a, j) => a + j.successRate, 0) / deptJobs.length).toFixed(1);

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        {[
          { label: 'Total Scheduled Jobs', value: deptJobs.length, icon: '🗓️', color: '#6366f1' },
          { label: 'Active', value: activeCount, icon: '✅', color: '#10b981' },
          { label: 'Paused', value: pausedCount, icon: '⏸️', color: '#f59e0b' },
          { label: 'Avg Success Rate', value: `${avgSuccess}%`, icon: '📈', color: '#3b82f6' },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 22 }}>{kpi.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, margin: '4px 0' }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* All Jobs Table */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📋 All Scheduled Jobs — {dept.name}</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Process</th><th>Job Name</th><th>Type</th><th>Schedule</th>
                <th>Next Run</th><th>Status</th><th>Priority</th><th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {deptJobs.map((j, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.process}</td>
                  <td style={{ fontWeight: 600 }}>{j.name}</td>
                  <td><span style={{ fontSize: 11, background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>{j.type}</span></td>
                  <td><code style={{ fontSize: 11 }}>{j.schedule}</code></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{j.nextRun}</td>
                  <td><Badge text={j.status} color={STATUS_COLOR[j.status] || '#9ca3af'} /></td>
                  <td><Badge text={j.priority} color={PRIORITY_COLOR[j.priority]} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, minWidth: 50 }}>
                        <div style={{ height: '100%', width: `${j.successRate}%`, background: j.successRate > 95 ? '#10b981' : j.successRate > 85 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{j.successRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar Heat Map + Cross-Process Deps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">📅 Weekly Job Activity</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CALENDAR_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="jobs" fill="#6366f1" radius={[4, 4, 0, 0]} name="Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🔀 Cross-Process Dependencies</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PROCESS_DEPS.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{d.from}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent-primary)', flex: 1 }}>{d.to}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--spacing-md)', fontSize: 12, color: 'var(--text-muted)' }}>
            These dependencies determine job execution order across processes.
          </div>
        </div>
      </div>

      {/* Per-process breakdown */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">📊 Jobs by Process</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
          {Array.from(new Set(deptJobs.map((j) => j.process))).map((proc) => {
            const procJobs = deptJobs.filter((j) => j.process === proc);
            const active = procJobs.filter((j) => j.status === 'Active').length;
            return (
              <div key={proc} className="card" style={{ padding: 'var(--spacing-md)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{proc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>Total: <strong>{procJobs.length}</strong></span>
                  <span>Active: <strong style={{ color: '#10b981' }}>{active}</strong></span>
                </div>
                <div style={{ marginTop: 8, height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(active / procJobs.length) * 100}%`, background: '#10b981', borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
