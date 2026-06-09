// VoiceAIDemoPage — end-to-end voice AI demo.
// Per operator 2026-06-08: "voice AI ..all the scenario ..end to end process,
// contact center, welcome message, service sales, presales, take sample produce
// and create complete UI to adding list of product and sales, customizing
// welcome message, requirement taking, customer sales/order creation and
// notification, UI with customer identification, knowledge AI"
// + "create UI with process flow, data, stakeholder, end to end solution,
// monitoring, scoring"

import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const STAGES = [
  'welcome', 'identify', 'presales', 'requirement',
  'recommend', 'order', 'notify', 'complete',
];

const STAGE_LABEL = {
  welcome: '1. Welcome',
  identify: '2. Identify',
  presales: '3. Pre-sales',
  requirement: '4. Requirement',
  recommend: '5. Recommend',
  order: '6. Order',
  notify: '7. Notify',
  complete: '8. Complete',
};

export default function VoiceAIDemoPage() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [welcomeTemplates, setWelcomeTemplates] = useState([]);
  const [orders, setOrders] = useState([]);
  const [monitoring, setMonitoring] = useState(null);

  const [selectedCustomerRef, setSelectedCustomerRef] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [stage, setStage] = useState('welcome');
  const [transcript, setTranscript] = useState([]);
  const [userText, setUserText] = useState('');
  const [recommended, setRecommended] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recRef = { current: null };  // box held by closure

  // New-product form
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: 'auto', price_cents: 0, description: '',
  });

  const fetchJSON = async (path, opts = {}) => {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`${r.status}: ${body}`);
    }
    return r.json();
  };

  const loadAll = async () => {
    try {
      const [cs, ps, wt, mn, os] = await Promise.all([
        fetchJSON('/api/v1/voice-ai/customers'),
        fetchJSON('/api/v1/voice-ai/products'),
        fetchJSON('/api/v1/voice-ai/welcome-templates'),
        fetchJSON('/api/v1/voice-ai/monitoring'),
        fetchJSON('/api/v1/voice-ai/orders'),
      ]);
      setCustomers(cs.items || []);
      setProducts(ps || []);
      setWelcomeTemplates(wt || []);
      setMonitoring(mn);
      setOrders(os.items || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('load failed:', e.message);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Auto-refresh monitoring every 5s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const mn = await fetchJSON('/api/v1/voice-ai/monitoring');
        setMonitoring(mn);
      } catch { /* swallow */ }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const startSession = async () => {
    setBusy(true);
    try {
      const body = selectedCustomerRef ? { customer_ref: selectedCustomerRef } : {};
      const r = await fetchJSON('/api/v1/voice-ai/sessions/start', {
        method: 'POST', body: JSON.stringify(body),
      });
      setSessionId(r.session.session_id);
      setStage(r.session.stage);
      setTranscript([{ role: 'assistant', text: r.welcome_text }]);
      setRecommended(null);
      setLastOrder(null);
    } catch (e) {
      setTranscript([{ role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const sendTurn = async () => {
    if (!sessionId || !userText.trim()) return;
    const userMsg = { role: 'user', text: userText };
    setTranscript((t) => [...t, userMsg]);
    setBusy(true);
    const sent = userText;
    setUserText('');
    try {
      const r = await fetchJSON('/api/v1/voice-ai/sessions/turn', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, user_text: sent }),
      });
      setTranscript((t) => [...t, { role: 'assistant', text: r.assistant_text }]);
      setStage(r.stage);
      speakReply(r.assistant_text);
      if (r.recommended_product) setRecommended(r.recommended_product);
      if (r.order) {
        setLastOrder(r.order);
        loadAll();
      }
    } catch (e) {
      setTranscript((t) => [...t, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const createProduct = async () => {
    if (!newProduct.sku || !newProduct.name) return;
    try {
      await fetchJSON('/api/v1/voice-ai/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProduct,
          price_cents: parseInt(newProduct.price_cents || 0, 10),
          features: [],
        }),
      });
      setNewProduct({ sku: '', name: '', category: 'auto', price_cents: 0, description: '' });
      loadAll();
    } catch (e) {
      alert(`Create failed: ${e.message}`);
    }
  };

  const updateWelcome = async (id, patch) => {
    try {
      await fetchJSON(`/api/v1/voice-ai/welcome-templates/${id}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      loadAll();
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  };


  const speakReply = (text) => {
    // Browser SpeechSynthesis · per §57.7 honest fallback when no ElevenLabs key.
    // No npm dep · no API key · works offline in Chrome/Edge/Safari/Firefox.
    if (!ttsEnabled || !text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();  // stop any in-flight utterance
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      // graceful no-op · don't break the conversation
    }
  };

  const toggleMic = () => {
    // Browser SpeechRecognition · per §57.7 honest fallback when no Deepgram key.
    // Supported in Chrome/Edge/Safari · Firefox needs about:config flag.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('SpeechRecognition not supported. Use Chrome/Edge/Safari or wire Deepgram.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      if (text) setUserText(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  // ── Styles ──
  const card = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: 12, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };
  const h3 = { margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#0f172a' };
  const small = { fontSize: 11, color: '#64748b' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 360px',
                  gap: 12, padding: 12, background: '#f8fafc',
                  minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* ─── LEFT COLUMN — Catalog + Customer + Welcome ─── */}
      <div>
        <div style={card}>
          <h3 style={h3}>Customer Identification</h3>
          <select
            value={selectedCustomerRef}
            onChange={(e) => setSelectedCustomerRef(e.target.value)}
            style={{ width: '100%', padding: 6, fontSize: 12 }}
          >
            <option value="">— New lead (no customer) —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.customer_ref}>
                {c.full_name} ({c.segment} · {c.phone})
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={startSession}
            style={{
              marginTop: 8, padding: '6px 12px', background: '#1e40af',
              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
          >
            Start session
          </button>
        </div>

        <div style={card}>
          <h3 style={h3}>Welcome Templates</h3>
          {welcomeTemplates.map((wt) => (
            <div key={wt.id} style={{ marginBottom: 8, fontSize: 12 }}>
              <div style={small}>
                {wt.name} {wt.is_default && '· DEFAULT'} · {wt.segment || 'all'}
              </div>
              <textarea
                defaultValue={wt.text}
                onBlur={(e) => {
                  if (e.target.value !== wt.text) updateWelcome(wt.id, { text: e.target.value });
                }}
                style={{ width: '100%', fontSize: 11, minHeight: 36, padding: 4 }}
              />
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={h3}>Product Catalog ({products.length})</h3>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {products.map((p) => (
              <div key={p.id} style={{ padding: 6, borderBottom: '1px solid #f1f5f9', fontSize: 11 }}>
                <strong>{p.name}</strong> · ${(p.price_cents / 100).toFixed(2)}
                <div style={small}>
                  {p.category} · {p.target_segment || 'all'} · {p.sku}
                </div>
              </div>
            ))}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, cursor: 'pointer', color: '#1e40af' }}>+ Add product</summary>
            <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
              <input placeholder="SKU" value={newProduct.sku}
                     onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                     style={{ fontSize: 11, padding: 4 }} />
              <input placeholder="Name" value={newProduct.name}
                     onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                     style={{ fontSize: 11, padding: 4 }} />
              <select value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      style={{ fontSize: 11, padding: 4 }}>
                <option>auto</option><option>home</option><option>life</option>
                <option>health</option><option>umbrella</option>
              </select>
              <input placeholder="Price (cents)" type="number" value={newProduct.price_cents}
                     onChange={(e) => setNewProduct({ ...newProduct, price_cents: e.target.value })}
                     style={{ fontSize: 11, padding: 4 }} />
              <button onClick={createProduct}
                      style={{ fontSize: 11, padding: '4px 8px', background: '#16a34a',
                              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Create
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* ─── MIDDLE COLUMN — Conversation + Stage Flow ─── */}
      <div>
        <div style={card}>
          <h3 style={h3}>Process Flow (8 stages)</h3>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STAGES.map((s) => (
              <div key={s} style={{
                padding: '4px 8px',
                fontSize: 11, borderRadius: 4,
                background: stage === s ? '#1e40af' : '#f1f5f9',
                color: stage === s ? '#fff' : '#475569',
                fontWeight: stage === s ? 600 : 400,
              }}>
                {STAGE_LABEL[s]}
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <h3 style={h3}>Conversation</h3>
          {!sessionId && (
            <div style={{ ...small, padding: 16, textAlign: 'center' }}>
              Pick a customer (left) and click "Start session" to begin.
            </div>
          )}
          {sessionId && (
            <>
              <div style={small}>session_id: <code>{sessionId}</code></div>
              <div style={{ maxHeight: 360, overflow: 'auto',
                            margin: '8px 0', padding: 8, background: '#f8fafc', borderRadius: 4 }}>
                {transcript.map((t, i) => (
                  <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                    <strong style={{ color: t.role === 'user' ? '#0f766e' : '#1e40af' }}>
                      {t.role === 'user' ? 'You' : 'Aria'}:
                    </strong>{' '}
                    {t.text}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTurn()}
                  placeholder='Type or press Mic · e.g. "I need auto coverage"'
                  style={{ flex: 1, padding: 6, fontSize: 12 }}
                />
                <button onClick={toggleMic}
                        disabled={busy}
                        title={listening ? 'Stop listening' : 'Speak (browser SpeechRecognition · per §57.7 honest fallback when no Deepgram key)'}
                        style={{ padding: '6px 10px',
                                background: listening ? '#dc2626' : '#0ea5e9',
                                color: '#fff', border: 'none', borderRadius: 4,
                                cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                  {listening ? '⏹' : '🎤'}
                </button>
                <button onClick={() => setTtsEnabled((v) => !v)}
                        title={ttsEnabled ? 'TTS playback ON (browser SpeechSynthesis · per §57.7 honest fallback)' : 'TTS playback OFF'}
                        style={{ padding: '6px 10px',
                                background: ttsEnabled ? '#14b8a6' : '#94a3b8',
                                color: '#fff', border: 'none', borderRadius: 4,
                                cursor: 'pointer', fontSize: 12 }}>
                  {ttsEnabled ? '🔊' : '🔇'}
                </button>
                <button onClick={sendTurn} disabled={busy || !userText.trim()}
                        style={{ padding: '6px 12px', background: '#1e40af',
                                color: '#fff', border: 'none', borderRadius: 4,
                                cursor: 'pointer', fontSize: 12 }}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>

        {recommended && (
          <div style={{ ...card, borderLeft: '4px solid #16a34a' }}>
            <h3 style={h3}>Recommended Product</h3>
            <strong>{recommended.name}</strong> ·{' '}
            <span style={{ color: '#16a34a' }}>${(recommended.price_cents / 100).toFixed(2)}</span>
            <div style={small}>{recommended.description}</div>
            <div style={small}>features: {recommended.features.join(', ')}</div>
          </div>
        )}

        {lastOrder && (
          <div style={{ ...card, borderLeft: '4px solid #16a34a',
                       background: '#f0fdf4' }}>
            <h3 style={h3}>Order Created</h3>
            <code style={{ fontSize: 13 }}>{lastOrder.order_ref}</code> ·{' '}
            ${(lastOrder.total_cents / 100).toFixed(2)} ·{' '}
            <span style={{ color: '#15803d', fontWeight: 600 }}>{lastOrder.status}</span>
          </div>
        )}
      </div>

      {/* ─── RIGHT COLUMN — Monitoring + Scoring + Stakeholders ─── */}
      <div>
        <div style={card}>
          <h3 style={h3}>Monitoring (live · 5s refresh)</h3>
          {monitoring ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Tile label="Sessions 24h" value={monitoring.total_sessions_24h} />
              <Tile label="Active" value={monitoring.active_sessions} />
              <Tile label="Completed 24h" value={monitoring.completed_sessions_24h} />
              <Tile label="Orders 24h" value={monitoring.orders_created_24h} />
              <Tile label="Conv rate" value={`${monitoring.conversion_rate_pct}%`}
                    accent={monitoring.conversion_rate_pct >= 22 ? '#16a34a' : '#dc2626'} />
              <Tile label="Avg turns" value={monitoring.avg_turns_per_session} />
              <Tile label="CSAT proxy" value={monitoring.customer_satisfaction_proxy}
                    accent={monitoring.customer_satisfaction_proxy >= 0.65 ? '#16a34a' : '#dc2626'} />
              <Tile label="Stages" value={Object.keys(monitoring.stage_distribution).length} />
            </div>
          ) : <div style={small}>loading...</div>}
        </div>

        <div style={card}>
          <h3 style={h3}>Stage distribution</h3>
          {monitoring && Object.entries(monitoring.stage_distribution).map(([s, n]) => (
            <div key={s} style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ display: 'inline-block', width: 80 }}>{s}</span>
              <span style={{
                display: 'inline-block', background: '#1e40af', height: 10,
                width: `${Math.min(n * 8, 200)}px`, borderRadius: 2, verticalAlign: 'middle',
              }} /> {n}
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={h3}>Recent Orders</h3>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} style={{ fontSize: 11, paddingBottom: 6,
                                     borderBottom: '1px solid #f1f5f9', marginBottom: 6 }}>
              <code>{o.order_ref}</code> · ${(o.total_cents / 100).toFixed(2)}
              <div style={small}>{o.status} · customer {o.customer_id}</div>
            </div>
          ))}
          {orders.length === 0 && <div style={small}>no orders yet</div>}
        </div>

        <div style={card}>
          <h3 style={h3}>Stakeholders</h3>
          <div style={{ fontSize: 11 }}>
            <strong>VP Sales</strong> · +83% conv · sign-off<br/>
            <strong>VP CS</strong> · NPS 32 → 48 · adoption<br/>
            <strong>VP Compliance</strong> · real-time audit · gate<br/>
            <strong>CFO</strong> · $7.2M savings · approve<br/>
            <strong>CISO</strong> · §47.6 sign-off · gate
          </div>
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
