"""§140 · Build per-dept × per-technique use case matrix.

19 depts × 18 techniques = 342 cells. Each cell: spec.md + script.py +
dataset_ref + metrics.json + drill.py + manifest.

Honest §57.7 scaffolding: cells without real data → impl_level='spec_only'
or 'scaffold'. Cells with realisable data → 'tiny_demo' (one-shot trained).
"""
from __future__ import annotations
import json
import os
from datetime import datetime
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
ROOT = R / "data/use_case_matrix"
ROOT.mkdir(parents=True, exist_ok=True)

# ─── 19 mandatory departments per §140.2 ───
DEPARTMENTS = [
    "marketing", "hr", "sales", "finance", "operations", "legal",
    "procurement", "customer-support", "engineering",
    "security-operations", "supply-chain", "it-operations",
    "claims", "underwriting", "policy-admin",
    "distribution", "customer-experience",
    "fraud-investigation", "actuarial",
]

# ─── 18 mandatory techniques per §140.3 ───
TECHNIQUES = {
    "cv-segmentation":  {"family": "CV",    "lib": "segmentation_models_pytorch",
                          "ref_model": "U-Net",      "needs": "images"},
    "cv-detection":     {"family": "CV",    "lib": "ultralytics",
                          "ref_model": "YOLOv8n",    "needs": "images + bboxes"},
    "cv-classification":{"family": "CV",    "lib": "timm",
                          "ref_model": "resnet18",   "needs": "images"},
    "nlp-general":      {"family": "NLP",   "lib": "spacy + distilbert",
                          "ref_model": "distilbert-base-uncased", "needs": "text"},
    "dl-pytorch":       {"family": "DL",    "lib": "torch",
                          "ref_model": "Custom CNN", "needs": "tabular/imgs"},
    "time-series":      {"family": "TS",    "lib": "darts",
                          "ref_model": "Prophet+LSTM", "needs": "temporal"},
    "transformer":      {"family": "NLP",   "lib": "transformers",
                          "ref_model": "distilbert",  "needs": "text"},
    "roberta":          {"family": "NLP",   "lib": "transformers",
                          "ref_model": "roberta-base", "needs": "text"},
    "gan":              {"family": "Gen",   "lib": "torch",
                          "ref_model": "Vanilla GAN", "needs": "samples"},
    "vae":              {"family": "Gen",   "lib": "torch",
                          "ref_model": "Vanilla VAE", "needs": "samples"},
    "rnn-lstm":         {"family": "DL",    "lib": "torch",
                          "ref_model": "LSTM",       "needs": "sequences"},
    "reinforcement-learning": {"family": "RL", "lib": "stable_baselines3",
                          "ref_model": "PPO",        "needs": "env+reward"},
    "rlhf":             {"family": "Train", "lib": "TRL · DPO",
                          "ref_model": "PPO + reward model", "needs": "preferences"},
    "hitl-workflow":    {"family": "Ops",   "lib": "custom queue",
                          "ref_model": "Confidence-tier gate", "needs": "review queue"},
    "small-data-fewshot":{"family": "ML",   "lib": "sentence-transformers",
                          "ref_model": "MiniLM + cosine", "needs": "few labels"},
    "autoreview":       {"family": "Ops",   "lib": "§122 brutal scorer",
                          "ref_model": "Self-eval loop", "needs": "model outputs"},
    "tool-search":      {"family": "Ops",   "lib": "skill.sh · §136",
                          "ref_model": "Skill registry lookup", "needs": "tool catalog"},
    "fable-5":          {"family": "Sim",   "lib": "TBD · operator clarify",
                          "ref_model": "AWAITING CLARIFICATION", "needs": "n/a"},
}

