# Customer Analytics — Demo Walkthrough

**Audience:** Sales engineers, executive stakeholders, prospective customers evaluating the BEV platform.
**Duration:** ~8 minutes.
**Prerequisites:** backend on :8001, frontend on :5173, Telco dataset ingested.

---

## Scenario 1 — "Who should Customer Ops call today?"

**Goal:** show that the platform produces an action-ready list ranked by a real model, not mock data.

Steps:
1. Navigate to `/customer/manager`.
2. Click the **Churn Risk** tab (right-most tab under the department title).
3. Header banner reads: *"Top-20 at-risk customers for Customer Analytics. Scored by a scikit-learn GBM+LR ensemble trained on IBM Telco (7,043 customers) — AUC **0.841**, precision@top10% **0.778**."*
4. Point to the 4 summary tiles (cohort size, high-risk count, avg tenure, avg monthly charges) — all computed from live predictions.
5. Scroll to the table of 20 customers. Every row has a real IBM Telco customer_id (format `####-XXXXX`), real tenure/monthly-charges, and a probability bar.

**Talking point:**
> "If a real customer-ops team called these 20 customers today, ~78% of them would churn without intervention. Random calling would only hit 27%. That 2.94× lift is pure retention-budget efficiency."

---

## Scenario 2 — "Why is this specific customer at risk?"

**Goal:** demonstrate per-customer explainability.

Steps:
1. From the ChurnRisk tab, click customer `7216-EWTRS` (top of the list).
2. A *Drivers* panel slides in below the table.
3. Panel reads:
   - *"Model predicts **88%** churn — segment **High Risk**, contract **Month-to-month**, tenure **1 months**."*
   - Ordered list of 3 drivers with importance scores:
     1. Month-to-month contract (importance ~0.42)
     2. Short tenure (1 mo — high risk) (importance ~0.17)
     3. Fiber optic internet / monthly charges (importance ~0.08)

**Talking point:**
> "The drivers are actual feature importances from the fitted GBM, not hand-written copy. This is what a manager needs before picking up the phone: here's **why** the model ranks this customer at the top, and here's **what retention playbook** applies."

---

## Scenario 3 — "What retention playbook applies to this case?"

**Goal:** show grounded AI Explain over the customer-specific corpus.

Steps:
1. With `7216-EWTRS` still open, click the AI Explain pill (or equivalent entry point — currently the Sales/SC tabs have a drawer; Customer will inherit when the corpus selector is exposed UI-side).
2. Alternatively, from a terminal:
   ```bash
   curl -s -X POST http://localhost:8001/api/v1/ai/explain \
     -H "Content-Type: application/json" \
     -d '{"question":"When should I intervene on a month-to-month customer with short tenure?","corpus":"customer"}'
   ```
3. Response narrates thresholds + citations from `churn-playbook.md`:
   - Probability ≥ 0.65 (High Risk) → intervene within 48h with personal outreach.
   - Drivers like "Month-to-month + high monthly charges + short tenure" → investigate bill-shock; offer plan right-sizing.
   - Each factual claim ends with `[ref N]` pointing back to the corpus file.

**Talking point:**
> "The platform doesn't just surface a prediction — it surfaces the playbook the manager is supposed to follow, cited from a curated corpus. That corpus is **department-specific**: Sales gets promo-playbook.md, Supply-Chain gets stockout-playbook.md, Customer now gets churn-playbook.md + 3 others."

---

## Closing — the control-vs-pilot contrast

Mention briefly:
> "Every enhancement you just saw — live model, driver explanations, dept
> corpus, 28 enhancement workflows, 15 AI use cases — is **only in the
> Customer department**. The other 13 departments still have baseline
> ~14 workflows, ~5 use cases, and zero live endpoints. This is an A/B
> experiment on organizational depth, and Customer Analytics is the A arm."

---

## Reset between demos (optional)

Customer list is scored once per backend process (in-memory cache). To re-run
the model with a fresh `trained_at` timestamp:

```bash
# restart backend
pkill -f "uvicorn main:app"
BEV_CORS_ORIGINS="http://localhost:5173,http://localhost:3000" \
  python3 -m uvicorn main:app --port 8001 &
# first call triggers refit; ~1s latency
curl -s http://localhost:8001/api/v1/customer/churn-metrics | jq
```
