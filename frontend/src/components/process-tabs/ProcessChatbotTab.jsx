import { useState, useRef, useEffect } from 'react';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ---- Sample Q&A for simulated responses ---- */
const SAMPLE_QA = {
  'forecast accuracy': {
    answer: `The current **forecast accuracy** for this process is **91.2% (MAPE: 7.8%)**. This is measured on the 30-day holdout set across all SKUs and stores. The XGBoost model outperforms baseline by 13.4 percentage points and meets the target of <10% MAPE set by the business.\n\n- Best accuracy: **Ensemble model at 92.4%**\n- Worst performing SKU segment: Seasonal/promotional items (MAPE ~14%)\n- Recommended action: Add promotion flag features for next model iteration.`,
    chunks: [
      { source: 'models/xgboost_eval_report.md', score: 0.94, snippet: 'XGBoost MAPE 7.8%, RMSE 34.2 on 30-day holdout...' },
      { source: 'data/metrics_summary_2024Q4.csv', score: 0.87, snippet: 'Model accuracy: 91.2%, precision: 89.7%, recall: 90.1%...' },
      { source: 'docs/forecast_kpis.md', score: 0.81, snippet: 'Target MAPE: <10%, current: 7.8% (exceeds target)...' },
    ],
    followups: ['What drove the accuracy improvement?', 'Show SKU-level accuracy breakdown', 'Which features matter most?'],
  },
  'demand spike': {
    answer: `The demand spike last week (Week 48) was driven by **three compounding factors**:\n\n1. **Promotional campaign** — 20% off on Category A triggered +38% volume lift\n2. **Seasonal peak** — December pre-holiday buying pattern detected\n3. **Competitor stock-out** — External intelligence shows competitor SKU unavailable in 3 regions\n\nThe model flagged a +2.1σ deviation on Tuesday and Wednesday. The RAG system retrieved 4 relevant historical spike events from 2022–2023 with similar signatures.`,
    chunks: [
      { source: 'data/promo_calendar_2024.xlsx', score: 0.96, snippet: 'Promo W48: 20% discount on Category A, expected +35% lift...' },
      { source: 'logs/anomaly_detection_W48.json', score: 0.89, snippet: 'Spike detected: +2.1 sigma above 12-week rolling mean...' },
      { source: 'external/competitor_intel_Dec2024.pdf', score: 0.74, snippet: 'Competitor OOS in 3 regions, Category A, week of Dec 2...' },
    ],
    followups: ['How often do spikes occur?', 'Set up spike alert for next week', 'Impact on inventory?'],
  },
  'xgboost vs lstm': {
    answer: `**XGBoost vs LSTM Comparison for this process:**\n\n| Metric | XGBoost | LSTM |\n|--------|---------|------|\n| Accuracy | 91.2% | 85.4% |\n| MAPE | 7.8% | 11.2% |\n| Training Time | 42s | 8.3 min |\n| Interpretability | High (SHAP) | Low |\n| Holiday Periods | ★★★★☆ | ★★★☆☆ |\n\n**Recommendation:** XGBoost is preferred for this process due to better accuracy, faster training, and interpretability. LSTM may add value in the ensemble for long-horizon (>60 day) forecasts where sequence dependencies matter.`,
    chunks: [
      { source: 'models/comparison_report_Q4.md', score: 0.97, snippet: 'XGBoost vs LSTM: accuracy gap of 5.8pp on holdout set...' },
      { source: 'experiments/lstm_holiday_eval.ipynb', score: 0.83, snippet: 'LSTM holiday accuracy: 82.1% vs XGBoost: 88.4%...' },
      { source: 'docs/model_selection_rationale.md', score: 0.79, snippet: 'XGBoost selected: interpretable, fast, top CV score...' },
    ],
    followups: ['When would LSTM outperform XGBoost?', 'How was the ensemble built?', 'Retrain LSTM with new features?'],
  },
  'risk sku': {
    answer: `**Top 5 High-Risk SKUs** (as of last pipeline run):\n\n1. **SKU-00142** — Forecast error +34%, stock-out probability 67%, trend: declining\n2. **SKU-00891** — High volatility (CV=0.82), last 3 forecasts missed >15%\n3. **SKU-01204** — New SKU, <6 months history, cold-start problem, confidence low\n4. **SKU-00567** — Seasonal product, model not trained on 2023 holiday data\n5. **SKU-00338** — Supplier lead time recently changed, feature not yet updated\n\n**Recommended actions:** Flag for manual review, increase safety stock by 20%, retrain with updated supplier data.`,
    chunks: [
      { source: 'reports/risk_dashboard_2024W48.pdf', score: 0.95, snippet: 'Top risk SKUs: 00142, 00891, 01204, 00567, 00338...' },
      { source: 'data/sku_volatility_analysis.csv', score: 0.88, snippet: 'CV > 0.7: SKU-00891 (0.82), SKU-01204 (0.78)...' },
      { source: 'logs/forecast_error_tracker.json', score: 0.82, snippet: 'SKU-00142 error rate: 34.1%, 4-week trend: worsening...' },
    ],
    followups: ['Set alerts for these SKUs', 'What is the inventory impact?', 'Show historical forecast errors'],
  },
  'data quality': {
    answer: `**Data Quality Summary — Last 7 days:**\n\n- **Missing values:** 2.8% (up from 1.2% last month — investigate upstream ERP)\n- **Outliers detected:** 1,243 rows (IQR method), 847 capped, 396 flagged for review\n- **Schema drift:** 0 columns added/removed this week\n- **Duplicate rows:** 127 removed during preprocessing\n- **Freshness:** Data lag is 4.2 hours average (target: <6h)\n- **Volume anomaly:** Monday ingestion was 12% lower than expected (holiday?)\n\n**Actionable:** Open ticket with data engineering team for missing values in 'store_id' column (3.4% null rate).`,
    chunks: [
      { source: 'logs/dq_report_2024W48.json', score: 0.93, snippet: 'Missing rate: 2.8%, outliers: 1243, schema drift: 0...' },
      { source: 'data/pipeline_audit_log.csv', score: 0.86, snippet: 'Monday W48: 12% volume shortfall, holiday flag missing...' },
      { source: 'docs/data_quality_sla.md', score: 0.77, snippet: 'Target missing rate: <2%, freshness: <6h, duplicates: 0...' },
    ],
    followups: ['Show missing value trend over 30 days', 'What columns have most issues?', 'Auto-fix data quality issues?'],
  },
};