# ─── Which technique fits which dept (impl_level hint) ───
# 'tiny_demo' = can wire a one-shot demo today; 'scaffold' = honest stub
DEPT_FIT = {
    "marketing":       ["nlp-general", "transformer", "roberta", "time-series",
                         "small-data-fewshot", "hitl-workflow", "autoreview", "tool-search"],
    "hr":              ["nlp-general", "transformer", "small-data-fewshot",
                         "hitl-workflow", "autoreview", "tool-search"],
    "sales":           ["time-series", "rnn-lstm", "nlp-general", "transformer",
                         "small-data-fewshot", "hitl-workflow", "autoreview", "tool-search"],
    "finance":         ["time-series", "rnn-lstm", "reinforcement-learning", "vae",
                         "hitl-workflow", "autoreview", "tool-search"],
    "operations":      ["time-series", "rnn-lstm", "dl-pytorch", "reinforcement-learning",
                         "hitl-workflow", "autoreview", "tool-search"],
    "legal":           ["nlp-general", "transformer", "roberta", "small-data-fewshot",
                         "hitl-workflow", "autoreview", "tool-search"],
    "procurement":     ["time-series", "nlp-general", "vae", "small-data-fewshot",
                         "hitl-workflow", "autoreview", "tool-search"],
    "customer-support":["nlp-general", "transformer", "roberta", "rlhf",
                         "small-data-fewshot", "hitl-workflow", "autoreview", "tool-search"],
    "engineering":     ["dl-pytorch", "rnn-lstm", "transformer", "reinforcement-learning",
                         "autoreview", "tool-search"],
    "security-operations": ["cv-classification", "cv-detection", "nlp-general",
                         "vae", "rnn-lstm", "hitl-workflow", "autoreview", "tool-search"],
    "supply-chain":    ["time-series", "rnn-lstm", "reinforcement-learning",
                         "vae", "hitl-workflow", "autoreview", "tool-search"],
    "it-operations":   ["time-series", "rnn-lstm", "vae", "reinforcement-learning",
                         "hitl-workflow", "autoreview", "tool-search"],
    "claims":          ["cv-segmentation", "cv-detection", "cv-classification",
                         "nlp-general", "transformer", "time-series", "vae",
                         "hitl-workflow", "rlhf", "autoreview", "tool-search"],
    "underwriting":    ["time-series", "vae", "gan", "transformer", "small-data-fewshot",
                         "hitl-workflow", "rlhf", "autoreview", "tool-search"],
    "policy-admin":    ["nlp-general", "transformer", "rnn-lstm",
                         "hitl-workflow", "autoreview", "tool-search"],
    "distribution":    ["time-series", "rnn-lstm", "reinforcement-learning",
                         "small-data-fewshot", "hitl-workflow", "autoreview", "tool-search"],
    "customer-experience": ["nlp-general", "transformer", "roberta", "rlhf",
                         "hitl-workflow", "autoreview", "tool-search"],
    "fraud-investigation": ["vae", "gan", "cv-detection", "nlp-general",
                         "reinforcement-learning", "hitl-workflow", "autoreview", "tool-search"],
    "actuarial":       ["time-series", "rnn-lstm", "vae", "gan",
                         "small-data-fewshot", "autoreview", "tool-search"],
}


def write(path: Path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, dict):
        path.write_text(json.dumps(content, indent=2))
    else:
        path.write_text(content)


def gen_spec(dept: str, tech: str) -> str:
    info = TECHNIQUES[tech]
    fits_well = tech in DEPT_FIT.get(dept, [])
    rel = "PRIMARY" if fits_well else "Cross-cutting"
    return f"""# §140 · {dept} × {tech} · Use Case Spec

## Purpose
{rel} fit · {info["family"]} technique applied to {dept} domain.

## Library
{info["lib"]}

## Reference Model
{info["ref_model"]}

## Data Needs
{info["needs"]}

## Example use case
{dept_example_use_case(dept, tech)}

## Honest impl_level (per §57.7)
- `spec_only` if no data available
- `scaffold` if Stage-1 adapter wired (env-gated)
- `tiny_demo` if one-shot trained on synthetic or sample real
- `real_trained` if trained on real production data
- `production` if + audit row + monitoring + rollback

Current cell impl_level: see manifest.json

## Composes with
§38 audit · §43 drill · §47 arch · §51 substrate · §57.7 honest ·
§63 dept canonical · §122 brutal · §131 AI catalog · §138 artifacts ·
§139 Odysseus reference · §140 (this matrix)
"""


