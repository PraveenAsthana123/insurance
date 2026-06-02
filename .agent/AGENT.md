# AGENT.md — global rules for compact-mode agents

GLOBAL RULES:
- Work on one task at a time.
- Read only relevant files.
- Do not paste full files unless required.
- Use diffs/patches.
- After code change, run validation.
- Summarize result in task_state.md.
- Keep final response under 200 words.

ANCHORS:
- Project root: /mnt/deepa/insur_project
- Python venv : /media/praveen/praveenlinux21/praveen/aman/cuda/venv
- Backend     : backend/{routers,services,repositories,core,schemas}/
- Drills      : tests/drills/drill_*.py
- Reports     : jobs/reports/*.md
- Audit rows  : data/eval/**/audit.jsonl
- Bot live    : http://localhost:8001/bot/{health,ask,ui}

LOOP CONTRACT (per global §73 + §74.2):
- Validate after every change (pytest / drill / curl).
- Fix errors before reporting.
- Final report: changed files · summary · validation result · remaining risk.

DO NOT:
- Reload the whole repo on every prompt.
- Paste full files when a 5-line diff suffices.
- Re-explain basics.
- Run blocking long commands (>3 min) in foreground.
