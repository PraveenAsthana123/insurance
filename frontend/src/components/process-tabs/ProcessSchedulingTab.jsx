import { useState } from 'react';
import {
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadialBarChart, RadialBar, Legend,
} from 'recharts';

/* ─── Sample Data ─────────────────────────────────────────── */

const SCHEDULE_TEMPLATES = [
  { name: 'Daily Forecast Refresh', type: 'Prediction', cron: '0 6 * * *', desc: 'Runs demand forecast every day at 6 AM', priority: 'High' },
  { name: 'Weekly Model Retrain', type: 'Training', cron: '0 2 * * 0', desc: 'Retrains model every Sunday at 2 AM', priority: 'Medium' },
  { name: 'Hourly Drift Check', type: 'Drift Check', cron: '0 * * * *', desc: 'PSI/CSI drift check every hour', priority: 'High' },
  { name: 'Monthly Report', type: 'Report Generation', cron: '0 8 1 * *', desc: 'Generates full report on 1st of each month', priority: 'Low' },
  { name: 'Real-time Demand Sensing', type: 'ETL Pipeline', cron: '*/15 * * * *', desc: 'Demand signal refresh every 15 minutes', priority: 'Critical' },
];

const INIT_SCHEDULES = [
  { id: 1, name: 'Daily Forecast Refresh', type: 'Prediction', schedule: '0 6 * * *', scheduleLabel: 'Daily 6 AM', nextRun: '2026-04-19 06:00', lastRun: '2026-04-18 06:00', status: 'Active', duration: '4m 12s', successRate: 98.2, priority: 'High' },
  { id: 2, name: 'Weekly Model Retrain', type: 'Training', schedule: '0 2 * * 0', scheduleLabel: 'Weekly Sun 2 AM', nextRun: '2026-04-20 02:00', lastRun: '2026-04-13 02:00', status: 'Active', duration: '22m 47s', successRate: 95.0, priority: 'Medium' },
  { id: 3, name: 'Hourly Drift Check', type: 'Drift Check', schedule: '0 * * * *', scheduleLabel: 'Hourly', nextRun: '2026-04-18 15:00', lastRun: '2026-04-18 14:00', status: 'Active', duration: '1m 03s', successRate: 99.7, priority: 'High' },
  { id: 4, name: 'Monthly Report', type: 'Report Generation', schedule: '0 8 1 * *', scheduleLabel: 'Monthly 1st', nextRun: '2026-05-01 08:00', lastRun: '2026-04-01 08:00', status: 'Paused', duration: '8m 30s', successRate: 100, priority: 'Low' },
  { id: 5, name: 'Real-time Demand Sensing', type: 'ETL Pipeline', schedule: '*/15 * * * *', scheduleLabel: 'Every 15 min', nextRun: '2026-04-18 14:15', lastRun: '2026-04-18 14:00', status: 'Active', duration: '0m 45s', successRate: 97.8, priority: 'Critical' },
  { id: 6, name: 'Data Quality Scan', type: 'Data Refresh', schedule: '0 3 * * *', scheduleLabel: 'Daily 3 AM', nextRun: '2026-04-19 03:00', lastRun: '2026-04-18 03:00', status: 'Active', duration: '3m 18s', successRate: 96.5, priority: 'Medium' },
  { id: 7, name: 'Feature Engineering Run', type: 'ETL Pipeline', schedule: '30 5 * * *', scheduleLabel: 'Daily 5:30 AM', nextRun: '2026-04-19 05:30', lastRun: '2026-04-18 05:30', status: 'Failed', duration: '6m 02s', successRate: 88.1, priority: 'High' },
  { id: 8, name: 'Competitor Price Scrape', type: 'Data Refresh', schedule: '0 */4 * * *', scheduleLabel: 'Every 4 hrs', nextRun: '2026-04-18 16:00', lastRun: '2026-04-18 12:00', status: 'Active', duration: '2m 55s', successRate: 91.3, priority: 'Medium' },
];

