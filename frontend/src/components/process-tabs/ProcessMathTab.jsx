import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ScatterChart, Scatter, ReferenceLine,
} from 'recharts';
import '../../styles/workbench.css';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* ── A. Mathematics sub-tab data ── */

// Linear Algebra
const MATRIX_EXAMPLE = {
  W: [[0.5, 0.3, -0.1], [0.8, -0.4, 0.6], [0.2, 0.7, 0.1]],
  x: [1.2, -0.8, 0.5],
  result: [0.43, 1.62, 0.29],
};

const PCA_DATA = Array.from({ length: 10 }, (_, i) => ({
  component: `PC${i + 1}`,
  variance: [32.4, 21.8, 14.3, 10.1, 7.2, 4.8, 3.6, 2.4, 1.9, 1.5][i],
  cumulative: [32.4, 54.2, 68.5, 78.6, 85.8, 90.6, 94.2, 96.6, 98.5, 100.0][i],
}));

// Calculus
const LOSS_CURVE = Array.from({ length: 50 }, (_, i) => ({
  epoch: i + 1,
  trainLoss: +(2.4 * Math.exp(-0.08 * i) + 0.12 + Math.random() * 0.05).toFixed(4),
  valLoss: +(2.5 * Math.exp(-0.075 * i) + 0.14 + Math.random() * 0.06).toFixed(4),
}));

// Statistics
const DIST_DATA = Array.from({ length: 40 }, (_, i) => {
  const x = i * 0.5 - 5;
  return {
    x: +x.toFixed(1),
    normal: +(Math.exp(-(x ** 2) / 2) / Math.sqrt(2 * Math.PI)).toFixed(4),
    lognormal: x > 0 ? +(Math.exp(-((Math.log(x + 0.1)) ** 2) / 2) / ((x + 0.1) * Math.sqrt(2 * Math.PI))).toFixed(4) : 0,
  };
});

// Probability
const POISSON_DATA = Array.from({ length: 15 }, (_, k) => {
  const lambda = 45.2;
  const factK = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200][k] || 1;
  const prob = (Math.exp(-lambda) * Math.pow(lambda, k)) / factK;
  return { k, prob: +(prob * 100).toFixed(3) };
});

// Trigonometry / Seasonality
const SEASONALITY_DATA = Array.from({ length: 52 }, (_, w) => ({
  week: w + 1,
  actual: +(100 + 25 * Math.sin((2 * Math.PI * w) / 52) + 15 * Math.sin((2 * Math.PI * w) / 7) + Math.random() * 10).toFixed(2),
  sinAnnual: +(100 + 25 * Math.sin((2 * Math.PI * w) / 52)).toFixed(2),
}));

