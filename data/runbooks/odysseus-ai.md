# Odysseus AI · Runbook · §57.5 5-question

## 1. WHAT broke?
Top-1 alert: accuracy drop below 0.85 in `/api/v1/odysseus/health` payload.
Check `data/odysseus/metrics.json` last 24h for the trend.

## 2. WHEN did it break?
`SELECT created_at FROM audit_log WHERE event_type='odysseus.predict' AND outcome='failed' ORDER BY created_at DESC LIMIT 10;`
Plus Grafana dashboard `data/obs/odysseus-ai_dashboard.json` panel #2.

## 3. WHO touched it?
`git log --since='7 days ago' scripts/odysseus/ models/odysseus-ai/`
Per §51 forensic substrate: every commit body lists actor + machine.

## 4. WHY did it break?
- Drift: PSI > 0.2 on agent_id distribution → retrain triggered.
- Schema change in agent_invocation? Check `_migrations` table.
- New agent class introduced? Check `data/odysseus/top_agents.json` vs current.

## 5. HOW to rollback?
- Roll back to previous model: `cp models/odysseus-ai/model.joblib.bak models/odysseus-ai/model.joblib`
- Or via MLflow: `mlflow models rollback odysseus-ai`
- Backend restart required per §120: `bash install.sh --restart`

## Live metrics
- Accuracy:      0.9586
- F1 weighted:   0.9582
- Trained on:    7722 REAL invocations · NO synthetic
- Top agent classes: ['sys_watchdog_status', 'sys_watchdog_frontend', 'sys_watchdog_api', 'sys_watchdog_jobs', 'sys_watchdog_vector']
