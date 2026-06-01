import { useState, useRef, useEffect } from 'react';
import '../styles/workbench.css';

/* ---- Per-department sample questions ---- */
const DEPT_QUESTIONS = {
  sales: [
    'Why did demand spike last week?',
    'What are the top forecast drivers?',
    'Explain the model accuracy',
    'Which SKUs are at risk of stockout?',
    'Show me promo uplift analysis',
  ],
  'supply-chain': [
    'Which suppliers have highest risk score?',
    'What is current inventory turnover ratio?',
    'Explain safety stock recommendations',
    'Show me demand variability by region',
    'Which nodes are bottlenecks?',
  ],
  logistics: [
    'What is average on-time delivery rate?',
    'Which routes have highest delay risk?',
    'Explain the routing optimization',
    'Show warehouse capacity utilization',
    'What caused the last delivery exception?',
  ],
  manufacturing: [
    'Which equipment needs maintenance soon?',
    'What is current OEE?',
    'Explain the defect detection model',
    'Show production yield by line',
    'What are the top quality issues?',
  ],
  'retail-execution': [
    'What is current on-shelf availability?',
    'Which stores have planogram compliance issues?',
    'Explain shelf space optimization',
    'Show me store cluster analysis',
    'Which SKUs need price adjustments?',
  ],
  marketing: [
    'What is ROI on current campaigns?',
    'Which customer segments are most valuable?',
    'Explain churn prediction model',
    'Show me campaign attribution results',
    'Which channels have best conversion?',
  ],
  finance: [
    'What is revenue forecast accuracy?',
    'Show me variance vs budget by category',
    'Explain the anomaly detected last month',
    'Which SKUs have best margin contribution?',
    'What drives the cash flow forecast?',
  ],
  'quality-compliance': [
    'What is current defect rate?',
    'Show me compliance violation trends',
    'Explain the CV defect model',
    'Which production lines have most issues?',
    'What were last batch test results?',
  ],
  procurement: [
    'Which suppliers are underperforming?',
    'Show me spend analysis by category',
    'Explain supplier risk scoring',
    'What is purchase price variance?',
    'Which contracts are up for renewal?',
  ],
  'hr-workforce': [
    'What is current attrition risk?',
    'Show me workforce skill gap analysis',
    'Explain workforce optimization model',
    'Which roles have highest turnover?',
    'What is headcount forecast for Q3?',
  ],
  'r-d': [
    'What is time-to-market for current pipeline?',
    'Show me product launch success probability',
    'Explain ingredient optimization model',
    'Which formulations need reformulation?',
    'What are top consumer trend signals?',
  ],
};

const DEFAULT_QUESTIONS = [
  'Explain the model accuracy',
  'What are the top data drivers?',
  'Show me performance trends',
  'What actions are recommended?',
];

/* ---- Simulated responses ---- */
function buildResponse(question, dept) {
  const q = question.toLowerCase();
  const deptName = dept?.name || 'this department';

  if (q.includes('accuracy') || q.includes('model')) {
    return `The primary model for ${deptName} achieves **92.4% accuracy** on the holdout test set (AUROC: 0.963, F1: 0.914). This represents a 31% improvement over the previous rule-based baseline. Model was trained on 2.4M rows using XGBoost with 45 features. Key performance metrics: MAPE 6.2%, RMSE 187, MAE 112. The model is monitored daily using Evidently AI for data drift (PSI threshold: 0.20).`;
  }
  if (q.includes('driver') || q.includes('feature') || q.includes('forecast')) {
    return `Top 5 drivers identified via SHAP analysis: (1) Historical sales trend — 34% importance, (2) Promotional calendar — 28%, (3) Seasonal index — 18%, (4) Price elasticity — 12%, (5) Competitor activity — 8%. Feature engineering added 12 lag/rolling features. All features validated for data leakage before model training.`;
  }
  if (q.includes('spike') || q.includes('increase') || q.includes('demand')) {
    return `Demand spike detected in the last 7 days: +47% above forecast. Root cause analysis identified 3 contributing factors: (1) Regional promotional event driving +22% uplift, (2) Competitor out-of-stock causing trade-up behavior (+15%), (3) Favorable weather index for the product category (+10%). Model confidence interval: ±8%. Recommended action: increase safety stock multiplier to 1.8x for affected SKUs.`;
  }
  if (q.includes('risk') || q.includes('stockout') || q.includes('supplier')) {
    return `Risk assessment for ${deptName}: 3 SKUs flagged as high stockout risk (probability > 70%) in the next 14 days. Top risk factors: lead time variability (σ = 4.2 days), demand spike in key SKUs, and low buffer inventory. 2 suppliers have elevated risk scores (score > 0.75) due to recent delivery delays. Recommended mitigation: expedite orders for SKU-7821, SKU-4403, and SKU-9012.`;
  }
  return `Based on the ${deptName} analytics data, here is the analysis for your query: "${question}". The ML pipeline has processed the latest batch of data and identified several actionable insights. The current model confidence is 91.2% on the validation set. For deeper analysis, navigate to the Data tab for EDA visualizations and the Models tab for hyperparameter details and evaluation metrics. The pipeline runs on a daily cadence with real-time exception alerts.`;
}

