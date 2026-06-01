// aiStack.js — AI types per department

export const departmentAIStack = {
  sales: [
    { type: 'ML', useCase: 'Demand forecasting, price elasticity, churn, basket analysis', exampleOutput: 'MAPE 7.2%, weekly SKU forecasts' },
    { type: 'DL', useCase: 'LSTM for seasonal demand patterns, customer order prediction', exampleOutput: 'Seasonal accuracy +12% vs ARIMA' },
    { type: 'NLP', useCase: 'Social signal for new launches, sentiment in sales reports, GTN deduction coding', exampleOutput: 'Launch forecast adjusted +18% on viral signal' },
    { type: 'RAG', useCase: 'Sales KPI narrative generation, automated insight reports', exampleOutput: '"Sales dropped 8% in South driven by competitor promo"' },
    { type: 'RPA', useCase: 'Auto-submit orders to ERP, price list updates, report distribution', exampleOutput: '400 POs auto-submitted/month, 0 manual errors' },
    { type: 'n8n', useCase: 'Sales alert workflows, CRM integration, WhatsApp KPI reports', exampleOutput: 'Anomaly detected → Slack + WhatsApp alert in 5 min' },
  ],
  'supply-chain': [
    { type: 'ML', useCase: 'Inventory optimization, supplier risk scoring, demand-supply matching', exampleOutput: 'Inventory reduced 22%, service level 98.5%' },
    { type: 'DL', useCase: 'Demand signal processing, lead time prediction', exampleOutput: 'Lead time prediction ±1.2 days accuracy' },
    { type: 'NLP', useCase: 'Supplier risk from news, contract analysis', exampleOutput: 'Risk flag 3 days before supplier disruption' },
    { type: 'RPA', useCase: 'Auto PO generation, supplier invoice matching, GRN processing', exampleOutput: '1200 POs/month automated, 99.8% accuracy' },
    { type: 'n8n', useCase: 'Supply alert workflows, ERP integration, supplier communication', exampleOutput: 'Shortage alert → procurement team → supplier email in 10 min' },
  ],
  logistics: [
    { type: 'ML', useCase: 'Route optimization, demand prediction for fleet, delivery time estimation', exampleOutput: 'Route cost reduced 19%, on-time delivery 96%' },
    { type: 'CV', useCase: 'Loading verification, POD capture, warehouse picking accuracy', exampleOutput: 'Loading accuracy 99.9%, POD fraud detection' },
    { type: 'RPA', useCase: 'Shipment booking, tracking updates, invoice reconciliation', exampleOutput: '800 shipments booked/day automated' },
    { type: 'n8n', useCase: 'Delivery exception workflows, customer notification, carrier API', exampleOutput: 'Delivery delay → customer SMS → reroute in 15 min' },
    { type: 'Physical AI', useCase: 'Autonomous warehouse robots, conveyor optimization', exampleOutput: 'Pick rate +45%, labor cost -30%' },
  ],
  manufacturing: [
    { type: 'ML', useCase: 'Production planning, OEE optimization, formula optimization', exampleOutput: 'Schedule adherence 91%, changeover -28%' },
    { type: 'DL', useCase: 'Defect detection models, process parameter optimization', exampleOutput: 'Defect detection 99.1% accuracy' },
    { type: 'CV', useCase: 'Visual defect inspection, label compliance, fill level check', exampleOutput: '100% inline inspection, 0.3% false reject' },
    { type: 'Physical AI', useCase: 'Collaborative robots, AGVs, smart conveyor systems', exampleOutput: 'Packing line fully automated, 3-shift continuous operation' },
  ],
  maintenance: [
    { type: 'ML', useCase: 'Failure prediction, RUL estimation, spare parts optimization', exampleOutput: 'Unplanned downtime -37%, maintenance cost -22%' },
    { type: 'DL', useCase: 'LSTM for sensor anomaly detection, vibration analysis', exampleOutput: 'Bearing failure predicted 8 days in advance' },
    { type: 'Physical AI', useCase: 'IoT sensor integration, edge AI for real-time monitoring, digital twin', exampleOutput: 'Real-time health score for 200+ assets' },
    { type: 'n8n', useCase: 'CMMS work order creation, parts ordering, engineer notification', exampleOutput: 'Failure alert → work order → parts PO in 30 min' },
  ],
  retail: [
    { type: 'CV', useCase: 'Shelf analytics, OSA monitoring, planogram compliance, footfall', exampleOutput: 'OOS detection in 28 min, compliance 87%' },
    { type: 'ML', useCase: 'Price optimization, store clustering, assortment optimization', exampleOutput: 'Revenue uplift 3.2%, slow movers -22%' },
    { type: 'NLP', useCase: 'Review analysis, shopper feedback, competitive intelligence', exampleOutput: 'Issue detection 4 days before complaint spike' },
    { type: 'n8n', useCase: 'Store alert workflows, replenishment triggers, price update workflows', exampleOutput: 'OOS → replenishment order → store manager alert in 1 hour' },
  ],
  customer: [
    { type: 'ML', useCase: 'Segmentation, churn prediction, LTV modeling, propensity scoring', exampleOutput: 'Churn recall 88%, retention campaign ROI 3.8x' },
    { type: 'DL', useCase: 'Behavioral sequence modeling, recommendation systems', exampleOutput: 'Recommendation CTR +34%, basket size +12%' },
    { type: 'NLP', useCase: 'Sentiment analysis, review mining, call center analytics', exampleOutput: 'Sentiment accuracy 91%, issue detection 3 days early' },
    { type: 'RAG', useCase: 'Personalized product Q&A, customer service chatbot', exampleOutput: 'CSAT +18%, support ticket reduction 40%' },
  ],
  finance: [
    { type: 'ML', useCase: 'Financial forecasting, fraud detection, trade spend optimization', exampleOutput: 'Forecast accuracy ±2.8%, fraud recall 91%' },
    { type: 'DL', useCase: 'Graph neural networks for fraud networks, deep anomaly detection', exampleOutput: 'Collusion networks detected before investigation' },
    { type: 'NLP', useCase: 'Deduction reason coding, contract analysis, regulatory parsing', exampleOutput: 'Deduction classification 92% accuracy, 0 manual coding' },
    { type: 'RAG', useCase: 'Financial report Q&A, regulation interpretation', exampleOutput: 'CFO query answered in 30 seconds vs 2 hours' },
    { type: 'RPA', useCase: 'Invoice processing, reconciliation, report generation', exampleOutput: '5000 invoices/month automated, 99.9% accuracy' },
  ],
  procurement: [
    { type: 'ML', useCase: 'Supplier scoring, spend analysis, demand forecasting for purchasing', exampleOutput: 'Procurement savings 9.2%, selection cycle -55%' },
    { type: 'NLP', useCase: 'Spend classification, contract analytics, bid analysis', exampleOutput: 'Classification accuracy 95%, review time -72%' },
    { type: 'RAG', useCase: 'Contract Q&A, compliance checking, supplier research', exampleOutput: 'Contract query answered in 45 sec, 0 missed renewals' },
    { type: 'RPA', useCase: 'PO processing, vendor onboarding, invoice three-way matching', exampleOutput: '2000 PO lines/day automated, processing cost -65%' },
  ],
  quality: [
    { type: 'CV', useCase: 'Inline defect detection, label inspection, fill level, seal integrity', exampleOutput: 'Detection accuracy 99.5%, false reject 0.4%' },
    { type: 'ML', useCase: 'SPC monitoring, complaint clustering, predictive quality', exampleOutput: 'Drift detected 2.3 days earlier, rework -32%' },
    { type: 'DL', useCase: 'Complex defect classification, microscopy analysis', exampleOutput: 'Defect type accuracy 98.8%' },
    { type: 'NLP', useCase: 'Complaint text analysis, batch record review, CAPA generation', exampleOutput: 'Complaint processing -65%, root cause accuracy 83%' },
  ],
  governance: [
    { type: 'ML', useCase: 'Model drift detection, risk scoring, compliance monitoring', exampleOutput: 'Drift detected within 4 hours, 100% model registry' },
    { type: 'NLP', useCase: 'Regulatory text parsing, policy analysis, audit report generation', exampleOutput: 'Regulation change detected in 18 hours' },
    { type: 'RAG', useCase: 'Compliance Q&A, policy chatbot, audit preparation assistant', exampleOutput: 'Audit preparation time reduced 70%' },
  ],
};

export default departmentAIStack;
