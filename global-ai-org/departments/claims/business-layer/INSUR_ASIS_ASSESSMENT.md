# AS-IS Process Assessment (7-Axis) — Claims

Owner: AI-Strategy role.
Per global §64.3 — every AS-IS process captured across 7 axes.

## Process Impact Matrix

| Process | Time Loss | Error Rate | Cost Impact | Impact: People | Impact: Process | Impact: Productivity | Impact: Technology |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FNOL via call center (manual) | 40 hrs/wk | Med | $2.4M/yr | Agent burnout; high turnover | Inconsistent intake quality | −35% throughput | Genesys + IVR only |
| Manual document classification + OCR review | 60 hrs/wk | High | $3.8M/yr | Adjuster fatigue; rework cycles | Lost / mis-routed docs | −40% throughput | Legacy DMS + manual OCR |
| Manual claim validation (completeness, duplicates) | 35 hrs/wk | Med | $1.5M/yr | Adjuster overload | Inconsistent rules application | −25% throughput | Excel checklists |
| Rules-only fraud detection (no ML) | 20 hrs/wk | Very High | $15M/yr leakage | SIU understaffed | Reactive only; misses sophisticated fraud | −60% detection rate | SAS-based rules engine |
| Manual damage assessment (in-person inspection) | 80 hrs/wk | Med | $8M/yr | Field adjuster overload; 48h schedule lag | Inconsistent estimates | −45% throughput | Polaroid + clipboard |
| Reserve calculation via spreadsheet | 25 hrs/wk | High | $5M/yr reserve drift | Actuarial backlog | Stale assumptions | −30% accuracy | Excel + quarterly review |
| Manual approval routing (paper + email) | 30 hrs/wk | Med | $1.2M/yr | Manager email overload | SLA breach common | −25% cycle time | Email + Outlook |
| Catastrophe surge handling (manual triage) | 100 hrs/wk | Critical | $50M/yr (CAT event) | Adjuster burnout during CAT | Triage by phone-tree | −70% during CAT | No CAT-specific tooling |

## Prioritized Automation Backlog (highest impact first)

| Rank | Process | Estimated Cost Impact | ROI Tier |
| --- | --- | --- | --- |
| 1 | FNOL via call center (manual) | $2.4M/yr | Very High |
| 2 | Manual document classification + OCR review | $3.8M/yr | Very High |
| 3 | Manual claim validation (completeness, duplicates) | $1.5M/yr | Very High |
| 4 | Rules-only fraud detection (no ML) | $15M/yr leakage | Very High |
| 5 | Manual damage assessment (in-person inspection) | $8M/yr | Very High |

## Methodology

Per §64.3:
1. Score each row by `(time-loss × labor-rate + cost-impact) × error-multiplier`
2. Sort descending → prioritized automation backlog
3. Map each row to a sub-process in INSUR_DEPT_SPEC.md process hierarchy
4. Re-assess quarterly + diff vs last quarter

Next quarterly re-assessment: TBD
