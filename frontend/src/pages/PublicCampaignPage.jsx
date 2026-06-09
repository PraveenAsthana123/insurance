// PublicCampaignPage — consumer-facing survey + form rendering.
//
// Per operator 2026-06-08: customer-facing public pages for the survey + form
// campaigns. NO authentication · just token-based lookup via URL path.
//
// Routes:
//   /public/survey/:campaignRef/:customerId
//   /public/form/:campaignRef/:customerId
//
// Reads /api/v1/marketing-campaigns/public/{kind}/{ref}/{cust}/preview to
// fetch the rendered_payload, renders the questions/fields, and POSTs to
// the respond/submit endpoint. DLP gate is enforced server-side.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function PublicCampaignPage({ kind }) {
  const { campaignRef, customerId } = useParams();
  const [preview, setPreview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState('loading');  // loading · ready · submitting · done · error · already_done
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `${API_BASE}/api/v1/marketing-campaigns/public/${kind}/${campaignRef}/${customerId}/preview`,
        );
        if (r.status === 404) {
          setStatus('already_done');
          return;
        }
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        setPreview(d);
        if (d.status !== 'pending') {
          setStatus('already_done');
        } else {
          setStatus('ready');
        }
      } catch (e) {
        setStatus('error');
        setError(e.message);
      }
    })();
  }, [kind, campaignRef, customerId]);

  const handleSubmit = async () => {
    setStatus('submitting');
    try {
      const endpoint = kind === 'survey' ? 'respond' : 'submit';
      const r = await fetch(
        `${API_BASE}/api/v1/marketing-campaigns/public/${kind}/${campaignRef}/${customerId}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: answers }),
        },
      );
      if (r.status === 400) {
        const body = await r.json();
        setError(body.detail?.detail || 'Submission blocked: please remove sensitive numbers.');
        setStatus('ready');
        return;
      }
      if (!r.ok) throw new Error(`${r.status}`);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  };

  const renderField = (field) => {
    const val = answers[field.id] ?? '';
    const set = (v) => setAnswers((a) => ({ ...a, [field.id]: v }));
    const common = {
      value: val,
      onChange: (e) => set(e.target.value),
      required: field.required,
      style: {
        width: '100%', padding: 10, fontSize: 14, border: '1px solid #cbd5e1',
        borderRadius: 6,
      },
    };
    if (field.type === 'select') {
      return (
        <select {...common}>
          <option value="">— pick one —</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (field.type === 'date') {
      return <input type="date" {...common} />;
    }
    if (field.type === 'tel') {
      return <input type="tel" {...common} placeholder="Phone number" />;
    }
    if (field.type === 'email') {
      return <input type="email" {...common} placeholder="email@example.com" />;
    }
    return <input type="text" {...common} />;
  };

  const renderQuestion = (q) => {
    const val = answers[q.id] ?? '';
    const set = (v) => setAnswers((a) => ({ ...a, [q.id]: v }));
    if (q.type === 'nps') {
      return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button key={n} type="button"
                    onClick={() => set(n)}
                    style={{
                      padding: '8px 12px', fontSize: 14, cursor: 'pointer',
                      background: val === n ? '#1e40af' : '#fff',
                      color: val === n ? '#fff' : '#475569',
                      border: `2px solid ${val === n ? '#1e40af' : '#cbd5e1'}`,
                      borderRadius: 6, minWidth: 40,
                    }}>
              {n}
            </button>
          ))}
        </div>
      );
    }
    if (q.type === 'radio') {
      return (
        <div>
          {(q.options || []).map((o) => (
            <label key={o} style={{
              display: 'block', padding: 8, marginBottom: 4,
              border: `1px solid ${val === o ? '#1e40af' : '#cbd5e1'}`,
              borderRadius: 4, cursor: 'pointer',
              background: val === o ? '#dbeafe' : '#fff',
            }}>
              <input type="radio" name={q.id} value={o} checked={val === o}
                     onChange={(e) => set(e.target.value)}
                     style={{ marginRight: 8 }} />
              {o}
            </label>
          ))}
        </div>
      );
    }
    return (
      <textarea value={val} onChange={(e) => set(e.target.value)}
                style={{
                  width: '100%', padding: 10, fontSize: 14, minHeight: 80,
                  border: '1px solid #cbd5e1', borderRadius: 6,
                }} />
    );
  };

  const card = {
    maxWidth: 600, margin: '40px auto', background: '#fff',
    border: '1px solid #e2e8f0', borderRadius: 12, padding: 24,
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  };

  if (status === 'loading') {
    return <div style={card}><p>Loading...</p></div>;
  }
  if (status === 'already_done') {
    return (
      <div style={card}>
        <h2 style={{ margin: 0 }}>Thanks · already on file</h2>
        <p style={{ color: '#64748b' }}>
          We already have your {kind} response. If you need to update something,
          please reach out to your agent.
        </p>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div style={card}>
        <h2 style={{ margin: 0, color: '#dc2626' }}>Something went wrong</h2>
        <p>{error || 'Unknown error.'}</p>
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div style={card}>
        <h2 style={{ margin: 0, color: '#15803d' }}>Thank you · received</h2>
        <p style={{ color: '#64748b' }}>
          {preview?.payload?.success_message || 'Your response has been recorded.'}
        </p>
      </div>
    );
  }

  // status === 'ready' or 'submitting'
  const items = kind === 'survey'
    ? (preview?.payload?.questions || [])
    : (preview?.payload?.fields || []);

  return (
    <div style={card}>
      <h1 style={{ margin: '0 0 4px' }}>
        {preview?.campaign_name || (kind === 'survey' ? 'Quick survey' : 'Lead form')}
      </h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        {preview?.product_pitch}
      </p>
      {preview?.payload?.intro_text && (
        <p style={{ background: '#f0f9ff', padding: 12, borderRadius: 6, fontSize: 14 }}>
          {preview.payload.intro_text}
        </p>
      )}
      {preview?.payload?.reward && (
        <p style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          padding: 10, borderRadius: 6, fontSize: 13, color: '#92400e',
        }}>
          🎁 Reward · {preview.payload.reward}
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontWeight: 600, fontSize: 14,
              marginBottom: 4, color: '#0f172a',
            }}>
              {kind === 'survey' ? item.text : item.label}
              {item.required && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            {kind === 'survey' ? renderQuestion(item) : renderField(item)}
          </div>
        ))}
        <button type="submit"
                disabled={status === 'submitting'}
                style={{
                  padding: '12px 24px', fontSize: 14, fontWeight: 700,
                  background: status === 'submitting' ? '#94a3b8' : '#1e40af',
                  color: '#fff', border: 'none', borderRadius: 6,
                  cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                  marginTop: 12,
                }}>
          {status === 'submitting'
            ? 'Submitting...'
            : (preview?.call_to_action || 'Submit')}
        </button>
        {error && (
          <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>
            {error}
          </p>
        )}
      </form>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
        Insur Analytics · §76 RAI · this response is consent-verified and DLP-gated.
      </p>
    </div>
  );
}
