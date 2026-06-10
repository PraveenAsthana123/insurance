# Insurance Benchmarking, Errors, And Graph

Generated from the current repo state.

## Benchmarking Snapshot

| Area | Current Evidence | Benchmark Result | Issue |
|---|---:|---:|---|
| Claims model | `data/eval/claims/insurance_claims_1/.../manifest.json` | Accuracy `73.3%`, ROC AUC `76.1%` | Needs stronger baseline and repeatable train/eval run. |
| Customer service model | `data/eval/customer-service/insurance_customer-service_1/.../manifest.json` | Accuracy `83.3%`, ROC AUC `78.8%` | Real dataset refresh failed in latest manifest, so reproducibility is broken. |
| Underwriting model | `data/eval/underwriting/insurance_underwriting_1/.../manifest.json` | R2 `80.2%`, MAE `2674.05`, RMSE `4784.55` | Regression metric, not accuracy. Needs business threshold benchmark. |
| Fraud SIU model | `data/eval/fraud-siu/insurance_fraud-siu_1/.../manifest.json` | Accuracy `100%` | Invalid-looking benchmark: confusion matrix contains only one class. |
| Capability score | `data/insurance/capability_status.json` | `262/262` planned | No capability is marked live/in-progress. |
| Department maturity | `data/insurance/maturity_state.json` | all departments `L0` | No department has progressed past baseline. |
| Catalog sample data | `config/insurance.catalog.json`, `data/insurance/*` | 312 files, about 347 KB total | Mostly tiny generated samples; CSVs average about 10 rows. |

## List Of Errors

| Severity | Error | Evidence | Fix Direction |
|---|---|---|---|
| High | Frontend lint fails with 34 errors | `frontend/src/pages/bank/BankUseCasePage.jsx` | Fix duplicate keys, empty blocks, unused eslint disables, and hook order violation. |
| High | React hook order violation | `BankUseCasePage.jsx` around `useWindowWidth` / `useMemo` after early return | Move hooks before conditional return or split component. |
| High | Duplicate object keys override config | `BankUseCasePage.jsx` repeats `test-ai.*` and `job-ai.*` keys | Merge or remove duplicate entries. |
| High | Backend tests fail during collection | `project_doctor.sh` output | Activate/install backend dependencies: FastAPI, Pydantic, psycopg, pandas, working psycopg2. |
| High | Real data refresh failed for 7 datasets | `data/insurance/_manifest.json` | Install/configure Kaggle CLI and credentials, rerun downloader. |
| High | Customer-service real data unavailable from latest refresh | `customer-service/*` entries failed or skipped | Fix Kaggle setup or provide alternative datasets. |
| High | Fraud SIU real data unavailable from latest refresh | `fraud-siu/*` entries failed or skipped | Fix Kaggle setup; replace competition-gated IEEE dataset. |
| Medium | Department scope mismatch | Catalog has 22 departments; API/model/cron focus on 4 | Decide target scope and align catalog, backend, docs, tests, cron, and models. |
| Medium | Namespace inconsistency | `/api/v1/insur/*` and `/api/v1/insurance/*` both exist | Consolidate or document clear ownership. |
| Medium | `siu` vs `fraud-siu` naming mismatch | Catalog department is `siu`; model/API department is `fraud-siu` | Add alias or standardize slug. |
| Medium | Cron coverage only for 13 datasets | `scripts/install_insurance_cron.sh` | Add cron jobs for all real datasets that should be maintained. |
| Medium | Model training only for 4 departments | `backend/ml/insurance/run_dept_pipelines.py` | Add pipeline registry entries per implemented department. |
| Medium | Architecture folders only for 4 departments | `global-ai-org/departments/*` | Generate or author architecture docs for remaining departments. |
| Medium | Docstring/comment coverage weak | AST scan found 48 missing module docstrings, 733 public function docstrings, 139 class docstrings | Add docstrings to important backend, scripts, and config modules first. |
| Low | Large frontend chunks | Vite build shows Plotly around 4.9 MB, main index around 2.0 MB | Code split Plotly/ECharts/recharts heavy pages. |

## Coverage Graph

```mermaid
flowchart TD
  A[Insurance Catalog: 22 departments] --> B[Generated sample data]
  B --> B1[312 files / ~347 KB]
  B --> B2[CSV average ~10 rows]
  A --> C[Architecture folders]
  A --> D[Backend APIs]
  A --> E[Model training pipelines]
  A --> F[Cron refresh]
  A --> G[Benchmark scores]

  C --> C1[Implemented: claims, underwriting, customer-service, fraud-siu]
  C --> C2[Missing: remaining departments]

  D --> D1[/api/v1/insur/*]
  D --> D2[/api/v1/insurance/*]
  D2 --> D3[Hardcoded 4 departments]

  E --> E1[Claims: 4 pipelines]
  E --> E2[Underwriting: 3 pipelines]
  E --> E3[Customer Service: 3 pipelines]
  E --> E4[Fraud SIU: 4 pipelines]
  E --> E5[Remaining departments: 0 pipelines]

  F --> F1[13 scheduled dataset refresh jobs]
  F --> F2[7 latest refresh failures]
  F --> F3[2 skipped datasets]

  G --> G1[Claims accuracy 73.3%]
  G --> G2[Customer Service accuracy 83.3%]
  G --> G3[Underwriting R2 80.2%]
  G --> G4[Fraud SIU 100% suspicious]
```

## Priority Order

1. Fix `project_doctor.sh` failures so benchmarks are trustworthy.
2. Fix Kaggle CLI/credentials and rerun dataset refresh.
3. Re-run model pipelines and reject suspicious single-class scores.
4. Decide whether insurance scope is 4 departments or all 22.
5. Align API, model registry, cron jobs, architecture folders, docs, and tests to that scope.
