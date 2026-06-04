#!/usr/bin/env python3
"""Back-fill orphan AI references into bp.ai_opportunities[].

Per §73.3a — every AI in process.automatic_process.ai_workflow + process.ai[].ai_type
MUST exist in the catalog. Operator picks from catalog vocabulary, never free text.

This script finds orphans and adds them as `derived: true` catalog entries with the
5 mandatory sub-sections (Data / Model / Accuracy / Benchmark / Stakeholder) per §73.3b.

Idempotent: re-running NEVER overwrites operator content.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT = ROOT / "data" / "insurance" / "blueprint.json"


def collect_orphans(bp: dict) -> tuple[set, dict]:
    """Return (orphan_set, first_occurrence_map). Covers process-level + top20_roi refs."""
    catalog = {r.get("ai_type") for r in bp.get("ai_opportunities", []) if r.get("ai_type")}
    orphans = set()
    first_occ = {}
    # Process-level refs
    for d in bp.get("department_catalog", []):
        for p in d.get("processes", []):
            refs = []
            for a in (p.get("ai") or []):
                if isinstance(a, dict) and a.get("ai_type"):
                    refs.append((a.get("ai_type"), a.get("scenario", "")))
            for ai_type in ((p.get("automatic_process") or {}).get("ai_workflow") or []):
                if ai_type:
                    refs.append((ai_type, ""))
            for ai_type, scenario in refs:
                if ai_type not in catalog:
                    orphans.add(ai_type)
                    if ai_type not in first_occ:
                        first_occ[ai_type] = {
                            "dept_id": d.get("id"),
                            "dept_name": d.get("name"),
                            "process_name": p.get("name"),
                            "scenario_hint": scenario,
                        }
    # top20_roi refs (per §73.3a — also expected to resolve to catalog)
    for r in bp.get("top20_roi", []) or []:
        ai_type = r.get("ai_opportunity")
        if ai_type and ai_type not in catalog and ai_type not in orphans:
            orphans.add(ai_type)
            first_occ[ai_type] = {
                "dept_id": 0,
                "dept_name": r.get("department", "Top-20 ROI"),
                "process_name": f"ROI rank {r.get('rank', '?')}",
                "scenario_hint": r.get("value_driver", "") or r.get("opportunity_name", ""),
            }
    return orphans, first_occ


def derived_catalog_entry(ai_type: str, ctx: dict) -> dict:
    """Build a §73.3b-compliant derived catalog entry for an orphan AI type."""
    scenario = (
        ctx["scenario_hint"]
        or f"{ai_type} used by {ctx['process_name']} in {ctx['dept_name']}"
    )
    return {
        "ai_type": ai_type,
        "scenario": scenario,
        "derived": True,
        "data": {
            "derived": True,
            "training_data": f"[operator: training data sources for {ai_type}]",
            "inference_inputs": f"[operator: real-time inputs for {ai_type}]",
            "features": "[operator: feature engineering notes]",
            "lineage": "[operator: data lineage diagram link]",
            "freshness_sla": "[operator: e.g. 5 min / 1 hour / daily]",
        },
        "model": {
            "derived": True,
            "architecture": "[operator: e.g. XGBoost / Transformer / LangGraph]",
            "framework": "[operator: PyTorch / TF / sklearn]",
            "version": "[operator: semver tag]",
            "prompt_registry": "[operator: prompt id + version if LLM]",
            "runtime": "[operator: vLLM / Ollama / Triton]",
        },
        "accuracy": {
            "derived": True,
            "holdout_metrics": "[operator: precision / recall / F1 / AUC]",
            "per_segment": "[operator: per-customer-segment metrics]",
            "per_group": "[operator: fairness across protected groups]",
            "drift_status": "[operator: PSI / KS stable / drifting]",
        },
        "benchmark": {
            "derived": True,
            "vs_prior_version": "[operator: delta vs previous model]",
            "vs_industry": "[operator: industry benchmark]",
            "vs_rule_only": "[operator: lift vs rule-based baseline]",
            "vs_human": "[operator: lift vs human reviewer]",
        },
        "stakeholder": {
            "derived": True,
            "owner": "[operator: model owner / team]",
            "sponsor": "[operator: business sponsor]",
            "consumer": ctx["process_name"] or "[operator: downstream consumer]",
            "escalation": "[operator: L1 → L2 → L3 contacts]",
            "on_call": "[operator: PagerDuty / Opsgenie schedule]",
        },
        "_note": f"Auto-back-filled from first reference at {ctx['dept_name']} → {ctx['process_name']}. Per §73.3a referential integrity.",
    }


def main() -> int:
    bp = json.loads(BLUEPRINT.read_text())
    orphans, first_occ = collect_orphans(bp)
    if not orphans:
        print("No orphan AI references found. Catalog is in sync.")
        return 0

    catalog = bp.setdefault("ai_opportunities", [])
    existing = {r.get("ai_type") for r in catalog if r.get("ai_type")}
    added = 0
    for ai_type in sorted(orphans):
        if ai_type in existing:
            continue
        catalog.append(derived_catalog_entry(ai_type, first_occ[ai_type]))
        added += 1

    BLUEPRINT.write_text(json.dumps(bp, indent=2, ensure_ascii=False))
    print(f"Back-filled {added} orphan AI types into ai_opportunities.")
    print(f"Catalog now has {len(catalog)} entries (was {len(catalog) - added}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