/* ── B. Analysis Types Catalog ── */
const ANALYSIS_TYPES = [
  // Statistical
  { category: 'Statistical', type: 'Descriptive Statistics', purpose: 'Summarize data distributions', mlConnection: 'EDA, Feature understanding', tools: 'pandas, scipy', cpgExample: 'Mean weekly sales = $142K per store' },
  { category: 'Statistical', type: 'Inferential Statistics', purpose: 'Draw population conclusions from samples', mlConnection: 'Hypothesis testing for features', tools: 'scipy.stats', cpgExample: 'KS test: demand follows log-normal (p=0.034)' },
  { category: 'Statistical', type: 'Regression Analysis', purpose: 'Model relationships between variables', mlConnection: 'Linear models, GLMs, elastic net', tools: 'sklearn, statsmodels', cpgExample: 'Price elasticity: -1.82 (1% price rise → -1.82% demand)' },
  { category: 'Statistical', type: 'ANOVA', purpose: 'Compare means across multiple groups', mlConnection: 'Feature significance testing', tools: 'scipy, statsmodels', cpgExample: 'Regional sales means significantly different (F=42.1, p<0.001)' },
  { category: 'Statistical', type: 'Chi-Square', purpose: 'Test independence between categorical vars', mlConnection: 'Feature selection for classifiers', tools: 'scipy.stats', cpgExample: 'Promo type & customer segment are dependent (χ²=38.2, p<0.001)' },
  { category: 'Statistical', type: 'Correlation Analysis', purpose: 'Measure linear relationships', mlConnection: 'Feature selection, multicollinearity detection', tools: 'pandas.corr()', cpgExample: 'Price vs demand: r=-0.67 (strong negative)' },
  // Business
  { category: 'Business', type: 'SWOT Analysis', purpose: 'Strategic position assessment', mlConnection: 'Context for model use cases', tools: 'Manual / LLM-assisted', cpgExample: 'AI strength: demand prediction accuracy 92.4%' },
  { category: 'Business', type: 'BCG Matrix', purpose: 'Portfolio performance classification', mlConnection: 'Product clustering, category ML', tools: 'sklearn KMeans', cpgExample: 'Stars: 120 SKUs, Dogs: 340 SKUs — drive retirement decisions' },
  { category: 'Business', type: 'Pareto Analysis', purpose: '80/20 rule — focus on vital few', mlConnection: 'Feature importance, SKU prioritization', tools: 'matplotlib, pandas', cpgExample: '20% SKUs drive 82% of revenue — focus ML on top-20%' },
  { category: 'Business', type: 'Porter\'s Five Forces', purpose: 'Competitive dynamics assessment', mlConnection: 'Market intelligence input to models', tools: 'LLM / RAG analysis', cpgExample: 'Supplier bargaining power inputs to supply chain risk model' },
  // Management
  { category: 'Management', type: 'Root Cause Analysis', purpose: 'Identify failure causes systematically', mlConnection: 'Model failure debugging, drift diagnosis', tools: 'Ishikawa, Why-Why', cpgExample: 'Forecast error spike: root cause = Christmas shift detection failure' },
  { category: 'Management', type: 'Six Sigma / DMAIC', purpose: 'Reduce process variation', mlConnection: 'Process optimization, quality ML', tools: 'Minitab, statsmodels', cpgExample: 'Inventory accuracy improved from 3.2σ to 5.1σ post-AI' },
  // Data Analysis
  { category: 'Data', type: 'EDA', purpose: 'Understand data shape, distributions, anomalies', mlConnection: 'Pre-modeling baseline, pipeline step 1', tools: 'pandas, ydata-profiling', cpgExample: '847 outliers flagged in sales_qty using IQR method' },
  { category: 'Data', type: 'RFM Analysis', purpose: 'Segment customers by Recency, Frequency, Monetary', mlConnection: 'Clustering, churn prediction input', tools: 'pandas, sklearn', cpgExample: '14% of customers in Champion segment drive 61% of LTV' },
  { category: 'Data', type: 'Cohort Analysis', purpose: 'Track group behavior over time', mlConnection: 'Churn prediction, LTV estimation', tools: 'pandas, seaborn', cpgExample: 'Q1 2024 customer cohort: 68% retention after 6 months' },
  { category: 'Data', type: 'Basket Analysis', purpose: 'Find product co-purchase patterns', mlConnection: 'Association rules, recommendation ML', tools: 'mlxtend (apriori)', cpgExample: 'Beer + chips: lift=3.4, confidence=0.68 on Fridays' },
  // Sentiment
  { category: 'Sentiment', type: 'Text Polarity', purpose: 'Classify text as positive/negative/neutral', mlConnection: 'NLP classification, BERT, VADER', tools: 'transformers, VADER', cpgExample: 'Customer review sentiment: 74% positive for top SKUs' },
  { category: 'Sentiment', type: 'Aspect-Based Sentiment', purpose: 'Sentiment per product attribute', mlConnection: 'NLP NER + classification', tools: 'spaCy, transformers', cpgExample: '"Packaging +" / "Price -" extracted from 284K reviews' },
  // Sensitivity
  { category: 'Sensitivity', type: 'One-At-a-Time (OAT)', purpose: 'Change one factor, hold rest constant', mlConnection: 'Feature impact testing', tools: 'Manual / sklearn', cpgExample: 'Price +10% → demand -18.2% (all else held constant)' },
  { category: 'Sensitivity', type: 'Sobol Indices', purpose: 'Global variance-based sensitivity', mlConnection: 'Model explanation, risk quantification', tools: 'SALib', cpgExample: 'Price accounts for 38% of forecast variance (first-order Sobol)' },
  // Time Series
  { category: 'Time Series', type: 'STL Decomposition', purpose: 'Separate trend + seasonality + residual', mlConnection: 'Feature engineering for TS models', tools: 'statsmodels, prophet', cpgExample: 'Seasonal component explains 41% of weekly demand variance' },
  { category: 'Time Series', type: 'ACF / PACF', purpose: 'Measure autocorrelation at each lag', mlConnection: 'ARIMA order selection, lag feature design', tools: 'statsmodels', cpgExample: 'Significant autocorrelation at lag 7 (weekly cycle confirmed)' },
  { category: 'Time Series', type: 'ADF Stationarity Test', purpose: 'Test if series has unit root (non-stationary)', mlConnection: 'ARIMA pre-check, transformation decision', tools: 'statsmodels.adfuller', cpgExample: 'ADF stat=-5.82, p=0.001 → reject unit root (stationary)' },
];

