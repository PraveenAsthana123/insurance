# HOLY Beverage — Manufacturing — AS-IS Process Assessment

> Per global CLAUDE.md §53 (enterprise AI maturity stack — §47 strategic alignment)
> + operator request 2026-05-22: every department MUST have an AS-IS process
> assessment owned by the **AI Digital Transformation Strategy role**.

## Purpose

This document is the **input to the AI strategy planning** for Manufacturing.
Every AS-IS process is captured with **7-axis impact** (time / error / cost / people /
process / productivity / technology) so the AI-Strategy role can prioritize
which processes to automate first.

## Owner: AI Digital Transformation Strategy role

See `../roles/ai-strategy/HOLY_README.md` for the role definition.

## AS-IS Process Inventory + 7-Axis Impact

| # | AS-IS Process | Time Loss | Error Rate | Cost Impact | Impact: People | Impact: Process | Impact: Productivity | Impact: Technology |
|---|---|---|---|---|---|---|---|---|
| 1 | Reactive equipment maintenance | 20 hrs/wk | High | $800K/yr | Mech burnout | Schedule-driven only | −25% OEE | CMMS only |
| 2 | Manual visual inspection | 10 hrs/wk | High | $400K/yr | Inspector fatigue | Sampling-based | −15% throughput | Eye-based |
| 3 | Paper batch records | 6 hrs/wk | Med | $150K/yr | Compliance risk | Delayed traceability | Slow lookup | Paper + scan |
| 4 | Manual energy monitoring | 8 hrs/wk | Med | $200K/yr | Eng overload | Daily review | −10% efficiency | BMS only |
| 5 | Quality lab manual testing | 12 hrs/wk | Med | $300K/yr | Lab queue | Sampling | Slow release | Manual instruments |

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
4. **Measure** via the persona's main KPI: Overall equipment effectiveness (OEE), mean time between failures

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
