# Process Agent Cron Catalog

Generated from `backend/seeds/processes.json`. Every seeded business process has a daily smoke test assignment and a weekly full validation assignment.

| Department | Process Count | Smoke Cron Pattern | Full Cron Pattern | Primary Agent Examples |
|---|---:|---|---|---|
| customer | 5 | daily spread across 01:00-04:59 | weekly day 1 spread across 02:00-06:59 | ai-ml-test-agent, customer-analytics-test-agent |
| finance | 4 | daily spread across 01:00-04:59 | weekly day 2 spread across 02:00-06:59 | ai-ml-test-agent, finance-test-agent |
| governance | 5 | daily spread across 01:00-04:59 | weekly day 3 spread across 02:00-06:59 | governance-test-agent |
| logistics | 4 | daily spread across 01:00-04:59 | weekly day 4 spread across 02:00-06:59 | logistics-process-test-agent |
| maintenance | 4 | daily spread across 01:00-04:59 | weekly day 5 spread across 02:00-06:59 | operations-test-agent |
| manufacturing | 4 | daily spread across 01:00-04:59 | weekly day 6 spread across 02:00-06:59 | operations-test-agent |
| procurement | 4 | daily spread across 01:00-04:59 | weekly day 0 spread across 02:00-06:59 | ai-ml-test-agent, supply-procurement-test-agent |
| quality | 4 | daily spread across 01:00-04:59 | weekly day 1 spread across 02:00-06:59 | quality-test-agent |
| retail | 4 | daily spread across 01:00-04:59 | weekly day 2 spread across 02:00-06:59 | process-test-agent |
| sales | 10 | daily spread across 01:00-04:59 | weekly day 3 spread across 02:00-06:59 | ai-ml-test-agent, process-test-agent |
| supply-chain | 5 | daily spread across 01:00-04:59 | weekly day 4 spread across 02:00-06:59 | ai-ml-test-agent, logistics-process-test-agent, supply-procurement-test-agent |

Use `scripts/process_test_plan.py list` to inspect suite assignments and `scripts/process_test_plan.py export-cron` to print crontab lines.

Example:

```bash
./scripts/process_test_plan.py list --dept sales
./scripts/process_test_plan.py export-cron --mode smoke
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full --dry-run
```

Related diagrams: [PROCESS_TESTING_DIAGRAMS.md](PROCESS_TESTING_DIAGRAMS.md)