/* ── C. Model Type Deep Dive ── */
const MODEL_CATALOG = [
  // Statistical
  { category: 'Statistical', name: 'ARIMA', fullName: 'AutoRegressive Integrated Moving Average', formula: 'ARIMA(p,d,q): combines AR(p) + I(d) + MA(q)', strengths: 'Interpretable, univariate, captures autocorrelation', weaknesses: 'Assumes linearity, struggles with multiple seasonality', hyperparams: 'p (AR order), d (differencing), q (MA order)', cpg: 'Monthly revenue forecasting per product category (MAPE=9.2%)' },
  { category: 'Statistical', name: 'SARIMA', fullName: 'Seasonal ARIMA', formula: 'ARIMA(p,d,q)(P,D,Q)s — adds seasonal terms', strengths: 'Handles single seasonality well', weaknesses: 'Manual order selection, slow on long series', hyperparams: 'Plus seasonal P, D, Q, s (period)', cpg: 'Weekly demand with annual seasonality (s=52)' },
  { category: 'Statistical', name: 'Holt-Winters ETS', fullName: 'Exponential Triple Smoothing', formula: 'Triple smoothing: level α + trend β + seasonal γ', strengths: 'Simple, fast, good for short series', weaknesses: 'Cannot handle complex patterns', hyperparams: 'α, β, γ smoothing weights', cpg: 'Baseline demand forecasting for low-volume SKUs' },
  // ML
  { category: 'ML', name: 'XGBoost', fullName: 'Extreme Gradient Boosting', formula: 'F(x) = Σ fₖ(x), fₖ ∈ F — gradient boosted trees with 2nd-order Taylor expansion', strengths: 'Fast, handles mixed types, built-in regularization, feature importance', weaknesses: 'Memory intensive, hyperparameter tuning required', hyperparams: 'n_estimators, max_depth, eta (lr), subsample, colsample_bytree, lambda, alpha', cpg: 'Demand forecasting champion: MAPE=7.8% on 3M row dataset' },
  { category: 'ML', name: 'LightGBM', fullName: 'Light Gradient Boosting Machine', formula: 'Same as XGBoost but uses histogram-based splitting (leaf-wise)', strengths: '10x faster than XGBoost, lower memory, categorical support native', weaknesses: 'Prone to overfitting on small datasets', hyperparams: 'num_leaves, max_depth, learning_rate, min_child_samples', cpg: 'Real-time inference: 2.3ms per prediction — used in API serving' },
  { category: 'ML', name: 'Random Forest', fullName: 'Random Forest Ensemble', formula: 'f(x) = (1/B) Σ fₙ(x) — B decision trees with bagging + feature subsampling', strengths: 'Robust to overfitting, interpretable feature importance', weaknesses: 'Slow prediction, large memory footprint', hyperparams: 'n_estimators, max_features, max_depth, min_samples_split', cpg: 'Product demand baseline; feature importance ranked 33 features' },
  { category: 'ML', name: 'Elastic Net', fullName: 'Elastic Net Regularized Regression', formula: 'min ‖Xβ-y‖² + λ₁‖β‖₁ + λ₂‖β‖₂² (L1+L2)', strengths: 'Variable selection, handles correlated features, interpretable', weaknesses: 'Only linear relationships', hyperparams: 'alpha (strength), l1_ratio (L1 vs L2 balance)', cpg: 'Price elasticity model — 8 features, R²=0.78' },
  // DL
  { category: 'Deep Learning', name: 'LSTM', fullName: 'Long Short-Term Memory', formula: 'Gates: forget fₜ, input iₜ, output oₜ | Cell: cₜ = fₜ⊙cₜ₋₁ + iₜ⊙c̃ₜ', strengths: 'Long-range dependencies, sequential data, arbitrary length', weaknesses: 'Slow to train, vanishing gradient on very long sequences', hyperparams: 'hidden_size, num_layers, dropout, sequence_length', cpg: 'Weekly demand with 52-week look-back: MAPE=6.4% challenger model' },
  { category: 'Deep Learning', name: 'Transformer', fullName: 'Attention-based Encoder-Decoder', formula: 'Attention(Q,K,V) = softmax(QKᵀ/√dₖ)V | Multi-head: h heads concatenated', strengths: 'Parallelizable, global attention, state-of-the-art on many tasks', weaknesses: 'Data hungry, computationally expensive, hard to interpret', hyperparams: 'd_model, nhead, num_encoder_layers, dropout, dim_feedforward', cpg: 'Temporal Fusion Transformer for multi-horizon forecasting (1-13 weeks)' },
  { category: 'Deep Learning', name: 'Autoencoder', fullName: 'Variational Autoencoder (VAE)', formula: 'Encoder: z = f(x) | Decoder: x̂ = g(z) | Loss = Reconstruction + KL divergence', strengths: 'Anomaly detection, dimensionality reduction, synthetic data', weaknesses: 'Training instability, blurry reconstructions', hyperparams: 'latent_dim, encoder_layers, beta (KL weight)', cpg: 'Anomaly detection in sensor data: 99.1% precision on known faults' },
  // CV
  { category: 'Computer Vision', name: 'ResNet-50', fullName: 'Residual Network 50 layers', formula: 'F(x) = H(x) + x — skip connections bypass layers to prevent vanishing gradient', strengths: 'Deep network without degradation, transfer learning', weaknesses: 'Large model size (25M params), inference latency', hyperparams: 'layers (18/34/50/101/152), lr, batch_size, augmentation', cpg: 'Shelf-out-of-stock detection: 94.2% accuracy on 42K store images' },
  { category: 'Computer Vision', name: 'YOLOv8', fullName: 'You Only Look Once v8', formula: 'Single-pass CNN → grid cells predict bounding boxes + class probabilities', strengths: 'Real-time detection (45 FPS), multi-object, end-to-end', weaknesses: 'Less accurate on small objects than 2-stage detectors', hyperparams: 'model size (n/s/m/l/x), conf_threshold, iou_threshold', cpg: 'Planogram compliance: detects 120+ SKUs in store shelves at 28ms/frame' },
  { category: 'Computer Vision', name: 'U-Net', fullName: 'U-Net Semantic Segmentation', formula: 'Encoder-decoder with skip connections — pixel-wise classification', strengths: 'Precise segmentation, works with small datasets', weaknesses: 'Slower than YOLO, requires masks for training', hyperparams: 'depth, num_filters, dropout, batch_norm', cpg: 'Defect segmentation in packaging images: IoU=0.87' },
  // NLP
  { category: 'NLP', name: 'BERT', fullName: 'Bidirectional Encoder Representations from Transformers', formula: 'Pre-trained on masked LM + next sentence prediction | Fine-tuned per task', strengths: 'Bidirectional context, strong transfer learning, versatile', weaknesses: 'Slow inference, 512 token limit, large model', hyperparams: 'max_length, batch_size, lr, warmup_steps, epochs', cpg: 'Customer complaint classification: 96.3% accuracy across 12 categories' },
  { category: 'NLP', name: 'Word2Vec', fullName: 'Word Embeddings via Skip-gram / CBOW', formula: 'Skip-gram: maximize P(context|word) using negative sampling', strengths: 'Fast training, semantic similarity, low memory', weaknesses: 'Static embeddings (no context awareness)', hyperparams: 'vector_size, window, min_count, sg (0=CBOW, 1=skip-gram)', cpg: 'Product similarity search: "cola" → [pepsi, sprite, fanta] in embedding space' },
  // Time Series
  { category: 'Time Series ML', name: 'Prophet', fullName: 'Facebook Prophet', formula: 'y(t) = trend(t) + seasonality(t) + holidays(t) + ε', strengths: 'Handles missing data, holidays, changepoints; easy to use', weaknesses: 'Limited to additive decomposition; underperforms complex patterns', hyperparams: 'changepoint_prior_scale, seasonality_mode, n_changepoints', cpg: 'Category-level 52-week forecasts with US holiday calendar (MAPE=11.2%)' },
  { category: 'Time Series ML', name: 'N-BEATS', fullName: 'Neural Basis Expansion Analysis for Time Series', formula: 'Stack of blocks with basis expansion: θ → backcast + forecast', strengths: 'State-of-the-art accuracy, interpretable trend/seasonality', weaknesses: 'Data hungry, GPU required, slow to train', hyperparams: 'stacks, blocks, expansion_coefficient_dim, basis functions', cpg: 'SKU-level 13-week forecasts: MAPE=5.8% vs XGBoost 7.8% (challenger)' },
  { category: 'Time Series ML', name: 'Temporal Fusion Transformer', fullName: 'TFT — Multi-horizon, multi-variate attention', formula: 'Combines GRN gates + multi-head attention + quantile regression', strengths: 'Multi-horizon, handles known future inputs, uncertainty quantile output', weaknesses: 'Complex, data hungry, hard to debug', hyperparams: 'hidden_size, attention_heads, dropout, learning_rate', cpg: '1-13 week forecasts with 15 covariates — quantile P10/P50/P90 output' },
];

