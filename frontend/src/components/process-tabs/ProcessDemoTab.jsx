import { useState } from 'react';
import { TabShell } from '../../pages/insurance/tabs/IPOLayout';

/* =========================================================
   DEMO SCENARIOS TAB — Interactive walkthroughs by process
   ========================================================= */

const DEMO_DATA = {
  'demand-forecasting': {
    demos: [
      {
        id: 'D1', title: 'Predict 30-Day Demand',
        description: 'End-to-end walkthrough: load historical sales data, run EDA, train XGBoost, generate 30-day forecast with confidence bands, and export to ERP.',
        difficulty: 'Beginner', time: '12 min', stepsCount: 5, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Data', desc: 'Upload CSV with 24 months of historical sales. System validates schema: date, sku_id, store_id, quantity, price.', input: 'sales_history.csv (3,200 SKUs × 104 weeks)', output: 'Loaded 332,800 rows. 0 duplicates, 12 null values auto-imputed.' },
          { n: 2, label: 'Exploratory Data Analysis', desc: 'Auto-profile the dataset: distributions, seasonality patterns, missing data heatmap, top-20 SKU volume ranking.', input: 'Loaded dataset', output: 'EDA report: 3 high-CV SKUs flagged, weekly seasonality confirmed (ACF spike at lag 52).' },
          { n: 3, label: 'Feature Engineering', desc: 'Create lag features (1,4,8,13 weeks), rolling mean (4w, 8w), promotion flag, holiday calendar, and day-of-week encoding.', input: 'Clean dataset', output: '45 features created from 18 raw columns.' },
          { n: 4, label: 'Train & Validate', desc: 'Train XGBoost with time-series cross-validation (5-fold walk-forward). Tune max_depth, n_estimators, learning_rate via Bayesian search.', input: 'Feature matrix (332,800 × 45)', output: 'Best model: MAPE 8.7% on holdout. Saved to model registry v2.1.' },
          { n: 5, label: 'Generate Forecast & Export', desc: 'Score all 3,200 SKUs for next 30 days. Generate P10/P50/P90 bands. Push to data warehouse. Export CSV and PDF report.', input: 'Trained model + feature pipeline', output: '30-day forecast for 3,200 SKUs exported. PDF report generated. ERP sync triggered.' },
        ],
      },
      {
        id: 'D2', title: 'Promotion Impact Simulator',
        description: 'Select a promotional mechanic (TPR, display, coupon), adjust depth and duration, and instantly see predicted volume uplift and margin impact.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Select SKU & Market', desc: 'Choose product, region, and retailer from dropdowns. Baseline demand is auto-populated from the latest forecast.', input: 'SKU: 12345 — "Natural Oat Biscuit 400g", Region: South', output: 'Baseline: 4,200 units/week. Current price: £2.50.' },
          { n: 2, label: 'Configure Promo', desc: 'Set promotion type (TPR / BOGOFs / Coupon / Display), discount depth (%), and duration (weeks).', input: 'TPR 20% off, 2-week promo', output: 'Promo parameters locked. Historical analogues identified: 14 matching events.' },
          { n: 3, label: 'Run Uplift Model', desc: 'Promo uplift model applies learned lift multipliers, adjusting for seasonality, store type, and pantry loading effect.', input: 'Baseline + promo parameters', output: 'Uplift: +38% (1,596 incremental units). Pantry-load correction applied: −6% in week 3.' },
          { n: 4, label: 'Review P&L Impact', desc: 'System computes gross profit, trade spend, and incremental revenue. Cannibalisation from adjacent SKUs flagged.', input: 'Volume uplift + margin data', output: 'Incremental GM: +£1,450. Trade spend: £840. Promo ROI: 1.73x. Cannib. flag: SKU 12346 −4%.' },
        ],
      },
      {
        id: 'D3', title: 'Stockout Risk Detection',
        description: 'Identify the top at-risk SKU-store combinations where demand forecast exceeds available inventory, factoring in lead times.',
        difficulty: 'Beginner', time: '5 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Sync Inventory', desc: 'Pull current on-hand inventory from WMS via API. Match against active SKU-store pairs.', input: 'WMS snapshot (real-time via API)', output: '94,000 SKU-store records loaded. 280 with SOH = 0 (already out of stock).' },
          { n: 2, label: 'Score Risk', desc: 'For each SKU-store, compute Days Cover = SOH / daily forecast rate. Flag items with Days Cover < lead time as at-risk.', input: 'Inventory + demand forecast + lead times', output: 'Risk scored: 312 high-risk (Days Cover <5d), 841 medium-risk, 92,847 safe.' },
          { n: 3, label: 'Dashboard & Alerts', desc: 'Render ranked list in dashboard. Send push notification to DC planners for top-20. Generate replenishment order suggestions.', input: 'Risk scores', output: 'Dashboard updated. 20 planners notified. 312 replenishment orders drafted.' },
        ],
      },
      {
        id: 'D4', title: 'Multi-Store Comparison',
        description: 'Compare demand patterns, forecast accuracy, and stockout rates across regions and store formats side-by-side.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Select Comparison Set', desc: 'Pick up to 5 stores or regions. Select SKU category and date range.', input: 'Stores: London-SW, Manchester-N, Birmingham-C; SKU: Cereals; Period: Q1 2025', output: 'Comparison scope set: 3 markets × 142 SKUs × 13 weeks.' },
          { n: 2, label: 'Demand Profiles', desc: 'Render weekly demand time series for each market. Highlight divergence weeks.', input: 'Filtered forecast and actuals', output: 'London-SW 18% higher than national avg. Birmingham-C shows promotional spike week 6.' },
          { n: 3, label: 'Accuracy Heatmap', desc: 'Show MAPE by store-week as a heatmap. Drill into worst-performing weeks.', input: 'Actuals vs. forecast archive', output: 'Worst MAPE: Manchester-N week 7 (23.4%) — coincided with competitor promotion.' },
          { n: 4, label: 'Exportable Report', desc: 'Download comparison PDF or CSV for category review meeting.', input: 'Comparison results', output: 'Multi-store_Q1_2025_Cereals.pdf generated (12 pages).' },
        ],
      },
      {
        id: 'D5', title: 'New SKU Cold Start',
        description: 'Generate a launch forecast for a new product with no sales history by matching it to analogous SKUs using attribute similarity.',
        difficulty: 'Advanced', time: '15 min', stepsCount: 5, status: 'Ready',
        steps: [
          { n: 1, label: 'Enter SKU Attributes', desc: 'Enter: category, sub-category, pack size, flavour type, price point, and target retailer.', input: 'New SKU: Protein Oat Bar 55g, £1.80, Snacking, Chocolate', output: 'Attributes encoded into 128-dimensional embedding vector.' },
          { n: 2, label: 'Find Analogues', desc: 'Cosine similarity search across 3,200 active SKUs. Top-5 most similar products selected.', input: 'New SKU embedding', output: 'Top analogues: SKU 2341 (sim 0.92), SKU 1872 (0.89), SKU 3105 (0.86).' },
          { n: 3, label: 'Build Prior', desc: 'Weight analogue launch curves by similarity score. Apply category growth trend and channel mix.', input: 'Analogue launch profiles', output: 'Bayesian prior: 1,200 units/week at launch, ramp to 1,800 by week 8.' },
          { n: 4, label: 'Generate Forecast', desc: 'Output 12-week ramp forecast with ±30% cold-start uncertainty band. Flag as cold-start in system.', input: 'Prior + launch calendar', output: '12-week cold-start forecast produced. Cold-start flag = TRUE. Uncertainty band: ±30%.' },
          { n: 5, label: 'Auto-Update Loop', desc: 'After week 4, system ingests actuals and tightens the prior. Forecast accuracy improves to ±15% by week 6.', input: 'Actuals week 1–4', output: 'Model updated. Uncertainty reduced to ±18%. Planner notified of forecast correction.' },
        ],
      },
      {
        id: 'D6', title: 'What-If Scenario Planning',
        description: 'Use interactive sliders to adjust promotional depth, price point, or external shocks and see demand impact instantly via a pre-trained what-if engine.',
        difficulty: 'Intermediate', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Configure Base Scenario', desc: 'Select SKU, region, and planning horizon. Baseline forecast auto-loaded.', input: 'SKU: "Orange Juice 1L", Region: East, Horizon: 8 weeks', output: 'Baseline forecast: 6,800 units/week. Baseline revenue: £27,200/week.' },
          { n: 2, label: 'Adjust Parameters', desc: 'Sliders: Price change (%), Promo depth (%), Distribution gain/loss (stores), Weather index (cold/warm).', input: 'Price +5%, Promo none, +20 distribution stores', output: 'Estimated impact: −3.2% volume, +1.5% revenue due to distribution gain offsetting price elasticity.' },
          { n: 3, label: 'Compare Scenarios', desc: 'Save up to 3 named scenarios. View side-by-side demand curves and financial P&L.', input: 'Scenarios: Base, Price+5%, Promo20%', output: 'Scenario table exported. CFO summary one-pager generated.' },
        ],
      },
      {
        id: 'D7', title: 'Forecast Accuracy Audit',
        description: 'Compare the last 4 weeks of forecasts against actual sales. Identify SKU clusters with systematic bias and trigger retraining if drift is detected.',
        difficulty: 'Advanced', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Actuals', desc: 'Ingest POS actuals for the trailing 4-week window. Align with forecast archive by SKU-store-week.', input: 'POS actuals (file or API)', output: '94,000 SKU-store-week pairs matched. 0.2% unmatched (new listings).' },
          { n: 2, label: 'Compute Metrics', desc: 'Calculate MAPE, BIAS, SMAPE, and Forecast Value Added (FVA) vs. naïve baseline.', input: 'Actuals vs. forecasts', output: 'Aggregate MAPE: 9.2%. BIAS: +1.8% (slight over-forecast). FVA: +6.3pp vs. naïve.' },
          { n: 3, label: 'Identify Drift', desc: 'Run Mann-Kendall trend test on rolling MAPE. Flag if MAPE increasing >2pp in last 3 periods.', input: 'Rolling MAPE history', output: 'Drift detected in Category: Beverages (MAPE trending +3.1pp). Retraining queued.' },
          { n: 4, label: 'Accuracy Report', desc: 'Generate PDF accuracy audit report with SKU-level heatmap, category breakdown, and recommendations.', input: 'All computed metrics', output: 'accuracy_audit_2025_W14.pdf generated. Sent to Demand Planning inbox.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Demand Week', demand: '6,800 units/week', modelBehavior: 'Standard XGBoost ensemble, auto-approved', kpiImpact: 'Fill Rate 98.2%, MAPE 8.7%', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Promotion Week (TPR 20%)', demand: '9,384 units/week (+38%)', modelBehavior: 'Promo uplift layer active, pantry-load correction applied', kpiImpact: 'Promo accuracy ±7%, GM uplift +£1.4K', color: 'var(--accent-primary)' },
      { id: 'SC3', label: 'Holiday Season (Christmas)', demand: '14,200 units/week (+109%)', modelBehavior: 'Seasonal decomposition, P10/P90 widened ±25%', kpiImpact: 'Zero stockouts on hero SKUs, 4% buffer inventory', color: 'var(--accent-warning)' },
      { id: 'SC4', label: 'New Product Launch', demand: '1,200 → 1,800 units/week (ramp)', modelBehavior: 'Cold-start Bayesian prior, ±30% uncertainty band', kpiImpact: 'Week-4 accuracy within 22%, auto-corrects by week 6', color: 'var(--accent-purple)' },
      { id: 'SC5', label: 'Supply Disruption', demand: '2,100 units available (constrained)', modelBehavior: 'Constrained forecast mode; substitution demand triggered', kpiImpact: 'Lost sales quantified £12K, 3 substitute SKUs uplifted', color: 'var(--accent-danger)' },
    ],
  },

  '__default__': {
    demos: [
      {
        id: 'D1', title: 'Standard AI Pipeline Walkthrough',
        description: 'Load data, run automated EDA, train a model, evaluate performance, and export predictions.',
        difficulty: 'Beginner', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Data', desc: 'Upload or connect to your data source. System validates schema and data quality.', input: 'Data file or API connection', output: 'Dataset loaded and profiled. Quality report generated.' },
          { n: 2, label: 'EDA & Feature Engineering', desc: 'Auto-profile data. Engineer features and encode categorical variables.', input: 'Clean dataset', output: 'Feature matrix ready. Summary statistics generated.' },
          { n: 3, label: 'Train & Evaluate', desc: 'Train model with cross-validation. Review accuracy metrics.', input: 'Feature matrix', output: 'Model trained. Accuracy metrics within target range.' },
          { n: 4, label: 'Export Results', desc: 'Export predictions, model card, and accuracy report.', input: 'Trained model', output: 'Predictions exported. PDF report generated.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Operations', demand: 'Standard volume', modelBehavior: 'Standard inference pipeline', kpiImpact: 'Target accuracy met', color: 'var(--accent-success)' },
    ],
  },

  'inventory-optimization': {
    demos: [
      {
        id: 'D1', title: 'Optimize Safety Stock Levels',
        description: 'Calculate optimal safety stock for every SKU using demand variability and supplier lead time distributions via Monte Carlo simulation.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Demand & Lead Time Data', desc: 'Ingest 52 weeks of demand history and supplier lead time records per SKU. Compute CV of demand and CV of lead time.', input: 'demand_history.csv, lead_times.csv (8,400 SKUs)', output: 'CV computed for all SKUs. High-CV SKUs (CV > 0.5): 312 flagged.' },
          { n: 2, label: 'Run Monte Carlo Simulation', desc: 'Simulate 10,000 demand+lead-time scenarios per SKU to build an empirical distribution of demand during lead time.', input: 'CV demand, CV lead time, 10,000 iterations per SKU', output: 'Distributions computed. P95 demand during lead time estimated for all 8,400 SKUs.' },
          { n: 3, label: 'Calculate Optimal Safety Stock', desc: 'Apply service-level target (98%) to each distribution. Safety stock = P98 demand during lead time minus average demand during lead time.', input: 'P98 distribution outputs, target service level 98%', output: 'Optimal safety stock set for 8,400 SKUs. Avg reduction vs current: 18%. Capital released: £2.1M.' },
          { n: 4, label: 'Push to ERP & Dashboard', desc: 'Export new safety stock parameters to ERP. Update inventory dashboard with before/after comparison.', input: 'Optimized safety stock table', output: 'ERP updated. Dashboard showing £2.1M working capital reduction at 98.2% service level.' },
        ],
      },
      {
        id: 'D2', title: 'Reorder Point Automation',
        description: 'Set up automated reorder triggers based on real-time stock levels and dynamic lead time signals, replacing manual reorder reviews.',
        difficulty: 'Beginner', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Define Reorder Parameters', desc: 'For each SKU, compute reorder point = (average daily demand × average lead time) + safety stock. Sync with current SOH from WMS.', input: 'Avg daily demand, avg lead time, safety stock per SKU', output: 'Reorder points set for 8,400 SKUs. 284 currently below reorder point: orders queued.' },
          { n: 2, label: 'Configure Auto-Trigger Rules', desc: 'Set trigger logic: when SOH falls below reorder point, auto-create draft purchase order. Apply supplier MOQ and packing constraints.', input: 'Reorder points, supplier MOQ, pack sizes', output: 'Auto-trigger rules active. 284 draft POs created and sent to approval queue.' },
          { n: 3, label: 'Monitor & Alert Dashboard', desc: 'Real-time dashboard shows SOH vs reorder point for all SKUs. Planners receive push alerts for top-20 at-risk SKUs daily.', input: 'Live WMS feed', output: 'Dashboard live. 20 critical SKU alerts sent. Average time-to-reorder reduced from 3 days to 4 hours.' },
        ],
      },
      {
        id: 'D3', title: 'Demand-Supply Matching',
        description: 'Match confirmed customer orders against available inventory across all warehouse nodes to maximize fulfillment and minimize shortages.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Open Orders & Inventory', desc: 'Pull all open sales orders from OMS and on-hand inventory from WMS across 5 distribution centers.', input: 'OMS orders (12,400 lines), WMS inventory snapshot (5 DCs)', output: '12,400 order lines loaded. Total demand: 84,200 units. Total available: 79,600 units. Gap: 4,600 units.' },
          { n: 2, label: 'Run Network Flow Optimization', desc: 'Apply min-cost flow algorithm to allocate inventory from the most cost-efficient source DC to each order, respecting transit time constraints.', input: 'Order locations, DC inventory, transport cost matrix', output: 'Optimal allocation computed. 91.2% of demand fulfilled. 4,600 units short — 38 orders partially fulfilled.' },
          { n: 3, label: 'Apply Priority Rules', desc: 'Re-allocate shortages using customer priority tiers (Key Account > Standard > Spot). Key accounts receive 100% fill; shortfall absorbed by spot orders.', input: 'Allocation output, customer priority tier', output: 'Key accounts: 100% filled. Standard: 97% filled. Spot orders: 74% filled. Notifications sent.' },
          { n: 4, label: 'Generate Replenishment Orders', desc: 'For unmet demand, auto-generate replenishment orders from suppliers to fulfill within lead time. Update ETA in OMS.', input: 'Shortage list, supplier lead times', output: '38 replenishment orders raised. ETAs updated in OMS. Customer notifications sent with revised delivery dates.' },
        ],
      },
      {
        id: 'D4', title: 'Stockout Prevention Simulation',
        description: 'Simulate stockout scenarios using historical demand shocks and test prevention strategies before deploying to production.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Define Shock Scenarios', desc: 'Configure 3 scenarios: +20% demand spike, 5-day supplier delay, and combined shock. Select affected SKU category (Beverages — 420 SKUs).', input: 'Scenario config: demand spike +20%, lead time +5 days, category: Beverages', output: 'Scenarios configured. Baseline: 6.4 days cover. Shock applied to 420 Beverage SKUs.' },
          { n: 2, label: 'Run Simulation', desc: 'Project daily SOH for 30 days under each scenario. Identify SKUs that would stock out, and on which day.', input: 'Current SOH, demand forecast, scenario parameters', output: 'Demand spike: 87 SKUs stock out by day 8. Supplier delay: 134 SKUs OOS by day 6. Combined: 198 SKUs OOS by day 5.' },
          { n: 3, label: 'Test Prevention Strategies', desc: 'Apply 3 prevention levers: emergency reorder, demand rationing, substitute promotion. Compare stock-out count under each intervention.', input: 'Simulated OOS list, prevention parameters', output: 'Emergency reorder: reduces OOS to 12 SKUs. Rationing: 41 SKUs. Promo substitute: 28 SKUs. Best: emergency reorder — draft POs created.' },
        ],
      },
      {
        id: 'D5', title: 'Warehouse Balancing',
        description: 'Identify and redistribute excess inventory from overstocked DCs to understocked locations to improve network fill rates without new procurement.',
        difficulty: 'Advanced', time: '11 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Assess Inventory Imbalance', desc: 'Compare days-of-cover across 5 DCs by SKU category. Identify DC-SKU combinations with excess (>60 days cover) or deficit (<10 days cover).', input: 'WMS inventory snapshot, demand forecasts by DC', output: 'Excess identified: DC-North £840K. Deficit: DC-South 62 high-priority SKUs below 10 days cover.' },
          { n: 2, label: 'Calculate Transfer Costs', desc: 'Compute inter-DC transfer cost vs. cost of stockout or emergency procurement. Identify transfers with positive net benefit.', input: 'Transfer cost matrix, stockout cost by SKU', output: '28 transfer lanes identified as net-positive. Total transfer value: £620K. Net savings vs emergency procurement: £180K.' },
          { n: 3, label: 'Optimize Transfer Plan', desc: 'Apply LP optimization to select the minimum-cost transfers that eliminate all critical deficits while respecting truck capacity constraints.', input: 'Transfer lanes, truck capacity, priority SKUs', output: 'Optimal plan: 14 transfers, 8 truck loads, resolves all 62 deficit SKUs. Total cost: £42K.' },
          { n: 4, label: 'Execute & Track', desc: 'Generate transfer orders in WMS. Track in-transit inventory and update destination DC forecasts to reflect inbound stock.', input: 'Approved transfer plan', output: '14 transfer orders created in WMS. Dashboard updated with in-transit inventory. DC-South deficits resolved in 2 days.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Demand Week', demand: 'Steady state, SOH > reorder point', modelBehavior: 'Monte Carlo safety stock, auto-reorder rules active', kpiImpact: 'Service level 98.2%, working capital reduced 18%', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Demand Spike (+20%)', demand: 'Sudden uplift across Beverages category', modelBehavior: 'Shock detection triggers emergency reorder review', kpiImpact: '87 SKUs at risk; emergency POs reduce OOS to 12 SKUs', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Supplier Lead Time Extension', demand: 'Lead time increases from 5 to 10 days', modelBehavior: 'Reorder points auto-adjusted; safety stock recalculated', kpiImpact: 'Service level maintained at 97.1%; £320K buffer added', color: 'var(--accent-primary)' },
    ],
  },

  'route-optimization': {
    demos: [
      {
        id: 'D1', title: 'Last-Mile Route Optimization',
        description: 'Optimize delivery routes for a fleet of 50 trucks serving 800 delivery points to minimize mileage and ensure all time-window commitments are met.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Orders & Fleet Data', desc: 'Import today\'s 800 delivery orders with addresses, time windows, and weights. Load fleet data: 50 trucks with capacity and start locations.', input: 'orders_today.csv (800 stops), fleet_config.json (50 trucks)', output: '800 stops loaded. Total weight: 142 tonnes. Fleet capacity: 168 tonnes. 94 stops with narrow time windows flagged.' },
          { n: 2, label: 'Geocode & Build Distance Matrix', desc: 'Geocode all delivery addresses. Build a 800×800 travel time matrix using real-time traffic data from HERE Maps API.', input: '800 addresses + HERE Maps API', output: 'All 800 stops geocoded. Distance matrix built (640,000 pairs). Avg travel time between stops: 8.4 min.' },
          { n: 3, label: 'Run VRP Optimizer', desc: 'Apply Google OR-Tools VRP solver with capacity, time-window, and driver shift constraints. Run for 120 seconds to find near-optimal solution.', input: 'Distance matrix, capacity constraints, time windows', output: '50 optimized routes generated. Total distance: 3,840 km vs manual baseline 4,920 km. Saving: 22%. All time windows met.' },
          { n: 4, label: 'Push to Driver App', desc: 'Export routes to driver mobile app with turn-by-turn navigation. Send manifest to dispatcher. Enable real-time tracking.', input: 'Optimized route plan (50 routes)', output: '50 driver apps updated with routes. Dispatcher manifest generated. Live tracking dashboard active.' },
        ],
      },
      {
        id: 'D2', title: 'ETA Prediction Accuracy Test',
        description: 'Validate ETA prediction accuracy by comparing model-predicted delivery times against actuals across 1,000 completed deliveries.',
        difficulty: 'Beginner', time: '6 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Historical Delivery Data', desc: 'Pull 1,000 completed deliveries from the last 30 days. Match predicted ETA at dispatch time with actual delivery timestamp.', input: 'delivery_history.csv (1,000 records), ETA predictions archive', output: '1,000 records matched. 6 records missing actual timestamp (excluded). Dataset: 994 deliveries.' },
          { n: 2, label: 'Compute ETA Accuracy Metrics', desc: 'Calculate mean absolute error (MAE), % on-time (within ±15 min), and error distribution by time of day, route type, and day of week.', input: '994 predicted vs actual delivery times', output: 'MAE: 9.2 min. On-time (±15 min): 87.4%. Peak-hour routes: 14.1 min MAE. Night routes: 5.8 min MAE.' },
          { n: 3, label: 'Identify Improvement Opportunities', desc: 'Segment routes with MAE > 15 min. Analyse root causes: traffic data lag, geocoding errors, or driver behaviour. Recommend model updates.', input: 'Error segmentation analysis', output: '78 routes with MAE > 15 min — 62% occur on motorway junctions 3-7pm. Traffic data update frequency: 15-min → 5-min recommended.' },
        ],
      },
      {
        id: 'D3', title: 'Load Optimization',
        description: 'Maximize truck utilization by optimally assigning mixed-size orders to vehicles, reducing the number of trucks required for daily operations.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Profile Order Mix', desc: 'Analyse today\'s order mix by weight, volume, and delivery zone. Identify opportunities to consolidate orders onto fewer trucks.', input: 'Order manifest: 800 orders, avg weight 178 kg, volume mix: 40% pallets, 60% mixed cases', output: 'Current plan: 50 trucks, avg utilization 72%. Consolidation potential identified: 8 trucks can be removed with re-sequencing.' },
          { n: 2, label: 'Run Bin-Packing Optimization', desc: 'Apply 3D bin-packing heuristic combined with VRP constraints to assign orders to trucks while respecting weight limits, stack heights, and delivery sequence.', input: 'Order dimensions, truck capacity, delivery sequence', output: '42 trucks needed (vs 50). Avg utilization: 86.4%. All capacity and sequence constraints satisfied.' },
          { n: 3, label: 'Calculate Savings & Report', desc: 'Compute cost savings from 8 fewer truck runs. Generate load plan per truck with loading sequence for warehouse team.', input: '42-truck optimized plan', output: '8 trucks de-assigned. Fuel saving: £1,240/day. CO₂ reduction: 2.1 tonnes/day. Load plans sent to warehouse.' },
        ],
      },
      {
        id: 'D4', title: 'Carrier Cost Comparison',
        description: 'Compare 4 logistics carriers on cost, speed, and reliability using 90 days of delivery data to inform the annual carrier contract decision.',
        difficulty: 'Beginner', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Carrier Performance Data', desc: 'Pull 90-day delivery records for Carriers A, B, C, D. Metrics: cost per km, on-time %, damage rate, tracking capability.', input: 'carrier_performance.csv (90 days, 4 carriers, 12,000 deliveries)', output: 'Data loaded. Carrier A: 12,000 deliveries. B: 9,400. C: 7,200. D: 3,100. Baseline stats computed.' },
          { n: 2, label: 'Compute Composite Score', desc: 'Weight metrics: cost 40%, on-time 35%, damage rate 15%, tracking 10%. Normalise each metric and compute weighted composite score per carrier.', input: 'Performance metrics, weight config', output: 'Scores: Carrier A 81/100, Carrier B 76/100, Carrier C 88/100, Carrier D 69/100. Carrier C leads on composite score.' },
          { n: 3, label: 'Generate Decision Report', desc: 'Output procurement recommendation with cost impact model: if Carrier C volume increased to 60% of lanes, annual saving vs current mix.', input: 'Composite scores, current volume split, rate cards', output: 'Recommendation: increase Carrier C to 60%. Annual saving: £280K. Damage reduction: 0.4pp. Report exported for procurement committee.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Standard Delivery Day', demand: '800 stops, 50 trucks', modelBehavior: 'VRP solver, 120s optimisation run', kpiImpact: 'Mileage reduced 22%, all time windows met', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Peak Season (+40% volume)', demand: '1,120 stops, 65 trucks', modelBehavior: 'Additional trucks sourced, routes rebalanced', kpiImpact: 'On-time delivery 92%, mileage saving 18%', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Traffic Disruption', demand: '800 stops, live rerouting active', modelBehavior: 'RL rerouting agent triggers on delay > 15 min', kpiImpact: '94% of ETAs updated, 12 routes rerouted in real time', color: 'var(--accent-danger)' },
    ],
  },

  'production-planning': {
    demos: [
      {
        id: 'D1', title: 'Batch Scheduling Optimizer',
        description: 'Schedule production batches across 8 lines to minimize changeover time and idle time while meeting the weekly production plan.',
        difficulty: 'Advanced', time: '14 min', stepsCount: 5, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Production Plan & Capacity', desc: 'Import weekly production plan (SKU quantities per line) and the changeover time matrix (minutes between each product pair on each line).', input: 'production_plan_W22.csv (120 SKUs), changeover_matrix.xlsx (8 lines × 120×120)', output: 'Plan loaded: 120 SKUs, 8 lines, 168 available hours/week. Changeover matrix: avg 47 min between switches.' },
          { n: 2, label: 'Baseline Changeover Analysis', desc: 'Calculate total changeover time under current FIFO schedule. Identify the top 10 costly transitions that should be resequenced.', input: 'FIFO schedule + changeover matrix', output: 'Baseline: 38 changeovers, 29.8 hours lost. Top 10 costly transitions identified — account for 60% of changeover time.' },
          { n: 3, label: 'Run Genetic Algorithm Optimizer', desc: 'Optimise batch sequence on each line using a genetic algorithm (500 generations, population 200). Objective: minimize total changeover while meeting due dates.', input: 'Production plan, changeover matrix, due date constraints', output: 'Optimal schedule found (gen 387): 22.1 hours changeover time. Saving: 7.7 hours (26%). All due dates met.' },
          { n: 4, label: 'Validate Capacity & Materials', desc: 'Check optimised schedule against material availability and line capacity hour-by-hour. Flag any conflicts.', input: 'Optimised schedule, material availability, line capacity', output: 'No capacity conflicts. 2 material gaps identified (raw ingredient delayed): 2 batches rescheduled to Thursday.' },
          { n: 5, label: 'Publish to MES', desc: 'Push approved schedule to Manufacturing Execution System. Send line-by-line job cards to operators. Enable real-time adherence tracking.', input: 'Approved optimised schedule', output: 'MES updated. 8 line schedules published. Operator job cards sent. Adherence dashboard live.' },
        ],
      },
      {
        id: 'D2', title: 'Yield Prediction',
        description: 'Predict production yield percentage from real-time sensor data before batch completion, enabling early intervention to prevent low-yield batches.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Stream Sensor Data', desc: 'Ingest live sensor readings from production line: temperature, humidity, mixing speed, ingredient ratios, process timestamps. Data refreshes every 30 seconds.', input: 'IoT sensor stream: 24 parameters, 30-sec cadence', output: '24 sensor channels active. 3 readings flagged as out-of-normal-range (temperature variance ±1.2°C on Line 4).' },
          { n: 2, label: 'Score Yield Prediction Model', desc: 'Apply LSTM model trained on 18 months of completed batches. Predict final yield % at 40% batch completion point when intervention is still possible.', input: 'Sensor readings at 40% batch completion, LSTM model v3.1', output: 'Predicted yield: 91.4% (target: 94%). Low-yield alert triggered. Line 4 supervisor notified.' },
          { n: 3, label: 'Recommend Intervention', desc: 'Provide actionable intervention suggestions ranked by historical effectiveness. Operator confirms and system logs the action taken.', input: 'Low-yield prediction + intervention library', output: 'Top recommendation: increase mixer speed 8% for next 12 min. Historical success rate: 78%. Operator confirmed action. Batch yield recovered to 93.6%.' },
        ],
      },
      {
        id: 'D3', title: 'Capacity Planning Simulation',
        description: 'Simulate production capacity at 80%, 100%, and 120% demand scenarios to identify bottlenecks and evaluate expansion options.',
        difficulty: 'Intermediate', time: '11 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Define Scenarios', desc: 'Set demand volumes for three scenarios: Base (100%), Conservative (80%), and Peak (120%). Map each to SKU mix and line requirements.', input: 'Base plan: 240 tonnes/week; 80% scenario: 192 tonnes; 120%: 288 tonnes', output: 'Three scenarios configured. SKU mix held constant. Line allocation model ready.' },
          { n: 2, label: 'Run Discrete Event Simulation', desc: 'Simulate 4-week production run under each scenario using DES. Model changeovers, breakdowns (MTBF-based), and shift patterns.', input: 'Scenario volumes, line specs, MTBF data, shift calendar', output: 'Base: 91% OEE, no bottleneck. 80%: 78% OEE, Line 2 idle 18%. 120%: Line 3 bottleneck — 14 hours/week unmet demand.' },
          { n: 3, label: 'Identify Bottlenecks', desc: 'For the 120% scenario, pinpoint which operation on Line 3 is the binding constraint and evaluate options: extended shifts, outsource, or equipment upgrade.', input: '120% simulation output, bottleneck analysis', output: 'Bottleneck: Packaging step on Line 3 (capacity 280 tonnes/week). Options: overtime +£42K/week, or co-packer at +£0.18/unit.' },
          { n: 4, label: 'Capacity Recommendation Report', desc: 'Summarise findings with cost-benefit table for each expansion option. Export to finance and operations for CapEx decision.', input: 'Bottleneck analysis, cost data', output: 'Report: co-packer option recommended for short-term peak. Line 3 upgrade (£1.2M, 6-month ROI) for sustained growth. PDF exported.' },
        ],
      },
      {
        id: 'D4', title: 'Quality Defect Prediction',
        description: 'Predict defects before batch completion using in-process measurements, reducing rework and finished goods failures.',
        difficulty: 'Advanced', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Connect In-Process Quality Data', desc: 'Ingest in-process quality measurements (pH, viscosity, particle size, colour index) at 5 checkpoints during production. Align with batch ID.', input: 'In-process QC readings: 5 checkpoints × 14 parameters per batch', output: '14 parameters ingested for active batch B2204. Checkpoint 3 of 5 completed. pH reading at checkpoint 2: 6.8 (spec 7.0–7.4).' },
          { n: 2, label: 'Score Defect Prediction Model', desc: 'Apply Random Forest model trained on 2,400 historical batches. Predict probability of finished goods failing specification at checkpoint 3.', input: 'Checkpoints 1–3 readings, defect model v2.4', output: 'Defect probability: 34% (threshold: 20%). Alert raised. Quality manager notified. Batch flagged for enhanced end-of-line inspection.' },
          { n: 3, label: 'Apply Corrective Action', desc: 'System retrieves top corrective actions from CAPA library based on defect type and deviation pattern. Quality manager selects adjustment.', input: 'Defect alert, deviation pattern, CAPA library', output: 'Recommended: adjust pH to 7.2 via buffer addition. Quality manager applied adjustment. pH confirmed 7.1 at checkpoint 4.' },
          { n: 4, label: 'Close-Out & Log', desc: 'After batch completion, compare final QC result with prediction. Update model feedback loop. Log prediction accuracy for model governance.', input: 'Final QC result, original prediction', output: 'Final QC: PASS (pH 7.1, all other parameters in spec). Prediction outcome logged. Model feedback loop updated. Batch released.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Production Week', demand: '240 tonnes, 8 lines running', modelBehavior: 'GA scheduler, changeover minimised, OEE 91%', kpiImpact: 'Changeover time down 26%, schedule adherence 93%', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Demand Peak (+20%)', demand: '288 tonnes, Line 3 at capacity limit', modelBehavior: 'Bottleneck detection, co-packer recommendation triggered', kpiImpact: 'Overflow managed via co-packer, £42K/week cost', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Low-Yield Alert Batch', demand: 'Normal volume, yield risk on Line 4', modelBehavior: 'LSTM yield model triggers intervention at 40% completion', kpiImpact: 'Yield recovered from 91% to 93.6%, batch passed', color: 'var(--accent-primary)' },
    ],
  },

  'predictive-maintenance': {
    demos: [
      {
        id: 'D1', title: 'Equipment Failure Prediction',
        description: 'Predict equipment failure 7 days in advance using vibration, temperature, and current sensor data from 120 production assets.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Ingest Sensor Streams', desc: 'Connect to IoT gateway receiving data from 120 assets. Each asset streams vibration (3-axis), temperature, current draw, and oil pressure at 1-second intervals.', input: 'IoT gateway: 120 assets × 7 sensors × 1-sec cadence = 840 data points/sec', output: '120 assets connected. 3 sensors offline (assets 44, 67, 91): alerts raised. Rolling 7-day feature window computed.' },
          { n: 2, label: 'Extract Health Features', desc: 'Compute 48 health features from raw sensor streams: RMS vibration, spectral peaks at bearing frequencies, temperature delta, current harmonics, and trend slopes.', input: 'Raw 7-day sensor windows for 120 assets', output: '48 features computed per asset. Asset 23 shows elevated bearing frequency peak (3.2× baseline). Asset 78: temperature delta trending +0.8°C/day.' },
          { n: 3, label: 'Score Failure Prediction Model', desc: 'Apply LSTM Autoencoder to compute reconstruction error (anomaly score) per asset. Apply Random Forest classifier to predict failure within 7 days.', input: 'Health features, LSTM model v4.1, RF classifier v2.0', output: 'Asset 23: failure probability 84% within 7 days (Bearing fault). Asset 78: 61% probability (Thermal degradation). 4 other assets > 30% probability.' },
          { n: 4, label: 'Generate Work Orders & Parts Alert', desc: 'Auto-create CMMS work orders for assets exceeding threshold. Alert MRO team to pre-stage required spare parts. Notify maintenance planner.', input: 'Failure predictions (threshold: 60% probability)', output: '2 work orders created in CMMS. Parts request sent for bearing SKU-B7821 (Asset 23) and cooling fan CF-1140 (Asset 78). Planner notified.' },
        ],
      },
      {
        id: 'D2', title: 'Maintenance Schedule Optimization',
        description: 'Balance preventive and reactive maintenance across 120 assets to minimize total downtime cost while respecting maintenance crew capacity.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Asset & Cost Data', desc: 'Import asset criticality ratings, maintenance history, crew capacity (8 technicians, 40hrs/week), and cost parameters (planned vs unplanned ratio).', input: 'asset_register.csv (120 assets), maintenance_history.xlsx (3 years), crew_capacity.json', output: 'Data loaded. High-criticality assets: 34. Current PM coverage: 67%. Reactive maintenance cost ratio: 3.2× planned.' },
          { n: 2, label: 'Calculate Optimal PM Intervals', desc: 'Use Weibull reliability analysis per asset to calculate failure rate curves. Find PM interval that minimises total expected maintenance cost.', input: 'Failure history per asset, Weibull parameters', output: 'Optimal PM intervals calculated for all 120 assets. 28 assets were over-maintained (PM too frequent). 12 under-maintained.' },
          { n: 3, label: 'Balance Crew Schedule', desc: 'Assign PM tasks to the 4-week calendar respecting crew capacity and production schedule blackout windows. Smooth workload across weeks.', input: 'PM task list, crew capacity, production blackout windows', output: 'Schedule balanced: max 38 hours/week (vs 40 capacity). No blackout conflicts. Workload variance between weeks: 9%.' },
          { n: 4, label: 'Projected Cost Savings', desc: 'Compare new optimised schedule against baseline: expected reduction in unplanned failures, total maintenance cost, and OEE improvement.', input: 'Optimised PM schedule vs baseline', output: 'Expected unplanned failures: down 38%. Total maintenance cost: -£124K/year. OEE improvement: +2.4pp. Report sent to engineering manager.' },
        ],
      },
      {
        id: 'D3', title: 'Anomaly Detection in Sensor Data',
        description: 'Real-time anomaly detection on vibration and temperature streams from 120 assets to catch deviations before they escalate to failures.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Configure Detection Parameters', desc: 'Set baseline window (30 days) for each asset and sensor. Configure sensitivity: z-score threshold 3.5 for vibration, 2.8 for temperature.', input: '30-day baseline window, sensitivity thresholds per sensor type', output: 'Baselines computed for 120 assets × 7 sensors. Adaptive thresholds set. High-sensitivity mode enabled for 34 critical assets.' },
          { n: 2, label: 'Run Real-Time Anomaly Scoring', desc: 'Apply Isolation Forest model in streaming mode. Score each incoming sensor reading against baseline. Flag readings exceeding z-score threshold.', input: 'Live sensor stream at 840 readings/sec', output: '3 anomalies detected in last 60 min: Asset 23 vibration (z=4.1), Asset 55 temperature spike (z=3.2), Asset 102 current harmonic (z=3.8). Alerts raised.' },
          { n: 3, label: 'Triage & Route Alerts', desc: 'Classify anomalies by severity and asset criticality. Route to correct team: critical assets to maintenance manager, non-critical to shift supervisor.', input: 'Anomaly alerts + criticality matrix', output: 'Asset 23 (Critical): routed to maintenance manager — bearing inspection today. Assets 55 & 102 (Standard): routed to shift supervisor for monitoring. Dashboard updated.' },
        ],
      },
      {
        id: 'D4', title: 'Downtime Cost Analysis',
        description: 'Calculate and compare the true cost of unplanned vs planned downtime across all assets to build the business case for predictive maintenance investment.',
        difficulty: 'Beginner', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Downtime Records', desc: 'Pull 12 months of downtime events from CMMS. Classify each as planned (PM) or unplanned (breakdown). Record duration, asset, and production line.', input: 'CMMS downtime log: 420 events over 12 months', output: '420 events: 268 planned (PM), 152 unplanned (breakdown). Total downtime: 1,840 hours planned, 690 hours unplanned.' },
          { n: 2, label: 'Calculate Cost Per Hour', desc: 'Apply cost model: unplanned = production loss + emergency labour + expedited parts + quality reject cost. Planned = standard labour + planned parts.', input: 'Downtime hours, cost model parameters', output: 'Planned downtime cost: £380/hour. Unplanned: £1,820/hour (4.8× multiplier). Annual unplanned cost: £1.26M. Annual planned cost: £700K.' },
          { n: 3, label: 'Model PdM Investment ROI', desc: 'Project the expected reduction in unplanned failures if PdM system is deployed (target: 40% reduction). Calculate payback period on £180K investment.', input: 'Unplanned failure reduction target 40%, PdM investment £180K', output: 'Expected saving: £504K/year in reduced unplanned downtime. Payback period: 4.3 months. 5-year NPV: £2.1M. Board presentation deck generated.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Operations', demand: '120 assets, all healthy', modelBehavior: 'LSTM anomaly scoring baseline, PM schedule running', kpiImpact: 'OEE 91%, unplanned downtime < 2%', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Bearing Failure Imminent', demand: 'Asset 23 vibration elevated', modelBehavior: '84% failure probability — CMMS work order auto-created', kpiImpact: 'Failure avoided: £28K downtime cost prevented', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Multiple Simultaneous Alerts', demand: '6 assets above 60% failure probability', modelBehavior: 'Priority queue by criticality score, crew capacity respected', kpiImpact: 'Critical assets serviced first, total cost contained', color: 'var(--accent-danger)' },
    ],
  },

  'shelf-optimization': {
    demos: [
      {
        id: 'D1', title: 'Planogram Optimization',
        description: 'Optimize shelf space allocation across 12 product categories using sales velocity, margin, and brand block principles.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Category Data', desc: 'Import sales velocity, margin, and current facings data for 420 SKUs across the Snacking category. Load planogram constraints: brand block rules, fixture dimensions.', input: 'category_data.csv (420 SKUs), planogram_constraints.json, fixture_dims.json', output: '420 SKUs loaded. Current total facings: 1,840. Avg sales/facing/week: £42. 38 SKUs with 0 sales in last 4 weeks identified.' },
          { n: 2, label: 'Run Space Productivity Analysis', desc: 'Calculate sales per facing and gross margin per facing for each SKU. Rank SKUs by space productivity. Identify over-spaced and under-spaced products.', input: 'Sales, margin, current facings per SKU', output: 'Over-spaced: 62 SKUs (receiving more facings than productivity justifies). Under-spaced: 41 SKUs. Space reallocation opportunity: 180 facings.' },
          { n: 3, label: 'Optimise Facing Allocation', desc: 'Apply LP optimisation to reallocate 180 facings: maximise gross margin per fixture while respecting brand block rules, minimum 1 facing per listed SKU, and fixture capacity.', input: 'Productivity scores, LP constraints', output: 'Optimal planogram: 41 high-productivity SKUs gain facings. 62 low-productivity SKUs reduced. Projected GM increase: +£8,400/week per store.' },
          { n: 4, label: 'Generate Planogram Output', desc: 'Export new planogram as a visual layout file compatible with JDA/Blue Yonder. Include implementation checklist and compliance guide for store teams.', input: 'Optimised facing allocation', output: 'Planogram exported (JDA format). Implementation guide with product position map. Projected GM lift: £8,400/week (+12.4%).' },
        ],
      },
      {
        id: 'D2', title: 'Store Performance Comparison',
        description: 'Compare key shelf and category KPIs across 5 store formats to identify best-practice stores and replicate their shelf strategies.',
        difficulty: 'Beginner', time: '6 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Select Stores & Metrics', desc: 'Choose 5 store formats: Hypermarket, Supermarket, Convenience, Online Fulfilment, Discount. Select KPIs: OSA, planogram compliance, space productivity, category GM.', input: 'Stores: 5 formats × 20 stores each. Period: Q1 2025. KPIs: 4 metrics.', output: 'Comparison set: 100 stores, 4 KPIs, 13-week period. Data loaded.' },
          { n: 2, label: 'Compute Benchmarks', desc: 'Calculate each KPI per format and identify the top-quartile stores within each format. Flag stores below format median as underperformers.', input: 'KPI data for 100 stores', output: 'Supermarkets lead: OSA 97.2%, planogram compliance 89%. Convenience stores lag: OSA 91.4%, compliance 67%. 14 underperforming stores identified.' },
          { n: 3, label: 'Best Practice Extraction', desc: 'Analyse the top-5 stores by composite KPI score. Extract shelf management practices (replenishment frequency, planogram review cycle, display strategy) for replication programme.', input: 'Top-quartile store practices', output: 'Best practice report: daily replenishment check + monthly planogram audit drives 98.1% OSA. Rollout plan to 14 underperforming stores drafted.' },
        ],
      },
      {
        id: 'D3', title: 'Category Assortment Analysis',
        description: 'Identify underperforming products in the Biscuits category for potential delisting, while ensuring no gap in consumer need-state coverage.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Assortment & Sales Data', desc: 'Pull 52-week sales history for all 280 Biscuits SKUs. Load consumer need-state mapping (Health, Indulgence, Kids, Value, Premium) per SKU.', input: 'biscuits_sales_52w.csv (280 SKUs), need_state_map.csv', output: '280 SKUs loaded. Need-states mapped. 42 SKUs with <£200/week across the estate identified as candidates for review.' },
          { n: 2, label: 'Apply Delisting Criteria', desc: 'Score SKUs on: sales velocity, distribution coverage, need-state uniqueness, and buyer margin. Flag SKUs failing 3+ criteria as delisting candidates.', input: 'Velocity, coverage, uniqueness, margin per SKU', output: '28 SKUs meet delisting criteria. Need-state gap check: removing these creates no gap in any of 5 need-states. Buyers notified.' },
          { n: 3, label: 'Project Impact of Delisting', desc: 'Estimate sales transfer rate to remaining SKUs (typically 60–75% for weak lines). Calculate net space freed for range extension or facings uplift.', input: '28 delisting candidates, transfer rate 65%', output: 'Net sales loss: £8,400/week. Transfer to top performers: +£5,460/week. Space freed: 84 facings for high-productivity new listings. Exec summary generated.' },
        ],
      },
      {
        id: 'D4', title: 'Promotion Placement Testing',
        description: 'Test the effectiveness of 3 promotional placement strategies — endcap, shelf, and digital — to identify the highest-ROI mechanic for the Snacking category.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Design Test Groups', desc: 'Assign matched stores to 3 test cells (endcap, shelf highlight, digital screen) and 1 control group. Match stores on size, footfall, and baseline Snacking sales.', input: '40 test stores (10 per cell), 10 control stores. 4-week test. SKU: Protein Bars 6-pack.', output: 'Store groups matched. Baseline sales: £1,840/week/store across all groups (±3%). Test ready.' },
          { n: 2, label: 'Monitor Sales During Test', desc: 'Track weekly sales per store throughout the 4-week test. Apply causal impact framework to isolate placement effect from external factors.', input: 'Weekly POS data for 50 stores, 4 weeks', output: 'Week 4 results: Endcap +62% uplift, Shelf highlight +28%, Digital screen +19%. Control group: +4% (seasonal baseline).' },
          { n: 3, label: 'Calculate Placement ROI', desc: 'Compute incremental gross margin from each placement type. Subtract placement execution cost (fixture, content, labour) to get net ROI.', input: 'Sales uplift, GM%, placement costs', output: 'Endcap ROI: 2.8×. Shelf highlight ROI: 1.9×. Digital ROI: 1.4×. Endcap wins on ROI but requires 3× higher execution cost.' },
          { n: 4, label: 'Rollout Recommendation', desc: 'Recommend optimal placement mix: endcap for hero SKUs, shelf highlight for secondary range. Generate category-wide rollout plan.', input: 'ROI results, store network, budget constraint', output: 'Recommendation: 80 endcap placements for top-5 SKUs, shelf highlight for next 20. Budget: £42K. Projected annual GM uplift: £620K. Approved for rollout.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Shelf Operations', demand: 'OSA 97%, planogram compliant', modelBehavior: 'CV compliance check, space productivity monitoring', kpiImpact: 'GM £8,400/week improvement from optimised planogram', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Promotional Period', demand: 'Endcap display active for hero SKUs', modelBehavior: 'Promo placement tracker, uplift measurement live', kpiImpact: 'Endcap: +62% uplift, ROI 2.8×', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Range Review Season', demand: 'Annual assortment assessment', modelBehavior: 'Delisting model + need-state gap check', kpiImpact: '28 delistings, 84 facings freed for new growth listings', color: 'var(--accent-primary)' },
    ],
  },

  'customer-segmentation': {
    demos: [
      {
        id: 'D1', title: 'RFM Segmentation Analysis',
        description: 'Segment 2.4M customers by Recency, Frequency, and Monetary value to create actionable groups for targeted marketing campaigns.',
        difficulty: 'Beginner', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Compute RFM Scores', desc: 'Calculate R (days since last purchase), F (number of purchases in 12 months), M (total spend in 12 months) for each of the 2.4M customers.', input: 'transaction_history.parquet (2.4M customers, 18M transactions)', output: 'RFM computed for all 2.4M customers. Median: R=42 days, F=4.2 orders, M=£148.' },
          { n: 2, label: 'Apply K-Means Clustering', desc: 'Run K-Means (k=6) on normalised RFM scores. Assign each customer to a segment. Validate cluster stability using silhouette score.', input: 'Normalised RFM matrix (2.4M × 3), k=6', output: 'Silhouette score: 0.68 (good). Segments: Champions 18%, Loyal 22%, Potential 19%, At-Risk 14%, Hibernating 16%, Lost 11%.' },
          { n: 3, label: 'Profile & Activate Segments', desc: 'Generate segment profiles with avg RFM, revenue contribution, and recommended action per segment. Push segments to CRM for campaign activation.', input: 'Cluster labels + transaction data', output: 'Champions: 18% of customers, 42% of revenue. CRM synced. Campaign briefs generated per segment. Email sequences queued.' },
        ],
      },
      {
        id: 'D2', title: 'Churn Prediction Model',
        description: 'Identify at-risk customers using XGBoost churn model and test 3 retention interventions to find the highest-ROI approach.',
        difficulty: 'Intermediate', time: '11 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Feature Engineering', desc: 'Build 64 features per customer: purchase recency, frequency trend, category breadth, promotion sensitivity, complaint history, and engagement score.', input: 'Transaction history, CRM data, loyalty app data (2.4M customers)', output: '64 features computed. Top predictive features: days-since-purchase (importance 0.18), frequency-trend (0.14), complaint-count (0.11).' },
          { n: 2, label: 'Score Churn Model', desc: 'Apply XGBoost model (AUC 0.89 on holdout) to score all 2.4M customers. Assign to risk tiers: High (>70%), Medium (40–70%), Low (<40%).', input: '64-feature matrix, XGBoost churn model v3.2', output: 'High-risk: 186K customers (7.8%). Medium-risk: 420K (17.5%). Low-risk: 1.79M (74.7%). High-risk concentrated in 35–44 age band.' },
          { n: 3, label: 'Test Retention Interventions', desc: 'Randomly assign high-risk customers to 3 intervention arms: personalised email, loyalty bonus, and win-back discount. Run 4-week A/B test.', input: 'High-risk 186K split 3 ways (62K each), 4-week test', output: 'Win-back discount: 34% retention. Loyalty bonus: 28%. Personalised email: 19%. Win-back discount wins — but margin cost: £4.20/customer retained.' },
          { n: 4, label: 'Calculate Retention ROI', desc: 'Compare CLV of retained customers vs intervention cost. Identify the profit-maximising intervention threshold.', input: 'Retention rates, CLV by risk tier, intervention costs', output: 'Win-back ROI: 3.8× for high-CLV customers, 0.9× for low-CLV. Recommendation: apply win-back only to high-CLV high-risk (42K customers). Saving vs blanket approach: £380K.' },
        ],
      },
      {
        id: 'D3', title: 'Customer Lifetime Value (CLV)',
        description: 'Calculate and rank CLV by customer segment to prioritise acquisition spend and retention investment.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Build CLV Model', desc: 'Apply BG/NBD model for purchase frequency and Gamma-Gamma model for monetary value. Predict expected revenue per customer over the next 12 months.', input: 'Transaction history (2.4M customers, 18M transactions), discount rate 10%', output: 'CLV computed for all 2.4M customers. Avg CLV: £214. Top decile CLV: £1,840. Pareto: top 20% of customers = 68% of total predicted CLV.' },
          { n: 2, label: 'Segment by CLV Tier', desc: 'Create 5 CLV tiers: Platinum (>£1,000), Gold (£500–1,000), Silver (£250–500), Bronze (£100–250), Tin (<£100). Map to current RFM segments.', input: 'CLV scores, 5-tier definition', output: 'Platinum: 84K (3.5%), Gold: 210K (8.8%), Silver: 480K (20%), Bronze: 840K (35%), Tin: 786K (32.8%). 60% of Platinum customers in Champions RFM segment.' },
          { n: 3, label: 'Prioritise Acquisition & Retention Spend', desc: 'Calculate max allowable acquisition cost (CAC) per tier based on CLV and target margin. Set retention investment limits per tier.', input: 'CLV by tier, margin target 25%', output: 'Platinum: max CAC £750, retention budget £120/yr. Gold: max CAC £375. Bronze: max CAC £75, retention budget £20/yr. Budgets published to marketing team.' },
        ],
      },
      {
        id: 'D4', title: 'Personalized Campaign Targeting',
        description: 'Target customer segments with tailored offers using next-best-offer model, increasing campaign response rate and reducing irrelevant communications.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Campaign Inventory', desc: 'Input 8 available offers: 3 discount offers, 2 loyalty bonuses, 2 new product trials, 1 VIP event invite. Define eligibility rules per offer.', input: '8 offers, eligibility rules, margin constraints per offer', output: '8 offers loaded. Eligibility matrix computed: avg customer eligible for 3.2 offers. Some offers conflict (can\'t send two discounts to same customer).' },
          { n: 2, label: 'Score Next-Best-Offer', desc: 'Apply collaborative filtering model to predict response probability for each customer-offer pair. Select highest-expected-value offer per customer.', input: 'Response probability model + eligibility matrix (2.4M × 8 offers)', output: 'Best offer assigned to each customer. Predicted avg response rate: 18.4% vs 6.2% for random targeting. Conflict resolution applied.' },
          { n: 3, label: 'Apply Frequency & Fatigue Rules', desc: 'Filter out customers who received a campaign in the last 14 days. Apply opt-out preferences. Final addressable audience: 1.2M.', input: '2.4M scored customers, 14-day suppression list, opt-out list', output: 'Suppressed: 800K (recent contact or opt-out). Final audience: 1.2M customers. 8 audience segments by offer type defined.' },
          { n: 4, label: 'Schedule & Track Campaign', desc: 'Push audiences to email/push/SMS platform. Set up real-time response tracking. Configure A/B hold-out group (10%) for lift measurement.', input: '1.2M customers, 8 offer segments, channel preferences', output: '1.2M communications scheduled. 120K hold-out group configured. Campaign launch: Tuesday 8am. Expected incremental revenue: £840K (12-week attribution).' },
        ],
      },
      {
        id: 'D5', title: 'Basket Analysis',
        description: 'Find frequently co-purchased product pairs to power cross-sell recommendations and improve basket size.',
        difficulty: 'Beginner', time: '6 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Transaction Data & Run Apriori', desc: 'Process 18M transactions using FP-Growth algorithm. Set minimum support = 0.01 (appears in 1% of baskets) and minimum confidence = 0.3.', input: '18M transactions, min support 0.01, min confidence 0.30', output: '1,284 association rules generated. Top rule: {Oat Biscuits} → {Oat Milk}, confidence 0.48, lift 3.2.' },
          { n: 2, label: 'Filter & Rank Rules', desc: 'Filter trivial rules (e.g., product → its own sub-brand). Rank by lift score. Present top-50 rules for merchandising and digital team review.', input: '1,284 rules, lift ranking, trivial rule filter', output: 'Top-50 rules: avg lift 2.8. Top cross-category rule: {Energy Bars} → {Sports Drinks}, lift 4.1. 12 new bundle opportunities identified.' },
          { n: 3, label: 'Implement Recommendations', desc: 'Feed top-50 rules into e-commerce recommendation engine and in-store digital display system. A/B test recommendation placements on app.', input: 'Top-50 rules, e-commerce platform API, in-store display system', output: 'Rules live in recommendation engine. App A/B test launched. Early results: +14% attach rate vs control. Basket size increase: +£1.80 avg.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Week — Retention Campaign', demand: '1.2M customers targeted with personalised offer', modelBehavior: 'Next-best-offer model, suppression rules applied', kpiImpact: 'Response rate 18.4% vs 6.2% random; incremental revenue £840K', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'At-Risk Segment Alert', demand: '186K high-churn-risk customers', modelBehavior: 'Churn model AUC 0.89, win-back discount triggered for high-CLV', kpiImpact: 'Retention ROI 3.8× for Platinum tier', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'RFM Refresh (Quarterly)', demand: '2.4M customers re-segmented', modelBehavior: 'K-Means k=6, silhouette 0.68, CRM sync automated', kpiImpact: 'Champions: 18% of customers drive 42% of revenue', color: 'var(--accent-primary)' },
    ],
  },

  'revenue-forecasting': {
    demos: [
      {
        id: 'D1', title: 'Revenue Forecast by Channel',
        description: 'Forecast 12-month revenue across retail, e-commerce, and wholesale channels using driver-based models and macro indicators.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Financial & Driver Data', desc: 'Import 3 years of monthly revenue by channel, and key business drivers: volume, price, distribution, promotions, and consumer confidence index.', input: 'monthly_revenue_36m.csv (3 channels), driver_data.csv (12 drivers)', output: 'Data loaded. Retail: 58% of revenue, E-com: 24%, Wholesale: 18%. Driver correlations computed. Price index: highest correlation (0.82).' },
          { n: 2, label: 'Build Driver-Based Models', desc: 'Fit separate regression models per channel linking revenue to drivers. Validate with 6-month holdout: all channels within 4% MAPE.', input: 'Revenue history + driver data, 6-month holdout validation', output: 'Model accuracy: Retail MAPE 2.8%, E-com MAPE 3.4%, Wholesale MAPE 4.1%. All within 5% target. Models approved.' },
          { n: 3, label: 'Generate 12-Month Forecast', desc: 'Apply agreed driver assumptions for the next 12 months (from S&OP consensus). Generate P10/P50/P90 revenue scenarios per channel.', input: 'Driver assumptions from S&OP, 3 probability scenarios', output: 'P50 forecast: Retail £142M, E-com £68M, Wholesale £44M. Total: £254M. P90 upside: £271M. P10 downside: £238M.' },
          { n: 4, label: 'Variance Commentary & Dashboard', desc: 'Auto-generate variance commentary comparing forecast to prior year and budget. Publish to CFO dashboard. Alert if any channel deviates >5% from budget.', input: 'New forecast vs budget, prior year actuals', output: 'Dashboard updated. E-com +12% vs budget (positive). Wholesale -6% vs budget (alert raised). CFO narrative generated automatically.' },
        ],
      },
      {
        id: 'D2', title: 'Profitability Analysis by SKU',
        description: 'Identify margin-negative SKUs and quantify the revenue and profitability impact of discontinuing or reformulating them.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Full P&L by SKU', desc: 'Allocate direct and indirect costs to each SKU using activity-based costing. Compute net margin % per SKU after trade spend, logistics, and production costs.', input: 'Revenue and cost data for 3,200 SKUs (activity-based cost allocation)', output: '3,200 SKUs fully costed. 218 SKUs showing negative net margin (avg -4.2%). Total value of margin-negative SKUs: £8.4M revenue, -£354K net margin.' },
          { n: 2, label: 'Segment by Action', desc: 'Classify the 218 margin-negative SKUs into 3 groups: reformulate (cost reduction feasible), reprice (volume elastic, price increase viable), discontinue (neither feasible).', input: '218 SKUs, reformulation cost estimates, price elasticity scores', output: 'Reformulate: 82 SKUs (potential saving £180K). Reprice: 67 SKUs (potential uplift £140K). Discontinue: 69 SKUs (margin drag £214K eliminated).' },
          { n: 3, label: 'Impact Simulation & Report', desc: 'Model the P&L impact of implementing all 3 actions: revenue change from discontinuations (volume transfer assumption 55%), cost savings from reformulation.', input: 'Action plans for 218 SKUs, volume transfer rate 55%', output: 'Net P&L improvement: +£468K/year. Revenue impact: -£3.8M (transfer rate applied). Margin % improvement: +0.4pp. Executive brief generated.' },
        ],
      },
      {
        id: 'D3', title: 'Cost Allocation Simulation',
        description: 'Simulate the financial impact of changing the cost allocation methodology from revenue-based to activity-based to reveal true product-line profitability.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Define Allocation Methodologies', desc: 'Configure 2 allocation methods: current revenue-based (overheads split proportional to revenue) and proposed activity-based (overheads split by actual resource consumption).', input: 'Overhead cost pool £42M, current revenue-based allocation, proposed activity drivers', output: 'Two methods configured. Revenue-based: simplistic. Activity-based uses 8 cost drivers (machine hours, orders, SKU count, storage volume).' },
          { n: 2, label: 'Apply Both Methods to All SKUs', desc: 'Allocate £42M overhead pool to all 3,200 SKUs under both methodologies. Compute the cost delta per SKU.', input: '£42M overhead pool, 8 activity drivers, 3,200 SKUs', output: 'Largest winners from ABC: 420 high-volume, low-complexity SKUs (avg overhead down 18%). Biggest losers: 180 low-volume, high-complexity SKUs (avg overhead up 34%).' },
          { n: 3, label: 'Identify Profitability Shifts', desc: 'Find SKUs that flip from profitable to loss-making (or vice versa) under the new methodology. These represent the biggest risks and opportunities.', input: 'Margin per SKU under both methods', output: '84 SKUs flip from profitable to loss-making under ABC. 61 SKUs move from loss-making to profitable. Net profitability picture materially different for Premium range.' },
          { n: 4, label: 'Generate Stakeholder Report', desc: 'Build a before-after P&L bridge by product line, highlighting the SKUs and categories most affected by the allocation change.', input: 'Per-SKU margin under both methods, product hierarchy', output: 'P&L bridge report generated: Premium range profitability drops from 12% to 6% under ABC. Standard range improves from 8% to 11%. CFO review scheduled.' },
        ],
      },
      {
        id: 'D4', title: 'Budget vs Actual Variance Analysis',
        description: 'Analyse YTD budget variances by channel and product line, automatically generating root cause commentary using LLM-powered narrative engine.',
        difficulty: 'Beginner', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Actuals & Budget', desc: 'Import YTD actuals from ERP and annual budget. Compute variance in absolute and percentage terms by channel, product line, and cost category.', input: 'YTD actuals from ERP, annual budget (both in £K by month × category)', output: 'YTD total variance: +£4.2M favourable (revenue) and -£1.8M adverse (costs). 14 line items with variance > ±5% of budget.' },
          { n: 2, label: 'Identify Key Drivers', desc: 'Apply attribution analysis to decompose revenue variance into price, volume, and mix effects. Decompose cost variance into rate and efficiency effects.', input: 'Revenue and cost variance by line item', output: 'Revenue +£4.2M: volume +£3.1M, price +£1.8M, mix -£0.7M. Cost -£1.8M: raw material inflation -£2.4M, efficiency savings +£0.6M.' },
          { n: 3, label: 'Auto-Generate Variance Commentary', desc: 'LLM reads the variance attribution data and generates a structured CFO commentary pack in business language, ready for board review.', input: 'Variance attribution data, LLM narrative model', output: 'Commentary pack generated: 6-page PDF with waterfall charts and narrative. Prepared in 4 minutes vs 2 days manual. Ready for board pack.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'On-Track Budget Month', demand: 'Revenue within ±2% of budget', modelBehavior: 'Driver model scoring, auto-variance commentary', kpiImpact: 'Zero escalations, CFO dashboard green', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Revenue Underperformance', demand: 'Wholesale channel -8% vs budget', modelBehavior: 'Alert triggered, attribution: volume −6%, mix −2%', kpiImpact: 'Root cause identified in 4 min; action plan drafted', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Annual Range Review', demand: '218 margin-negative SKUs under review', modelBehavior: 'ABC cost model, reformulate/reprice/discontinue classification', kpiImpact: 'Net P&L improvement +£468K/year projected', color: 'var(--accent-primary)' },
    ],
  },

  'supplier-scoring': {
    demos: [
      {
        id: 'D1', title: 'Supplier Risk Scoring',
        description: 'Score all 340 active suppliers on quality, delivery, cost, and compliance dimensions to create a consolidated risk heat map.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Supplier Performance Data', desc: 'Ingest 12 months of quality (defect PPM), delivery (OTIF%), cost (price variance%), and compliance (audit score%) data for all 340 suppliers.', input: 'supplier_performance_12m.csv (340 suppliers × 4 KPI dimensions)', output: '340 suppliers loaded. Avg OTIF: 91.2%. Avg quality defect PPM: 480. 42 suppliers with missing compliance audit data — flagged.' },
          { n: 2, label: 'Apply Weighted Scoring Model', desc: 'Apply weights: Quality 35%, Delivery 30%, Cost 20%, Compliance 15%. Normalise each dimension to 0–100. Compute composite supplier score.', input: 'KPI data, weight config (Quality 35%, Delivery 30%, Cost 20%, Compliance 15%)', output: 'Composite scores: Green (70–100): 198 suppliers. Amber (50–70): 98 suppliers. Red (<50): 44 suppliers. 42 missing-audit flagged separately.' },
          { n: 3, label: 'Identify High-Risk Suppliers', desc: 'Drill into the 44 Red-rated suppliers. Cross-reference with spend and sole-source flag to prioritise intervention. Alert procurement for top 10 critical-risk suppliers.', input: '44 Red suppliers, spend data, sole-source flag', output: 'Top 10 critical: Red-rated AND sole-source AND annual spend > £1M. Procurement manager alerted. Contingency sourcing review initiated for 3 sole-source reds.' },
          { n: 4, label: 'Generate Supplier Scorecards', desc: 'Auto-generate individual supplier scorecards as PDF for supplier review meetings. Include 12-month trend and benchmark vs category peers.', input: 'Score data, 12-month trend, peer benchmark', output: '340 scorecards generated. Sent to respective category managers. 44 Red suppliers scheduled for review meeting within 30 days.' },
        ],
      },
      {
        id: 'D2', title: 'Contract Analysis with NLP',
        description: 'Extract key terms, pricing clauses, and risk provisions from 120 supplier contracts using LegalBERT NLP, reducing manual review time by 70%.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Ingest & OCR Contract Documents', desc: 'Upload 120 supplier contracts (mix of PDF, Word, and scanned). Apply OCR to scanned documents. Segment into clauses using structural NLP parser.', input: '120 contracts: 84 PDF, 22 Word, 14 scanned. Avg 42 pages each.', output: '120 contracts ingested. 14 scanned documents OCR-processed (avg confidence 94%). 5,040 clauses identified and segmented.' },
          { n: 2, label: 'Extract Key Terms via LegalBERT', desc: 'Run LegalBERT extraction model to identify and classify: pricing terms, payment terms, liability caps, termination clauses, renewal dates, and exclusivity provisions.', input: '5,040 clauses, LegalBERT extraction model v2.1', output: 'Extracted: 340 pricing clauses, 280 payment terms, 98 liability caps, 120 termination clauses, 120 renewal dates, 42 exclusivity provisions.' },
          { n: 3, label: 'Flag Risk Provisions', desc: 'Compare extracted terms against risk library: uncapped liability, auto-renewal without notice, or unilateral price change rights. Flag contracts with high-risk provisions.', input: 'Extracted terms, risk provision library (28 risk patterns)', output: '18 contracts with uncapped liability. 24 with auto-renewal requiring 90-day notice. 8 with unilateral price change rights. 31% of contracts have at least one high-risk flag.' },
          { n: 4, label: 'Obligation Calendar & Summary', desc: 'Build renewal calendar for all 120 contracts. Generate executive summary for procurement head. Create 90-day alert schedule for upcoming renewals.', input: '120 renewal dates, 90-day alert config', output: 'Renewal calendar built: 28 contracts renewing in next 90 days. Alerts scheduled. Executive summary: 8-page PDF with risk matrix. Saved 3 analyst-weeks of manual review.' },
        ],
      },
      {
        id: 'D3', title: 'Spend Analysis Dashboard',
        description: 'Analyse £280M of procurement spend by category and supplier to uncover consolidation opportunities and maverick spend.',
        difficulty: 'Beginner', time: '7 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Classify Spend via NLP', desc: 'Run 180K purchase order lines through BERT-based spend classifier. Assign each line to UNSPSC taxonomy (4-level hierarchy). Flag lines with low confidence.', input: '180K PO lines (£280M total spend), BERT classifier + UNSPSC taxonomy', output: '94.2% classified with confidence >80%. 5.8% (10,440 lines, £8.2M) flagged for manual review. Top category: Raw Materials £92M (33%).' },
          { n: 2, label: 'Identify Consolidation Opportunities', desc: 'Find categories where spend is fragmented across many suppliers. Compute Herfindahl Index per category. Flag categories where top 3 suppliers hold <50% of spend.', input: 'Classified spend, Herfindahl Index calculation', output: '14 categories with fragmented spend identified. Office Supplies: 28 suppliers, top-3 hold 31%. Consolidation to 5 suppliers could save £420K/year.' },
          { n: 3, label: 'Maverick Spend Detection', desc: 'Identify purchases made outside approved supplier list or without PO. Flag by value, category, and department. Report to CPO.', input: 'PO data vs approved supplier master', output: 'Maverick spend: £4.8M (1.7% of total). Top 3 departments: Facilities (£1.8M), IT (£1.2M), Marketing (£0.9M). CPO report with corrective action plan generated.' },
        ],
      },
      {
        id: 'D4', title: 'Vendor Performance Benchmarking',
        description: 'Benchmark key logistics vendors on OTIF, damage rate, and cost per unit to support the annual contract renegotiation.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Delivery & Cost Data', desc: 'Pull 90-day delivery records for 8 logistics vendors. Extract OTIF%, damage rate per 1,000 units, cost per unit delivered, and tracking accuracy.', input: 'delivery_data_90d.csv (8 vendors, 48,000 deliveries)', output: '48,000 delivery records. Vendor OTIF range: 84–97%. Damage rate range: 0.2–1.8 per 1,000. Cost per unit: £1.80–£3.40.' },
          { n: 2, label: 'Compute Benchmark Scores', desc: 'Weight metrics: OTIF 40%, Cost 35%, Damage rate 15%, Tracking 10%. Compute composite benchmark score. Rank vendors.', input: 'Performance data, weight config', output: 'Rankings: Vendor C first (88/100), Vendor A second (84/100), Vendor F third (79/100). Vendor D last (61/100) — high damage rate (1.8/1,000).' },
          { n: 3, label: 'Generate Negotiation Brief', desc: 'For bottom-3 vendors, build a data-backed negotiation brief: show their performance gap vs best-in-class and quantify the business cost of underperformance.', input: 'Vendor D, E, G performance gaps vs Vendor C benchmark', output: 'Vendor D cost of damage: £84K/year above Vendor C baseline. Negotiation brief: improve damage rate to 0.5 within 90 days or volume reallocation. PDF brief exported.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Standard Supplier Review', demand: '340 suppliers scored monthly', modelBehavior: 'Weighted composite scoring, automatic scorecard generation', kpiImpact: '44 Red suppliers identified, 3 sole-source reviews initiated', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Supplier Disruption Risk', demand: 'Red-rated supplier is sole source for key ingredient', modelBehavior: 'Risk flag + contingency sourcing trigger activated', kpiImpact: 'Alternate supplier qualified in 3 weeks, risk mitigated', color: 'var(--accent-danger)' },
      { id: 'SC3', label: 'Annual Contract Renegotiation', demand: '8 logistics vendors benchmarked', modelBehavior: 'Composite benchmark, negotiation brief generated', kpiImpact: 'Target: 12% cost reduction, damage rate halved', color: 'var(--accent-warning)' },
    ],
  },

  'defect-detection': {
    demos: [
      {
        id: 'D1', title: 'Image-Based Defect Detection',
        description: 'Run CNN classification on product images from 4 production lines to detect scratches, deformations, and label misapplication in real time.',
        difficulty: 'Advanced', time: '11 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Configure Camera & Pipeline', desc: 'Connect 4 high-speed cameras (120 fps) on production lines. Calibrate image preprocessing: crop ROI, normalise brightness, resize to 640×640.', input: '4 cameras at 120 fps, ROI configuration, lighting calibration', output: '4 cameras live. Image quality score > 92% on all lanes. Frame rate confirmed at 118 fps (within spec). Pipeline ready.' },
          { n: 2, label: 'Run YOLO Inference', desc: 'Apply YOLOv8 model (trained on 24,000 labelled defect images) to each frame. Classify defect type and draw bounding box. Decision in < 8ms per frame.', input: 'Live camera frames, YOLOv8 model v4.1 (24K training images)', output: 'Inference latency: 6.2ms avg. Accuracy on validation set: 99.1%. Lane 3: 2 defects detected in last 60 seconds (label offset).' },
          { n: 3, label: 'Trigger Rejection Mechanism', desc: 'Defective unit triggers pneumatic reject arm within 120ms of detection. Defect image and metadata logged to quality database.', input: 'Defect classification + reject arm timing', output: '2 units rejected on Lane 3. Rejection latency: 84ms. Quality log updated. Production supervisor notified of label offset pattern.' },
          { n: 4, label: 'Quality Dashboard & Trend', desc: 'Real-time dashboard shows defect rate per lane, defect type breakdown, and trend over shift. Alert if defect rate exceeds 0.5% in any 10-minute window.', input: 'Defect log (shift data)', output: 'Lane 3 defect rate: 0.12% (below threshold). Shift summary: 42,000 units inspected, 51 defects detected, 51 rejected. 0 false positives this shift.' },
        ],
      },
      {
        id: 'D2', title: 'Batch Quality Scoring',
        description: 'Score entire production batches on multiple quality dimensions using in-process and end-of-line measurements to produce a single quality index.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Aggregate Batch Measurements', desc: 'Collect all quality measurements for Batch B2204: in-process (pH, viscosity, temperature profile) and end-of-line (weight, dimensions, appearance score). Combine into a single batch record.', input: 'In-process: 14 measurements × 5 checkpoints. End-of-line: 200 unit sample.', output: 'Batch B2204 record: 70 in-process readings, 200 end-of-line measurements. All data validated and aligned to batch ID.' },
          { n: 2, label: 'Compute Quality Index', desc: 'Apply weighted quality index formula (in-process 40%, end-of-line 60%). Normalise each dimension. Compute composite batch quality score (0–100).', input: 'Aggregated batch measurements, weight config', output: 'Batch B2204 Quality Index: 87.4/100 (threshold: 80). Status: PASS. Dimension breakdown: in-process 91.2, end-of-line 85.1.' },
          { n: 3, label: 'Release Decision & Certificate', desc: 'System auto-approves batches scoring > 80. Generates Certificate of Quality with lot number, test results, and release timestamp. Pushes to ERP for dispatch.', input: 'Quality index 87.4, release threshold 80', output: 'Batch B2204 RELEASED. CoQ generated (PDF). ERP dispatch record created. Time from batch completion to release decision: 12 minutes (vs 4 hours manual).' },
        ],
      },
      {
        id: 'D3', title: 'Root Cause Analysis',
        description: 'Trace recurring defects back to specific production parameters using causal analysis to identify and fix the upstream cause.',
        difficulty: 'Advanced', time: '13 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Identify Defect Pattern', desc: 'Review last 30 days of defect data. Identify that Lane 2 has 3× higher label-offset rate than other lanes (0.41% vs 0.14% avg).', input: 'Defect log: 30 days, all lanes, all defect types', output: 'Lane 2 label-offset rate: 0.41%. Statistically significant vs other lanes (p < 0.001). Defect concentrated in shift 2 (6pm–2am).' },
          { n: 2, label: 'Correlate with Process Parameters', desc: 'Pull all Lane 2 process parameters for the last 30 days. Apply Pearson and Spearman correlation to find parameters correlated with label-offset events.', input: 'Lane 2 defect timestamps, process parameters (18 variables)', output: 'Top correlation: label applicator temperature (r=0.72). Secondary: line speed at >940 units/min (r=0.58). No significant correlation with operator or raw material batch.' },
          { n: 3, label: 'Confirm Causal Hypothesis', desc: 'Run a 1-week controlled test: hold label applicator temperature at 62°C (vs variable 55–68°C). Compare defect rate before and after.', input: 'Controlled test: temperature fixed at 62°C, 1 week', output: 'Label-offset rate during test: 0.08% (vs 0.41% baseline). Reduction: 80%. Causal link confirmed. Root cause: temperature variance in applicator heating element.' },
          { n: 4, label: 'Implement Fix & Verify', desc: 'Issue CAPA: replace faulty heating element thermostat on Lane 2. Verify fix by monitoring defect rate for 2 weeks post-repair.', input: 'CAPA: thermostat replacement, 2-week monitoring', output: 'Post-repair defect rate: 0.09% (within control limit). CAPA closed. £28K annual scrap reduction projected. Corrective action logged in quality system.' },
        ],
      },
      {
        id: 'D4', title: 'SPC Control Charts',
        description: 'Set up Statistical Process Control monitoring on 6 critical quality parameters to detect process drift before specification violations occur.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Configure Control Charts', desc: 'Define control charts for 6 key parameters: weight (X-bar/R), fill volume (X-bar/S), pH (individuals), seal integrity (p-chart), label position (X-bar/R), and appearance (c-chart).', input: '6 parameters, historical data for UCL/LCL calculation (minimum 25 subgroups)', output: '6 control charts configured. UCL/LCL set from 3-sigma limits. Weight chart: LCL 98.2g, UCL 101.8g (target 100g). Charts active.' },
          { n: 2, label: 'Run Real-Time SPC Monitoring', desc: 'Plot each new measurement in real time. Apply Western Electric rules to detect non-random patterns: 8 consecutive points same side of mean, 2 of 3 beyond 2-sigma, etc.', input: 'Live measurement stream, Western Electric rules configured', output: 'pH parameter: 7 consecutive points above mean (Rule 1 trigger). Alert raised. No spec violation yet, but drift pattern detected. Operator notified.' },
          { n: 3, label: 'Generate Cpk Report', desc: 'Calculate process capability (Cpk) for all 6 parameters. Flag any with Cpk < 1.33 as requiring process improvement. Generate shift Cpk trend report.', input: 'Measurement data for current shift, spec limits', output: 'Weight Cpk: 1.62 (excellent). pH Cpk: 1.28 (below 1.33 threshold — flagged). Seal integrity Cpk: 1.44. Cpk report emailed to quality manager.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Normal Production Shift', demand: '42,000 units inspected, defect rate 0.12%', modelBehavior: 'YOLOv8 real-time, 6.2ms latency, all lanes active', kpiImpact: '51 defects caught, 0 escapes, 0 false positives', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Recurring Defect Pattern', demand: 'Lane 2 label-offset 3× above average', modelBehavior: 'Root cause correlation analysis, controlled test designed', kpiImpact: '80% defect reduction after thermostat fix, £28K scrap saving', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Process Drift Alert', demand: 'pH 7 consecutive points above mean', modelBehavior: 'SPC Western Electric rule 1 triggered, early warning', kpiImpact: 'Spec violation prevented, corrective action before product loss', color: 'var(--accent-danger)' },
    ],
  },

  'compliance-monitoring': {
    demos: [
      {
        id: 'D1', title: 'Regulatory Compliance Audit',
        description: 'Run an automated compliance check of all 3,200 active product SKUs against the latest EU and UK food labelling regulations.',
        difficulty: 'Intermediate', time: '10 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Load Regulatory Requirements', desc: 'Pull current regulatory rules from the compliance knowledge base: EU FIC 1169/2011, UK retained law, 14 major allergen declaration rules, and country-specific labelling requirements.', input: 'Regulatory knowledge base: 840 rules across 12 regulatory frameworks', output: '840 rules loaded and structured. 14 allergen rules flagged as mandatory. Knowledge base last updated: 48 hours ago.' },
          { n: 2, label: 'Check Products Against Rules', desc: 'Run each of the 3,200 SKUs against all applicable rules. Use RAG model to match product attributes (ingredients, label text, country of sale) to regulatory requirements.', input: '3,200 SKUs × product master data, RAG compliance model', output: '3,200 SKUs checked. 3,126 fully compliant. 74 with violations: 42 allergen declaration issues, 18 nutrition labelling gaps, 14 country-specific label violations.' },
          { n: 3, label: 'Prioritise Violations by Risk', desc: 'Score violations by severity: allergen errors (Critical), nutrition labelling (High), formatting (Medium). Generate remediation tasks per violation.', input: '74 violations, severity matrix', output: 'Critical: 42 allergen violations (immediate recall risk). High: 18. Medium: 14. 42 critical violations escalated to regulatory affairs team. Remediation tasks created.' },
          { n: 4, label: 'Generate Audit Report', desc: 'Produce a full compliance audit report with violation details, affected markets, remediation plan, and regulatory risk exposure. Export for regulatory affairs team.', input: '74 violations, remediation tasks, regulatory risk assessment', output: 'Audit report generated: 28-page PDF. 42 critical violations with specific remediation steps. Regulatory risk exposure quantified. Submitted to regulatory affairs in 18 minutes.' },
        ],
      },
      {
        id: 'D2', title: 'Data Governance Health Check',
        description: 'Scan all registered data assets for quality, ownership, and policy compliance to produce a data governance health score.',
        difficulty: 'Intermediate', time: '9 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Inventory Data Assets', desc: 'Scan data catalogue for all registered assets: tables, dashboards, APIs, and ML models. Check each for owner, classification, retention policy, and last quality check date.', input: 'Data catalogue: 840 registered assets', output: '840 assets scanned. 184 with no declared owner. 92 missing data classification. 220 with quality check > 90 days old. 344 assets flagged.' },
          { n: 2, label: 'Apply Governance Scoring', desc: 'Score each asset on 5 dimensions: ownership (20%), classification (20%), quality (25%), lineage (20%), retention policy (15%). Compute composite governance score.', input: '840 assets × 5 governance dimensions', output: 'Avg governance score: 62/100. Platinum (>90): 98 assets. Silver (70–90): 312 assets. At-Risk (<50): 184 assets. Critical systems (finance, compliance) avg 81/100.' },
          { n: 3, label: 'Generate Action Plan', desc: 'For the 184 At-Risk assets, auto-assign owners based on last known responsible team, generate data quality tasks, and set 30-day remediation deadline.', input: '184 at-risk assets, ownership assignment rules', output: '184 remediation tasks created. 184 owners auto-assigned (with email notification). 30-day deadline set. CDO dashboard updated with health score 62/100.' },
        ],
      },
      {
        id: 'D3', title: 'Risk Assessment Matrix',
        description: 'Score and rank operational risks across 8 business units to produce a company-wide risk heat map for the board.',
        difficulty: 'Advanced', time: '12 min', stepsCount: 4, status: 'Ready',
        steps: [
          { n: 1, label: 'Collect Risk Register Inputs', desc: 'Pull risk entries from 8 business unit risk registers. Standardise format (risk description, likelihood 1–5, impact 1–5, current controls, risk owner).', input: '8 risk registers: 420 total risk entries', output: '420 risks loaded and standardised. 84 duplicates across units consolidated. Final unique risk count: 336.' },
          { n: 2, label: 'Apply Scoring Model', desc: 'Compute inherent risk score (likelihood × impact). Apply control effectiveness rating (0–100%) to compute residual risk. Map to company risk appetite thresholds.', input: '336 risks, inherent scores, control effectiveness ratings', output: 'Red (above appetite): 28 risks. Amber (near appetite): 84 risks. Green: 224 risks. Top risk: "Single-source supplier for key raw material" — inherent 20, residual 14.' },
          { n: 3, label: 'Build Risk Heat Map', desc: 'Render 5×5 heat map of residual risks. Annotate top-10 risks with ownership and current mitigation status. Identify emerging risk clusters by category.', input: '336 residual risk scores, heat map layout', output: 'Heat map generated. Top cluster: Supply Chain (8 of top-20 risks). Operational Technology cluster emerging (5 new risks this quarter vs 1 last quarter).' },
          { n: 4, label: 'Board Report Package', desc: 'Generate board risk report: executive summary, heat map, top-10 risk profiles with mitigations, and trend vs prior quarter.', input: 'Risk heat map, trend data, mitigation status', output: 'Board report: 14-page PDF. Top-10 risks with owners and RAG status. Quarter-on-quarter trend: supply chain risk down (2 red → amber), OT risk up (2 green → amber). Ready for board.' },
        ],
      },
      {
        id: 'D4', title: 'Audit Trail Verification',
        description: 'Verify the completeness and integrity of the model change audit trail for all AI models deployed in the last 12 months.',
        difficulty: 'Intermediate', time: '8 min', stepsCount: 3, status: 'Ready',
        steps: [
          { n: 1, label: 'Extract Model Change Log', desc: 'Pull all model change events from the model registry for the last 12 months: version increments, hyperparameter changes, dataset updates, and deployment events.', input: 'Model registry API: 48 models × 12-month change history', output: '48 models, 384 change events extracted. Expected: 1 approval record per deployment event. Checking completeness.' },
          { n: 2, label: 'Check Completeness & Integrity', desc: 'For each change event, verify: approval sign-off exists, test results are attached, data lineage is recorded, and rollback plan is documented.', input: '384 change events, completeness checklist (4 requirements each)', output: '1,536 checks performed. 1,488 passed. 48 gaps found: 22 missing test result attachments, 18 missing rollback plans, 8 missing data lineage records.' },
          { n: 3, label: 'Generate Compliance Report', desc: 'Produce audit trail compliance report showing completeness rate, gap details, model-level breakdown, and remediation deadlines.', input: '48 gaps across 384 change events', output: 'Completeness rate: 96.9% (target: 100%). 14 models with gaps — remediation tasks created. Report submitted to AI Governance Board. 30-day remediation window set.' },
        ],
      },
    ],
    scenarios: [
      { id: 'SC1', label: 'Routine Compliance Monitoring', demand: '3,200 SKUs checked weekly', modelBehavior: 'RAG compliance model, automatic rule updates within 48 hours', kpiImpact: '74 violations found and remediated, 0 regulatory breaches', color: 'var(--accent-success)' },
      { id: 'SC2', label: 'Regulatory Change Alert', demand: 'New allergen declaration rule published', modelBehavior: 'NLP change detector flags, compliance re-check triggered for affected SKUs', kpiImpact: 'All affected SKUs identified in 2 hours, remediation plan issued', color: 'var(--accent-warning)' },
      { id: 'SC3', label: 'Board Risk Review', demand: '336 risks across 8 BUs assessed', modelBehavior: 'Risk scoring model, heat map generation, trend analysis', kpiImpact: 'Top-10 risks with owners presented, OT risk cluster flagged', color: 'var(--accent-primary)' },
    ],
  },
};