const HISTORY = [
  { id: 'RUN-20241', job: 'Daily Forecast Refresh', started: '2026-04-18 06:00', duration: '4m 12s', status: 'Success', trigger: 'Scheduled', rows: '142,800', model: 'XGBoost v3.2', accuracy: '94.1%' },
  { id: 'RUN-20240', job: 'Hourly Drift Check', started: '2026-04-18 05:00', duration: '1m 02s', status: 'Success', trigger: 'Scheduled', rows: '8,400', model: 'PSI Monitor', accuracy: 'PSI=0.04' },
  { id: 'RUN-20239', job: 'Feature Engineering Run', started: '2026-04-18 05:30', duration: '6m 02s', status: 'Failed', trigger: 'Scheduled', rows: '—', model: 'dbt Pipeline', accuracy: '—' },
  { id: 'RUN-20238', job: 'Real-time Demand Sensing', started: '2026-04-18 05:15', duration: '0m 43s', status: 'Success', trigger: 'Scheduled', rows: '22,100', model: 'LSTM v1.4', accuracy: '92.8%' },
  { id: 'RUN-20237', job: 'Data Quality Scan', started: '2026-04-18 03:00', duration: '3m 19s', status: 'Success', trigger: 'Scheduled', rows: '180,000', model: 'Great Expectations', accuracy: '98.4%' },
  { id: 'RUN-20236', job: 'Daily Forecast Refresh', started: '2026-04-17 06:00', duration: '4m 05s', status: 'Success', trigger: 'Scheduled', rows: '141,200', model: 'XGBoost v3.2', accuracy: '93.8%' },
  { id: 'RUN-20235', job: 'Weekly Model Retrain', started: '2026-04-13 02:00', duration: '22m 47s', status: 'Success', trigger: 'Scheduled', rows: '980,000', model: 'XGBoost v3.2', accuracy: '94.6%' },
  { id: 'RUN-20234', job: 'Competitor Price Scrape', started: '2026-04-18 04:00', duration: '2m 58s', status: 'Success', trigger: 'Scheduled', rows: '3,600', model: 'Scraper v2', accuracy: '—' },
  { id: 'RUN-20233', job: 'Hourly Drift Check', started: '2026-04-18 04:00', duration: '1m 05s', status: 'Success', trigger: 'Scheduled', rows: '8,400', model: 'PSI Monitor', accuracy: 'PSI=0.03' },
  { id: 'RUN-20232', job: 'Real-time Demand Sensing', started: '2026-04-18 04:00', duration: '0m 48s', status: 'Success', trigger: 'Scheduled', rows: '21,800', model: 'LSTM v1.4', accuracy: '93.1%' },
  { id: 'RUN-20231', job: 'Daily Forecast Refresh', started: '2026-04-16 06:00', duration: '4m 22s', status: 'Success', trigger: 'Scheduled', rows: '140,500', model: 'XGBoost v3.2', accuracy: '93.5%' },
  { id: 'RUN-20230', job: 'Feature Engineering Run', started: '2026-04-17 05:30', duration: '5m 48s', status: 'Success', trigger: 'Scheduled', rows: '175,000', model: 'dbt Pipeline', accuracy: '—' },
  { id: 'RUN-20229', job: 'Monthly Report', started: '2026-04-01 08:00', duration: '8m 30s', status: 'Success', trigger: 'Scheduled', rows: '4,200,000', model: 'Report Engine', accuracy: '—' },
  { id: 'RUN-20228', job: 'Hourly Drift Check', started: '2026-04-18 03:00', duration: '1m 01s', status: 'Cancelled', trigger: 'Manual', rows: '—', model: 'PSI Monitor', accuracy: '—' },
  { id: 'RUN-20227', job: 'Data Quality Scan', started: '2026-04-17 03:00', duration: '3m 44s', status: 'Success', trigger: 'Scheduled', rows: '178,200', model: 'Great Expectations', accuracy: '97.9%' },
  { id: 'RUN-20226', job: 'Weekly Model Retrain', started: '2026-04-06 02:00', duration: '24m 12s', status: 'Success', trigger: 'Scheduled', rows: '950,000', model: 'XGBoost v3.1', accuracy: '93.9%' },
  { id: 'RUN-20225', job: 'Real-time Demand Sensing', started: '2026-04-18 03:30', duration: '0m 52s', status: 'Running', trigger: 'Scheduled', rows: '21,000', model: 'LSTM v1.4', accuracy: '—' },
];

const QUEUE = [
  { id: 'RUN-20242', job: 'Real-time Demand Sensing', priority: 'Critical', status: 'Running', progress: 62, eta: '18s', position: null },
  { id: 'RUN-20243', job: 'Hourly Drift Check', priority: 'High', status: 'Queued', progress: 0, eta: '~2m', position: 1 },
  { id: 'RUN-20244', job: 'Competitor Price Scrape', priority: 'Medium', status: 'Queued', progress: 0, eta: '~4m', position: 2 },
  { id: 'RUN-20245', job: 'Data Quality Scan', priority: 'Medium', status: 'Queued', progress: 0, eta: '~6m', position: 3 },
];