/* ── D. Prompt Engineering ── */
const PROMPT_TEMPLATES = [
  {
    process: 'Demand Forecasting',
    template: `You are a demand forecasting expert for CPG.

Context: {store_name} store, {category} category, past 12 weeks data:
{time_series_data}

Promotions next 4 weeks: {promo_calendar}
Holidays: {holiday_list}

Task: Forecast weekly demand for next 4 weeks.
Format: JSON with P10, P50, P90 quantiles per week.
Explain key drivers in 2-3 sentences.`,
    technique: 'Few-shot + structured output',
    tokens: '~800 context + ~200 output',
  },
  {
    process: 'Root Cause Analysis',
    template: `You are a retail analytics expert. A model alert was triggered:
Alert: MAPE exceeded 15% threshold (actual: {mape_value}%)
Model: {model_name} v{model_version}
Store: {store_id}, Category: {category}

Recent data changes:
{drift_summary}

Apply MECE root cause analysis. List top 3 likely causes with evidence.
Suggest immediate action and long-term fix.`,
    technique: 'Chain-of-thought (MECE framework)',
    tokens: '~600 context + ~400 output',
  },
  {
    process: 'Inventory Optimization',
    template: `Given the following inventory snapshot:
{inventory_json}

Historical service level: {service_level}%
Lead time: {lead_time} days (σ={lead_time_std})
Demand forecast: {forecast_json}

Calculate: safety stock, reorder point, EOQ.
Show formulas and explain assumptions.
Flag any stockout risk items.`,
    technique: 'Structured reasoning + formula explanation',
    tokens: '~700 context + ~350 output',
  },
  {
    process: 'Promotion Planning',
    template: `Analyze this promotion candidate:
Product: {product_name} (SKU: {sku})
Proposed discount: {discount_pct}%
Duration: {start_date} to {end_date}

Historical promo lifts: {lift_history}
Category baseline: {category_baseline}
Competitor activity: {competitor_data}

Predict: incremental units, revenue uplift, cannibalization risk.
Recommend: Go / No-Go with rationale.`,
    technique: 'Decision framework + prediction request',
    tokens: '~900 context + ~300 output',
  },
];

