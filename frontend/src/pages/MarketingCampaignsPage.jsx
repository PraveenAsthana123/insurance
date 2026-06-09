// MarketingCampaignsPage — multi-channel campaign UI (email · banner · survey · form).
//
// Per operator 2026-06-08: "campaign: email campaign ..end to end process;
// voice campaign: end to end process; banner campaign - product and service;
// survey campaign; form collection campaign".
//
// Voice is at /voice-ai-campaigns. This page covers the other 4 channels
// using one unified marketing_campaigns table (migration 054).

import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const CHANNELS = [
  { id: 'email',  name: '📧 Email',  color: '#1e40af' },
  { id: 'banner', name: '🖼 Banner', color: '#9333ea' },
  { id: 'survey', name: '📋 Survey', color: '#16a34a' },
  { id: 'form',   name: '📝 Form',   color: '#d97706' },
];

const STATUS_COLORS = {
  pending: '#94a3b8', sent: '#0ea5e9', delivered: '#0ea5e9',
  opened: '#16a34a', clicked: '#16a34a', responded: '#16a34a',
  converted: '#15803d', skipped: '#94a3b8', failed: '#dc2626',
  bounced: '#dc2626',
};

export default function MarketingCampaignsPage() {
  const [channel, setChannel] = useState('email');
  const [channelsHelp, setChannelsHelp] = useState({});
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [runs, setRuns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // create-form state — minimal but per-channel config differs
  const [form, setForm] = useState({
    name: '', product_id: '', product_pitch: '', call_to_action: '',
    target_segment: '', require_consent: true,
    config: {},
  });

  const fetchJSON = async (path, opts = {}) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
    return r.json();
  };

  const loadAll = async () => {
    try {
      const [help, ps] = await Promise.all([
        fetchJSON('/api/v1/marketing-campaigns/channels'),
        fetchJSON('/api/v1/voice-ai/products'),
      ]);
      setChannelsHelp(help);
      setProducts(ps);
      setError(null);
    } catch (e) {
      setError(`load: ${e.message}`);
    }
  };

  const loadCampaigns = async (ch) => {
    try {
      const cs = await fetchJSON(`/api/v1/marketing-campaigns?channel=${ch}`);
      setCampaigns(cs);
      setSelectedId(null);
      setRuns([]);
      setMetrics(null);
    } catch (e) {
      setError(`campaigns: ${e.message}`);
    }
  };

  const loadRuns = async (id) => {
    try {
      const [rs, m] = await Promise.all([
        fetchJSON(`/api/v1/marketing-campaigns/${id}/runs`),
        fetchJSON(`/api/v1/marketing-campaigns/${id}/metrics`),
      ]);
      setRuns(rs);
      setMetrics(m);
    } catch (e) {
      setError(`runs: ${e.message}`);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadCampaigns(channel); }, [channel]);
  useEffect(() => { if (selectedId) loadRuns(selectedId); }, [selectedId]);

  // Reset form when channel changes
  useEffect(() => {
    const ex = channelsHelp[channel]?.example_config || {};
    setForm((f) => ({ ...f, config: ex }));
  }, [channel, channelsHelp]);

  const createCampaign = async () => {
    if (!form.name || !form.product_pitch || !form.call_to_action) {
      setError('Name, pitch, and CTA required.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        channel,
        product_id: form.product_id ? parseInt(form.product_id, 10) : null,
      };
      if (!body.target_segment) delete body.target_segment;
      const c = await fetchJSON('/api/v1/marketing-campaigns', {
        method: 'POST', body: JSON.stringify(body),
      });
      setCampaigns((arr) => [c, ...arr]);
      setSelectedId(c.id);
      setError(null);
    } catch (e) {
      setError(`create: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const executeCampaign = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const r = await fetchJSON(`/api/v1/marketing-campaigns/${selectedId}/execute`, {
        method: 'POST', body: JSON.stringify({}),
      });
      alert(
        `Runs created: ${r.runs_created}\n` +
        `Skipped (consent): ${r.runs_skipped_no_consent}\n` +
        `Skipped (segment): ${r.runs_skipped_segment_mismatch}\n` +
        `Skipped (DLP): ${r.runs_skipped_dlp}`,
      );
      loadRuns(selectedId);
    } catch (e) {
      setError(`execute: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const markRun = async (run, status, score) => {
    try {
      await fetchJSON(`/api/v1/marketing-campaigns/runs/${run.id}`, {
        method: 'PATCH', body: JSON.stringify({ status, outcome_score: score }),
      });
      loadRuns(selectedId);
    } catch (e) {
      setError(`mark: ${e.message}`);
    }
  };

  const currentHelp = channelsHelp[channel];
  const currentChannel = CHANNELS.find((c) => c.id === channel);

  // ── styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const h3 = { margin: '0 0 8px', fontSize: 14, fontWeight: 700 };
  const small = { fontSize: 11, color: '#64748b' };
  const input = { width: '100%', padding: 6, fontSize: 12, marginBottom: 6 };
  const ta = { ...input, fontFamily: 'ui-monospace', minHeight: 60 };
  const btn = (bg) => ({
    padding: '6px 12px', background: bg, color: '#fff', border: 'none',
    borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 4,
  });

  // Render channel-specific payload preview for a run
  const renderPayloadPreview = (channel, p) => {
    if (channel === 'email') {
      return (
        <div>
          <div><strong>Subject:</strong> {p.subject}</div>
          <div><strong>To:</strong> {p.to_email}</div>
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '4px 0',
                        background: '#f8fafc', padding: 6 }}>{p.body}</pre>
        </div>
      );
    }
    if (channel === 'banner') {
      return (
        <div>
          <div><strong>Banner:</strong> <code>{p.image_url}</code> · {p.banner_size}</div>
          <div><strong>Alt:</strong> {p.alt_text}</div>
          <div><strong>Landing:</strong> <code>{p.landing_url}</code></div>
          {p.watermark_required && <div style={{ color: '#16a34a' }}>✓ Watermark MANDATORY per §82.21</div>}
        </div>
      );
    }
    if (channel === 'survey') {
      return (
        <div>
          <div><strong>Intro:</strong> {p.intro_text}</div>
          <div><strong>Survey URL:</strong> <code>{p.survey_url}</code></div>
          <div><strong>Questions ({p.questions?.length}):</strong></div>
          <ol style={{ fontSize: 11, paddingLeft: 18, margin: 4 }}>
            {(p.questions || []).map((q) => (
              <li key={q.id}>{q.text} <em>({q.type})</em></li>
            ))}
          </ol>
          {p.reward && <div><strong>Reward:</strong> {p.reward}</div>}
        </div>
      );
    }
    if (channel === 'form') {
      return (
        <div>
          <div><strong>Intro:</strong> {p.intro_text}</div>
          <div><strong>Form URL:</strong> <code>{p.form_url}</code></div>
          <div><strong>Fields ({p.fields?.length}):</strong></div>
          <ul style={{ fontSize: 11, paddingLeft: 18, margin: 4 }}>
            {(p.fields || []).map((f) => (
              <li key={f.id}>{f.label} <em>({f.type}{f.required ? ' · required' : ''})</em></li>
            ))}
          </ul>
        </div>
      );
    }
    return <pre style={{ fontSize: 11 }}>{JSON.stringify(p, null, 2)}</pre>;
  };

  return (
    <div style={{ padding: 12, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>
        Marketing Campaigns · Multi-Channel
      </h1>
      <div style={{ ...small, marginBottom: 8 }}>
        4 channels (email · banner · survey · form). Voice campaigns at <code>/voice-ai-campaigns</code>.
        Per §64.13 + §90 L13/L14 + §76 + §82.21 top-1% gates.
      </div>

      {/* ─── Channel tabs ─── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {CHANNELS.map((c) => (
          <button key={c.id}
                  onClick={() => setChannel(c.id)}
                  style={{
                    padding: '8px 16px', fontSize: 14, fontWeight: 600,
                    background: channel === c.id ? c.color : '#fff',
                    color: channel === c.id ? '#fff' : '#475569',
                    border: `2px solid ${channel === c.id ? c.color : '#e2e8f0'}`,
                    borderRadius: 4, cursor: 'pointer',
                  }}>
            {c.name}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12 }}>
        {/* ─── LEFT — Create form + campaign list ─── */}
        <div>
          <div style={card}>
            <h3 style={{ ...h3, color: currentChannel?.color }}>
              Create {currentChannel?.name} Campaign
            </h3>
            <div style={small}>{currentHelp?.notes}</div>
            <input placeholder="Campaign name" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })}
                   style={input} />
            <select value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    style={input}>
              <option value="">— Product (optional) —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${(p.price_cents / 100).toFixed(2)})
                </option>
              ))}
            </select>
            <input placeholder="Product pitch (1-liner)" value={form.product_pitch}
                   onChange={(e) => setForm({ ...form, product_pitch: e.target.value })}
                   style={input} />
            <input placeholder="Call to action" value={form.call_to_action}
                   onChange={(e) => setForm({ ...form, call_to_action: e.target.value })}
                   style={input} />
            <select value={form.target_segment}
                    onChange={(e) => setForm({ ...form, target_segment: e.target.value })}
                    style={input}>
              <option value="">— All segments —</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="standard">Standard</option>
            </select>
            <div style={{ ...small, marginTop: 6 }}>Channel config (JSON):</div>
            <textarea value={JSON.stringify(form.config, null, 2)}
                      onChange={(e) => {
                        try {
                          setForm({ ...form, config: JSON.parse(e.target.value) });
                        } catch { /* user editing */ }
                      }}
                      style={{ ...ta, minHeight: 140 }} />
            <label style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              <input type="checkbox" checked={form.require_consent}
                     onChange={(e) => setForm({ ...form, require_consent: e.target.checked })} />
              {' '}Require marketing consent (§76 + GDPR)
            </label>
            <button onClick={createCampaign} disabled={busy} style={btn(currentChannel?.color)}>
              Create {currentChannel?.id}
            </button>
          </div>

          <div style={card}>
            <h3 style={h3}>{currentChannel?.name} Campaigns ({campaigns.length})</h3>
            {campaigns.map((c) => (
              <div key={c.id}
                   onClick={() => setSelectedId(c.id)}
                   style={{
                     padding: 6, marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                     background: selectedId === c.id ? '#dbeafe' : '#f8fafc',
                     border: `1px solid ${selectedId === c.id ? currentChannel?.color : '#e2e8f0'}`,
                   }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                <div style={small}>
                  {c.campaign_ref} · {c.target_segment || 'all'} · {c.status}
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <div style={small}>None yet.</div>}
          </div>
        </div>

        {/* ─── RIGHT — selected campaign + runs + metrics ─── */}
        <div>
          {!selectedId && (
            <div style={card}>
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                Create or pick a {currentChannel?.name} campaign on the left.
              </div>
            </div>
          )}

          {selectedId && metrics && (
            <div style={card}>
              <h3 style={h3}>Metrics · per §75 + §82.7</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <Tile label="Total runs" value={metrics.total_runs} />
                <Tile label="Consent rate" value={`${(metrics.consent_gate_rate * 100).toFixed(0)}%`} />
                <Tile label="Avg outcome" value={metrics.avg_outcome_score.toFixed(2)} />
                <Tile label="Cohorts" value={Object.keys(metrics.cohort_distribution).length} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11 }}>
                <strong>By status:</strong>{' '}
                {Object.entries(metrics.by_status).map(([k, v]) => (
                  <span key={k} style={{
                    background: STATUS_COLORS[k] || '#64748b', color: '#fff',
                    padding: '2px 6px', borderRadius: 4, marginRight: 4,
                  }}>
                    {k}={v}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                <strong>§76 fairness · cohorts:</strong>{' '}
                {Object.entries(metrics.cohort_distribution).map(([k, v]) =>
                  `${k}=${v}`
                ).join(' · ')}
              </div>
            </div>
          )}

          {selectedId && (
            <div style={card}>
              <h3 style={h3}>
                Runs ({runs.length}) · top 1% gates ✓
                <button onClick={executeCampaign} disabled={busy}
                        style={{ ...btn(currentChannel?.color), float: 'right' }}>
                  ▶ Execute (filter + create runs)
                </button>
              </h3>
              {runs.length === 0 && (
                <div style={small}>No runs · click ▶ Execute above.</div>
              )}
              {runs.map((r) => (
                <div key={r.id} style={{
                  padding: 8, marginBottom: 6, border: '1px solid #e2e8f0',
                  borderRadius: 4, background: r.status === 'pending' ? '#fff' : '#f8fafc',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 12 }}>customer {r.customer_id} ({r.fairness_cohort})</strong>
                    <span style={{
                      background: STATUS_COLORS[r.status] || '#64748b', color: '#fff',
                      padding: '2px 6px', borderRadius: 4, fontSize: 10,
                    }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', margin: '4px 0', padding: 6,
                                background: '#f0f9ff', borderRadius: 4 }}>
                    {renderPayloadPreview(channel, r.rendered_payload)}
                  </div>
                  {r.status === 'pending' && (
                    <div>
                      <button onClick={() => markRun(r, 'sent', 0.5)} style={btn('#0ea5e9')}>
                        📤 Mark sent
                      </button>
                      <button onClick={() => markRun(r, 'opened', 0.7)} style={btn('#16a34a')}>
                        👁 Opened
                      </button>
                      <button onClick={() => markRun(r, 'converted', 1.0)} style={btn('#15803d')}>
                        ✓ Converted
                      </button>
                      <button onClick={() => markRun(r, 'failed', 0.0)} style={btn('#dc2626')}>
                        ✗ Failed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent = '#1e40af' }) {
  return (
    <div style={{
      padding: 8, background: '#f8fafc', border: `1px solid ${accent}`,
      borderRadius: 4, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
    </div>
  );
}
