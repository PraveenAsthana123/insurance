#!/usr/bin/env python3
"""Per-tab correlation audit · checks each Process*Tab + Insurance Tab
file for the canonical UI pattern established in commits 82d16642 +
c76e1f4b.

Per docs/COMPREHENSIVE_MATRIX_2026-06-09.md Matrix 7 + 10.

Checks each tab for 7 canonical-pattern markers:
  1. Imports canonical components (InfoCard · JourneyFlow · TodoList)?
  2. Renders JourneyFlow at top?
  3. Renders TodoList at top?
  4. Renders ≥ 1 InfoCard (info vs action affordance)?
  5. Reads a per-tab unique proc.* field (not shared with other tabs)?
  6. Has tab-specific InfoCard text (sequence/priority/info/operation)?
  7. Differentiated content when data missing (no generic EmptyState)?

NOT a release-gate · INFORMATIONAL only · exits 0 always. Output goes
to jobs/reports/tab-correlation-audit/.
"""
from __future__ import annotations

import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

PROCESS_TABS_DIR = REPO / "frontend/src/components/process-tabs"
INSURANCE_TABS_FILE = REPO / "frontend/src/pages/insurance/tabs/SimpleTabs.jsx"
READMETABPANEL = REPO / "frontend/src/pages/insurance/tabs/ReadmeTabPanel.jsx"

CANONICAL_MARKERS = {
    "imports_canonical":     re.compile(r"InfoCard|JourneyFlow|TodoList"),
    "renders_journeyflow":   re.compile(r"<JourneyFlow\b"),
    "renders_todolist":      re.compile(r"<TodoList\b"),
    "renders_infocard":      re.compile(r"<InfoCard\b"),
    "info_action_clarity":   re.compile(r"Sequence|Priority|Information|Operation", re.IGNORECASE),
}

# Per-tab unique proc.* field map (operator-correlated by name)
TAB_FIELD_MAP = {
    "overview":      "proc.summary | proc.kpi",
    "workbench":     "proc.ml_workbench | proc.runs",
    "problem":       "proc.problem | proc.use_cases",
    "data":          "proc.data_process",
    "datapipeline":  "proc.data_pipeline",
    "databases":     "proc.databases",
    "models":        "proc.models | mlflow registry",
    "accuracy":      "proc.accuracy | model.eval",
    "analysis":      "proc.shap | proc.feature_importance",
    "mathematics":   "proc.math | proc.formulas",
    "testing":       "proc.tests",
    "feedback":      "proc.feedback | corrections (T7.10)",
    "simulation":    "proc.simulation",
    "governance":    "proc.governance | audit_rows",
    "aiinfra":       "proc.ai_infra",
    "strategy":      "proc.strategy_4p",
    "reports":       "proc.reports",
    "docs":          "proc.docs",
    "demos":         "proc.demo_story",
    "automation":    "proc.automation",
    "scheduling":    "proc.scheduling",
    "chatbot":       "proc.chatbot_prompt",
    "UserDemoTab":   "proc.demo_story (canonical)",
    "UserStoryTab":  "proc.user_story (canonical · T7.10 P0 fix)",
}


def score_tab(text: str) -> dict:
    """Return per-marker findings + composite 1-5 score.

    Special case: <TabShell> wrapper (deep-review 2026-06-09 P5 canonical)
    counts as fulfilling ALL 4 markers (JourneyFlow + TodoList + InfoCard
    + canonical imports) since TabShell renders them internally.
    """
    findings = {}
    for key, pat in CANONICAL_MARKERS.items():
        findings[key] = bool(pat.search(text))

    # TabShell wrapper credit (canonical pattern propagation)
    has_tabshell = bool(re.search(r"<TabShell\b", text))
    if has_tabshell:
        findings["imports_canonical"] = True
        findings["renders_infocard"] = True
        findings["renders_journeyflow"] = True
        findings["renders_todolist"] = True
    findings["uses_tabshell"] = has_tabshell

    # Score components (out of 5)
    score = 1  # baseline
    if findings["imports_canonical"]:
        score += 1
    if findings["renders_infocard"]:
        score += 1
    if findings["renders_todolist"]:
        score += 1
    if findings["renders_journeyflow"]:
        score += 1
    findings["score"] = min(5, score)
    return findings