const JOB_METRICS_BAR = [
  { day: 'Apr 5', jobs: 14 }, { day: 'Apr 6', jobs: 18 }, { day: 'Apr 7', jobs: 12 },
  { day: 'Apr 8', jobs: 20 }, { day: 'Apr 9', jobs: 16 }, { day: 'Apr 10', jobs: 22 },
  { day: 'Apr 11', jobs: 19 }, { day: 'Apr 12', jobs: 15 }, { day: 'Apr 13', jobs: 24 },
  { day: 'Apr 14', jobs: 21 }, { day: 'Apr 15', jobs: 17 }, { day: 'Apr 16', jobs: 23 },
  { day: 'Apr 17', jobs: 20 }, { day: 'Apr 18', jobs: 11 },
];

const SUCCESS_RATE = [
  { day: 'Apr 5', rate: 96 }, { day: 'Apr 6', rate: 98 }, { day: 'Apr 7', rate: 94 },
  { day: 'Apr 8', rate: 99 }, { day: 'Apr 9', rate: 97 }, { day: 'Apr 10', rate: 100 },
  { day: 'Apr 11', rate: 95 }, { day: 'Apr 12', rate: 98 }, { day: 'Apr 13', rate: 97 },
  { day: 'Apr 14', rate: 99 }, { day: 'Apr 15', rate: 96 }, { day: 'Apr 16', rate: 98 },
  { day: 'Apr 17', rate: 100 }, { day: 'Apr 18', rate: 97 },
];

const AVG_DURATION = [
  { type: 'Training', avg: 22.8 },
  { type: 'Report Gen', avg: 8.5 },
  { type: 'ETL Pipeline', avg: 3.6 },
  { type: 'Data Refresh', avg: 3.1 },
  { type: 'Drift Check', avg: 1.1 },
  { type: 'Prediction', avg: 4.2 },
];

const RESOURCE_DATA = [
  { name: 'CPU', value: 68, fill: '#6366f1' },
  { name: 'Memory', value: 74, fill: '#10b981' },
];

const ALERT_RULES = [
  { condition: 'Job failed', threshold: 'Any failure', channel: 'Slack + Email', status: 'Active' },
  { condition: 'Duration > 2× average', threshold: '>200% of avg', channel: 'Slack', status: 'Active' },
  { condition: 'Accuracy dropped > 5%', threshold: 'Δ > 5%', channel: 'Email + PagerDuty', status: 'Active' },
  { condition: 'Drift detected (PSI > 0.1)', threshold: 'PSI > 0.1', channel: 'Slack', status: 'Active' },
  { condition: 'Data quality below 95%', threshold: 'Quality < 95%', channel: 'Email', status: 'Paused' },
];

const RECENT_ALERTS = [
  { time: '2026-04-18 05:31', message: 'Feature Engineering Run FAILED — exit code 1', level: 'error' },
  { time: '2026-04-18 04:12', message: 'Accuracy dropped 5.2% on Daily Forecast Refresh', level: 'warning' },
  { time: '2026-04-17 09:00', message: 'Hourly Drift Check cancelled manually', level: 'info' },
  { time: '2026-04-16 06:00', message: 'Daily Forecast Refresh succeeded — 94.1% accuracy', level: 'success' },
  { time: '2026-04-13 02:48', message: 'Weekly Model Retrain completed in 22m 47s', level: 'success' },
];

const WORKERS = [
  { id: 'worker-1', status: 'Active', completed: 1284, current: 'Real-time Demand Sensing (RUN-20242)' },
  { id: 'worker-2', status: 'Active', completed: 976, current: 'Idle — waiting for next task' },
];

