# HOLY Beverage — Product Rd — AS-IS Process Assessment

> Per global CLAUDE.md §53 (enterprise AI maturity stack — §47 strategic alignment)
> + operator request 2026-05-22: every department MUST have an AS-IS process
> assessment owned by the **AI Digital Transformation Strategy role**.

## Purpose

This document is the **input to the AI strategy planning** for Product Rd.
Every AS-IS process is captured with **7-axis impact** (time / error / cost / people /
process / productivity / technology) so the AI-Strategy role can prioritize
which processes to automate first.

## Owner: AI Digital Transformation Strategy role

See `../roles/ai-strategy/HOLY_README.md` for the role definition.

## AS-IS Process Inventory + 7-Axis Impact

| # | AS-IS Process | Time Loss | Error Rate | Cost Impact | Impact: People | Impact: Process | Impact: Productivity | Impact: Technology |
|---|---|---|---|---|---|---|---|---|
| 1 | Manual literature review | 40 hrs/wk | Med | $200K/yr | Scientist overload | Slow exploration | −50% throughput | Paper journals |
| 2 | Manual recipe iteration | 24 hrs/wk | High | $500K/yr | Trial-and-error | Manual logging | −30% iter speed | Lab notebook |
| 3 | Sensory panel scheduling (manual) | 6 hrs/wk | Med | $80K/yr | Coordinator overload | Long lead time | Slow feedback | Email + Excel |
| 4 | Manual stability testing review | 8 hrs/wk | Med | $120K/yr | QA backlog | Sampling-based | Slow release | Excel reports |
| 5 | Manual competitor scan | 4 hrs/wk | Med | $60K/yr | Strategist overload | Reactive | −20% market awareness | Web browsing |

## Reading the table

| Axis | Meaning |
|---|---|
| **Time Loss** | Hours per week (across the dept) spent on this AS-IS process |
| **Error Rate** | Subjective severity: Low / Med / High (replace with metric when measured) |
| **Cost Impact** | Estimated $/year impact (fully-loaded labor + waste + opportunity) |
| **Impact: People** | What the manual process does to the humans running it (burnout, frustration, bottleneck) |
| **Impact: Process** | How the AS-IS state shapes downstream process quality (inconsistent, reactive, stale) |
| **Impact: Productivity** | Relative productivity vs the TO-BE automated version (−25%, −40%, etc.) |
| **Impact: Technology** | What tool(s) currently back the AS-IS process (Excel, email, paper, vendor dashboard) |

## TO-BE Recommendation

For every row above, the recommended TO-BE transformation:

1. **Automate** with the matching AI / ML / RAG pipeline (see `HOLY_DEPT_SPEC.md`)
2. **Augment** with human-in-the-loop only where confidence < 0.8 (per global §40)
3. **Audit** via decision-log per global §38.3 + §48
4. **Measure** via the persona's main KPI: Time-to-market, recipe success rate, sensory panel acceptance

## Reuse + Scoring

The AI-Strategy role uses this table to:

1. Score each row by `(time-loss-hrs × labor-rate + cost-impact) × error-severity-multiplier`
2. Sort descending → produces the **prioritized automation backlog**
3. Map each row to a sub-process in `HOLY_NAV.json` → enables the
   "AI Strategy" UI panel in the frontend to overlay automation-ROI on
   each sub-process card
4. Track quarterly delta — every quarter, re-run the assessment + diff
   against last quarter (TO-BE-cumulative-impact-realized)

## Related Artifacts

- `HOLY_DEMO_STORY.md` — narrative demo walkthrough
- `HOLY_DEPT_SPEC.md` — process → AI mapping
- `../roles/ai-strategy/HOLY_README.md` — role definition
- `../docs/sad/HOLY_SAD.md` — solution architecture
- `../../../app-stack/frontend/src/pages/HolyNavPage.jsx` — the UI

---

**Last assessed**: 2026-05-22. **Re-assess cadence**: quarterly.
