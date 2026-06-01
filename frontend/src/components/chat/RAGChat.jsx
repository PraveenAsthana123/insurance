import { useState, useRef, useEffect } from 'react';
import '../../styles/chat.css';
import '../../styles/forms.css';

const SAMPLE_QUESTIONS = [
  'Why did demand increase last week?',
  'What are the top drivers for this forecast?',
  'Explain the model accuracy',
  'What caused the stockout?',
];

const SIMULATED_RESPONSES = {
  'why did demand increase last week?':
    'Demand increased last week primarily due to three factors: (1) a promotional campaign running across key retail channels (+18% lift), (2) favorable weather conditions that boosted seasonal product categories, and (3) competitor stock-outs in adjacent SKUs driving trade-up behavior. The model attributes 62% of the spike to the promo depth.',
  'what are the top drivers for this forecast?':
    'The top 5 forecast drivers are: 1. Historical sales trend (importance: 34%) 2. Promotional calendar (importance: 28%) 3. Seasonal index (importance: 18%) 4. Price elasticity (importance: 12%) 5. Competitor activity (importance: 8%). These were identified using SHAP values from the XGBoost model.',
  'explain the model accuracy':
    'The current model achieves MAPE of 6.2% and WAPE of 5.8% on the holdout test set. This represents a 38% improvement over the legacy statistical baseline. The model performs best on weekly aggregated forecasts (MAPE 4.1%) and shows higher error at SKU-level for long-tail items with sparse history.',
  'what caused the stockout?':
    'The stockout on SKU-7821 was caused by a demand spike (actual: +47% vs forecast) coinciding with a delayed replenishment order. The root cause was an underestimated promo lift factor — the model predicted +15% but actual uplift was +47%. The safety stock buffer of 3 days was insufficient. Recommended fix: increase safety stock multiplier to 1.8x for promoted SKUs.',
};

function getResponse(question) {
  const key = question.toLowerCase().trim();
  for (const [k, v] of Object.entries(SIMULATED_RESPONSES)) {
    if (key.includes(k.split(' ').slice(0, 3).join(' '))) return v;
  }
  return `I analyzed your question: "${question}". Based on the available data and model outputs, this appears to relate to demand variability patterns in the dataset. For a detailed analysis, please ensure the relevant process data is loaded and the forecasting model has been trained on the latest dataset. You can also explore the Feature Importance chart for more insights into the key drivers.`;
}

let msgIdCounter = 0;
function makeId() {
  return ++msgIdCounter;
}

export default function RAGChat({ title = 'AI Assistant', subtitle = 'Ask questions about your forecast' }) {
  const [messages, setMessages] = useState([
    {
      id: makeId(),
      role: 'assistant',
      text: 'Hello! I can help explain forecast results, model accuracy, and demand drivers. Ask me anything or choose a sample question below.',
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

    setMessages((prev) => [...prev, { id: makeId(), role: 'user', text: q }]);
    setInput('');
    setTyping(true);

    const delay = 800 + Math.random() * 700;
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', text: getResponse(q) },
      ]);
    }, delay);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            color: '#10b981',
            background: 'rgba(16,185,129,0.08)',
            padding: '2px 10px',
            borderRadius: 12,
            fontWeight: 500,
          }}
        >
          Online
        </span>
      </div>

      <div className="chat-container" style={{ border: 'none', borderRadius: 0, height: 440 }}>
        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {typing && (
            <div className="chat-typing">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="chat-suggestions">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              className="chat-suggestion-btn"
              onClick={() => sendMessage(q)}
              disabled={typing}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask a question about the forecast..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={typing}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => sendMessage(input)}
            disabled={typing || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
