// VoiceAICampaignPage — outbound voice AI campaign demo.
// Per operator 2026-06-08: "where user need to provide information about the
// product and service on form and then AI tool will refer that to speak to
// customer ...also have customer contact information database our form table
// ...top 1%"
//
// Reuses: existing /api/v1/voice-ai/{customers,products} endpoints.
// New:    /api/v1/voice-ai/campaigns/* (8 endpoints).
// STT/TTS: browser SpeechRecognition + SpeechSynthesis (zero API keys per §57.7).
//
// Top 1% gates (per §76 + §82.21 + §38.3):
//   1. Consent gate (require_consent + customer.consent_marketing)
//   2. Segment match (operator-specified targeting)
//   3. DLP scan on rendered script (refuses SSN/CC patterns)
//   4. Per-run audit row via §38.3
//   5. Browser TTS plays personalized script · operator marks outcome

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const DEFAULT_FORM = {
  name: '',
  product_id: '',
  product_pitch: '',
  service_description: '',
  call_to_action: 'Press 1 or say YES to schedule a callback.',
  target_segment: '',
  require_consent: true,
  script_template:
    'Hello {name}, this is Aria from Insur Analytics. ' +
    'You may qualify for our {product_name} at ${price}. ' +
    '{call_to_action}',
  voice_lang: 'en-US',
  max_attempts_per_customer: 1,
};

