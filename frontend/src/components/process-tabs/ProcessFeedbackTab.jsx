import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';
import CorrectionsPanel from '../CorrectionsPanel';
import FeedbackPanel from '../FeedbackPanel';

/* ─────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────── */
const REVIEW_QUEUE = [
  { id: 'PRD-001', sku: 'SKU-4821', store: 'STR-12', predicted: 342, override: 380, reason: 'Promo error', status: 'approved' },
  { id: 'PRD-002', sku: 'SKU-7203', store: 'STR-07', predicted: 128, override: null, reason: '', status: 'pending' },
  { id: 'PRD-003', sku: 'SKU-1190', store: 'STR-34', predicted: 570, override: 490, reason: 'External event', status: 'approved' },
  { id: 'PRD-004', sku: 'SKU-8854', store: 'STR-21', predicted: 95,  override: null, reason: '', status: 'pending' },
  { id: 'PRD-005', sku: 'SKU-3361', store: 'STR-05', predicted: 210, override: 195, reason: 'Data issue', status: 'approved' },
  { id: 'PRD-006', sku: 'SKU-6702', store: 'STR-18', predicted: 445, override: 300, reason: 'Model limitation', status: 'rejected' },
  { id: 'PRD-007', sku: 'SKU-9015', store: 'STR-09', predicted: 87,  override: null, reason: '', status: 'pending' },
  { id: 'PRD-008', sku: 'SKU-2234', store: 'STR-41', predicted: 623, override: 650, reason: 'Promo error', status: 'approved' },
  { id: 'PRD-009', sku: 'SKU-5579', store: 'STR-03', predicted: 178, override: null, reason: '', status: 'pending' },
  { id: 'PRD-010', sku: 'SKU-7891', store: 'STR-28', predicted: 399, override: 370, reason: 'External event', status: 'approved' },
];

const RECENT_FEEDBACK = [
  { id: 'FB-1240', prediction: 'PRD-003', accurate: false,  actual: 490, confidence: 'High',   category: 'External event',    note: 'Local weather disruption impacted demand', ts: '2026-04-18 09:12' },
  { id: 'FB-1241', prediction: 'PRD-005', accurate: false,  actual: 195, confidence: 'Medium', category: 'Data issue',        note: 'Stale promo data in source system', ts: '2026-04-18 09:18' },
  { id: 'FB-1242', prediction: 'PRD-008', accurate: true,   actual: null, confidence: 'High',  category: '',                  note: '', ts: '2026-04-18 09:31' },
  { id: 'FB-1243', prediction: 'PRD-001', accurate: false,  actual: 380, confidence: 'High',   category: 'Promo error',       note: 'Incorrect promo uplift applied', ts: '2026-04-18 09:44' },
  { id: 'FB-1244', prediction: 'PRD-010', accurate: true,   actual: null, confidence: 'Low',   category: '',                  note: 'Close enough for planning', ts: '2026-04-18 10:02' },
  { id: 'FB-1245', prediction: 'PRD-006', accurate: false,  actual: 300, confidence: 'High',   category: 'Model limitation',  note: 'Model underestimates post-restock demand', ts: '2026-04-18 10:15' },
  { id: 'FB-1246', prediction: 'PRD-002', accurate: true,   actual: null, confidence: 'Medium', category: '',                 note: '', ts: '2026-04-18 10:27' },
  { id: 'FB-1247', prediction: 'PRD-004', accurate: false,  actual: 112, confidence: 'Medium', category: 'External event',   note: 'Competitor promo not in data', ts: '2026-04-18 10:39' },
  { id: 'FB-1248', prediction: 'PRD-007', accurate: true,   actual: null, confidence: 'High',  category: '',                 note: '', ts: '2026-04-18 10:51' },
  { id: 'FB-1249', prediction: 'PRD-009', accurate: false,  actual: 145, confidence: 'Low',    category: 'Other',            note: 'Unclear — needs further investigation', ts: '2026-04-18 11:03' },
];

const RLHF_METRICS = [
  { metric: 'MAPE',               before: '9.2%', after: '7.8%', improvement: '-15.2%', dir: 'down' },
  { metric: 'Planner Satisfaction', before: '72%', after: '89%', improvement: '+23.6%', dir: 'up' },
  { metric: 'Override Rate',       before: '18%', after: '12%', improvement: '-33.3%', dir: 'down' },
  { metric: 'False Alarm Rate',    before: '14%', after: '8%',  improvement: '-42.9%', dir: 'down' },
  { metric: 'Reward Model Acc.',   before: '—',   after: '84%', improvement: 'New',    dir: 'up' },
  { metric: 'Policy Update Cycles',before: '—',   after: '6',   improvement: 'New',    dir: 'up' },
];