def dept_example_use_case(dept: str, tech: str) -> str:
    """One-sentence dept-specific use case."""
    matrix = {
        ("claims", "cv-segmentation"): "Vehicle damage region segmentation from photos.",
        ("claims", "cv-detection"): "Detect damaged parts (bumper, door, hood) with YOLO bboxes.",
        ("claims", "cv-classification"): "Classify damage severity (minor/moderate/total).",
        ("claims", "nlp-general"): "Extract claim narrative entities (date · location · cause).",
        ("claims", "transformer"): "Summarize claimant statement → adjuster brief.",
        ("claims", "time-series"): "Forecast next-30d claim volume by region.",
        ("claims", "vae"): "Detect anomalous claim filings (out-of-distribution scoring).",
        ("claims", "hitl-workflow"): "Confidence < 0.7 → adjuster manual review queue.",
        ("claims", "rlhf"): "Learn from adjuster corrections on auto-decisions.",
        ("underwriting", "time-series"): "Premium pricing curve forecasting per zip+segment.",
        ("underwriting", "vae"): "Detect rare-but-real risk profile clusters.",
        ("underwriting", "gan"): "Generate synthetic policy applications for rare profiles.",
        ("underwriting", "transformer"): "Classify application narrative risk category.",
        ("underwriting", "small-data-fewshot"): "Few-shot risk profile clustering on emerging segment.",
        ("underwriting", "hitl-workflow"): "Borderline risk applications → senior underwriter approve.",
        ("underwriting", "rlhf"): "Update from underwriter override decisions.",
        ("fraud-investigation", "vae"): "Anomaly detection on claim feature distribution.",
        ("fraud-investigation", "gan"): "Generate synthetic fraud patterns for training adversarial.",
        ("fraud-investigation", "cv-detection"): "Detect photo manipulation (image splicing) in claim evidence.",
        ("fraud-investigation", "reinforcement-learning"): "Sequential investigation routing (next-action policy).",
        ("fraud-investigation", "hitl-workflow"): "High-risk flag → SIU agent review queue.",
        ("customer-support", "transformer"): "Intent classification on incoming inquiry text.",
        ("customer-support", "roberta"): "Sentiment + escalation prediction from transcript.",
        ("customer-support", "rlhf"): "Learn from CSR feedback on bot draft replies.",
        ("customer-support", "small-data-fewshot"): "Cold-start: new product line FAQ embedding match.",
        ("customer-support", "hitl-workflow"): "Confidence < 0.6 → human CSR takes over.",
        ("marketing", "nlp-general"): "Campaign copy topic clustering.",
        ("marketing", "transformer"): "Generate copy variants for A/B test.",
        ("marketing", "time-series"): "Multi-channel attribution + spend forecasting.",
        ("marketing", "small-data-fewshot"): "New segment targeting from <50 labeled converts.",
        ("hr", "nlp-general"): "Resume entity extraction + skill matching.",
        ("hr", "transformer"): "Job description ↔ candidate similarity scoring.",
        ("hr", "small-data-fewshot"): "Niche role candidate prefiltering with few labeled examples.",
        ("hr", "hitl-workflow"): "AI shortlist → recruiter approves before outreach.",
        ("sales", "time-series"): "Pipeline forecast 30/60/90 day.",
        ("sales", "rnn-lstm"): "Lead-scoring sequence model over engagement events.",
        ("sales", "transformer"): "Email reply intent classification.",
        ("sales", "small-data-fewshot"): "Tiny new vertical: 10 labeled accounts → propensity ranking.",
        ("sales", "hitl-workflow"): "Deal > $1M → manager approves AI recommended action.",
        ("finance", "time-series"): "Loss-reserve forecasting (IBNR estimates).",
        ("finance", "rnn-lstm"): "Cash-flow seq model for daily AR/AP.",
        ("finance", "reinforcement-learning"): "Optimal payment-collection action policy.",
        ("finance", "vae"): "Anomaly detection on GL entries.",
        ("finance", "hitl-workflow"): "Flagged ledger entries → controller reviews.",
        ("operations", "time-series"): "Hourly system load forecasting.",
        ("operations", "rnn-lstm"): "Incident pattern sequence modeling.",
        ("operations", "reinforcement-learning"): "Auto-scaling action policy.",
        ("operations", "dl-pytorch"): "Custom defect classification CNN.",
        ("legal", "nlp-general"): "Clause extraction from contract PDFs.",
        ("legal", "transformer"): "Contract risk classification per clause.",
        ("legal", "roberta"): "Fine-grained legal-domain entity NER.",
        ("legal", "small-data-fewshot"): "New jurisdiction clause cluster with few labeled.",
        ("legal", "hitl-workflow"): "Risk flag → counsel reviews flagged clauses.",
        ("procurement", "time-series"): "Supplier delivery time forecasting.",
        ("procurement", "nlp-general"): "RFP requirement extraction.",
        ("procurement", "vae"): "Detect anomalous vendor billing patterns.",
        ("procurement", "small-data-fewshot"): "New supplier scoring from 5-10 historical orders.",
        ("procurement", "hitl-workflow"): "Above-threshold POs → manager approve.",
        ("engineering", "dl-pytorch"): "Code-LLM training for repo-specific completions.",
        ("engineering", "rnn-lstm"): "Build-time prediction from change history.",
        ("engineering", "transformer"): "PR summary + risk classification.",
        ("engineering", "reinforcement-learning"): "CI test ordering for faster signal.",
        ("security-operations", "cv-classification"): "Captured frame: benign vs intrusion attempt.",
        ("security-operations", "cv-detection"): "Person detection on CCTV feeds.",
        ("security-operations", "nlp-general"): "SIEM alert text severity scoring.",
        ("security-operations", "vae"): "Network log anomaly detection.",
        ("security-operations", "rnn-lstm"): "Attack sequence modeling.",
        ("security-operations", "hitl-workflow"): "P0 incidents → on-call analyst.",
        ("supply-chain", "time-series"): "Demand forecasting per SKU per region.",
        ("supply-chain", "rnn-lstm"): "Lead-time sequence model.",
        ("supply-chain", "reinforcement-learning"): "Inventory replenishment policy.",
        ("supply-chain", "vae"): "Demand anomaly (sudden spikes) detection.",
        ("supply-chain", "hitl-workflow"): "Above-threshold reorders → planner reviews.",
        ("it-operations", "time-series"): "Disk fill forecasting per host.",
        ("it-operations", "rnn-lstm"): "Log-event sequence anomaly.",
        ("it-operations", "vae"): "OS-metric anomaly detection.",
        ("it-operations", "reinforcement-learning"): "Auto-remediation action policy.",
        ("it-operations", "hitl-workflow"): "P0 outage → SRE on-call.",
        ("policy-admin", "nlp-general"): "Endorsement text extraction + categorization.",
        ("policy-admin", "transformer"): "Cancellation reason classification.",
        ("policy-admin", "rnn-lstm"): "Policy lifecycle event sequence model.",
        ("policy-admin", "hitl-workflow"): "Edge-case endorsements → human review.",
        ("distribution", "time-series"): "Agent productivity forecasting.",
        ("distribution", "rnn-lstm"): "Producer engagement seq → churn risk.",
        ("distribution", "reinforcement-learning"): "Optimal commission tier policy.",
        ("distribution", "small-data-fewshot"): "New channel partner scoring.",
        ("distribution", "hitl-workflow"): "Above-threshold commissions → finance approves.",
        ("customer-experience", "transformer"): "Voice-call transcript intent classification.",
        ("customer-experience", "roberta"): "Detailed sentiment shifts over journey.",
        ("customer-experience", "rlhf"): "Bot draft → CX expert feedback → retrain.",
        ("customer-experience", "hitl-workflow"): "NPS detractor → retention specialist outreach.",
        ("actuarial", "time-series"): "Mortality table updates from rolling cohorts.",
        ("actuarial", "rnn-lstm"): "Claims development seq model.",
        ("actuarial", "vae"): "Anomaly detection on loss curves.",
        ("actuarial", "gan"): "Generate synthetic loss curves for stress testing.",
        ("actuarial", "small-data-fewshot"): "New product line reserving with few historical years.",
    }
    return matrix.get((dept, tech),
        f"{dept.replace('-', ' ').title()} use case applying {tech} to {TECHNIQUES[tech]['needs']}.")


