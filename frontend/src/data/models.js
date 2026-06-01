// models.js — Model details per department

export const departmentModels = {
  sales: [
    { name: 'XGBoost Demand Model', algorithm: 'Gradient Boosting', useCase: 'Demand forecasting', status: 'production', metrics: { mape: 7.2, rmse: 142, accuracy: 91, f1: 0.89 }, justification: 'Best performer; handles promotions and holidays natively' },
    { name: 'LSTM Seasonal Model', algorithm: 'Long Short-Term Memory', useCase: 'Seasonal forecasting', status: 'production', metrics: { mape: 9.1, rmse: 178, accuracy: 88, f1: 0.85 }, justification: 'Excellent for long-range seasonal patterns; ensemble with XGBoost' },
    { name: 'Prophet Holiday Model', algorithm: 'Additive Time Series', useCase: 'Holiday forecasting', status: 'staging', metrics: { mape: 11.3, rmse: 201, accuracy: 84, f1: 0.81 }, justification: 'Interpretable; used as explainability layer for business users' },
    { name: 'Price Elasticity Model', algorithm: 'Ridge Regression', useCase: 'Price optimization', status: 'production', metrics: { mape: null, rmse: null, accuracy: 87, f1: 0.83 }, justification: 'Handles multicollinearity; stable coefficients per SKU' },
    { name: 'Churn Risk Model', algorithm: 'XGBoost Classifier', useCase: 'Customer churn prediction', status: 'production', metrics: { mape: null, rmse: null, accuracy: 90, f1: 0.88 }, justification: 'AUC 0.92; exceeds business threshold of 0.85' },
    { name: 'Anomaly Detector', algorithm: 'Isolation Forest', useCase: 'KPI anomaly detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 92, f1: 0.86 }, justification: 'No labels needed; adapts to changing baselines' },
  ],
  'supply-chain': [
    { name: 'Inventory Optimizer', algorithm: 'Stochastic Optimization', useCase: 'Safety stock calculation', status: 'production', metrics: { mape: 5.1, rmse: null, accuracy: 93, f1: null }, justification: 'Monte Carlo simulation captures demand uncertainty correctly' },
    { name: 'Supplier Risk Model', algorithm: 'XGBoost', useCase: 'Supplier risk scoring', status: 'production', metrics: { mape: null, rmse: null, accuracy: 88, f1: 0.84 }, justification: 'Best tabular model; features include financial + operational data' },
    { name: 'Network Flow Optimizer', algorithm: 'Min-Cost Flow', useCase: 'Supply-demand matching', status: 'production', metrics: { mape: null, rmse: null, accuracy: 95, f1: null }, justification: 'Mathematical optimum for network allocation problems' },
    { name: 'Lead Time Predictor', algorithm: 'Random Forest', useCase: 'Lead time estimation', status: 'staging', metrics: { mape: 8.5, rmse: 2.1, accuracy: 86, f1: null }, justification: 'Handles non-linear lead time factors; robust to outliers' },
  ],
  logistics: [
    { name: 'VRP Route Optimizer', algorithm: 'Google OR-Tools', useCase: 'Delivery route planning', status: 'production', metrics: { mape: null, rmse: null, accuracy: 96, f1: null }, justification: 'Industry standard; handles all VRP constraints optimally' },
    { name: 'Fleet Health Model', algorithm: 'Isolation Forest', useCase: 'Vehicle anomaly detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 89, f1: 0.85 }, justification: 'Detects engine anomalies from telematics data without labels' },
    { name: 'ETA Predictor', algorithm: 'Gradient Boosting', useCase: 'Delivery time estimation', status: 'production', metrics: { mape: 6.8, rmse: 0.45, accuracy: 91, f1: null }, justification: 'Best ETA accuracy with traffic features; ±15 min accuracy' },
  ],
  manufacturing: [
    { name: 'YOLO Defect Detector', algorithm: 'YOLOv8n', useCase: 'Visual defect detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 99.1, f1: 0.991 }, justification: 'Real-time inference 40fps; exceeds 99% accuracy requirement' },
    { name: 'Schedule Optimizer', algorithm: 'Genetic Algorithm', useCase: 'Production scheduling', status: 'production', metrics: { mape: null, rmse: null, accuracy: 92, f1: null }, justification: 'Handles complex combinatorial scheduling; changeover matrix integrated' },
    { name: 'Formula Optimizer', algorithm: 'Linear Programming', useCase: 'Recipe optimization', status: 'production', metrics: { mape: null, rmse: null, accuracy: 98, f1: null }, justification: 'Mathematically optimal; all nutritional constraints satisfied' },
    { name: 'OEE Predictor', algorithm: 'Random Forest', useCase: 'OEE prediction', status: 'staging', metrics: { mape: 3.2, rmse: null, accuracy: 90, f1: null }, justification: 'Predicts OEE 2 hours ahead enabling proactive adjustments' },
  ],
  maintenance: [
    { name: 'LSTM Anomaly Detector', algorithm: 'LSTM Autoencoder', useCase: 'Sensor anomaly detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 93, f1: 0.90 }, justification: 'Unsupervised; no failure labels needed; detects novel failures' },
    { name: 'RUL Estimator', algorithm: 'Weibull Analysis', useCase: 'Remaining useful life', status: 'production', metrics: { mape: 12.5, rmse: 8.3, accuracy: 85, f1: null }, justification: 'Industry standard reliability model; interpretable output' },
    { name: 'Failure Classifier', algorithm: 'Random Forest', useCase: 'Failure mode classification', status: 'production', metrics: { mape: null, rmse: null, accuracy: 89, f1: 0.87 }, justification: 'Interpretable SHAP values for maintenance team understanding' },
    { name: 'Parts Demand Model', algorithm: 'Croston Method', useCase: 'Spare parts forecasting', status: 'production', metrics: { mape: 18.2, rmse: null, accuracy: 86, f1: null }, justification: 'Designed for intermittent demand; outperforms ARIMA on spare parts' },
  ],
  retail: [
    { name: 'Shelf CV Model', algorithm: 'YOLOv8 + Siamese Net', useCase: 'Shelf analytics / OSA', status: 'production', metrics: { mape: null, rmse: null, accuracy: 97, f1: 0.96 }, justification: 'Dual-model: detection + matching to planogram; 28 min OOS detection' },
    { name: 'Price Optimizer', algorithm: 'Gradient Boosting', useCase: 'Retail price optimization', status: 'production', metrics: { mape: null, rmse: null, accuracy: 88, f1: null }, justification: 'Captures non-linear price-demand; margin floor respected' },
    { name: 'Store Cluster Model', algorithm: 'K-Means', useCase: 'Store segmentation', status: 'production', metrics: { mape: null, rmse: null, accuracy: 87, f1: null }, justification: 'Optimal K=7 clusters by silhouette score; stable 3-month validity' },
  ],
  customer: [
    { name: 'Segmentation Model', algorithm: 'K-Means + RFM', useCase: 'Customer segmentation', status: 'production', metrics: { mape: null, rmse: null, accuracy: 88, f1: null }, justification: 'RFM-validated; segment stability 85% over 3 months' },
    { name: 'Churn Predictor', algorithm: 'XGBoost', useCase: 'Churn prediction', status: 'production', metrics: { mape: null, rmse: null, accuracy: 90, f1: 0.88 }, justification: 'AUC 0.92; retention campaign lifted by 3.8x ROI' },
    { name: 'Sentiment Model', algorithm: 'Fine-tuned BERT', useCase: 'Sentiment analysis', status: 'production', metrics: { mape: null, rmse: null, accuracy: 91, f1: 0.90 }, justification: 'Domain-tuned on BEV reviews; outperforms generic BERT by 8%' },
    { name: 'LTV Model', algorithm: 'Pareto/NBD', useCase: 'Customer lifetime value', status: 'staging', metrics: { mape: 11.3, rmse: null, accuracy: 85, f1: null }, justification: 'Probabilistic model; interpretable LTV decomposition' },
  ],
  finance: [
    { name: 'Financial Forecast Model', algorithm: 'Driver-Based Regression', useCase: 'P&L forecasting', status: 'production', metrics: { mape: 2.8, rmse: null, accuracy: 92, f1: null }, justification: 'Links financial drivers to outcomes; CFO-approved methodology' },
    { name: 'Fraud Detector', algorithm: 'Isolation Forest + GNN', useCase: 'Fraud detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 94, f1: 0.91 }, justification: 'Ensemble approach; GNN detects network fraud Isolation Forest misses' },
    { name: 'Deduction Classifier', algorithm: 'Fine-tuned BERT', useCase: 'Deduction reason coding', status: 'production', metrics: { mape: null, rmse: null, accuracy: 92, f1: 0.90 }, justification: 'Auto-classifies 50 deduction codes; 0 manual coding needed' },
  ],
  procurement: [
    { name: 'Spend Classifier', algorithm: 'Fine-tuned BERT', useCase: 'Spend categorization', status: 'production', metrics: { mape: null, rmse: null, accuracy: 95, f1: 0.94 }, justification: '7-level taxonomy classification; 95% accuracy without human review' },
    { name: 'Supplier Scorer', algorithm: 'AHP + Gradient Boosting', useCase: 'Supplier evaluation', status: 'production', metrics: { mape: null, rmse: null, accuracy: 90, f1: null }, justification: 'Multi-criteria scoring; ESG integrated; audit trail for decisions' },
    { name: 'Contract Analyzer', algorithm: 'LegalBERT + RAG', useCase: 'Contract risk extraction', status: 'production', metrics: { mape: null, rmse: null, accuracy: 93, f1: 0.91 }, justification: 'Legal domain NLP; extracts obligations, risks, and renewal dates' },
  ],
  quality: [
    { name: 'Inline CV Inspector', algorithm: 'YOLOv8 + EfficientNet', useCase: 'Defect detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 99.5, f1: 0.995 }, justification: 'Dual-stage: detection + classification; 40fps real-time inference' },
    { name: 'SPC Monitor', algorithm: 'CUSUM + Isolation Forest', useCase: 'Process monitoring', status: 'production', metrics: { mape: null, rmse: null, accuracy: 94, f1: 0.91 }, justification: 'Hybrid statistical + ML; catches drift 2.3 days earlier than SPC alone' },
    { name: 'Complaint NLP Model', algorithm: 'BERT + DBSCAN', useCase: 'Complaint analysis', status: 'production', metrics: { mape: null, rmse: null, accuracy: 91, f1: 0.88 }, justification: 'Cluster-then-classify; discovers unknown complaint patterns' },
  ],
  governance: [
    { name: 'Drift Detector', algorithm: 'PSI/CSI Monitor', useCase: 'Model drift detection', status: 'production', metrics: { mape: null, rmse: null, accuracy: 95, f1: null }, justification: 'Industry standard metrics; threshold-based alerting within 4 hours' },
    { name: 'Compliance Bot', algorithm: 'RAG (GPT-4)', useCase: 'Regulatory Q&A', status: 'production', metrics: { mape: null, rmse: null, accuracy: 92, f1: null }, justification: 'Retrieval-augmented; grounded in actual regulatory documents' },
    { name: 'SHAP Explainer', algorithm: 'SHAP TreeExplainer', useCase: 'Model explainability', status: 'production', metrics: { mape: null, rmse: null, accuracy: 95, f1: null }, justification: 'Exact SHAP for tree models; approximate for neural networks' },
  ],
};

export default departmentModels;