const LOSS_CURVE = Array.from({ length: 20 }, (_, i) => ({
  epoch: i + 1,
  trainLoss: parseFloat((0.85 - i * 0.033 + Math.random() * 0.015).toFixed(3)),
  valLoss:   parseFloat((0.91 - i * 0.030 + Math.random() * 0.018).toFixed(3)),
}));

const UNCERTAINTY_POOL = [
  { id: 'UNC-001', sku: 'SKU-3892', store: 'STR-22', prediction: 214, confidence: 0.41, uncertainty: 0.59, priority: 'High' },
  { id: 'UNC-002', sku: 'SKU-5510', store: 'STR-11', prediction: 87,  confidence: 0.44, uncertainty: 0.56, priority: 'High' },
  { id: 'UNC-003', sku: 'SKU-1124', store: 'STR-38', prediction: 432, confidence: 0.47, uncertainty: 0.53, priority: 'High' },
  { id: 'UNC-004', sku: 'SKU-7667', store: 'STR-04', prediction: 61,  confidence: 0.51, uncertainty: 0.49, priority: 'Medium' },
  { id: 'UNC-005', sku: 'SKU-4403', store: 'STR-17', prediction: 189, confidence: 0.53, uncertainty: 0.47, priority: 'Medium' },
  { id: 'UNC-006', sku: 'SKU-9921', store: 'STR-29', prediction: 307, confidence: 0.55, uncertainty: 0.45, priority: 'Medium' },
  { id: 'UNC-007', sku: 'SKU-2278', store: 'STR-06', prediction: 148, confidence: 0.58, uncertainty: 0.42, priority: 'Low' },
  { id: 'UNC-008', sku: 'SKU-6619', store: 'STR-33', prediction: 512, confidence: 0.61, uncertainty: 0.39, priority: 'Low' },
];

const OVERRIDE_ACCURACY = [
  { week: 'W1', modelMAPE: 9.8,  humanMAPE: 8.2,  fva: 16.3 },
  { week: 'W2', modelMAPE: 9.4,  humanMAPE: 7.9,  fva: 16.0 },
  { week: 'W3', modelMAPE: 9.1,  humanMAPE: 8.5,  fva: 6.6  },
  { week: 'W4', modelMAPE: 8.8,  humanMAPE: 7.6,  fva: 13.6 },
  { week: 'W5', modelMAPE: 8.5,  humanMAPE: 7.3,  fva: 14.1 },
  { week: 'W6', modelMAPE: 8.2,  humanMAPE: 7.1,  fva: 13.4 },
  { week: 'W7', modelMAPE: 8.0,  humanMAPE: 6.9,  fva: 13.8 },
  { week: 'W8', modelMAPE: 7.8,  humanMAPE: 6.8,  fva: 12.8 },
];

const FEEDBACK_BY_CATEGORY = [
  { name: 'Data Issue',        value: 312, color: '#3b82f6' },
  { name: 'External Event',    value: 287, color: '#f59e0b' },
  { name: 'Promo Error',       value: 241, color: '#10b981' },
  { name: 'Model Limitation',  value: 198, color: '#8b5cf6' },
  { name: 'Other',             value: 209, color: '#6b7280' },
];

const RESPONSE_TIME = [
  { bucket: '<1 min',  count: 89 },
  { bucket: '1-2 min', count: 234 },
  { bucket: '2-5 min', count: 412 },
  { bucket: '5-10 min', count: 198 },
  { bucket: '>10 min', count: 64  },
];

const IMPROVEMENT_LOG = [
  { date: '2026-04-01', source: 'Human Feedback', change: 'Promo uplift calibration +8%', impact: 'MAPE -0.4%', version: 'v2.1.3' },
  { date: '2026-03-24', source: 'RLHF Cycle 6',   change: 'Policy update — reward model retrain', impact: 'Satisfaction +5%', version: 'v2.1.2' },
  { date: '2026-03-17', source: 'Active Learning', change: '340 new labels — cold-start SKUs', impact: 'Coverage +3.2%', version: 'v2.1.1' },
  { date: '2026-03-10', source: 'Human Feedback', change: 'External event feature added', impact: 'MAPE -0.6%', version: 'v2.1.0' },
  { date: '2026-03-01', source: 'RLHF Cycle 5',   change: 'False alarm threshold tuned', impact: 'FAR -6%', version: 'v2.0.9' },
  { date: '2026-02-21', source: 'Human Feedback', change: 'Data issue detector improved', impact: 'Accuracy +1.1%', version: 'v2.0.8' },
  { date: '2026-02-10', source: 'Active Learning', change: '290 new labels — holiday edge cases', impact: 'Holiday MAPE -1.2%', version: 'v2.0.7' },
  { date: '2026-01-28', source: 'RLHF Cycle 4',   change: 'Reward model architecture upgrade', impact: 'Reward Acc. +4%', version: 'v2.0.6' },
];