def gen_script(dept: str, tech: str) -> str:
    info = TECHNIQUES[tech]
    if tech == "fable-5":
        return f'''"""§140 · {dept} × {tech} · Fable 5 scaffold · AWAITING CLARIFICATION.

Per §57.7 honest stance: 'Fable 5' is not known unambiguously.
Operator clarification required: framework? eval bench? sim library?

When clarified, re-run scripts/use_case_matrix/build.py to regenerate.
"""

def run():
    return {{"awaiting_clarification": True, "spec": "§140 · fable-5"}}


if __name__ == "__main__":
    print(run())
'''
    return f'''"""§140 · {dept} × {tech} scaffold · {info["family"]}/{info["ref_model"]}.

Honest §57.7 scaffold. Wire real impl when:
- dataset for {dept} is available + labeled
- {info["lib"]} installed
- GPU available (if needed)

Reference impl pattern:
    1. Load data from dept-specific PostgreSQL table
    2. Preprocess (split, tokenize / resize)
    3. Instantiate {info["ref_model"]}
    4. Train / fine-tune
    5. Evaluate · save metrics.json · emit audit row per §38.3
"""

def run():
    return {{
        "dept": "{dept}",
        "technique": "{tech}",
        "ref_model": "{info["ref_model"]}",
        "lib": "{info["lib"]}",
        "impl_level": "scaffold",
        "honest_caveat": "Real impl pending dataset + lib install + GPU",
        "spec": "§140",
    }}


if __name__ == "__main__":
    import json
    print(json.dumps(run(), indent=2))
'''