export default function VoiceAICampaignPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [runs, setRuns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [executingRunId, setExecutingRunId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
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

  const loadAll = async () => {
    try {
      const [cs, ps, cus] = await Promise.all([
        fetchJSON('/api/v1/voice-ai/campaigns'),
        fetchJSON('/api/v1/voice-ai/products'),
        fetchJSON('/api/v1/voice-ai/customers'),
      ]);
      setCampaigns(cs);
      setProducts(ps);
      setCustomers(cus.items || []);
      setError(null);
    } catch (e) {
      setError(`load failed: ${e.message}`);
    }
  };

  const loadRuns = async (id) => {
    try {
      const [r, m] = await Promise.all([
        fetchJSON(`/api/v1/voice-ai/campaigns/${id}/runs`),
        fetchJSON(`/api/v1/voice-ai/campaigns/${id}/metrics`),
      ]);
      setRuns(r);
      setMetrics(m);
    } catch (e) {
      setError(`load runs failed: ${e.message}`);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (selectedCampaignId) loadRuns(selectedCampaignId);
  }, [selectedCampaignId]);

  const createCampaign = async () => {
    if (!form.name || !form.product_pitch || !form.script_template) {
      setError('Fill name, pitch, and script template.');
      return;
    }
    setBusy(true);
    try {
      const body = { ...form, product_id: form.product_id ? parseInt(form.product_id, 10) : null };
      // strip empty target_segment so backend treats as "all"
      if (!body.target_segment) delete body.target_segment;
      const c = await fetchJSON('/api/v1/voice-ai/campaigns', {
        method: 'POST', body: JSON.stringify(body),
      });
      setCampaigns((arr) => [c, ...arr]);
      setSelectedCampaignId(c.id);
      setForm(DEFAULT_FORM);
      setError(null);
    } catch (e) {
      setError(`create failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const executeCampaign = async () => {
    if (!selectedCampaignId) return;
    setBusy(true);
    try {
      const r = await fetchJSON(
        `/api/v1/voice-ai/campaigns/${selectedCampaignId}/execute`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      alert(
        `Runs created: ${r.runs_created}\n` +
        `Skipped (no consent): ${r.runs_skipped_no_consent}\n` +
        `Skipped (segment mismatch): ${r.runs_skipped_segment_mismatch}\n` +
        `Skipped (DLP): ${r.runs_skipped_dlp}`,
      );
      loadRuns(selectedCampaignId);
    } catch (e) {
      setError(`execute failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const playRun = (run) => {
    if (!window.speechSynthesis) {
      setError('Browser SpeechSynthesis not supported.');
      return;
    }
    if (!ttsEnabled) {
      setError('TTS muted. Toggle 🔊 to enable.');
      return;
    }
    setExecutingRunId(run.id);
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(run.rendered_script);
    utt.lang = 'en-US';
    utt.rate = 1.0;
    utt.onend = async () => {
      // Mark spoken in backend
      try {
        await fetchJSON(`/api/v1/voice-ai/campaign-runs/${run.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'spoken', outcome_score: 0.5 }),
        });
        loadRuns(selectedCampaignId);
      } catch (e) {
        setError(`mark spoken failed: ${e.message}`);
      } finally {
        setExecutingRunId(null);
      }
    };
    utt.onerror = () => {
      setExecutingRunId(null);
      setError('TTS playback failed.');
    };
    window.speechSynthesis.speak(utt);
  };

  const markRun = async (run, outcome) => {
    try {
      await fetchJSON(`/api/v1/voice-ai/campaign-runs/${run.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: outcome,
          outcome_score: outcome === 'accepted' ? 1.0 : outcome === 'declined' ? 0.1 : 0.5,
        }),
      });
      loadRuns(selectedCampaignId);
    } catch (e) {
      setError(`mark ${outcome} failed: ${e.message}`);
    }
  };

  const customerOf = (id) => customers.find((c) => c.id === id) || {};

  // ── styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const h3 = { margin: '0 0 8px', fontSize: 14, fontWeight: 600 };
  const input = { width: '100%', padding: 6, fontSize: 12, marginBottom: 6 };
  const ta = { ...input, fontFamily: 'ui-monospace', minHeight: 60 };
  const btn = (bg, fg = '#fff') => ({
    padding: '6px 12px', background: bg, color: fg, border: 'none',
    borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 4,
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr',
                  gap: 12, padding: 12, background: '#f8fafc',
                  minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* ─── LEFT — form + campaign list ─── */}
      <div>
        <div style={card}>
          <h3 style={h3}>Create Outbound Campaign</h3>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Operator fills product + service info. AI uses it to speak to customers.
            Per §76 + §82.21 top 1% gates: consent · segment · DLP · audit.
          </div>
          <input
            placeholder="Campaign name (e.g. Q2 Auto Premium)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={input}
          />
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            style={input}
          >
            <option value="">— Product (optional) —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (${(p.price_cents / 100).toFixed(2)}) · {p.category}
              </option>
            ))}
          </select>
          <input
            placeholder="Product pitch (1-line value prop)"
            value={form.product_pitch}
            onChange={(e) => setForm({ ...form, product_pitch: e.target.value })}
            style={input}
          />
          <textarea
            placeholder="Service description (long-form context)"
            value={form.service_description}
            onChange={(e) => setForm({ ...form, service_description: e.target.value })}
            style={ta}
          />
          <input
            placeholder="Call to action"
            value={form.call_to_action}
            onChange={(e) => setForm({ ...form, call_to_action: e.target.value })}
            style={input}
          />
          <select
            value={form.target_segment}
            onChange={(e) => setForm({ ...form, target_segment: e.target.value })}
            style={input}
          >
            <option value="">— All segments —</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="standard">Standard</option>
          </select>
          <textarea
            placeholder="Script template · use {name} {product_name} {price} {call_to_action}"
            value={form.script_template}
            onChange={(e) => setForm({ ...form, script_template: e.target.value })}
            style={ta}
          />
          <label style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 6 }}>
            <input type="checkbox" checked={form.require_consent}
                   onChange={(e) => setForm({ ...form, require_consent: e.target.checked })} />
            {' '}Require marketing consent (§76 + GDPR)
          </label>
          <button onClick={createCampaign} disabled={busy} style={btn('#1e40af')}>
            Create Campaign
          </button>
        </div>

        <div style={card}>
          <h3 style={h3}>Campaigns ({campaigns.length})</h3>
          {campaigns.map((c) => (
            <div key={c.id}
                 onClick={() => setSelectedCampaignId(c.id)}
                 style={{
                   padding: 6, marginBottom: 6, borderRadius: 4, cursor: 'pointer',
                   background: selectedCampaignId === c.id ? '#dbeafe' : '#f8fafc',
                   border: `1px solid ${selectedCampaignId === c.id ? '#1e40af' : '#e2e8f0'}`,
                 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {c.campaign_ref} · target: {c.target_segment || 'all'} · {c.status}
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div style={{ fontSize: 11, color: '#64748b' }}>No campaigns yet.</div>
          )}
        </div>
      </div>

      {/* ─── RIGHT — selected campaign details + runs ─── */}
      <div>
        {!selectedCampaignId && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              Create or pick a campaign on the left.
            </div>
          </div>
        )}

        {selectedCampaignId && metrics && (
          <div style={card}>
            <h3 style={h3}>Campaign Metrics · per §75 + §82.7</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <Tile label="Total runs" value={metrics.total_runs} />
              <Tile label="Spoken" value={metrics.spoken} accent="#16a34a" />
              <Tile label="Accepted" value={metrics.accepted} accent="#16a34a" />
              <Tile label="Declined" value={metrics.declined} accent="#dc2626" />
              <Tile label="Pending" value={metrics.pending} />
              <Tile label="Consent rate" value={`${(metrics.consent_gate_rate * 100).toFixed(0)}%`} />
              <Tile label="Avg outcome" value={metrics.avg_outcome_score.toFixed(2)} />
              <Tile label="Cohorts" value={Object.keys(metrics.cohort_distribution).length} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
              <strong>Fairness · §76:</strong>{' '}
              {Object.entries(metrics.cohort_distribution).map(([k, v]) =>
                `${k}=${v}`
              ).join(' · ')}
            </div>
          </div>
        )}

        {selectedCampaignId && (
          <div style={card}>
            <h3 style={h3}>
              Runs · {runs.length} · Top 1% gates ✓
              <span style={{ float: 'right' }}>
                <button onClick={executeCampaign} disabled={busy}
                        style={btn('#16a34a')}>
                  ▶ Execute (filter + create runs)
                </button>
                <button onClick={() => setTtsEnabled((v) => !v)}
                        style={btn(ttsEnabled ? '#14b8a6' : '#94a3b8')}>
                  {ttsEnabled ? '🔊 TTS On' : '🔇 TTS Off'}
                </button>
              </span>
            </h3>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              Click <strong>▶ Play</strong> on a run · browser TTS speaks the
              personalized script · then mark Accepted/Declined to update outcome.
            </div>
            {runs.length === 0 && (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                No runs · click <strong>▶ Execute</strong> above to apply gates and create runs.
              </div>
            )}
            {runs.map((r) => {
              const c = customerOf(r.customer_id);
              return (
                <div key={r.id} style={{
                  padding: 8, marginBottom: 6, border: '1px solid #e2e8f0',
                  borderRadius: 4, background: r.status === 'pending' ? '#fff' : '#f8fafc',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 12 }}>
                      {c.full_name || `customer ${r.customer_id}`} ({c.segment || '?'})
                    </strong>
                    <small style={{ color: '#64748b', fontSize: 10 }}>
                      {r.run_ref} · {r.status}
                    </small>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', margin: '4px 0',
                                fontStyle: 'italic' }}>
                    "{r.rendered_script}"
                  </div>
                  <div>
                    <button onClick={() => playRun(r)}
                            disabled={executingRunId === r.id}
                            style={btn(executingRunId === r.id ? '#94a3b8' : '#0ea5e9')}>
                      {executingRunId === r.id ? '⏹ Speaking...' : '▶ Play'}
                    </button>
                    <button onClick={() => markRun(r, 'accepted')}
                            style={btn('#16a34a')}>
                      ✓ Accepted
                    </button>
                    <button onClick={() => markRun(r, 'declined')}
                            style={btn('#dc2626')}>
                      ✗ Declined
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626',
                        color: '#b91c1c', fontSize: 12 }}>
            {error}
          </div>
        )}
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