const ACCURACY_TREND = [
  { month: 'Nov', mape: 13.2 }, { month: 'Dec', mape: 12.1 }, { month: 'Jan', mape: 11.4 },
  { month: 'Feb', mape: 10.2 }, { month: 'Mar', mape:  9.1 }, { month: 'Apr', mape:  7.8 },
];

const RLHF_MILESTONES = [
  { month: 'Dec', label: 'RLHF v1' },
  { month: 'Feb', label: 'RLHF v2' },
  { month: 'Apr', label: 'RLHF v3' },
];

const STATUS_COLOR = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' };
const PRIORITY_COLOR = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function ProcessFeedbackTab() {
  const [activeSection, setActiveSection] = useState('hitl');
  const [feedbackForm, setFeedbackForm] = useState({ thumbs: null, actual: '', confidence: 'Medium', category: '', note: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [requestedLabels, setRequestedLabels] = useState({});

  const totalFeedback = 1247;
  const positiveFb = 892;
  const negativeFb = 355;

  const sections = [
    { id: 'hitl',      label: 'Human-in-the-Loop' },
    { id: 'feedback',  label: 'Feedback Collection' },
    { id: 'rlhf',      label: 'RLHF Pipeline' },
    { id: 'active',    label: 'Active Learning' },
    { id: 'analytics', label: 'Feedback Analytics' },
    { id: 'improve',   label: 'Improvement Tracker' },
  ];

  function handleThumb(val) { setFeedbackForm(f => ({ ...f, thumbs: val })); }
  function handleSubmitFb() { setFormSubmitted(true); setTimeout(() => setFormSubmitted(false), 3000); }
  function requestLabel(id) { setRequestedLabels(r => ({ ...r, [id]: true })); }

  return (
    <TabShell
      tabName="feedback"
      title="Feedback & RLHF · capture + correction list"
      phase="Govern"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="RLHF capture form · correction list · override frequency · severity"
      operation="wire UI to T7.10 corrections endpoint (backend ready)"
      accent="#dc2626"
      todos={[]}
    >
      <CorrectionsPanel accent="#dc2626" />
      <FeedbackPanel accent="#8b5cf6" />
    <div style={{ fontFamily: 'var(--font-family, system-ui)', color: 'var(--text-primary, #1e293b)' }}>

      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              background: activeSection === s.id ? '#3b82f6' : '#f1f5f9',
              color: activeSection === s.id ? '#fff' : '#475569', fontWeight: activeSection === s.id ? 600 : 400,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* ── A. Human-in-the-Loop ── */}
      {activeSection === 'hitl' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Human-in-the-Loop (HITL) Dashboard</h3>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Pending Review', value: '12', sub: 'items in queue', color: '#f59e0b' },
              { label: 'Reviewed Today', value: '47', sub: 'predictions', color: '#10b981' },
              { label: 'Override Rate',  value: '12%', sub: 'of reviewed', color: '#3b82f6' },
              { label: 'Avg Review Time', value: '2.3 min', sub: 'per prediction', color: '#8b5cf6' },
            ].map(k => (
              <div key={k.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{k.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Approve All Pending
            </button>
            <button style={{ padding: '8px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Review Next
            </button>
          </div>

          {/* Review Queue Table */}
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Prediction ID', 'SKU', 'Store', 'Predicted', 'Planner Override', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REVIEW_QUEUE.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#3b82f6' }}>{row.id}</td>
                    <td style={{ padding: '10px 14px' }}>{row.sku}</td>
                    <td style={{ padding: '10px 14px' }}>{row.store}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.predicted}</td>
                    <td style={{ padding: '10px 14px', color: row.override ? '#0f172a' : '#94a3b8' }}>
                      {row.override ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.reason || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: STATUS_COLOR[row.status] + '22', color: STATUS_COLOR[row.status] }}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── B. Feedback Collection ── */}
      {activeSection === 'feedback' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Feedback Collection Interface</h3>

          {/* Feedback Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Feedback', value: totalFeedback.toLocaleString(), color: '#3b82f6' },
              { label: 'Positive (👍)',  value: positiveFb.toLocaleString(),    color: '#10b981' },
              { label: 'Negative (👎)',  value: negativeFb.toLocaleString(),    color: '#ef4444' },
              { label: 'Positive Rate',  value: `${Math.round(positiveFb / totalFeedback * 100)}%`, color: '#8b5cf6' },
            ].map(k => (
              <div key={k.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Feedback Form */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#1e293b' }}>Submit Feedback — Prediction PRD-004 (SKU-8854 / STR-21 / Predicted: 95)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Was this prediction accurate?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: true, icon: '👍', label: 'Yes' }, { val: false, icon: '👎', label: 'No' }].map(opt => (
                    <button key={String(opt.val)} onClick={() => handleThumb(opt.val)}
                      style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 20,
                        borderColor: feedbackForm.thumbs === opt.val ? '#3b82f6' : '#e2e8f0',
                        background: feedbackForm.thumbs === opt.val ? '#eff6ff' : '#fff' }}>
                      {opt.icon} <span style={{ fontSize: 13 }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {feedbackForm.thumbs === false && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Actual Value</label>
                  <input type="number" placeholder="Enter actual demand" value={feedbackForm.actual}
                    onChange={e => setFeedbackForm(f => ({ ...f, actual: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 200 }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Confidence in Override</label>
                  <select value={feedbackForm.confidence} onChange={e => setFeedbackForm(f => ({ ...f, confidence: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: '100%' }}>
                    {['Low', 'Medium', 'High'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Reason Category</label>
                  <select value={feedbackForm.category} onChange={e => setFeedbackForm(f => ({ ...f, category: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: '100%' }}>
                    <option value="">Select reason...</option>
                    {['Data issue', 'External event', 'Promo error', 'Model limitation', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={feedbackForm.note} onChange={e => setFeedbackForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Add context or observations..." rows={3}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={handleSubmitFb}
                  style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Submit Feedback
                </button>
                {formSubmitted && <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>Feedback submitted!</span>}
              </div>
            </div>
          </div>

          {/* Recent Feedback Table */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent Feedback Entries</h4>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['ID', 'Prediction', 'Accurate', 'Actual', 'Confidence', 'Category', 'Note', 'Time'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_FEEDBACK.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#3b82f6', fontSize: 11 }}>{row.id}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{row.prediction}</td>
                    <td style={{ padding: '8px 12px', fontSize: 16 }}>{row.accurate ? '👍' : '👎'}</td>
                    <td style={{ padding: '8px 12px' }}>{row.actual ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11,
                        background: row.confidence === 'High' ? '#d1fae5' : row.confidence === 'Medium' ? '#fef3c7' : '#fee2e2',
                        color: row.confidence === 'High' ? '#065f46' : row.confidence === 'Medium' ? '#92400e' : '#991b1b' }}>
                        {row.confidence}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.category || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{row.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── C. RLHF ── */}
      {activeSection === 'rlhf' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Reinforcement Learning from Human Feedback (RLHF)</h3>

          {/* Pipeline visualization */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 14 }}>RLHF Pipeline</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Model Prediction', color: '#3b82f6' },
                { label: 'Human Feedback', color: '#f59e0b' },
                { label: 'Reward Model', color: '#8b5cf6' },
                { label: 'Policy Update', color: '#ef4444' },
                { label: 'Improved Model', color: '#10b981' },
              ].map((step, i, arr) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ background: step.color, color: '#fff', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </div>
                  {i < arr.length - 1 && <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 700 }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Training status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Reward Model Status</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div><span style={{ fontSize: 11, color: '#94a3b8' }}>Accuracy</span><div style={{ fontWeight: 700, color: '#10b981' }}>84.3%</div></div>
                <div><span style={{ fontSize: 11, color: '#94a3b8' }}>Final Loss</span><div style={{ fontWeight: 700, color: '#3b82f6' }}>0.182</div></div>
                <div><span style={{ fontSize: 11, color: '#94a3b8' }}>Epochs</span><div style={{ fontWeight: 700 }}>20</div></div>
                <div><span style={{ fontSize: 11, color: '#94a3b8' }}>Status</span><div style={{ fontWeight: 700, color: '#10b981' }}>Trained</div></div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={LOSS_CURVE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Policy Optimization — Before vs After</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { metric: 'MAPE', before: 9.2, after: 7.8 },
                  { metric: 'Override%', before: 18, after: 12 },
                  { metric: 'Satisfaction', before: 72, after: 89 },
                  { metric: 'FAR', before: 14, after: 8 },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="metric" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="before" name="Before RLHF" fill="#94a3b8" barSize={12} />
                  <Bar dataKey="after" name="After RLHF" fill="#10b981" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RLHF Metrics Table */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>RLHF Impact Metrics</h4>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Metric', 'Before RLHF', 'After RLHF', 'Improvement'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RLHF_METRICS.map((row, i) => (
                  <tr key={row.metric} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{row.metric}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{row.before}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{row.after}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontWeight: 700, color: row.dir === 'up' ? '#10b981' : row.improvement.startsWith('-') ? '#10b981' : '#f59e0b' }}>
                        {row.improvement}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── D. Active Learning ── */}
      {activeSection === 'active' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Active Learning</h3>

          {/* Cycle Diagram */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 14 }}>Active Learning Cycle</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Unlabeled Pool', color: '#64748b' },
                { label: 'Uncertainty Sampling', color: '#3b82f6' },
                { label: 'Human Annotation', color: '#f59e0b' },
                { label: 'Retrain', color: '#8b5cf6' },
                { label: 'Improved Model', color: '#10b981' },
              ].map((step, i, arr) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ background: step.color, color: '#fff', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </div>
                  {i < arr.length - 1 && <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 700 }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Labeling Progress */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Labeling Progress</span>
              <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>1,247 / 5,000 labels</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 18, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', height: '100%', width: '24.9%', borderRadius: 8, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>24.9% complete — 3,753 labels remaining</div>
          </div>

          {/* Uncertainty Table */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Uncertainty Sampling Queue</h4>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['ID', 'SKU', 'Store', 'Prediction', 'Confidence', 'Uncertainty', 'Priority', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UNCERTAINTY_POOL.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#3b82f6', fontSize: 11 }}>{row.id}</td>
                    <td style={{ padding: '10px 14px' }}>{row.sku}</td>
                    <td style={{ padding: '10px 14px' }}>{row.store}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.prediction}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, width: 60, overflow: 'hidden' }}>
                          <div style={{ background: '#3b82f6', height: '100%', width: `${row.confidence * 100}%` }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{(row.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, width: 60, overflow: 'hidden' }}>
                          <div style={{ background: '#ef4444', height: '100%', width: `${row.uncertainty * 100}%` }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{(row.uncertainty * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: PRIORITY_COLOR[row.priority] + '22', color: PRIORITY_COLOR[row.priority] }}>
                        {row.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => requestLabel(row.id)}
                        style={{ padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer',
                          background: requestedLabels[row.id] ? '#d1fae5' : '#eff6ff',
                          color: requestedLabels[row.id] ? '#065f46' : '#1d4ed8', fontWeight: 600 }}>
                        {requestedLabels[row.id] ? 'Requested' : 'Request Label'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── E. Feedback Analytics ── */}
      {activeSection === 'analytics' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Feedback Loop Analytics</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Override Accuracy / FVA */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Override Accuracy & FVA Over Time</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={OVERRIDE_ACCURACY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="modelMAPE" name="Model MAPE" stroke="#94a3b8" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="humanMAPE" name="Human+Model MAPE" stroke="#10b981" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* FVA Bar */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Forecast Value Added (FVA%) by Week</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={OVERRIDE_ACCURACY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="fva" name="FVA%" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Feedback by Category */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Feedback Volume by Category</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={FEEDBACK_BY_CATEGORY} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {FEEDBACK_BY_CATEGORY.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Response Time */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Review Response Time Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={RESPONSE_TIME}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reviews" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── F. Continuous Improvement Tracker ── */}
      {activeSection === 'improve' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Continuous Improvement Tracker</h3>

          {/* Accuracy Trend Chart */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Model MAPE Trend with RLHF Milestones</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ACCURACY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 16]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="mape" name="MAPE" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                {RLHF_MILESTONES.map(m => (
                  <ReferenceLine key={m.month} x={m.month} stroke="#8b5cf6" strokeDasharray="4 2"
                    label={{ value: m.label, position: 'insideTopRight', fill: '#8b5cf6', fontSize: 10 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Improvement Log */}
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Improvement Log</h4>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Date', 'Source', 'Change Made', 'Impact', 'Version'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IMPROVEMENT_LOG.map((row, i) => (
                  <tr key={row.date + i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: row.source.includes('RLHF') ? '#ede9fe' : row.source.includes('Active') ? '#fef3c7' : '#dbeafe',
                        color: row.source.includes('RLHF') ? '#7c3aed' : row.source.includes('Active') ? '#92400e' : '#1d4ed8' }}>
                        {row.source}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{row.change}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#10b981' }}>{row.impact}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{row.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </TabShell>
  );
}