/* =========================================================
   CATALOG METADATA — used by the Demo Catalog section
   ========================================================= */

const CATALOG_META = {
  'Sales & Demand': { processId: 'demand-forecasting', color: 'var(--accent-primary)' },
  'Supply Chain': { processId: 'inventory-optimization', color: 'var(--accent-success)' },
  'Logistics': { processId: 'route-optimization', color: 'var(--accent-warning)' },
  'Manufacturing': { processId: 'production-planning', color: 'var(--accent-purple)' },
  'Maintenance': { processId: 'predictive-maintenance', color: 'var(--accent-danger)' },
  'Retail': { processId: 'shelf-optimization', color: '#f59e0b' },
  'Customer Analytics': { processId: 'customer-segmentation', color: '#06b6d4' },
  'Finance': { processId: 'revenue-forecasting', color: '#8b5cf6' },
  'Procurement': { processId: 'supplier-scoring', color: '#ec4899' },
  'Quality Control': { processId: 'defect-detection', color: '#10b981' },
  'Governance': { processId: 'compliance-monitoring', color: '#6366f1' },
};

const FEATURED_DEMOS = [
  { dept: 'Sales & Demand', demoId: 'D1', title: 'Predict 30-Day Demand', reason: 'End-to-end ML pipeline — most impactful starting point', color: 'var(--accent-primary)' },
  { dept: 'Maintenance', demoId: 'D1', title: 'Equipment Failure Prediction', reason: 'Predict failures 7 days ahead — highest ROI use case in CPG', color: 'var(--accent-danger)' },
  { dept: 'Customer Analytics', demoId: 'D2', title: 'Churn Prediction Model', reason: 'Identifies at-risk customers before they leave — direct revenue impact', color: '#06b6d4' },
  { dept: 'Manufacturing', demoId: 'D1', title: 'Batch Scheduling Optimizer', reason: 'GA-powered scheduler cuts changeover by 26% — fast wins on OEE', color: 'var(--accent-purple)' },
  { dept: 'Quality Control', demoId: 'D3', title: 'Root Cause Analysis', reason: 'Traces defects to process parameters — eliminates repeat failures', color: '#10b981' },
];

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

