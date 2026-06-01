# AS-IS Process Assessment (7-Axis) — Fraud / Special Investigations Unit (SIU)

Owner: AI-Strategy role.
Per global §64.3 — every AS-IS process captured across 7 axes.

## Process Impact Matrix

| Process | Time Loss | Error Rate | Cost Impact | Impact: People | Impact: Process | Impact: Productivity | Impact: Technology |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rules-only fraud detection (no ML) | 30 hrs/wk | Very High | $15M/yr leakage | SIU misses sophisticated fraud | Reactive only | −60% detection | SAS-based rule engine |
| Manual graph / network analysis (Excel) | 50 hrs/wk | High | $4M/yr | Investigator overload | Misses network rings | −70% network detection | Excel + Visio |
| Manual OSINT / social media review | 40 hrs/wk | Med | $2M/yr | Investigator overload | Sampling only | −50% throughput | Manual web browsing |
| Sequential document forensics review | 35 hrs/wk | Med | $3.2M/yr | Forensic specialist bottleneck | Slow | −40% throughput | Manual document review |
| Manual NICB / DOI reporting | 15 hrs/wk | Med | $600K/yr | Compliance bottleneck | Late filings | −30% throughput | Manual data entry |
| Provider audit (annual / reactive) | 25 hrs/wk | High | $8M/yr provider-fraud leakage | Audit team capacity | Reactive only | −65% on emerging schemes | Spreadsheet-based audits |
| Manual recovery / subrogation tracking | 20 hrs/wk | Med | $1.5M/yr lost recovery | Recovery-team backlog | Lost-to-aging | −40% recovery rate | Excel + email |

## Prioritized Automation Backlog (highest impact first)

| Rank | Process | Estimated Cost Impact | ROI Tier |
| --- | --- | --- | --- |
| 1 | Rules-only fraud detection (no ML) | $15M/yr leakage | Very High |
| 2 | Manual graph / network analysis (Excel) | $4M/yr | Very High |
| 3 | Manual OSINT / social media review | $2M/yr | Very High |
| 4 | Sequential document forensics review | $3.2M/yr | Very High |
| 5 | Manual NICB / DOI reporting | $600K/yr | High |

## Methodology

Per §64.3:
1. Score each row by `(time-loss × labor-rate + cost-impact) × error-multiplier`
2. Sort descending → prioritized automation backlog
3. Map each row to a sub-process in INSUR_DEPT_SPEC.md process hierarchy
4. Re-assess quarterly + diff vs last quarter

Next quarterly re-assessment: TBD