function findBestMatch(input) {
  const lower = input.toLowerCase();
  if (lower.includes('accuracy') || lower.includes('forecast accuracy') || lower.includes('mape')) return 'forecast accuracy';
  if (lower.includes('spike') || lower.includes('demand spike') || lower.includes('last week')) return 'demand spike';
  if (lower.includes('xgboost') || lower.includes('lstm') || lower.includes('compar')) return 'xgboost vs lstm';
  if (lower.includes('risk') || lower.includes('sku') || lower.includes('top 5')) return 'risk sku';
  if (lower.includes('data quality') || lower.includes('missing') || lower.includes('quality')) return 'data quality';
  return null;
}

const SAMPLE_QUESTIONS = [
  'What is the current forecast accuracy?',
  'Why did demand spike last week?',
  'Which model performs best for holiday periods?',
  'Show me the top 5 risk SKUs',
  'Compare XGBoost vs LSTM for this process',
  'What data quality issues exist?',
];

function parseMarkdown(text) {
  // Very basic inline markdown for bold + newlines
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={li}>
        {parts.map((part, pi) =>
          pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part,
        )}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function RagDetails({ chunks, latency, tokens, cacheHit }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)',
          fontSize: 10, padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600,
        }}
      >
        {open ? '▲' : '▼'} RAG Pipeline Details
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: 'var(--spacing-sm)', background: 'var(--bg-hover)',
          borderRadius: 'var(--border-radius)', fontSize: 10,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Embedding Model', value: 'text-embedding-3-small' },
              { label: 'Retrieval Latency', value: `${latency.retrieval}ms` },
              { label: 'Generation Latency', value: `${latency.generation}ms` },
              { label: 'Input Tokens', value: tokens.input },
              { label: 'Output Tokens', value: tokens.output },
              { label: 'Cache', value: cacheHit ? '✅ Hit' : '❌ Miss' },
            ].map((s) => (
              <div key={s.label} style={{ padding: '4px 8px', background: 'var(--bg-card)', borderRadius: 4 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 1 }}>{s.label}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Retrieved Chunks ({chunks.length})</div>
          {chunks.map((c, i) => (
            <div key={i} style={{ padding: '4px 8px', marginBottom: 4, background: 'var(--bg-card)', borderRadius: 4, borderLeft: '3px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{c.source}</span>
                <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>score: {c.score}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{c.snippet}"</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProcessChatbotTab({ process }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hi! I'm the **Process AI Assistant** for **${process?.name || 'this process'}**. I have context about your models, data, metrics, and pipeline. Ask me anything!`,
      chunks: null,
      followups: SAMPLE_QUESTIONS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function generateFallback(question) {
    return {
      answer: `I found relevant context for your question: **"${question}"**\n\nBased on the process data and model documentation, here is what I know:\n\n- The pipeline last ran successfully at 06:42 UTC\n- Current model: XGBoost (MAPE 7.8%, Accuracy 91.2%)\n- Data freshness: 4.2 hours\n- No active alerts at this time\n\nFor more specific analysis, please ask about: forecast accuracy, demand spikes, model comparison, risk SKUs, or data quality issues.`,
      chunks: [
        { source: 'docs/process_overview.md', score: 0.71, snippet: 'Process context and KPI definitions...' },
        { source: 'logs/pipeline_run_latest.json', score: 0.65, snippet: 'Last successful run: 06:42 UTC, status: OK...' },
      ],
      followups: SAMPLE_QUESTIONS.slice(0, 3),
    };
  }

  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;
    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const key = findBestMatch(text);
    const qa = key ? SAMPLE_QA[key] : null;
    const retrieval = 180 + Math.floor(Math.random() * 120);
    const generation = 420 + Math.floor(Math.random() * 280);
    const tokens = { input: 380 + Math.floor(Math.random() * 120), output: 210 + Math.floor(Math.random() * 80) };
    tokens.total = tokens.input + tokens.output;
    const cacheHit = Math.random() > 0.6;

    const assistantMsg = {
      role: 'assistant',
      text: qa ? qa.answer : generateFallback(text).answer,
      chunks: qa ? qa.chunks : generateFallback(text).chunks,
      followups: qa ? qa.followups : SAMPLE_QUESTIONS.slice(3),
      latency: { retrieval, generation },
      tokens,
      cacheHit,
    };
    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMsg]);
  }

  function exportChat() {
    const content = messages.map((m) => `[${m.role.toUpperCase()}]\n${m.text}\n`).join('\n---\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'process-chat-export.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearHistory() {
    setMessages([{
      role: 'assistant',
      text: `Chat cleared. How can I help you with **${process?.name || 'this process'}**?`,
      chunks: null,
      followups: SAMPLE_QUESTIONS.slice(0, 3),
    }]);
  }

  <TabShell
      tabName="chatbot"
      title="Chatbot · chat UI + per-proc system prompt + history"
      phase="Operate"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="chat UI · system prompt · message history · citations"
      operation="interactive · per-proc system prompt pending"
      accent="#8b5cf6"
      todos={[]}
    >
      return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600 }}>

      {/* Header */}
      <div className="content-section" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
              🤖 Process AI Assistant — {process?.name || 'Process'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              RAG-powered · GPT-4o · text-embedding-3-small · Context: process data, models, metrics
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportChat} className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '5px 12px' }}>
              📥 Export Chat
            </button>
            <button onClick={clearHistory} className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '5px 12px' }}>
              🗑️ Clear History
            </button>
          </div>
        </div>

        {/* Sample questions */}
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>SAMPLE QUESTIONS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={isTyping}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 12,
                  border: '1px solid var(--border-color)', background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 'var(--spacing-sm)',
        background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', marginBottom: 'var(--spacing-sm)',
        minHeight: 380, maxHeight: 480,
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 'var(--spacing-md)',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', flexShrink: 0, marginRight: 8, marginTop: 2,
              }}>🤖</div>
            )}
            <div style={{ maxWidth: '76%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                fontSize: 'var(--font-size-xs)', lineHeight: 1.6,
              }}>
                {parseMarkdown(msg.text)}
              </div>

              {/* RAG Details */}
              {msg.role === 'assistant' && msg.chunks && (
                <RagDetails
                  chunks={msg.chunks}
                  latency={msg.latency || { retrieval: 220, generation: 540 }}
                  tokens={msg.tokens || { input: 420, output: 230, total: 650 }}
                  cacheHit={msg.cacheHit ?? false}
                />
              )}

              {/* Follow-ups */}
              {msg.role === 'assistant' && msg.followups && msg.followups.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>SUGGESTED FOLLOW-UPS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {msg.followups.map((f, fi) => (
                      <button
                        key={fi}
                        onClick={() => sendMessage(f)}
                        disabled={isTyping}
                        style={{
                          fontSize: 10, padding: '3px 10px', borderRadius: 10,
                          border: '1px solid var(--accent-primary)', background: 'rgba(59,130,246,0.08)',
                          color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', flexShrink: 0, marginLeft: 8, marginTop: 2,
              }}>👤</div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>🤖</div>
            <div style={{ padding: '10px 16px', borderRadius: '4px 16px 16px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)',
                    animation: 'pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about forecasts, models, data quality, risk SKUs…"
          disabled={isTyping}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontSize: 'var(--font-size-xs)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="btn btn-primary"
          style={{ padding: '10px 20px', borderRadius: 'var(--border-radius-lg)', fontWeight: 700 }}
        >
          Send →
        </button>
      </div>
    </div>
    </TabShell>
  );
}