const DIFFICULTY_COLORS = {
  Beginner: 'var(--accent-success)',
  Intermediate: 'var(--accent-warning)',
  Advanced: 'var(--accent-danger)',
};

const STATUS_COLORS = {
  Ready: 'var(--accent-success)',
  'Coming Soon': 'var(--text-muted)',
};

function DifficultyBadge({ level }) {
  const color = DIFFICULTY_COLORS[level] || 'var(--text-muted)';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>{level}</span>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'var(--text-muted)';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>{status === 'Ready' ? '✓ ' : '⏳ '}{status}</span>
  );
}

function DemoCard({ demo, isSelected, onClick }) {
  const isReady = demo.status === 'Ready';
  return (
    <div
      onClick={isReady ? onClick : undefined}
      style={{
        padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        background: isSelected ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
        cursor: isReady ? 'pointer' : 'not-allowed',
        opacity: isReady ? 1 : 0.6,
        boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.15)' : 'var(--shadow-card)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{demo.id}</span>
        <StatusBadge status={demo.status} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginBottom: 6 }}>{demo.title}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{demo.description}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <DifficultyBadge level={demo.difficulty} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⏱ {demo.time}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📋 {demo.stepsCount} steps</span>
      </div>
      {isReady && (
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--accent-primary)', fontWeight: 600 }}>
          {isSelected ? '▲ Collapse details' : '▼ View walkthrough'}
        </div>
      )}
    </div>
  );
}