const PROMPT_TIPS = [
  { tip: 'Be specific about output format', desc: 'Request JSON, tables, or bullet lists. Reduces parsing errors by 60%.' },
  { tip: 'Provide context injection', desc: 'Always include relevant data (12-week history, product metadata) in the system or user prompt.' },
  { tip: 'Use chain-of-thought', desc: 'Ask the model to "Think step by step" for complex reasoning tasks (root cause, optimization).' },
  { tip: 'Set role clearly', desc: '"You are a CPG demand planner" dramatically improves domain-specific vocabulary and reasoning.' },
  { tip: 'Token budget management', desc: 'Cap context at 70% of window. Keep 30% for reasoning + output. Use RAG to retrieve relevant chunks.' },
  { tip: 'Few-shot examples', desc: 'Include 2-3 examples of ideal input→output pairs for consistent formatting.' },
  { tip: 'Temperature control', desc: 'Use T=0 for structured outputs (forecasts, tables). Use T=0.7 for creative tasks (insights, summaries).' },
  { tip: 'Idempotency check', desc: 'For the same input, verify output is consistent across 3+ runs before using in production.' },
];

const MATH_SUB_TABS = ['Linear Algebra', 'Calculus', 'Statistics', 'Probability', 'Trigonometry'];

const MAIN_TABS = [
  { id: 'mathematics', label: 'Mathematics in ML' },
  { id: 'analysis', label: 'Analysis Catalog' },
  { id: 'models', label: 'Model Deep Dive' },
  { id: 'prompts', label: 'Prompt Engineering' },
];

const ANALYSIS_CATEGORIES = ['Statistical', 'Business', 'Management', 'Data', 'Sentiment', 'Sensitivity', 'Time Series'];
const MODEL_CATEGORIES = ['Statistical', 'ML', 'Deep Learning', 'Computer Vision', 'NLP', 'Time Series ML'];