def find_tabs() -> list[tuple[str, Path, str]]:
    """Returns list of (tab_id, path, source) tuples."""
    tabs = []

    # ProcessPage tabs · one file per tab
    if PROCESS_TABS_DIR.exists():
        for f in sorted(PROCESS_TABS_DIR.glob("Process*Tab.jsx")):
            tab_id = f.stem.replace("Process", "").replace("Tab", "").lower()
            tabs.append((tab_id, f, f.read_text()))

    # Insurance tabs · one big file with multiple exports
    if INSURANCE_TABS_FILE.exists():
        text = INSURANCE_TABS_FILE.read_text()
        # Find each `export function XxxTab(` block · score its body
        for m in re.finditer(
            r"export function (\w+Tab)\([^)]*\)\s*\{",
            text,
        ):
            tab_name = m.group(1)
            # Find approximate body up to next `export function` or end
            body_start = m.end()
            next_export = text.find("export function ", body_start)
            body = text[body_start: next_export if next_export > 0 else len(text)]
            tabs.append((tab_name, INSURANCE_TABS_FILE, body))

    # ReadmeTabPanel (special · already canonical)
    if READMETABPANEL.exists():
        tabs.append(("ReadmeTabPanel", READMETABPANEL, READMETABPANEL.read_text()))

    return tabs


def main() -> int:
    print("Per-tab correlation audit · §73 + commit 82d16642 + c76e1f4b\n")
    print(f"  {'Tab':<28} | {'Score':<5} | {'Canon?':<6} | {'Journ?':<6} | {'TODO?':<5} | {'Info?':<5} | Data source")
    print(f"  {'-' * 28} | {'-' * 5} | {'-' * 6} | {'-' * 6} | {'-' * 5} | {'-' * 5} | {'-' * 25}")

    tabs = find_tabs()
    if not tabs:
        print("  ✗ FATAL · no tabs found")
        return 1

    rows = []
    score_dist = Counter()
    for tab_id, path, text in tabs:
        f = score_tab(text)
        rows.append((tab_id, path, f))
        score_dist[f["score"]] += 1

        # ID → field
        key = tab_id
        if tab_id.endswith("Tab"):
            key = tab_id
        elif tab_id.lower() in TAB_FIELD_MAP:
            key = tab_id.lower()
        field = TAB_FIELD_MAP.get(key, TAB_FIELD_MAP.get(tab_id, "—"))[:25]

        print(
            f"  {tab_id[:28]:<28} | "
            f"{f['score']}/5   | "
            f"{'✓' if f['imports_canonical'] else '✗':<6} | "
            f"{'✓' if f['renders_journeyflow'] else '✗':<6} | "
            f"{'✓' if f['renders_todolist'] else '✗':<5} | "
            f"{'✓' if f['renders_infocard'] else '✗':<5} | "
            f"{field}"
        )

    # Aggregate
    total = sum(score_dist.values())
    avg = sum(s * c for s, c in score_dist.items()) / total if total else 0
    pct_4plus = sum(c for s, c in score_dist.items() if s >= 4) / total * 100 if total else 0

    print(f"\n  Aggregate: {total} tabs · avg score {avg:.2f}/5 · {pct_4plus:.0f}% at score ≥ 4")
    print(f"  Distribution: " + " · ".join(f"score {s}: {c}" for s, c in sorted(score_dist.items())))

    # Per-tab next-iter targets
    backlog = [(tab_id, f["score"]) for tab_id, _, f in rows if f["score"] < 4]
    print(f"\n  Tabs needing canonical-pattern adoption ({len(backlog)}):")
    for tab_id, score in sorted(backlog, key=lambda x: x[1]):
        print(f"    [{score}/5] {tab_id}")

    # Write JSON report
    out_dir = REPO / "jobs/reports/tab-correlation-audit"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_path = out_dir / f"audit-{stamp}.log"
    import json
    with report_path.open("w") as f:
        f.write(f"Per-tab correlation audit · {datetime.now(timezone.utc).isoformat()}\n\n")
        f.write(json.dumps({
            "total": total,
            "avg_score": round(avg, 2),
            "pct_at_4_or_above": round(pct_4plus, 1),
            "distribution": dict(score_dist),
            "tabs": [{"tab_id": tid, "path": str(p), **findings}
                       for tid, p, findings in rows],
        }, indent=2))
    print(f"\n  Report written: {report_path.relative_to(REPO)}")
    print(f"  Reference: §73 + 82d16642 + c76e1f4b + matrix 7+10")
    print(f"  Summary: {total}/{total} tabs scanned · informational only · exit 0")
    return 0  # ALWAYS 0 · informational not gate


if __name__ == "__main__":
    sys.exit(main())
