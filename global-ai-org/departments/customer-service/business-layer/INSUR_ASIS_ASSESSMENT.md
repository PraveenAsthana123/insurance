# AS-IS Process Assessment (7-Axis) — Customer Service / Contact Center

Owner: AI-Strategy role.
Per global §64.3 — every AS-IS process captured across 7 axes.

## Process Impact Matrix

| Process | Time Loss | Error Rate | Cost Impact | Impact: People | Impact: Process | Impact: Productivity | Impact: Technology |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manual IVR menu navigation | 40 hrs/wk | High | $2M/yr (lost-call cost) | Customer frustration | Misroutes 30% | −40% FCR | Legacy Avaya IVR |
| Agent manually searches KB for answer | 60 hrs/wk | High | $3.5M/yr | Agent confusion + AHT inflation | KB stale; wrong answers | −35% accuracy | Confluence keyword search |
| Manual sentiment review (sample 2% of calls) | 20 hrs/wk | Very High | $1.5M/yr | QA-team only | Reactive feedback | 98% of signals missed | Excel + sampling |
| Manual QA call audits (5 calls / agent / month) | 15 hrs/wk | Med | $1.2M/yr | QA bottleneck | Stale coaching feedback | −25% coaching effectiveness | Excel forms + recordings |
| Voice transcription outsourced (48h SLA) | 25 hrs/wk | Low | $2.5M/yr | Slow analytics + missed real-time | Lag 48h | −50% real-time visibility | Vendor transcription |
| Tier-1 calls handled by human (no chatbot deflection) | 80 hrs/wk | Med | $8M/yr (FTE cost) | Agent burnout on repetitive Qs | Inconsistent answers | −60% on simple Qs | No chatbot / weak FAQ |
| Manual escalation routing (email + warm transfer) | 12 hrs/wk | Med | $600K/yr | Transfer-loss + repeat-explain | Customer effort high | −20% FCR | Outlook + phone |

## Prioritized Automation Backlog (highest impact first)

| Rank | Process | Estimated Cost Impact | ROI Tier |
| --- | --- | --- | --- |
| 1 | Manual IVR menu navigation | $2M/yr (lost-call cost) | Very High |
| 2 | Agent manually searches KB for answer | $3.5M/yr | Very High |
| 3 | Manual sentiment review (sample 2% of calls) | $1.5M/yr | Very High |
| 4 | Manual QA call audits (5 calls / agent / month) | $1.2M/yr | Very High |
| 5 | Voice transcription outsourced (48h SLA) | $2.5M/yr | Very High |

## Methodology

Per §64.3:
1. Score each row by `(time-loss × labor-rate + cost-impact) × error-multiplier`
2. Sort descending → prioritized automation backlog
3. Map each row to a sub-process in INSUR_DEPT_SPEC.md process hierarchy
4. Re-assess quarterly + diff vs last quarter

Next quarterly re-assessment: TBD