def gen_dataset_ref(dept: str, tech: str) -> dict:
    return {
        "dept": dept, "technique": tech,
        "primary_source": dept_data_source(dept),
        "needs": TECHNIQUES[tech]["needs"],
        "sample_query": f"SELECT * FROM {dept_table(dept)} LIMIT 100",
        "honest_caveat": "Real DB-backed data not yet wired per cell",
        "spec": "§140",
    }


def dept_data_source(dept: str) -> str:
    return {
        "claims": "claims_record",
        "marketing": "marketing_campaigns + marketing_kpis",
        "customer-support": "agent_invocation (where tag='cs')",
        "finance": "voice_ai_customers (proxy until finance_record exists)",
        "hr": "stakeholder (proxy)",
        "sales": "voice_ai_customers",
        "engineering": "deploy_manifest",
        "security-operations": "agent_trace_event (where status='failed')",
    }.get(dept, "(dept-specific table TBD)")


def dept_table(dept: str) -> str:
    return dept_data_source(dept).split()[0]


def gen_metrics(dept: str, tech: str, impl_level: str) -> dict:
    return {
        "dept": dept, "technique": tech,
        "impl_level": impl_level,
        "metric_name": "n/a · scaffold",
        "metric_value": None,
        "honest_caveat": "Metrics are scaffold-zero until trained on real data",
        "computed_at": datetime.now().isoformat(),
        "spec": "§140",
    }


def gen_drill(dept: str, tech: str) -> str:
    safe = (dept.replace("-", "_"), tech.replace("-", "_"))
    return f'''"""§140 · {dept} × {tech} drill · ≥1 pos + ≥1 neg."""
import json
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
CELL = R / "data/use_case_matrix/{dept}/{tech}"


def test_spec_exists():
    """POSITIVE · spec.md must exist."""
    assert (CELL / "spec.md").exists()


def test_manifest_has_dept_and_technique():
    """POSITIVE · manifest names both dimensions."""
    m = json.loads((CELL / "manifest.json").read_text())
    assert m["dept"] == "{dept}"
    assert m["technique"] == "{tech}"


def test_metrics_not_fabricated():
    """NEGATIVE · scaffold metrics MUST declare honest_caveat (per §57.7)."""
    m = json.loads((CELL / "metrics.json").read_text())
    if m.get("impl_level") in ("spec_only", "scaffold"):
        assert "honest_caveat" in m, "scaffold cell must declare honest_caveat"
'''


def gen_manifest(dept: str, tech: str, impl_level: str) -> dict:
    return {
        "dept": dept,
        "technique": tech,
        "impl_level": impl_level,
        "score": 0.5 if impl_level == "scaffold" else 0.2,
        "last_run": datetime.now().isoformat(),
        "spec": "§140",
    }


def main():
    print(f"\n[§140] Build use case matrix · {datetime.now()}")
    print("─" * 75)
    count = 0
    levels = {"spec_only": 0, "scaffold": 0}
    for dept in DEPARTMENTS:
        for tech in TECHNIQUES:
            cell = ROOT / dept / tech
            impl_level = "scaffold" if tech in DEPT_FIT.get(dept, []) else "spec_only"
            write(cell / "spec.md", gen_spec(dept, tech))
            write(cell / "script.py", gen_script(dept, tech))
            write(cell / "dataset_ref.json", gen_dataset_ref(dept, tech))
            write(cell / "metrics.json", gen_metrics(dept, tech, impl_level))
            write(cell / "drill.py", gen_drill(dept, tech))
            write(cell / "manifest.json", gen_manifest(dept, tech, impl_level))
            count += 1
            levels[impl_level] += 1

    # Aggregate matrix index
    matrix_index = []
    for dept in DEPARTMENTS:
        row = {"dept": dept, "by_tech": {}}
        for tech in TECHNIQUES:
            m = json.loads((ROOT / dept / tech / "manifest.json").read_text())
            row["by_tech"][tech] = m["impl_level"]
        matrix_index.append(row)
    write(ROOT / "matrix_index.json", {
        "n_depts": len(DEPARTMENTS),
        "n_techniques": len(TECHNIQUES),
        "n_cells": count,
        "by_impl_level": levels,
        "matrix": matrix_index,
        "computed_at": datetime.now().isoformat(),
        "spec": "§140",
    })

    print(f"  cells written: {count}")
    print(f"  scaffold:      {levels['scaffold']}")
    print(f"  spec_only:     {levels['spec_only']}")
    print(f"  matrix index:  data/use_case_matrix/matrix_index.json")


if __name__ == "__main__":
    main()
