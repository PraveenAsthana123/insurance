# Sequence Diagrams · insur_project · Top 3 User Flows

> Per §86 doc #5. Updated 2026-06-08.

## Flow 1: Operator opens Insurance Blueprint catalog

```mermaid
sequenceDiagram
    actor U as Operator (LAN)
    participant FE as Vite dev server :3210
    participant Disk as data/insurance/blueprint.json (8.2 MB)
    participant BE as Backend :8001 (NOT running)

    U->>FE: GET http://192.168.1.88:3210/insurance
    FE->>FE: React Router matches /insurance/:deptId/:domain/:processId
    FE->>FE: useBlueprint() hook fires
    FE->>FE: GET /insurance-blueprint
    Note over FE,Disk: Vite middleware intercepts<br/>(server.middlewares.use)
    FE->>Disk: fs.readFile(data/insurance/blueprint.json)
    Disk-->>FE: 8.2 MB JSON · 21 depts · 322 processes · 1278 AI items
    FE-->>U: Renders Main Menu (4 levels) + Sub Menu + 21-tab right pane
    U->>FE: Click process · navigate to /insurance/3/b2b/lead-scoring
    FE->>FE: useParams → load process detail
    FE->>FE: Render 21 tabs (Data · Model · Analysis · UserStory · UserDemo · etc.)
    Note over FE,BE: Backend NOT consulted for catalog<br/>(by design — vite serves static)
```

## Flow 2: ML pipeline smoke run (fraud-SIU)

```mermaid
sequenceDiagram
    actor U as Operator
    participant CLI as venv/python
    participant Runner as run_dept_pipelines.py
    participant Pipeline as full_lifecycle.py
    participant Data as creditcard.csv
    participant ML as sklearn / XGBoost
    participant Mflow as MLflow :5001
    participant Disk as data/eval/fraud-siu/

    U->>CLI: python run_dept_pipelines.py --dept fraud-siu --pipeline 1 --smoke
    CLI->>Runner: invoke
    Runner->>Pipeline: subprocess.run with --sample 200 --n-trials 3
    Pipeline->>Data: read_csv(creditcard.csv)
    Data-->>Pipeline: 284807 rows · 0.17% fraud
    Pipeline->>Pipeline: stratified smoke sample (MIN_PER_CLASS=30)
    Note over Pipeline: Per fix in 57463ce<br/>guarantees both classes
    Pipeline->>Pipeline: train_test_split(stratify=y)
    Pipeline->>ML: Optuna HPO · 3 trials
    ML-->>Pipeline: best params
    Pipeline->>ML: final XGBoost train
    Pipeline->>Disk: save manifest.json · acc=0.967 · CM=[[25,1],[0,4]]
    Pipeline->>Mflow: mlflow.log_metric (planned · separate script)
    CLI-->>U: [OK] fraud-siu/1 — full_lifecycle

    U->>CLI: python scripts/log_manifests_to_mlflow.py --apply
    CLI->>Mflow: backfill 21 runs from on-disk manifests
    Mflow-->>U: View at http://localhost:5001
```

## Flow 3: Error recovery — fix-loop nightly cron with disk unmount

```mermaid
sequenceDiagram
    participant Cron as cron :09:00
    participant Wrapper as with_venv_preflight.sh
    participant Loop as insur_fix_loop.sh
    participant Preflight as scripts/insur_preflight.sh
    participant Disk as /media/praveen/praveenlinux21
    participant Log as jobs/logs/insur_fix_loop.log
    participant Audit as .agent/auto_fix_audit.jsonl

    Cron->>Wrapper: invoke fix-loop with preflight
    Wrapper->>Preflight: check venv + kaggle + creds + disk
    alt disk unmounted
        Preflight-->>Wrapper: FAIL · venv at /media/.../cuda not reachable
        Wrapper->>Log: "preflight skip · disk unmounted · no error per §60"
        Wrapper-->>Cron: exit 0 (clean skip)
        Note over Wrapper,Cron: Per §60 path verification<br/>(d40a468 fix)
    else disk mounted
        Preflight-->>Wrapper: OK · all 5 checks pass
        Wrapper->>Loop: run 6 stages
        Loop->>Loop: scan ruff lint
        Loop->>Loop: dispatch council if --council
        Loop->>Audit: append jsonl per attempt
        Loop->>Log: write summary
        Loop-->>Wrapper: exit 0
        Wrapper-->>Cron: completed
    end
```

## Composes with

§47 (architecture · sequences are C4 dynamic views) · §57.5 (5-question runbook · flow 3 = incident response) · §60 (path verification · flow 3 fail-safe) · §86 (this standard)