/* ── Sub-components ── */
function SectionHeader({ title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 4, height: 28, background: color, borderRadius: 4 }} />
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {subtitle && <p style={{ marginLeft: 14, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  );
}

function FormulaBox({ title, formula, note }) {
  return (
    <div style={{ background: '#1e1e3a', borderRadius: 'var(--border-radius)', padding: '12px 16px', marginBottom: 'var(--spacing-sm)' }}>
      {title && <div style={{ fontSize: 'var(--font-size-xs)', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{title}</div>}
      <div style={{ fontFamily: 'monospace', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.7 }}>{formula}</div>
      {note && <div style={{ fontSize: 'var(--font-size-xs)', color: '#64748b', marginTop: 6 }}>{note}</div>}
    </div>
  );
}

function InfoBox({ label, value, color }) {
  return (
    <div style={{ background: `${color}11`, border: `1px solid ${color}44`, borderRadius: 'var(--border-radius)', padding: '10px 14px' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function CategoryPill({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : 'var(--bg-hover)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? color : 'var(--border-color)'}`,
        padding: '6px 14px',
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 'var(--font-size-xs)',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

/* ── Main Component ── */
export default function ProcessMathTab() {
  const [activeMain, setActiveMain] = useState('mathematics');
  const [activeMathSub, setActiveMathSub] = useState('Linear Algebra');
  const [activeAnalysisCat, setActiveAnalysisCat] = useState('Statistical');
  const [activeModelCat, setActiveModelCat] = useState('ML');
  const [expandedModel, setExpandedModel] = useState(null);

  const filteredAnalysis = ANALYSIS_TYPES.filter((a) => a.category === activeAnalysisCat);
  const filteredModels = MODEL_CATALOG.filter((m) => m.category === activeModelCat);

  return (
    <TabShell
      tabName="math"
      title="Mathematics · formulas + derivations + references"
      phase="Build"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P2"
      information="core formulas · variable defs · derivations · references"
      operation="read-only · per-proc math pending"
      accent="#8b5cf6"
      todos={[]}
    >
    <div>
      {/* Main tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveMain(t.id)}
            style={{
              background: activeMain === t.id ? 'var(--accent-primary)' : 'var(--bg-hover)',
              color: activeMain === t.id ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontWeight: activeMain === t.id ? 700 : 400,
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── A. Mathematics ── */}
      {activeMain === 'mathematics' && (
        <div>
          <SectionHeader title="Mathematical Foundations of ML" subtitle="How core math disciplines power every CPG AI model" color="#8b5cf6" />

          {/* Sub-tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--spacing-lg)', overflowX: 'auto', paddingBottom: 4 }}>
            {MATH_SUB_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveMathSub(t)}
                style={{
                  background: activeMathSub === t ? '#8b5cf6' : 'var(--bg-hover)',
                  color: activeMathSub === t ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontWeight: activeMathSub === t ? 700 : 400,
                  fontSize: 'var(--font-size-xs)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Linear Algebra */}
          {activeMathSub === 'Linear Algebra' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Matrix Multiplication in Neural Networks</h3>
                  <FormulaBox
                    title="Output = Weight Matrix × Input Vector"
                    formula={"y = W · x + b\n\n[0.5  0.3  -0.1]   [1.2]   [0.43]\n[0.8  -0.4  0.6] × [-0.8] = [1.62]\n[0.2  0.7   0.1]   [0.5]   [0.29]"}
                    note="Each layer transforms the input space via learned weight matrices"
                  />
                  <FormulaBox
                    title="Dot Product"
                    formula={"u · v = Σ uᵢ·vᵢ = ‖u‖‖v‖cos(θ)\n\nUsed in: attention scores, cosine similarity,\nvector search (ChromaDB)"}
                  />
                  <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>Feature matrix (3M rows × 33 cols) → Neural network transforms to 64-dim hidden representation → output layer gives demand forecast</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>PCA — Eigenvalue Decomposition</h3>
                  <FormulaBox
                    title="Principal Components via SVD"
                    formula={"X = U·Σ·Vᵀ  (Singular Value Decomposition)\n\nW_PCA = eigenvectors of XᵀX\nλ = eigenvalues (variance explained)\n\nProjection: Z = X · W_PCA[:, :k]"}
                    note="Retaining top-k PCs with λ₁ + λ₂ + ... ≥ 95% total variance"
                  />
                  <h4 style={{ marginBottom: 8, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Scree Plot — Explained Variance</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={PCA_DATA.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="component" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="variance" name="Variance %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>Feature matrix (3M rows × 33 cols) → PCA reduces to 15 principal components retaining 95% variance → 55% faster model training</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <InfoBox label="SVD in Recommendations" value="User-Item matrix decomposed into U·Σ·Vᵀ — product embeddings for collaborative filtering" color="#8b5cf6" />
                <InfoBox label="L1/L2 Norms" value="‖w‖₁ = LASSO (sparsity), ‖w‖₂² = Ridge (shrinkage) — regularization in elastic net" color="#8b5cf6" />
                <InfoBox label="Cosine Similarity" value="sim(a,b) = (a·b)/(‖a‖‖b‖) — used in ChromaDB for document retrieval at scale" color="#8b5cf6" />
              </div>
            </div>
          )}

          {/* Calculus */}
          {activeMathSub === 'Calculus' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Gradient Descent</h3>
                  <FormulaBox
                    title="Parameter Update Rule"
                    formula={"θₜ₊₁ = θₜ - α · ∇L(θₜ)\n\nα = learning rate (step size)\n∇L = gradient of loss w.r.t. parameters\n\nAdam optimizer:\nmₜ = β₁mₜ₋₁ + (1-β₁)gₜ\nvₜ = β₂vₜ₋₁ + (1-β₂)gₜ²\nθₜ₊₁ = θₜ - α·m̂ₜ/(√v̂ₜ + ε)"}
                    note="XGBoost uses Newton-Raphson (2nd-order): uses Hessian for faster convergence"
                  />
                  <FormulaBox
                    title="Chain Rule (Backpropagation)"
                    formula={"∂L/∂w₁ = (∂L/∂yhat) · (∂yhat/∂h) · (∂h/∂w₁)\n\nGradients flow backwards through the network\nlayer by layer via the chain rule"}
                  />
                </div>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Loss Function Convergence</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={LOSS_CURVE.slice(0, 40)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="trainLoss" stroke="#3b82f6" strokeWidth={2} name="Train Loss" dot={false} />
                      <Line type="monotone" dataKey="valLoss" stroke="#ef4444" strokeWidth={2} name="Val Loss" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#1e40af', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>XGBoost uses Newton-Raphson (2nd-order gradient) — uses both gradient & Hessian for faster convergence vs standard SGD. Reduces training from 420s to 42s on 3M rows.</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <InfoBox label="Partial Derivatives" value="∂f/∂x: rate of change w.r.t. one feature — SHAP values approximate partial derivatives for feature attribution" color="#3b82f6" />
                <InfoBox label="Learning Rate Decay" value="α(t) = α₀ / (1 + decay×t) — reduces step size as training progresses to prevent oscillation near minimum" color="#3b82f6" />
                <InfoBox label="Convexity" value="MSE loss is convex (single global minimum). XGBoost loss with regularization: quasi-convex — gradient descent finds good local optima" color="#3b82f6" />
              </div>
            </div>
          )}

          {/* Statistics */}
          {activeMathSub === 'Statistics' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Descriptive Statistics</h3>
                  <FormulaBox
                    title="Key Moments"
                    formula={"Mean:     μ = (1/n) Σxᵢ\nVariance: σ² = (1/n) Σ(xᵢ-μ)²\nSkewness: γ₁ = E[(X-μ)³]/σ³\nKurtosis: γ₂ = E[(X-μ)⁴]/σ⁴ - 3\n\nFor CPG sales_qty:\nμ=142.3, σ=93.5, γ₁=+1.42 (right-skew)"}
                  />
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700, marginTop: 16 }}>Bayesian Inference</h3>
                  <FormulaBox
                    title="Bayes' Theorem"
                    formula={"P(θ|data) = P(data|θ) · P(θ) / P(data)\n\nPosterior ∝ Likelihood × Prior\n\nBayesian demand estimation:\nPrior: historical demand distribution\nLikelihood: observed sales this week\nPosterior: updated demand belief"}
                  />
                </div>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Distribution Shapes</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={DIST_DATA.slice(10, 35)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={2} name="Normal" dot={false} />
                      <Line type="monotone" dataKey="lognormal" stroke="#f59e0b" strokeWidth={2} name="Log-normal" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#065f46', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>Kolmogorov-Smirnov test confirms CPG demand follows log-normal distribution (p=0.034). This justifies log-transformation before regression models — reduces MAPE from 11.2% to 7.8%.</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <InfoBox label="Confidence Interval" value="CI₉₅% = μ ± 1.96·σ/√n — Forecast uncertainty bands shown in demand planning output (P10/P50/P90)" color="#10b981" />
                <InfoBox label="OLS Regression" value="β = (XᵀX)⁻¹Xᵀy — closed-form solution for linear regression coefficients (price elasticity model)" color="#10b981" />
                <InfoBox label="Lasso (L1) Variable Selection" value="‖Xβ-y‖² + λ‖β‖₁ — drives sparse solutions; 33 features → 8 significant for price model" color="#10b981" />
              </div>
            </div>
          )}

          {/* Probability */}
          {activeMathSub === 'Probability' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Probability Distributions</h3>
                  <FormulaBox
                    title="Poisson Distribution — Order Arrivals"
                    formula={"P(X=k) = (λᵏ · e⁻λ) / k!\n\nλ = 45.2 orders/day\nP(X=45) ≈ 0.0592 (5.92%)\nP(X≤50) = 0.78\n\nUsed for: daily order arrival modeling,\nstaffing, fulfillment capacity planning"}
                  />
                  <FormulaBox
                    title="Monte Carlo Simulation"
                    formula={"For each scenario s = 1..10,000:\n  demand_s ~ Log-Normal(μ_d, σ_d)\n  lead_time_s ~ Normal(μ_l, σ_l)\n  stockout_s = demand_s > inventory\n\nP(stockout) = count(stockout_s) / 10,000"}
                    note="Used in inventory planning for service level estimation"
                  />
                </div>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Poisson PMF — Daily Orders (λ=45.2)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={POISSON_DATA.slice(35, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="k" tick={{ fontSize: 10 }} label={{ value: 'k (orders)', position: 'insideBottom', offset: -5 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="prob" name="P(X=k)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#92400e', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>Poisson distribution models daily order arrivals (λ=45.2 orders/day). Used to size fulfillment team and set inventory buffers for 98% service level.</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <InfoBox label="Bayes in Classification" value="P(class|features) ∝ P(features|class)·P(class) — Naive Bayes for customer segment classification; baseline 84.2% accuracy" color="#f59e0b" />
                <InfoBox label="Markov Chain (Customer Journey)" value="State transitions: Browser → Buyer → Repeat → Churn. Steady-state probabilities guide retention spend allocation" color="#f59e0b" />
                <InfoBox label="Expected Value" value="E[profit] = Σ P(scenario) × profit(scenario) — used in promotion go/no-go decision (Monte Carlo over 10,000 scenarios)" color="#f59e0b" />
              </div>
            </div>
          )}

          {/* Trigonometry */}
          {activeMathSub === 'Trigonometry' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Fourier Transforms for Seasonality</h3>
                  <FormulaBox
                    title="Cyclical Feature Encoding"
                    formula={"Annual seasonality:\nsin_annual = sin(2π × day_of_year / 365)\ncos_annual = cos(2π × day_of_year / 365)\n\nWeekly seasonality:\nsin_weekly = sin(2π × day_of_week / 7)\ncos_weekly = cos(2π × day_of_week / 7)\n\nMonthly:\nsin_month = sin(2π × month / 12)\ncos_month = cos(2π × month / 12)"}
                    note="Sine+cosine pairs capture periodicity without gap between Dec and Jan"
                  />
                  <FormulaBox
                    title="Fourier Series Decomposition"
                    formula={"y(t) = a₀/2 + Σₙ[aₙcos(2πnt/T) + bₙsin(2πnt/T)]\n\nFitting: estimate Fourier coefficients\nto extract dominant frequencies\nin time series data"}
                  />
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--border-radius)', padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#065f46', fontWeight: 700, marginBottom: 4 }}>CPG Use Case</div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>sin(2π×day/365) and cos(2π×day/365) capture annual seasonality. Adding these 2 features to XGBoost reduces MAPE from 9.4% to 7.8% — equivalent to adding 6 months of training data.</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700 }}>Annual Seasonality Decomposition</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={SEASONALITY_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={1.5} name="Actual Sales" dot={false} />
                      <Line type="monotone" dataKey="sinAnnual" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" name="Sin Annual Component" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <InfoBox label="Cosine Similarity (Vectors)" value="cos(θ) = (a·b)/(‖a‖‖b‖) — distance metric in ChromaDB for document retrieval. Identical docs: cos=1.0" color="#10b981" />
                <InfoBox label="Periodogram Analysis" value="FFT detects dominant periods in sales data. Peak at frequency 1/52 → annual cycle confirmed in 94% of CPG categories" color="#10b981" />
                <InfoBox label="Phase Shift Detection" value="Peaks in different categories shift by 2-8 weeks. Cross-correlation (via FFT) identifies lead/lag between categories for inventory planning" color="#10b981" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── B. Analysis Catalog ── */}
      {activeMain === 'analysis' && (
        <div>
          <SectionHeader title="Analysis Types Catalog" subtitle="Comprehensive catalog of statistical, business, and data analysis techniques used in CPG AI" color="#3b82f6" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)' }}>
            {ANALYSIS_CATEGORIES.map((cat) => (
              <CategoryPill key={cat} label={cat} active={activeAnalysisCat === cat} onClick={() => setActiveAnalysisCat(cat)} color="#3b82f6" />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {filteredAnalysis.map((a, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{a.type}</div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{a.category}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                  <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Purpose: </span><span style={{ fontSize: 'var(--font-size-xs)' }}>{a.purpose}</span></div>
                  <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ML Connection: </span><span style={{ fontSize: 'var(--font-size-xs)' }}>{a.mlConnection}</span></div>
                  <div><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Tools: </span><code style={{ fontSize: '0.72rem', background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{a.tools}</code></div>
                </div>
                <div style={{ marginTop: 8, padding: '6px 12px', background: '#eff6ff', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: '#1e40af' }}>
                  <strong>CPG Example:</strong> {a.cpgExample}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── C. Model Deep Dive ── */}
      {activeMain === 'models' && (
        <div>
          <SectionHeader title="Model Type Deep Dive" subtitle="Algorithms, formulas, strengths, weaknesses, and CPG use cases for every model category" color="#10b981" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)' }}>
            {MODEL_CATEGORIES.map((cat) => (
              <CategoryPill key={cat} label={cat} active={activeModelCat === cat} onClick={() => setActiveModelCat(cat)} color="#10b981" />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {filteredModels.map((m, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                <div
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedModel === i + activeModelCat ? '#f0fdf4' : 'var(--bg-card)', borderLeft: '4px solid #10b981' }}
                  onClick={() => setExpandedModel(expandedModel === i + activeModelCat ? null : i + activeModelCat)}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', marginRight: 8 }}>{m.name}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{m.fullName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{m.category}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{expandedModel === i + activeModelCat ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedModel === i + activeModelCat && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ marginTop: 12 }}>
                      <FormulaBox title="Mathematical Foundation" formula={m.formula} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                      <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)' }}>
                        <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Strengths</div>
                        {m.strengths}
                      </div>
                      <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)' }}>
                        <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Weaknesses</div>
                        {m.weaknesses}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                      <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)' }}>
                        <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>Key Hyperparameters</div>
                        {m.hyperparams}
                      </div>
                      <div style={{ padding: '8px 12px', background: '#f3e8ff', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)' }}>
                        <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>CPG Use Case</div>
                        {m.cpg}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── D. Prompt Engineering ── */}
      {activeMain === 'prompts' && (
        <div>
          <SectionHeader title="Prompt Engineering for CPG RAG/LLM" subtitle="Prompt templates, context injection strategies, and optimization tips for each CPG process" color="#f59e0b" />

          <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Prompt Templates by Process</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
            {PROMPT_TEMPLATES.map((pt, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: '#fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: '#92400e' }}>{pt.process}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', background: '#fff7ed', color: '#c2410c', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>Technique: {pt.technique}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', background: '#fff7ed', color: '#c2410c', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>{pt.tokens}</span>
                  </div>
                </div>
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <pre style={{ background: '#1e1e3a', color: '#e2e8f0', padding: '12px 16px', borderRadius: 'var(--border-radius)', fontSize: '0.72rem', overflowX: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {pt.template}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Prompt Optimization Tips</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            {PROMPT_TIPS.map((tip, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)', borderTop: '3px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ background: '#f59e0b', color: '#fff', minWidth: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>{tip.tip}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{tip.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 'var(--spacing-sm)', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Token Budget Management</h3>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              {[
                { label: 'System Prompt', pct: '15%', tokens: '~600', color: '#3b82f6' },
                { label: 'RAG Context', pct: '50%', tokens: '~2000', color: '#8b5cf6' },
                { label: 'User Query + Examples', pct: '20%', tokens: '~800', color: '#f59e0b' },
                { label: 'Output Budget', pct: '15%', tokens: '~600', color: '#10b981' },
              ].map((b) => (
                <div key={b.label} style={{ textAlign: 'center', padding: 'var(--spacing-sm)', border: `2px solid ${b.color}`, borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: b.color }}>{b.pct}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, marginBottom: 2 }}>{b.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{b.tokens} tokens</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--border-radius)', padding: '10px 14px', fontSize: 'var(--font-size-xs)' }}>
              <strong>Rule:</strong> Cap injected context at 70% of context window. Use semantic chunking (ChromaDB) to retrieve only the most relevant 3-5 document chunks rather than full documents. Always reserve 15% for CoT reasoning + structured output.
            </div>
          </div>
        </div>
      )}
    </div>
    </TabShell>
  );
}