function DemoDetail({ demo }) {
  const [running, setRunning] = useState(false);
  const [doneStep, setDoneStep] = useState(0);

  function handleRun() {
    if (running) return;
    setRunning(true);
    setDoneStep(0);
    const total = demo.steps.length;
    let i = 0;
    const tick = () => {
      i++;
      setDoneStep(i);
      if (i < total) setTimeout(tick, 900);
      else setRunning(false);
    };
    setTimeout(tick, 600);
  }

  return (
    <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--accent-primary)', background: 'rgba(59,130,246,0.04)', marginTop: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
          {demo.id}: {demo.title}
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius)', border: 'none',
            background: running ? 'var(--bg-hover)' : 'var(--accent-primary)',
            color: running ? 'var(--text-muted)' : '#fff',
            fontWeight: 700, fontSize: 'var(--font-size-xs)', cursor: running ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {running ? '⏳ Running…' : '▶ Run Demo'}
        </button>
      </div>

      {/* Step-by-step */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {demo.steps.map((step) => {
          const isComplete = doneStep >= step.n;
          const isActive = running && doneStep === step.n - 1;
          const canRunIndividually = !running && doneStep === step.n - 1;
          return (
            <div
              key={step.n}
              style={{
                borderRadius: 'var(--border-radius)',
                background: isComplete ? 'rgba(16,185,129,0.07)' : isActive ? 'rgba(59,130,246,0.08)' : 'var(--bg-hover)',
                border: `1px solid ${isComplete ? 'rgba(16,185,129,0.25)' : isActive ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                transition: 'all 0.3s',
                overflow: 'hidden',
              }}
            >
              {/* Step header row */}
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isComplete ? 'var(--accent-success)' : isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                  color: isComplete || isActive ? '#fff' : 'var(--text-muted)',
                  fontWeight: 800, fontSize: 12,
                }}>
                  {isComplete ? '✓' : step.n}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: isComplete ? 'var(--accent-success)' : isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    Step {step.n}: {step.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
                </div>

                {/* Individual Run button */}
                {canRunIndividually && (
                  <button
                    onClick={() => {
                      setRunning(true);
                      setTimeout(() => { setDoneStep(step.n); setRunning(false); }, 900 + Math.random() * 800);
                    }}
                    style={{
                      padding: '5px 14px', border: 'none', borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--accent-primary)', color: '#fff', fontSize: 'var(--font-size-xs)',
                      fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    ▶ Run Step
                  </button>
                )}
                {isActive && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary)', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⏳</span> Running...
                  </div>
                )}
                {isComplete && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', fontWeight: 600, flexShrink: 0 }}>✓ Done</span>
                )}
              </div>

              {/* Expanded Input → Process → Output panel */}
              {isComplete && (
                <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)', marginTop: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {/* INPUT */}
                    <div style={{ padding: '8px 10px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4, letterSpacing: '0.05em' }}>📥 INPUT</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.input}</div>
                    </div>
                    {/* PROCESS */}
                    <div style={{ padding: '8px 10px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 4, letterSpacing: '0.05em' }}>⚙️ PROCESS</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>Duration: {(0.5 + Math.random() * 4).toFixed(1)}s | Status: Complete</div>
                    </div>
                    {/* OUTPUT */}
                    <div style={{ padding: '8px 10px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-success)', marginBottom: 4, letterSpacing: '0.05em' }}>📤 OUTPUT</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.output}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioSimulator({ scenarios }) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id);
  const scenario = scenarios.find((s) => s.id === selectedId);

  return (
    <div>
      {/* Selector */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Select Business Scenario:
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 'var(--font-size-xs)',
            cursor: 'pointer', outline: 'none', minWidth: 260,
          }}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.id}: {s.label}</option>
          ))}
        </select>
      </div>

      {/* Detail card */}
      {scenario && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
          {[
            { icon: '📦', label: 'Expected Demand', value: scenario.demand, color: scenario.color },
            { icon: '🤖', label: 'Model Behavior', value: scenario.modelBehavior, color: 'var(--accent-primary)' },
            { icon: '📊', label: 'KPI Impact', value: scenario.kpiImpact, color: 'var(--accent-success)' },
          ].map((card, i) => (
            <div key={i} style={{
              padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)',
              background: `${card.color}08`, border: `1px solid ${card.color}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '1rem' }}>{card.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: card.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Before/After comparison */}
      {scenario && (
        <div style={{ marginTop: 'var(--spacing-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--accent-danger)', marginBottom: 8 }}>🔴 Without AI (Manual)</div>
            <ul style={{ paddingLeft: 16 }}>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Planner manually adjusts spreadsheet forecast</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>1–2 days to produce updated plan</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>No confidence bands; planners over-buffer by 25%</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>MAPE typically 18–24% in volatile scenarios</li>
            </ul>
          </div>
          <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)', marginBottom: 8 }}>🟢 With AI</div>
            <ul style={{ paddingLeft: 16 }}>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Auto-forecast generated in &lt;4 hours</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>P10/P50/P90 bands — planners review exceptions only</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Scenario-specific model layer activates automatically</li>
              <li style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>MAPE &lt;10% with drift detection and auto-retraining</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoCatalog() {
  const [diffFilter, setDiffFilter] = useState('All');

  // Build stats from DEMO_DATA
  const deptStats = Object.entries(CATALOG_META).map(([dept, meta]) => {
    const demos = (DEMO_DATA[meta.processId] || DEMO_DATA['__default__']).demos;
    const counts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    demos.forEach((d) => { if (counts[d.difficulty] !== undefined) counts[d.difficulty]++; });
    return { dept, color: meta.color, total: demos.length, counts };
  });

  const totalDemos = deptStats.reduce((s, d) => s + d.total, 0);

  const diffOptions = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const DIFF_COLORS = { Beginner: 'var(--accent-success)', Intermediate: 'var(--accent-warning)', Advanced: 'var(--accent-danger)' };

  const filteredStats = deptStats.map((d) => ({
    ...d,
    displayCount: diffFilter === 'All' ? d.total : (d.counts[diffFilter] || 0),
  }));

  return (
    <div className="content-section">
      <div className="content-section-header">
        <span className="content-section-title">📚 Demo Catalog</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          {totalDemos} demos across {Object.keys(CATALOG_META).length} departments
        </span>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-lg)', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
          {totalDemos} Total Demos
        </div>
        {Object.entries({ Beginner: 'var(--accent-success)', Intermediate: 'var(--accent-warning)', Advanced: 'var(--accent-danger)' }).map(([lvl, col]) => {
          const cnt = deptStats.reduce((s, d) => s + (d.counts[lvl] || 0), 0);
          return (
            <div key={lvl} style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-lg)', background: `${col}18`, border: `1px solid ${col}40`, color: col, fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>
              {lvl}: {cnt}
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--spacing-md)' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', alignSelf: 'center', fontWeight: 600 }}>Filter by difficulty:</span>
        {diffOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setDiffFilter(opt)}
            style={{
              padding: '4px 12px', borderRadius: 'var(--border-radius)', border: `1px solid ${diffFilter === opt ? (DIFF_COLORS[opt] || 'var(--accent-primary)') : 'var(--border-color)'}`,
              background: diffFilter === opt ? `${DIFF_COLORS[opt] || 'var(--accent-primary)'}18` : 'transparent',
              color: diffFilter === opt ? (DIFF_COLORS[opt] || 'var(--accent-primary)') : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 10, cursor: 'pointer',
            }}
          >{opt}</button>
        ))}
      </div>

      {/* Department cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {filteredStats.map(({ dept, color, total, counts, displayCount }) => (
          <div key={dept} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: `1px solid ${color}30`, background: `${color}06` }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color, marginBottom: 6 }}>{dept}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {displayCount}
              {diffFilter !== 'All' && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}> / {total}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(counts).map(([lvl, cnt]) => cnt > 0 && (
                <span key={lvl} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${DIFF_COLORS[lvl]}18`, color: DIFF_COLORS[lvl], fontWeight: 600 }}>{cnt} {lvl.slice(0, 3)}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Featured Demos */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          Featured Demos — Highest Business Impact
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--spacing-sm)' }}>
          {FEATURED_DEMOS.map((f, i) => (
            <div key={i} style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', border: `1px solid ${f.color}30`, background: `${f.color}06` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: f.color, background: `${f.color}18`, padding: '2px 6px', borderRadius: 3, border: `1px solid ${f.color}30` }}>{f.dept}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN EXPORT
   ========================================================= */

export default function ProcessDemoTab({ process }) {
  const data = DEMO_DATA[process.id] || DEMO_DATA['__default__'];
  const [selectedDemoId, setSelectedDemoId] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const selectedDemo = data.demos.find((d) => d.id === selectedDemoId);

  // Total demos count for badge
  const totalDemos = Object.entries(DEMO_DATA)
    .filter(([k]) => k !== '__default__')
    .reduce((s, [, v]) => s + v.demos.length, 0);

  <TabShell
      tabName="demo"
      title="Demo Scenarios · walkthrough + scenario library"
      phase="Orient"
      phases={['Orient', 'Understand', 'Describe', 'Ship', 'Measure', 'Govern', 'Verify', 'Secure']}
      priority="P1"
      information="demo walkthrough · scenario library · replay history"
      operation="interactive · per-proc demo pending"
      accent="#d946ef"
      todos={[]}
    >
      return (
    <div>
      {/* Catalog toggle banner */}
      <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem' }}>📚</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>Demo Catalog</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{totalDemos} demos across 11 departments</span>
          </div>
        </div>
        <button
          onClick={() => setShowCatalog(!showCatalog)}
          style={{ padding: '5px 14px', borderRadius: 'var(--border-radius)', border: '1px solid rgba(59,130,246,0.4)', background: showCatalog ? 'var(--accent-primary)' : 'transparent', color: showCatalog ? '#fff' : 'var(--accent-primary)', fontWeight: 600, fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}
        >
          {showCatalog ? 'Hide Catalog' : 'View Catalog'}
        </button>
      </div>

      {/* Demo Catalog (collapsible) */}
      {showCatalog && <DemoCatalog />}

      {/* A. Demo List */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">🎬 Demo Walkthroughs</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Click a demo to view step-by-step walkthrough</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)', marginBottom: selectedDemo ? 'var(--spacing-md)' : 0 }}>
          {data.demos.map((demo) => (
            <DemoCard
              key={demo.id}
              demo={demo}
              isSelected={selectedDemoId === demo.id}
              onClick={() => setSelectedDemoId(selectedDemoId === demo.id ? null : demo.id)}
            />
          ))}
        </div>

        {/* B. Demo Detail */}
        {selectedDemo && <DemoDetail demo={selectedDemo} />}
      </div>

      {/* C. Business Scenario Simulator */}
      <div className="content-section">
        <div className="content-section-header">
          <span className="content-section-title">⚙️ Business Scenario Simulator</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Select a scenario to see expected demand, model behavior, and KPI impact</span>
        </div>
        <ScenarioSimulator scenarios={data.scenarios} />
      </div>
    </div>
    </TabShell>
  );
}
