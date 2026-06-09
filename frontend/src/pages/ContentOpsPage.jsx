// ContentOpsPage — manager UI for job/blog postings + contacts upload + schedules.
//
// Per operator 2026-06-08 stacked asks (5 messages):
//   job posting + blog posting + LinkedIn automation
//   create master data email + contact
//   UI must have email + contact number upload + manual adding
//   schedule of campaign daily/weekly/monthly
//
// 4-tab layout (Job · Blog · Contacts · Schedules)

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const TABS = [
  { id: 'postings-job',  name: '💼 Job Postings',  color: '#1e40af' },
  { id: 'postings-blog', name: '📝 Blog Posts',    color: '#9333ea' },
  { id: 'contacts',      name: '📇 Master Contacts', color: '#16a34a' },
  { id: 'schedules',     name: '🗓 Schedules',     color: '#d97706' },
];

export default function ContentOpsPage() {
  const [tab, setTab] = useState('postings-job');
  const [postings, setPostings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [monitoring, setMonitoring] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // forms
  const [postingForm, setPostingForm] = useState({
    name: '', title: '', summary: '', body_markdown: '',
    config: {}, platforms: ['linkedin', 'website'],
  });
  const [contactForm, setContactForm] = useState({
    full_name: '', email: '', phone: '', segment: 'standard',
    consent_marketing: false, consent_email: false, consent_calls: false,
  });
  const [bulkText, setBulkText] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    campaign_id: 1, cadence: 'daily', time_of_day_utc: '09:00',
    day_of_week: 1, day_of_month: 1,
  });

  const fetchJSON = async (path, opts = {}) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' }, ...opts,
    });
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
    return r.json();
  };

  const load = async () => {
    try {
      const ch = tab === 'postings-job' ? 'job'
              : tab === 'postings-blog' ? 'blog' : null;
      if (ch) {
        const [ps, mon] = await Promise.all([
          fetchJSON(`/api/v1/content-ops/postings?channel=${ch}`),
          fetchJSON('/api/v1/content-ops/postings/monitoring'),
        ]);
        setPostings(ps);
        setMonitoring(mon);
      }
      if (tab === 'contacts') {
        const cs = await fetchJSON('/api/v1/content-ops/contacts?limit=200');
        setContacts(cs);
      }
      if (tab === 'schedules') {
        const ss = await fetchJSON('/api/v1/content-ops/schedules');
        setSchedules(ss);
      }
      setError(null);
    } catch (e) { setError(`load: ${e.message}`); }
  };

  useEffect(() => { load(); }, [tab]);

  const createPosting = async () => {
    if (!postingForm.name || !postingForm.title || !postingForm.body_markdown) {
      setError('Name + title + body required'); return;
    }
    setBusy(true);
    try {
      const channel = tab === 'postings-job' ? 'job' : 'blog';
      await fetchJSON('/api/v1/content-ops/postings', {
        method: 'POST', body: JSON.stringify({ ...postingForm, channel }),
      });
      setPostingForm({ name: '', title: '', summary: '', body_markdown: '',
                        config: {}, platforms: ['linkedin', 'website'] });
      load();
    } catch (e) { setError(`create: ${e.message}`); }
    finally { setBusy(false); }
  };

  const publishPosting = async (p) => {
    setBusy(true);
    try {
      const r = await fetchJSON(`/api/v1/content-ops/postings/${p.id}/publish`, {
        method: 'POST', body: JSON.stringify({}),
      });
      alert(`Published to ${r.runs_created} platforms: ` +
             r.runs.map((x) => `${x.platform}=${x.status}`).join(' · '));
      load();
    } catch (e) { setError(`publish: ${e.message}`); }
    finally { setBusy(false); }
  };

  const createContact = async () => {
    if (!contactForm.full_name) { setError('Name required'); return; }
    if (!contactForm.email && !contactForm.phone) {
      setError('Email OR phone required'); return;
    }
    setBusy(true);
    try {
      await fetchJSON('/api/v1/content-ops/contacts', {
        method: 'POST', body: JSON.stringify(contactForm),
      });
      setContactForm({ full_name: '', email: '', phone: '', segment: 'standard',
                       consent_marketing: false, consent_email: false, consent_calls: false });
      load();
    } catch (e) { setError(`contact: ${e.message}`); }
    finally { setBusy(false); }
  };

  const bulkUpload = async () => {
    if (!bulkText.trim()) { setError('Paste CSV first'); return; }
    // Parse simple CSV: full_name,email,phone,segment
    const rows = bulkText.split('\n').slice(1).filter((l) => l.trim()).map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      const [full_name, email, phone, segment] = parts;
      return {
        full_name: full_name || `Imported ${Date.now()}`,
        email: email || null,
        phone: phone || null,
        segment: segment || 'standard',
        consent_marketing: true,
        consent_email: true,
        consent_calls: false,
        source: 'csv_upload',
      };
    });
    setBusy(true);
    try {
      const r = await fetchJSON('/api/v1/content-ops/contacts/bulk-upload', {
        method: 'POST', body: JSON.stringify({ rows, skip_duplicates: true }),
      });
      alert(`Inserted ${r.inserted} · skipped ${r.skipped_duplicates} duplicates · ${r.invalid_rows} invalid`);
      setBulkText('');
      load();
    } catch (e) { setError(`upload: ${e.message}`); }
    finally { setBusy(false); }
  };

  const createSchedule = async () => {
    setBusy(true);
    try {
      const body = {
        campaign_id: parseInt(scheduleForm.campaign_id, 10),
        cadence: scheduleForm.cadence,
      };
      if (scheduleForm.cadence !== 'once') {
        body.time_of_day_utc = scheduleForm.time_of_day_utc;
      }
      if (scheduleForm.cadence === 'weekly') body.day_of_week = parseInt(scheduleForm.day_of_week, 10);
      if (scheduleForm.cadence === 'monthly') body.day_of_month = parseInt(scheduleForm.day_of_month, 10);
      await fetchJSON('/api/v1/content-ops/schedules', {
        method: 'POST', body: JSON.stringify(body),
      });
      load();
    } catch (e) { setError(`schedule: ${e.message}`); }
    finally { setBusy(false); }
  };

  // ── styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const h3 = { margin: '0 0 8px', fontSize: 14, fontWeight: 700 };
  const small = { fontSize: 11, color: '#64748b' };
  const input = { width: '100%', padding: 6, fontSize: 12, marginBottom: 6 };
  const btn = (bg) => ({
    padding: '6px 12px', background: bg, color: '#fff', border: 'none',
    borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 4,
  });
  const td = { padding: 6, fontSize: 11, borderBottom: '1px solid #f1f5f9' };
  const th = { padding: 6, fontSize: 11, textAlign: 'left', color: '#64748b' };

  const isPosting = tab.startsWith('postings');
  const channelLabel = tab === 'postings-job' ? 'Job' : tab === 'postings-blog' ? 'Blog' : '';

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>Content Operations · Manager Console</h1>
      <div style={{ ...small, marginBottom: 8 }}>
        Job + blog postings · master contacts · campaign schedules · per §38.3 + §76 + §82.7
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    background: tab === t.id ? t.color : '#fff',
                    color: tab === t.id ? '#fff' : '#475569',
                    border: `2px solid ${tab === t.id ? t.color : '#e2e8f0'}`,
                    borderRadius: 4, cursor: 'pointer',
                  }}>
            {t.name}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626' }}>{error}</div>
      )}

      {isPosting && (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 12 }}>
          <div>
            <div style={card}>
              <h3 style={h3}>Create {channelLabel} Posting</h3>
              <input placeholder="Name (internal)" value={postingForm.name}
                     onChange={(e) => setPostingForm({...postingForm, name: e.target.value})}
                     style={input} />
              <input placeholder="Title (public)" value={postingForm.title}
                     onChange={(e) => setPostingForm({...postingForm, title: e.target.value})}
                     style={input} />
              <textarea placeholder="Summary (≤ 1000 chars)" value={postingForm.summary}
                        onChange={(e) => setPostingForm({...postingForm, summary: e.target.value})}
                        style={{...input, minHeight: 60}} />
              <textarea placeholder="Body markdown" value={postingForm.body_markdown}
                        onChange={(e) => setPostingForm({...postingForm, body_markdown: e.target.value})}
                        style={{...input, minHeight: 120, fontFamily: 'ui-monospace'}} />
              <div style={small}>Platforms (comma-separated)</div>
              <input value={postingForm.platforms.join(', ')}
                     onChange={(e) => setPostingForm({...postingForm,
                        platforms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                     style={input} />
              <button onClick={createPosting} disabled={busy} style={btn('#1e40af')}>
                Create {channelLabel}
              </button>
            </div>
            {monitoring && (
              <div style={card}>
                <h3 style={h3}>Monitoring · §75 + §82.7</h3>
                <div style={{ fontSize: 11 }}>
                  Total: <strong>{monitoring.total_postings}</strong> · Avg quality:{' '}
                  <strong>{monitoring.avg_quality_score.toFixed(2)}</strong> · Avg time-to-publish:{' '}
                  <strong>{monitoring.avg_time_to_publish_seconds.toFixed(0)}s</strong>
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <strong>By status:</strong>{' '}
                  {Object.entries(monitoring.by_status).map(([k,v]) =>
                    <code key={k} style={{marginRight: 4}}>{k}={v}</code>
                  )}
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <strong>By platform published:</strong>{' '}
                  {Object.entries(monitoring.by_platform_published).map(([k,v]) =>
                    <code key={k} style={{marginRight: 4}}>{k}={v}</code>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <div style={card}>
              <h3 style={h3}>{channelLabel} Postings ({postings.length})</h3>
              {postings.map((p) => (
                <div key={p.id} style={{
                  padding: 8, marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>{p.title}</strong>
                    <span style={{
                      background: p.status === 'published' ? '#16a34a' : '#64748b',
                      color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    }}>{p.status}</span>
                  </div>
                  <div style={small}>{p.posting_ref} · {p.platforms.join(' · ')}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{p.summary}</div>
                  <div style={{ marginTop: 6 }}>
                    {p.status === 'draft' && (
                      <button onClick={() => publishPosting(p)} disabled={busy} style={btn('#16a34a')}>
                        🚀 Publish
                      </button>
                    )}
                    {p.quality_score != null && (
                      <span style={{...small, marginLeft: 8}}>
                        quality={p.quality_score.toFixed(2)} · edits={p.operator_edit_count}
                        {p.time_to_publish_seconds != null && ` · ttp=${p.time_to_publish_seconds.toFixed(0)}s`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 12 }}>
          <div>
            <div style={card}>
              <h3 style={h3}>Add Contact Manually</h3>
              <input placeholder="Full name" value={contactForm.full_name}
                     onChange={(e) => setContactForm({...contactForm, full_name: e.target.value})}
                     style={input} />
              <input placeholder="Email" type="email" value={contactForm.email}
                     onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                     style={input} />
              <input placeholder="Phone (+15551234567)" value={contactForm.phone}
                     onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                     style={input} />
              <select value={contactForm.segment}
                      onChange={(e) => setContactForm({...contactForm, segment: e.target.value})}
                      style={input}>
                <option>standard</option><option>silver</option><option>gold</option>
              </select>
              <label style={{ fontSize: 11, display: 'block' }}>
                <input type="checkbox" checked={contactForm.consent_marketing}
                       onChange={(e) => setContactForm({...contactForm, consent_marketing: e.target.checked})} />
                {' '}Marketing consent
              </label>
              <label style={{ fontSize: 11, display: 'block' }}>
                <input type="checkbox" checked={contactForm.consent_email}
                       onChange={(e) => setContactForm({...contactForm, consent_email: e.target.checked})} />
                {' '}Email consent
              </label>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                <input type="checkbox" checked={contactForm.consent_calls}
                       onChange={(e) => setContactForm({...contactForm, consent_calls: e.target.checked})} />
                {' '}Voice/call consent
              </label>
              <button onClick={createContact} disabled={busy} style={btn('#16a34a')}>
                Add Contact
              </button>
            </div>
            <div style={card}>
              <h3 style={h3}>Bulk Upload · CSV</h3>
              <div style={small}>Format · header row required:</div>
              <code style={{...small, display:'block', background:'#f8fafc', padding:4, marginBottom:6}}>
                full_name,email,phone,segment
              </code>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input type="file" accept=".csv,text/csv,text/plain"
                       onChange={async (e) => {
                         const f = e.target.files?.[0];
                         if (!f) return;
                         if (f.size > 5 * 1024 * 1024) {
                           setError('File too large (>5MB). Paste instead.');
                           e.target.value = '';
                           return;
                         }
                         try {
                           const text = await f.text();
                           setBulkText(text);
                           setError(null);
                         } catch (err) {
                           setError(`File read failed: ${err.message}`);
                         }
                         e.target.value = '';  // re-pickable
                       }}
                       style={{ flex: 1, fontSize: 11 }} />
                <button type="button"
                        onClick={() => setBulkText('')}
                        disabled={!bulkText}
                        style={{...btn('#94a3b8'), padding: '4px 8px'}}>
                  Clear
                </button>
              </div>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                        placeholder="full_name,email,phone,segment&#10;Sarah Chen,sarah@ex.com,+15551234567,gold"
                        style={{...input, minHeight: 140, fontFamily: 'ui-monospace'}} />
              <div style={{...small, marginBottom: 6}}>
                {bulkText.trim()
                  ? `${Math.max(0, bulkText.split('\n').filter((l) => l.trim()).length - 1)} data rows · ${bulkText.length} chars`
                  : 'No data loaded'}
              </div>
              <button onClick={bulkUpload} disabled={busy || !bulkText.trim()} style={btn('#16a34a')}>
                📤 Bulk Upload
              </button>
            </div>
          </div>
          <div>
            <div style={card}>
              <h3 style={h3}>Master Contacts ({contacts.length})</h3>
              <table style={{ width: '100%' }}>
                <thead><tr>
                  <th style={th}>Name</th><th style={th}>Email</th><th style={th}>Phone</th>
                  <th style={th}>Segment</th><th style={th}>Source</th><th style={th}>Quality</th>
                  <th style={th}>Consent</th>
                </tr></thead>
                <tbody>
                  {contacts.slice(0, 50).map((c) => (
                    <tr key={c.id}>
                      <td style={td}><strong>{c.full_name}</strong></td>
                      <td style={td}>{c.email || '—'}</td>
                      <td style={td}>{c.phone || '—'}</td>
                      <td style={td}><code>{c.segment || '—'}</code></td>
                      <td style={td}>{c.source}</td>
                      <td style={td}>{c.quality_score != null ? c.quality_score.toFixed(2) : '—'}</td>
                      <td style={td}>
                        {c.consent_marketing ? '📢' : ''}
                        {c.consent_email     ? '📧' : ''}
                        {c.consent_calls     ? '📞' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length > 50 && <div style={small}>showing first 50</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'schedules' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12 }}>
          <div style={card}>
            <h3 style={h3}>Create Schedule</h3>
            <div style={small}>Campaign ID (from /marketing-campaigns)</div>
            <input type="number" value={scheduleForm.campaign_id}
                   onChange={(e) => setScheduleForm({...scheduleForm, campaign_id: e.target.value})}
                   style={input} />
            <select value={scheduleForm.cadence}
                    onChange={(e) => setScheduleForm({...scheduleForm, cadence: e.target.value})}
                    style={input}>
              <option value="once">Once (specify scheduled_at)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {scheduleForm.cadence !== 'once' && (
              <input type="time" value={scheduleForm.time_of_day_utc}
                     onChange={(e) => setScheduleForm({...scheduleForm, time_of_day_utc: e.target.value})}
                     style={input} />
            )}
            {scheduleForm.cadence === 'weekly' && (
              <select value={scheduleForm.day_of_week}
                      onChange={(e) => setScheduleForm({...scheduleForm, day_of_week: e.target.value})}
                      style={input}>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            )}
            {scheduleForm.cadence === 'monthly' && (
              <input type="number" min="1" max="28" value={scheduleForm.day_of_month}
                     onChange={(e) => setScheduleForm({...scheduleForm, day_of_month: e.target.value})}
                     placeholder="Day of month (1-28)"
                     style={input} />
            )}
            <button onClick={createSchedule} disabled={busy} style={btn('#d97706')}>
              Create Schedule
            </button>
          </div>
          <div style={card}>
            <h3 style={h3}>Schedules ({schedules.length})</h3>
            <table style={{ width: '100%' }}>
              <thead><tr>
                <th style={th}>Ref</th><th style={th}>Campaign</th><th style={th}>Cadence</th>
                <th style={th}>Time</th><th style={th}>Next run</th>
                <th style={th}>Runs</th><th style={th}>Enabled</th>
              </tr></thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td style={td}><code>{s.schedule_ref}</code></td>
                    <td style={td}>{s.campaign_id}</td>
                    <td style={td}><code>{s.cadence}</code></td>
                    <td style={td}>
                      {s.time_of_day_utc}
                      {s.day_of_week !== null && ` · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day_of_week]}`}
                      {s.day_of_month !== null && ` · day ${s.day_of_month}`}
                    </td>
                    <td style={td}><code>{s.next_run_at?.slice(0,16) || '—'}</code></td>
                    <td style={td}>{s.run_count}</td>
                    <td style={td}>{s.enabled ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