const DAG_NODES = [
  { id: 'refresh', label: 'Data Refresh', icon: '🔄', lastRun: '03:00', next: '03:00+1d', status: 'ok' },
  { id: 'etl', label: 'ETL Pipeline', icon: '⚙️', lastRun: '05:30', next: '05:30+1d', status: 'failed' },
  { id: 'features', label: 'Feature Eng.', icon: '🛠️', lastRun: '05:50', next: '05:50+1d', status: 'ok' },
  { id: 'training', label: 'Training', icon: '🧠', lastRun: 'Sun 02:00', next: 'Sun 02:00', status: 'ok' },
  { id: 'eval', label: 'Evaluation', icon: '📊', lastRun: 'Sun 02:22', next: 'Sun 02:22', status: 'ok' },
  { id: 'deploy', label: 'Deploy', icon: '🚀', lastRun: 'Sun 02:45', next: 'Sun 02:45', status: 'ok' },
  { id: 'monitor', label: 'Monitor', icon: '📡', lastRun: '14:00', next: '15:00', status: 'ok' },
];

/* ─── Helpers ─────────────────────────────────────────────── */

const STATUS_COLOR = {
  Active: '#10b981', Paused: '#f59e0b', Failed: '#ef4444',
  Completed: '#6366f1', Running: '#3b82f6', Cancelled: '#9ca3af',
  Success: '#10b981', Queued: '#f59e0b', ok: '#10b981', failed: '#ef4444',
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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="content-section-header">
      <span className="content-section-title">{title}</span>
      {subtitle && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{subtitle}</span>}
    </div>
  );
}

/* ─── Sub-sections ────────────────────────────────────────── */

function CreateScheduleForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'Prediction', scheduleType: 'Daily', cron: '0 6 * * *',
    dataPath: '/data/forecast/', model: 'XGBoost v3.2', priority: 'Medium',
    notifyEmail: false, notifySlack: false, notifyWebhook: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onAdd(form);
  };

  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', border: '1px solid var(--border-color)' }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
        Create New Schedule
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Job Name</label>
          <input
            type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. My Daily Job"
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Job Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            {['Training', 'Prediction', 'ETL Pipeline', 'Data Refresh', 'Drift Check', 'Report Generation'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Schedule Type</label>
          <select value={form.scheduleType} onChange={(e) => set('scheduleType', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            {['One-time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Cron Expression'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {form.scheduleType === 'Cron Expression' && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cron Expression</label>
            <input type="text" value={form.cron} onChange={(e) => set('cron', e.target.value)}
              placeholder="0 6 * * *"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace' }} />
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Data Path</label>
          <input type="text" value={form.dataPath} onChange={(e) => set('dataPath', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Model</label>
          <select value={form.model} onChange={(e) => set('model', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            {['XGBoost v3.2', 'LSTM v1.4', 'LightGBM v2.1', 'Prophet v1.0', 'Random Forest v2.5'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Notifications</label>
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          {[['notifyEmail', 'Email'], ['notifySlack', 'Slack'], ['notifyWebhook', 'Webhook']].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <button onClick={handleSubmit}
          style={{ padding: '7px 18px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Schedule Job
        </button>
        <button onClick={onCancel}
          style={{ padding: '7px 18px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScheduleManager({ schedules, setSchedules }) {
  const [showForm, setShowForm] = useState(false);

  const addSchedule = (form) => {
    const next = {
      id: schedules.length + 1,
      name: form.name,
      type: form.type,
      schedule: form.scheduleType === 'Cron Expression' ? form.cron : form.scheduleType.toLowerCase(),
      scheduleLabel: form.scheduleType,
      nextRun: '—',
      lastRun: '—',
      status: 'Active',
      duration: '—',
      successRate: 100,
      priority: form.priority,
    };
    setSchedules((prev) => [next, ...prev]);
    setShowForm(false);
  };

  const toggleStatus = (id) => {
    setSchedules((prev) => prev.map((s) => s.id === id
      ? { ...s, status: s.status === 'Active' ? 'Paused' : 'Active' }
      : s));
  };

  const removeSchedule = (id) => setSchedules((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="content-section">
      <SectionHeader title="🗓️ Schedule Manager" subtitle={`${schedules.length} schedules configured`} />

      {/* Templates */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>PRE-BUILT TEMPLATES</div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          {SCHEDULE_TEMPLATES.map((t) => (
            <div key={t.name}
              onClick={() => {
                setSchedules((prev) => [{
                  id: prev.length + 1, name: t.name, type: t.type,
                  schedule: t.cron, scheduleLabel: t.cron, nextRun: '—', lastRun: '—',
                  status: 'Active', duration: '—', successRate: 100, priority: t.priority,
                }, ...prev]);
              }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border-color)', cursor: 'pointer', background: 'var(--bg-hover)', minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>{t.cron}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ marginBottom: 'var(--spacing-md)', padding: '7px 18px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Create Schedule
        </button>
      )}
      {showForm && <CreateScheduleForm onAdd={addSchedule} onCancel={() => setShowForm(false)} />}

      {/* Active Schedules Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job Name</th><th>Type</th><th>Schedule</th><th>Next Run</th>
              <th>Last Run</th><th>Status</th><th>Duration</th><th>Success Rate</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>{s.type}</span></td>
                <td><code style={{ fontSize: 11 }}>{s.schedule}</code></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.nextRun}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.lastRun}</td>
                <td><Badge text={s.status} color={STATUS_COLOR[s.status] || '#9ca3af'} /></td>
                <td style={{ fontSize: 12 }}>{s.duration}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, minWidth: 50 }}>
                      <div style={{ height: '100%', width: `${s.successRate}%`, background: s.successRate > 95 ? '#10b981' : s.successRate > 85 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, width: 36 }}>{s.successRate}%</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => {}} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #6366f133', background: '#6366f110', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Run Now</button>
                    <button onClick={() => toggleStatus(s.id)} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {s.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => removeSchedule(s.id)} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #ef444433', background: '#ef444410', color: '#ef4444', cursor: 'pointer' }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecutionHistory() {
  return (
    <div className="content-section">
      <SectionHeader title="📜 Job Execution History" subtitle={`${HISTORY.length} recent runs`} />
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Run ID</th><th>Job Name</th><th>Started</th><th>Duration</th>
              <th>Status</th><th>Trigger</th><th>Data Rows</th><th>Model</th><th>Accuracy</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h) => (
              <tr key={h.id}>
                <td><code style={{ fontSize: 11 }}>{h.id}</code></td>
                <td style={{ fontWeight: 600 }}>{h.job}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.started}</td>
                <td style={{ fontSize: 12 }}>{h.duration}</td>
                <td><Badge text={h.status} color={STATUS_COLOR[h.status] || '#9ca3af'} /></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.trigger}</td>
                <td style={{ fontSize: 12 }}>{h.rows}</td>
                <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{h.model}</td>
                <td style={{ fontSize: 12, fontWeight: 600 }}>{h.accuracy}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Logs</button>
                    {h.status === 'Success' && <button style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Results</button>}
                    <button style={{ padding: '2px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #6366f133', background: '#6366f110', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Rerun</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobQueue() {
  return (
    <div className="content-section">
      <SectionHeader title="⏳ Job Queue — Live View" subtitle="Real-time execution status" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {QUEUE.map((q) => (
          <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: 80, textAlign: 'center' }}>
              <Badge text={q.status} color={STATUS_COLOR[q.status] || '#9ca3af'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{q.job}</div>
              <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.id}</code>
            </div>
            <div style={{ width: 80 }}>
              <Badge text={q.priority} color={PRIORITY_COLOR[q.priority]} />
            </div>
            {q.status === 'Running' ? (
              <div style={{ flex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontWeight: 700 }}>{q.progress}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${q.progress}%`, background: '#3b82f6', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            ) : (
              <div style={{ flex: 2, fontSize: 12, color: 'var(--text-secondary)' }}>
                Queue position #{q.position} — Est. start: {q.eta}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 50 }}>ETA: {q.eta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineDAG() {
  return (
    <div className="content-section">
      <SectionHeader title="🔀 Pipeline DAG — Scheduled Job Dependencies" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: 'var(--spacing-md) 0' }}>
        {DAG_NODES.map((node, i) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              textAlign: 'center', padding: '14px 18px', borderRadius: 10, minWidth: 100,
              background: node.status === 'failed' ? '#ef444415' : 'var(--bg-hover)',
              border: `2px solid ${node.status === 'failed' ? '#ef4444' : STATUS_COLOR.Active}`,
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{node.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>{node.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Last: {node.lastRun}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Next: {node.next}</div>
              <div style={{ marginTop: 6 }}><Badge text={node.status === 'ok' ? 'OK' : 'FAILED'} color={node.status === 'ok' ? '#10b981' : '#ef4444'} /></div>
            </div>
            {i < DAG_NODES.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-muted)', fontSize: 20 }}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function JobMetrics() {
  return (
    <div className="content-section">
      <SectionHeader title="📊 Job Metrics Dashboard" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Jobs Per Day (Last 14 Days)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={JOB_METRICS_BAR}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jobs" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Success Rate Over Time (%)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={SUCCESS_RATE}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Avg Duration by Job Type (min)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={AVG_DURATION} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="avg" fill="#f59e0b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Resource Utilization</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart innerRadius="30%" outerRadius="90%" data={RESOURCE_DATA} startAngle={180} endAngle={0}>
              <RadialBar minAngle={15} background clockWise dataKey="value" />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
              <Tooltip formatter={(v) => `${v}%`} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', justifyContent: 'center', marginTop: 'var(--spacing-sm)' }}>
            {RESOURCE_DATA.map((r) => (
              <div key={r.name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: r.fill }}>{r.value}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertingPanel() {
  return (
    <div className="content-section">
      <SectionHeader title="🔔 Alerting & Notifications" />
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Alert Rules</div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Condition</th><th>Threshold</th><th>Channel</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ALERT_RULES.map((r, i) => (
                <tr key={i}>
                  <td>{r.condition}</td>
                  <td><code style={{ fontSize: 12 }}>{r.threshold}</code></td>
                  <td style={{ fontSize: 12 }}>{r.channel}</td>
                  <td><Badge text={r.status} color={r.status === 'Active' ? '#10b981' : '#f59e0b'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Recent Alerts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {RECENT_ALERTS.map((a, i) => {
            const c = { error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' }[a.level];
            return (
              <div key={i} style={{ display: 'flex', gap: 'var(--spacing-sm)', padding: '8px 12px', background: `${c}0d`, borderRadius: 6, borderLeft: `3px solid ${c}` }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 130 }}>{a.time}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{a.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CeleryPanel() {
  return (
    <div className="content-section">
      <SectionHeader title="⚙️ Celery Worker Status" subtitle="Live task processing infrastructure" />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
        {/* Workers */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Workers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {WORKERS.map((w) => (
              <div key={w.id} style={{ padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{w.id}</span>
                  <Badge text={w.status} color={STATUS_COLOR.Active} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Current: <em>{w.current}</em>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tasks completed: {w.completed.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Redis Broker */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Redis Broker</div>
          <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Status', value: 'Connected', color: '#10b981' },
                { label: 'Queue Depth', value: '3 tasks' },
                { label: 'Memory', value: '48 MB / 512 MB' },
                { label: 'Uptime', value: '12d 4h 22m' },
                { label: 'Commands/sec', value: '142' },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.color || 'var(--text-primary)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */

const SUB_TABS = [
  { id: 'manager', label: 'Schedule Manager' },
  { id: 'history', label: 'Execution History' },
  { id: 'queue', label: 'Job Queue' },
  { id: 'dag', label: 'Pipeline DAG' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'celery', label: 'Worker Status' },
];

export default function ProcessSchedulingTab({ process: proc }) {
  const [subTab, setSubTab] = useState('manager');
  const [schedules, setSchedules] = useState(INIT_SCHEDULES);

  const activeCount = schedules.filter((s) => s.status === 'Active').length;
  const pausedCount = schedules.filter((s) => s.status === 'Paused').length;
  const failedCount = schedules.filter((s) => s.status === 'Failed').length;

  <TabShell
      tabName="scheduling"
      title="Scheduling · cron + last-run + next-run"
      phase="Operate"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P2"
      information="cron list · schedule editor · timezone · holiday calendar"
      operation="read-only · per-proc schedule pending"
      accent="#10b981"
      todos={[]}
    >
      return (
    <div>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        {[
          { label: 'Total Schedules', value: schedules.length, icon: '🗓️', color: '#6366f1' },
          { label: 'Active', value: activeCount, icon: '✅', color: '#10b981' },
          { label: 'Paused', value: pausedCount, icon: '⏸️', color: '#f59e0b' },
          { label: 'Failed', value: failedCount, icon: '❌', color: '#ef4444' },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 22 }}>{kpi.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, margin: '4px 0' }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: subTab === t.id ? 'var(--accent-primary)' : 'var(--bg-hover)',
              color: subTab === t.id ? '#fff' : 'var(--text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'manager' && <ScheduleManager schedules={schedules} setSchedules={setSchedules} />}
      {subTab === 'history' && <ExecutionHistory />}
      {subTab === 'queue' && <JobQueue />}
      {subTab === 'dag' && <PipelineDAG />}
      {subTab === 'metrics' && <JobMetrics />}
      {subTab === 'alerts' && <AlertingPanel />}
      {subTab === 'celery' && <CeleryPanel />}
    </div>
    </TabShell>
  );
}
