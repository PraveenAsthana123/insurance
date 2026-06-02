# HANDOFF.md — agent-to-agent context handoff

Use when transferring a task between agents (large → medium → small) OR between
sessions. Receiving agent reads this BEFORE touching the code.

## Current handoff slot

**To**: <agent-name>
**From**: <agent-name>
**Task ID**: <T-XXX>
**Date**: <ISO-8601>

**Background**:
What problem are we solving? What's the user-visible goal?

**Decisions already locked**:
- (cite DECISIONS.md lines)

**Files in scope**:
- (list with line ranges)

**Validation commands**:
- `<exact command 1>`
- `<exact command 2>`

**What's done**:
- ...

**What's left**:
- ...

**Known gotchas (read MEMORY.md gotchas section)**:
- ...

**Rollback path**:
- `git revert <hash>` OR `git checkout <hash> -- <file>`

## Handoff history (most recent first)

2026-06-02T05:30Z · claude → parallel-kivi · §77 ladder closeout
  Task: continue closing custom-build rows
  Closed: 1403/1410/1413/1419/1431/1426/1439/1446/1457 (9 of 9)
  Open: 2 SaaS rows (Lakera, Purview) — operator billing decision

2026-06-02T04:17Z · operator → claude · fix-all
  Task: run all 14 fix-all subtasks
  Closed: 14/14 green; report at jobs/reports/fix_all_20260602T041722Z.md
