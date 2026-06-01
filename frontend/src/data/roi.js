// roi.js — ROI data per department

export const departmentROI = {
  sales: [
    { area: 'Demand Forecast Accuracy', impact: '+18%', description: 'MAPE reduced from 18% to 7.2%, reducing stockouts and write-offs', measurement: 'MAPE comparison vs prior year baseline' },
    { area: 'Revenue Uplift', impact: '+22%', description: 'Price optimization and channel mix driving top-line growth', measurement: 'Year-over-year revenue comparison, A/B test on pricing' },
    { area: 'Trade Spend Efficiency', impact: '+35%', description: 'Promotion ROI visibility eliminates ineffective trade spend', measurement: 'Promo ROI pre/post AI model deployment' },
    { area: 'Sales Report Automation', impact: '80% time saved', description: 'Automated KPI reports eliminate 8 hours/week of manual work per analyst', measurement: 'Time-motion study before/after' },
    { area: 'GTN Leakage Reduction', impact: '$2.4M saved', description: 'Automated deduction detection recovers unauthorized deductions', measurement: 'Deduction dispute resolution rate × average deduction value' },
  ],
  'supply-chain': [
    { area: 'Inventory Reduction', impact: '-22%', description: 'Safety stock optimization reduces excess inventory without service level impact', measurement: 'Average inventory value vs service level comparison' },
    { area: 'Supplier Disruption Prevention', impact: '3 prevented/year', description: 'Early warning system prevents supply disruptions worth $1.8M each', measurement: 'Disruption incidents before/after, near-miss tracking' },
    { area: 'Working Capital Improvement', impact: '$4.2M freed', description: 'Inventory optimization directly reduces working capital requirement', measurement: 'Days Inventory Outstanding (DIO) reduction × WACC' },
    { area: 'Order Processing Automation', impact: '1200 POs/month', description: 'RPA auto-generates POs reducing procurement team workload 60%', measurement: 'Manual PO count vs automated PO count per month' },
  ],
  logistics: [
    { area: 'Delivery Cost Reduction', impact: '-19%', description: 'Route optimization reduces fuel and driver time per delivery', measurement: 'Cost per delivery comparison, fuel consumption tracking' },
    { area: 'On-Time Delivery', impact: '+8% → 96%', description: 'Optimized routes and predictive rerouting improve on-time performance', measurement: 'OTD rate, customer SLA adherence' },
    { area: 'Fleet Utilization', impact: '+28%', description: 'Better load planning and dynamic routing improves vehicle utilization', measurement: 'Vehicle utilization rate, empty miles percentage' },
    { area: 'Maintenance Cost Savings', impact: '-30%', description: 'Predictive maintenance prevents costly breakdowns and reduces reactive repairs', measurement: 'Maintenance cost per km, breakdown incidents per month' },
  ],
  manufacturing: [
    { area: 'OEE Improvement', impact: '+15%', description: 'Optimized scheduling and predictive maintenance drive equipment effectiveness', measurement: 'OEE score monthly tracking against baseline' },
    { area: 'Defect Rate Reduction', impact: '-40%', description: 'Computer vision detects 99.1% of defects vs 60% manual inspection', measurement: 'Defect escape rate, customer complaints, rework cost' },
    { area: 'Changeover Reduction', impact: '-28%', description: 'AI-optimized production sequence minimizes time lost to product changeovers', measurement: 'Average changeover duration, changeover frequency' },
    { area: 'Formula Cost Savings', impact: '$1.5M/year', description: 'Ingredient optimization reduces raw material cost 5% while maintaining quality', measurement: 'Cost per tonne of finished goods, formulation changes tracked' },
  ],
  maintenance: [
    { area: 'Unplanned Downtime', impact: '-37%', description: 'Predictive maintenance prevents failures; 8-day advance warning enables planning', measurement: 'Unplanned downtime hours vs planned maintenance hours' },
    { area: 'Maintenance Cost', impact: '-22%', description: 'Condition-based maintenance replaces costly time-based schedules', measurement: 'Total maintenance cost per asset per year' },
    { area: 'MTBF Improvement', impact: '+25%', description: 'Better maintenance execution extends mean time between failures', measurement: 'MTBF tracking per critical asset class' },
    { area: 'Spare Parts Inventory', impact: '-25%', description: 'Optimized stocking reduces excess parts while ensuring critical part availability', measurement: 'Spare parts inventory value vs service level' },
  ],
  retail: [
    { area: 'On-Shelf Availability', impact: '+4% → 98%', description: 'CV-based OSA monitoring reduces OOS from 8% to 2%', measurement: 'OSA audit scores, OOS detection time, lost sales recovery' },
    { area: 'Revenue Uplift', impact: '+3.2%', description: 'Price optimization and assortment rationalization drive revenue growth', measurement: 'Revenue per store, basket size, price realization' },
    { area: 'Audit Cost Reduction', impact: '-60%', description: 'Automated shelf audits replace expensive manual fieldforce audits', measurement: 'Audit cost per store per visit, audit frequency' },
    { area: 'Margin Improvement', impact: '+2%', description: 'Price optimization and markdown reduction improve store margin', measurement: 'Gross margin per store, markdown rate tracking' },
  ],
  customer: [
    { area: 'Churn Reduction', impact: '-25%', description: 'Proactive retention campaigns targeting AI-identified at-risk customers', measurement: 'Churn rate before/after, retention campaign response rate' },
    { area: 'Campaign ROI', impact: '3.8x', description: 'Segmented, personalized campaigns outperform blanket campaigns', measurement: 'Revenue per campaign dollar, control group comparison' },
    { area: 'CSAT Improvement', impact: '+18 pts', description: 'Sentiment-driven issue resolution and personalized service improve satisfaction', measurement: 'NPS score, CSAT survey, complaint volume' },
    { area: 'Basket Size', impact: '+12%', description: 'Market basket recommendations drive cross-sell and upsell', measurement: 'Average basket value, items per transaction' },
  ],
  finance: [
    { area: 'Fraud Prevention', impact: '$3.2M/year', description: '91% fraud recall prevents financial losses from invoice and payment fraud', measurement: 'Fraud detected × average fraud value, false positive rate' },
    { area: 'Forecast Accuracy', impact: '+60%', description: 'AI forecasting achieves ±2.8% accuracy vs ±8% manual baseline', measurement: 'Forecast vs actual variance, planning cycle time' },
    { area: 'Close Cycle Time', impact: '-40%', description: 'Automated reconciliation and AI-assisted review accelerates financial close', measurement: 'Days to close vs baseline, automation rate' },
    { area: 'Trade Spend ROI', impact: '+15%', description: 'Data-driven trade investment decisions improve return on trade spend', measurement: 'Trade ROI measurement, deduction settlement rate' },
  ],
  procurement: [
    { area: 'Procurement Savings', impact: '9.2%', description: 'Data-driven sourcing, supplier consolidation, and spend optimization', measurement: 'Total savings vs prior year spend, negotiation win rate' },
    { area: 'Selection Cycle Time', impact: '-55%', description: 'AI scoring reduces RFQ evaluation from 4 weeks to 1.5 weeks', measurement: 'End-to-end RFQ cycle time tracking' },
    { area: 'Maverick Spend Reduction', impact: '-40%', description: 'Spend classification and compliance alerts reduce off-contract purchasing', measurement: 'Maverick spend as % of total spend' },
    { area: 'Contract Value Recovery', impact: '$1.2M/year', description: 'Automated renewal alerts and obligation tracking prevent lapsed contracts', measurement: 'Missed renewal rate × average contract value' },
  ],
  quality: [
    { area: 'Defect Detection', impact: '99.5% accuracy', description: 'CV inspection achieves 99.5% vs 60% manual inspection accuracy', measurement: 'Detection rate, escape rate, false positive rate' },
    { area: 'Customer Complaints', impact: '-45%', description: 'Better defect detection and early SPC alerts prevent quality failures reaching customers', measurement: 'Complaint rate per million units, complaint severity' },
    { area: 'Rework Cost', impact: '-32%', description: 'Early SPC drift detection prevents large-scale quality failures requiring rework', measurement: 'Rework cost per batch, rework rate' },
    { area: 'Inspection Labor', impact: '-50%', description: 'Automated CV inspection replaces manual inspectors on production line', measurement: 'Inspection labor hours per shift, inspector headcount' },
  ],
  governance: [
    { area: 'Compliance Coverage', impact: '100%', description: 'All products and markets covered vs 60% manual coverage', measurement: 'Compliance audit coverage rate' },
    { area: 'Audit Preparation', impact: '-70% time', description: 'Automated audit trail generation reduces preparation from 4 weeks to 1 week', measurement: 'Audit preparation man-days, audit findings count' },
    { area: 'Regulatory Fines Avoided', impact: '$2.8M/year', description: 'Proactive compliance monitoring prevents regulatory violations', measurement: 'Fine incidents before/after, near-miss tracking' },
    { area: 'AI Risk Reduction', impact: 'Quantified', description: 'Model governance prevents AI model failures and associated business impact', measurement: 'Model failure incidents, RMSE drift events caught' },
  ],
};

export default departmentROI;