/* ---- RAG metadata generator ---- */
function genRAGMeta() {
  const cacheHit = Math.random() > 0.4;
  return {
    chunking: `${[256, 512, 1024][Math.floor(Math.random() * 3)]} tokens`,
    overlap: `${[32, 64, 128][Math.floor(Math.random() * 3)]} tokens`,
    strategy: ['sentence', 'paragraph', 'semantic'][Math.floor(Math.random() * 3)],
    inputTokens: Math.floor(Math.random() * 800 + 200),
    outputTokens: Math.floor(Math.random() * 300 + 80),
    embeddingModel: ['text-embedding-3-small', 'all-MiniLM-L6-v2', 'bge-large-en'][Math.floor(Math.random() * 3)],
    embeddingDims: [384, 768, 1536][Math.floor(Math.random() * 3)],
    cacheHit,
    cacheKey: cacheHit ? `cache-${Math.random().toString(36).slice(2, 8)}` : null,
    queryExpansion: Math.random() > 0.5 ? 'HyDE' : 'None',
    reranking: Math.random() > 0.4 ? 'cross-encoder/ms-marco-MiniLM-L-6-v2' : 'None',
    chunks: Math.floor(Math.random() * 5 + 2),
    sourceDocs: ['process_docs.pdf', 'model_report.pdf', 'data_dictionary.xlsx'].slice(0, Math.floor(Math.random() * 3 + 1)).join(', '),
    latency: `${(Math.random() * 400 + 100).toFixed(0)}ms`,
  };
}

let msgCounter = 0;
function mkId() { return ++msgCounter; }

