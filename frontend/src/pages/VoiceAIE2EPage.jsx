// VoiceAIE2EPage — comprehensive end-to-end voice AI observability dashboard.
// Per operator 2026-06-08 stacked asks:
//   "create each phase, component in detail and manual and automatic both
//    scenario end to end with quality, benchmark, scoring, tracking date,
//    timestamp, user" + "visualization dashboard report" + "explainability"
//    + "voice quality . indian accent , list of language supported"
//
// Six sections per §64.34 5-layer simulation + §48 XAI + §75 metrics + §76 fairness:
//   1. Phase strip with expandable Components × Manual × Automatic detail
//   2. Benchmark Manual-vs-Auto table + visual speedup chart
//   3. Live session tracking grid (date/timestamp/user/correlation_id)
//   4. Quality scoring tiles per phase
//   5. Explainability inspector (attribution chain + product match scoring)
//   6. Voice quality + language picker (23 langs · 12 Indian accents)

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function VoiceAIE2EPage() {
  const [phases, setPhases] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [quality, setQuality] = useState(null);
  const [voices, setVoices] = useState(null);
  const [browserVoices, setBrowserVoices] = useState([]);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [tracking, setTracking] = useState(null);
  const [explainability, setExplainability] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [error, setError] = useState(null);

  const fetchJSON = async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  const loadAll = async () => {
    try {
      const [ph, bm, q, vc] = await Promise.all([
        fetchJSON('/api/v1/voice-ai/e2e/phases'),
        fetchJSON('/api/v1/voice-ai/e2e/benchmark'),
        fetchJSON('/api/v1/voice-ai/e2e/quality'),
        fetchJSON('/api/v1/voice-ai/e2e/voices'),
      ]);
      setPhases(ph.phases || []);
      setBenchmark(bm);
      setQuality(q);
      setVoices(vc);
      setError(null);
    } catch (e) {
      setError(`load: ${e.message}`);
    }
  };

  // Pull session list from inbound demo (joins via orders)
  const loadSessions = async () => {
    try {
      const r = await fetchJSON('/api/v1/voice-ai/orders');
      const uniqueSessions = [];
      const seen = new Set();
      for (const o of (r.items || [])) {
        if (o.session_id && !seen.has(o.session_id)) {
          uniqueSessions.push(o.session_id);
          seen.add(o.session_id);
        }
      }
      setSessions(uniqueSessions);
    } catch { /* swallow */ }
  };

  const loadTracking = async (sid) => {
    if (!sid) return;
    try {
      const [t, e] = await Promise.all([
        fetchJSON(`/api/v1/voice-ai/e2e/sessions/${sid}/tracking`),
        fetchJSON(`/api/v1/voice-ai/e2e/sessions/${sid}/explainability`),
      ]);
      setTracking(t);
      setExplainability(e);
    } catch (err) {
      setError(`tracking: ${err.message}`);
    }
  };

  useEffect(() => { loadAll(); loadSessions(); }, []);
  useEffect(() => {
    if (selectedSessionId) loadTracking(selectedSessionId);
  }, [selectedSessionId]);

  // Browser voice catalog · pulled live
  useEffect(() => {
    const update = () => {
      if (window.speechSynthesis) {
        setBrowserVoices(window.speechSynthesis.getVoices());
      }
    };
    update();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = update;
    }
  }, []);

  const previewVoice = () => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(
      'This is a preview of how Aria will sound to your customers.',
    );
    u.lang = selectedLang;
    if (selectedVoice) {
      const v = browserVoices.find((bv) => bv.name === selectedVoice);
      if (v) u.voice = v;
    }
    u.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // ── styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12,
  };
  const h3 = { margin: '0 0 8px', fontSize: 14, fontWeight: 700 };
  const small = { fontSize: 11, color: '#64748b' };
  const td = { padding: 4, fontSize: 11, borderTop: '1px solid #f1f5f9' };
  const th = { padding: 4, fontSize: 11, fontWeight: 700, textAlign: 'left',
                color: '#64748b', borderBottom: '1px solid #e2e8f0' };

  // Filter browser voices by selected language prefix
  const langPrefix = selectedLang.split('-')[0];
  const filteredBrowserVoices = browserVoices.filter(
    (v) => v.lang === selectedLang || v.lang.startsWith(langPrefix + '-'),
  );

  const matchingBackendLang = voices?.languages?.find((l) => l.code === selectedLang);

  return (
    <div style={{ padding: 16, background: '#f8fafc', minHeight: '100vh',
                  fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>
        Voice AI · End-to-End Observability
      </h1>
      <div style={{ ...small, marginBottom: 16 }}>
        Per §64.34 5-layer simulation · §48 XAI · §75 metrics · §76 fairness · §82.7 drift
      </div>

      {error && (
        <div style={{ ...card, background: '#fee2e2', borderColor: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* ─── SECTION 1 · Phase strip with detail expansion ─── */}
      <div style={card}>
        <h3 style={h3}>1. 8-Phase Component Breakdown · click to expand</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
          {phases.map((p) => (
            <div key={p.id}
                 onClick={() => setExpandedPhase(expandedPhase === p.id ? null : p.id)}
                 style={{
                   padding: 8, borderRadius: 4, cursor: 'pointer', fontSize: 12,
                   background: expandedPhase === p.id ? '#dbeafe' : '#f8fafc',
                   border: `1px solid ${expandedPhase === p.id ? '#1e40af' : '#e2e8f0'}`,
                 }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={small}>
                {p.live_metrics?.sessions_in_stage || 0} sessions · {p.components?.length} components
              </div>
            </div>
          ))}
        </div>
        {expandedPhase && (() => {
          const p = phases.find((x) => x.id === expandedPhase);
          if (!p) return null;
          return (
            <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 4 }}>
              <h4 style={{ margin: '0 0 8px' }}>{p.name} · {p.purpose}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 12 }}>📝 Manual scenario</strong>
                  <ol style={{ fontSize: 11, paddingLeft: 16 }}>
                    {(p.manual_steps || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
                <div>
                  <strong style={{ fontSize: 12 }}>🤖 Automatic scenario</strong>
                  <ol style={{ fontSize: 11, paddingLeft: 16 }}>
                    {(p.automatic_steps || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ fontSize: 12 }}>🧩 Components ({p.components?.length})</strong>
                <table style={{ width: '100%', marginTop: 4 }}>
                  <thead><tr><th style={th}>Name</th><th style={th}>Type</th>
                              <th style={th}>Backing</th><th style={th}>Manual equiv</th></tr></thead>
                  <tbody>
                    {(p.components || []).map((c, i) => (
                      <tr key={i}>
                        <td style={td}><strong>{c.name}</strong></td>
                        <td style={td}><code>{c.type}</code></td>
                        <td style={td}>{c.table || c.api || c.spec || c.logic || '—'}</td>
                        <td style={td}>{c.manual_equivalent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, ...small }}>
                Quality targets: {JSON.stringify(p.target_quality)}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── SECTION 2 · Benchmark Manual vs Auto ─── */}
      {benchmark && (
        <div style={card}>
          <h3 style={h3}>2. Benchmark · Manual vs Automatic</h3>
          <div style={small}>{benchmark.spec}</div>
          <table style={{ width: '100%', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={th}>Phase</th>
                <th style={th}>Manual sec</th>
                <th style={th}>Auto sec</th>
                <th style={th}>Speedup</th>
                <th style={th}>Manual err/100</th>
                <th style={th}>Auto err/100</th>
                <th style={th}>Manual ¢</th>
                <th style={th}>Auto ¢</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.per_phase.map((r, i) => (
                <tr key={i}>
                  <td style={td}><strong>{r.phase_name}</strong></td>
                  <td style={td}>{r.manual_avg_seconds}</td>
                  <td style={td}>{r.auto_avg_seconds.toFixed(2)}</td>
                  <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>
                    {r.speedup_factor.toFixed(0)}×
                  </td>
                  <td style={td}>{r.manual_errors_per_100}</td>
                  <td style={td}>{r.auto_errors_per_100}</td>
                  <td style={td}>${(r.manual_cost_cents / 100).toFixed(2)}</td>
                  <td style={td}>${(r.auto_cost_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#dcfce7' }}>
                <td style={{ ...td, fontWeight: 700 }}>TOTAL</td>
                <td style={{ ...td, fontWeight: 700 }}>{benchmark.totals.manual_total_seconds}</td>
                <td style={{ ...td, fontWeight: 700 }}>{benchmark.totals.auto_total_seconds.toFixed(2)}</td>
                <td style={{ ...td, fontWeight: 700, color: '#16a34a' }}>
                  {benchmark.totals.overall_speedup.toFixed(0)}×
                </td>
                <td style={td} colSpan="2"></td>
                <td style={{ ...td, fontWeight: 700 }}>
                  ${(benchmark.totals.manual_total_cost_cents / 100).toFixed(2)}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>
                  ${(benchmark.totals.auto_total_cost_cents / 100).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
            💰 Cost savings: {benchmark.totals.cost_savings_pct.toFixed(1)}% · Overall speedup: {benchmark.totals.overall_speedup.toFixed(0)}×
          </div>
        </div>
      )}

      {/* ─── SECTION 3 · Quality scoring ─── */}
      {quality && (
        <div style={card}>
          <h3 style={h3}>3. Quality Scoring · per §75</h3>
          <div style={{ ...small, marginBottom: 8 }}>
            Overall: <strong>{(quality.overall_score * 100).toFixed(1)}%</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {quality.per_phase.map((p, i) => (
              <div key={i} style={{
                padding: 8, borderRadius: 4,
                background: p.passed ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${p.passed ? '#16a34a' : '#dc2626'}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{p.phase_name}</div>
                <div style={{ fontSize: 16, fontWeight: 700,
                              color: p.passed ? '#15803d' : '#b91c1c' }}>
                  {(p.live_score * 100).toFixed(0)}%
                </div>
                <div style={small}>{p.sessions} sessions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SECTION 4 · Tracking timeline ─── */}
      <div style={card}>
        <h3 style={h3}>4. Session Tracking · date · timestamp · user · correlation_id</h3>
        <select value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                style={{ padding: 6, fontSize: 12, marginBottom: 8 }}>
          <option value="">— Pick a session —</option>
          {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {tracking && (
          <>
            <div style={{ ...small, marginBottom: 8 }}>
              <strong>{tracking.customer_name}</strong> ({tracking.segment})
              · stage: <code>{tracking.stage}</code>
              · correlation_id: <code>{tracking.correlation_id || 'n/a'}</code>
              · started: {tracking.started_at}
            </div>
            <table style={{ width: '100%' }}>
              <thead><tr>
                <th style={th}>#</th><th style={th}>Date</th><th style={th}>Timestamp</th>
                <th style={th}>User</th><th style={th}>Actor</th><th style={th}>Text</th>
                <th style={th}>Stage</th><th style={th}>corr_id</th>
              </tr></thead>
              <tbody>
                {tracking.timeline.map((t) => (
                  <tr key={t.seq}>
                    <td style={td}>{t.seq}</td>
                    <td style={td}>{t.date}</td>
                    <td style={td}><code style={{ fontSize: 10 }}>{t.timestamp?.slice(11, 19)}</code></td>
                    <td style={td}>{t.user}</td>
                    <td style={td}><code>{t.actor}</code></td>
                    <td style={td}>{t.text}</td>
                    <td style={td}><code>{t.stage_when_logged}</code></td>
                    <td style={td}><code style={{ fontSize: 9 }}>{t.correlation_id?.slice(0, 8) || '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ─── SECTION 5 · Explainability ─── */}
      {explainability && !explainability.error && (
        <div style={card}>
          <h3 style={h3}>5. Explainability · per §48 XAI MANDATORY</h3>
          <div style={small}>{explainability.spec}</div>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <strong>Recommended:</strong> {explainability.recommended_product || '(none)'}<br/>
              <strong>Customer:</strong> {explainability.customer_name} ({explainability.customer_segment})<br/>
              <strong>Extracted category:</strong> <code>{explainability.extracted_category || '—'}</code><br/>
              <strong>Extracted features:</strong>{' '}
              {(explainability.extracted_features || []).map((f, i) => (
                <code key={i} style={{ marginRight: 4, background: '#e0e7ff', padding: '1px 4px' }}>{f}</code>
              ))}
            </div>
            <div>
              <strong>Match scoring:</strong>
              <ul style={{ fontSize: 11, paddingLeft: 16, margin: '4px 0' }}>
                <li>Segment boost: <strong>{explainability.match_scoring?.segment_boost}</strong></li>
                <li>Feature overlap score: <strong>{explainability.match_scoring?.feature_overlap_score}</strong></li>
                <li>Feature overlap set: {(explainability.match_scoring?.feature_overlap_set || []).join(', ') || '—'}</li>
                <li>Missing features: {(explainability.match_scoring?.missing_features || []).join(', ') || '—'}</li>
                <li>Price preference score: <strong>{explainability.match_scoring?.price_preference_score?.toFixed(2)}</strong></li>
                <li style={{ color: '#16a34a' }}>
                  Total: <strong>{explainability.match_scoring?.total}</strong>
                </li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong style={{ fontSize: 12 }}>🔗 Attribution chain ({explainability.attribution_chain?.length})</strong>
            <table style={{ width: '100%', marginTop: 4 }}>
              <thead><tr>
                <th style={th}>Turn</th><th style={th}>User said</th><th style={th}>Keyword</th>
                <th style={th}>Derived</th><th style={th}>Weight</th><th style={th}>Rule</th>
              </tr></thead>
              <tbody>
                {(explainability.attribution_chain || []).map((a, i) => (
                  <tr key={i}>
                    <td style={td}>{a.turn}</td>
                    <td style={td}>{a.user_text_excerpt}</td>
                    <td style={td}><code>{a.matched_keyword}</code></td>
                    <td style={td}><code>{a.derived}</code></td>
                    <td style={td}>{a.weight}</td>
                    <td style={td}>{a.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SECTION 6 · Voice quality + language picker ─── */}
      {voices && (
        <div style={card}>
          <h3 style={h3}>
            6. Voice Quality · {voices.total_languages} languages · {voices.indian_count} Indian accents
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 12 }}>🌐 Language picker</strong>
              <select value={selectedLang}
                      onChange={(e) => { setSelectedLang(e.target.value); setSelectedVoice(''); }}
                      style={{ width: '100%', padding: 6, fontSize: 12, marginTop: 4 }}>
                {(voices.languages || []).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} {l.indian_accent ? '🇮🇳' : ''} ({l.code})
                  </option>
                ))}
              </select>
              {matchingBackendLang && (
                <div style={{ ...small, marginTop: 4 }}>
                  {matchingBackendLang.notes}
                </div>
              )}
              <div style={{ marginTop: 8, ...small }}>
                <strong>Browser voices for {selectedLang} ({filteredBrowserVoices.length}):</strong>
              </div>
              {filteredBrowserVoices.length > 0 ? (
                <select value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        style={{ width: '100%', padding: 6, fontSize: 11, marginTop: 4 }}>
                  <option value="">— OS default —</option>
                  {filteredBrowserVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang}) {v.localService ? '· local' : '· cloud'}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ ...small, marginTop: 4, color: '#dc2626' }}>
                  No browser voice for this language. Install OS language pack OR use cloud TTS (ElevenLabs · Deepgram).
                </div>
              )}
              <button onClick={previewVoice}
                      style={{ marginTop: 8, padding: '6px 12px', background: '#1e40af',
                              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
                              fontSize: 12 }}>
                🔊 Preview voice
              </button>
            </div>
            <div>
              <strong style={{ fontSize: 12 }}>⭐ Voice quality tiers</strong>
              <table style={{ width: '100%', marginTop: 4 }}>
                <tbody>
                  {Object.entries(voices.voice_quality_tiers || {}).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>{k}</td>
                      <td style={td}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, ...small }}>{voices.spec}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