function RAGDetailsPanel({ meta }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rag-details">
      <button className="rag-details-toggle" onClick={() => setOpen((p) => !p)}>
        <span>🔬 RAG Details</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="rag-details-body">
          <div className="rag-detail-item">
            <span className="rag-detail-label">Chunking</span>
            <span className="rag-detail-value">{meta.chunking} / {meta.overlap} overlap</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Strategy</span>
            <span className="rag-detail-value">{meta.strategy}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Input Tokens</span>
            <span className="rag-detail-value">{meta.inputTokens}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Output Tokens</span>
            <span className="rag-detail-value">{meta.outputTokens}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Embedding Model</span>
            <span className="rag-detail-value">{meta.embeddingModel}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Dimensions</span>
            <span className="rag-detail-value">{meta.embeddingDims}D</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Cache</span>
            <span className={`rag-detail-value ${meta.cacheHit ? 'hit' : 'miss'}`}>{meta.cacheHit ? '✓ HIT' : '✗ MISS'}</span>
          </div>
          {meta.cacheHit && (
            <div className="rag-detail-item">
              <span className="rag-detail-label">Cache Key</span>
              <span className="rag-detail-value" style={{ fontFamily: 'monospace', fontSize: 10 }}>{meta.cacheKey}</span>
            </div>
          )}
          <div className="rag-detail-item">
            <span className="rag-detail-label">Query Expansion</span>
            <span className="rag-detail-value">{meta.queryExpansion}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Reranking</span>
            <span className="rag-detail-value" style={{ fontSize: 10 }}>{meta.reranking}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Chunks Retrieved</span>
            <span className="rag-detail-value">{meta.chunks}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Source Docs</span>
            <span className="rag-detail-value" style={{ fontSize: 10 }}>{meta.sourceDocs}</span>
          </div>
          <div className="rag-detail-item">
            <span className="rag-detail-label">Latency</span>
            <span className="rag-detail-value">{meta.latency}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepartmentChatbot({ dept }) {
  const questions = DEPT_QUESTIONS[dept?.id] || DEFAULT_QUESTIONS;

  const [messages, setMessages] = useState([
    {
      id: mkId(),
      role: 'assistant',
      text: `Hello! I am the AI assistant for **${dept?.name || 'this department'}**. I can help explain model outputs, data insights, KPIs, and anomalies. Ask me anything or choose a sample question below.`,
      ragMeta: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function sendMessage(text) {
    const q = text.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { id: mkId(), role: 'user', text: q, ragMeta: null }]);
    setInput('');
    setTyping(true);

    const delay = 900 + Math.random() * 800;
    setTimeout(() => {
      const ragMeta = genRAGMeta();
      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: 'assistant', text: buildResponse(q, dept), ragMeta },
      ]);
      setTyping(false);
    }, delay);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function renderText(text) {
    // Bold markdown-like **text**
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  }

  return (
    <div>
      <div className="content-section" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="content-section-header">
          <span className="content-section-title">🤖 Department AI Chatbot — {dept?.name}</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>RAG-powered · Context-aware</span>
        </div>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This chatbot uses Retrieval-Augmented Generation (RAG) to answer questions about {dept?.name} processes,
          model outputs, data insights, and KPIs. Each response includes a collapsible RAG metadata panel
          showing chunking strategy, tokens, embeddings, cache status, and retrieval details.
        </p>
      </div>

      <div className="chatbot-panel">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-avatar">🤖</div>
          <div>
            <div className="chatbot-title">{dept?.name || 'Department'} AI Assistant</div>
            <div className="chatbot-subtitle">RAG · Vector DB · {dept?.aiTypes?.includes('NLP') ? 'NLP' : 'ML'} Analytics</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', fontWeight: 700 }}>● Online</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}>RAG Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`chat-msg ${msg.role}`}>
                <div className={`chat-msg-avatar ${msg.role}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`chat-bubble ${msg.role}`}>
                  {renderText(msg.text)}
                </div>
              </div>
              {msg.role === 'assistant' && msg.ragMeta && (
                <div style={{ paddingLeft: 40 }}>
                  <RAGDetailsPanel meta={msg.ragMeta} />
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="chat-msg assistant">
              <div className="chat-msg-avatar assistant">🤖</div>
              <div className="chat-bubble assistant">
                <span style={{ letterSpacing: 2 }}>●●●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sample questions */}
        <div className="chatbot-samples">
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginRight: 4 }}>Try:</span>
          {questions.slice(0, 4).map((q) => (
            <button key={q} className="chatbot-sample-btn" onClick={() => sendMessage(q)} disabled={typing}>
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="chatbot-input-bar">
          <input
            className="chatbot-input"
            placeholder={`Ask about ${dept?.name || 'this department'}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={typing}
          />
          <button className="chatbot-send-btn" onClick={() => sendMessage(input)} disabled={typing || !input.trim()}>
            {typing ? '⏳' : 'Send'}
          </button>
        </div>
      </div>

      {/* RAG Architecture Info */}
      <div className="content-section" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="content-section-header">
          <span className="content-section-title">🔬 RAG Pipeline Architecture</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {[
            { phase: 'Pre-Retrieval', icon: '🔍', items: ['Query expansion (HyDE)', 'Query rewriting', 'Multi-query generation'] },
            { phase: 'Retrieval', icon: '📚', items: [`Vector DB (${['Pinecone', 'Weaviate', 'Qdrant'][Math.floor(Math.random() * 3)]})`, 'Top-K similarity search', 'Semantic chunking'] },
            { phase: 'Post-Retrieval', icon: '⚙️', items: ['Cross-encoder reranking', 'Citation extraction', 'Context filtering'] },
            { phase: 'Generation', icon: '✍️', items: ['LLM (GPT-4 / Claude)', 'Structured prompt template', 'Response grounding'] },
          ].map((p) => (
            <div key={p.phase} style={{ padding: 'var(--spacing-md)', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}>
                <span>{p.icon}</span> {p.phase}
              </div>
              {p.items.map((item) => (
                <div key={item} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'var(--accent-success)' }}>•</span> {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
