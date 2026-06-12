"""§141 · Scaffold runners for the 6 OTHER fine-tune scenarios.

Each scaffold honestly declares what it would do · safer than fabricating
metrics. Real runs require GPU + balanced dataset + preference pairs.

Run individually:
  python scaffolds.py qlora
  python scaffolds.py full
  python scaffolds.py ppo
  python scaffolds.py dpo
  python scaffolds.py distillation
  python scaffolds.py prompt
"""
from __future__ import annotations
import json
import sys
from datetime import datetime
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
LOG = R / "data/finetune"
LOG.mkdir(parents=True, exist_ok=True)


def emit(scenario: str, content: dict):
    out = {"scenario": scenario,
            **content,
            "ts_local": datetime.now().isoformat(),
            "synthetic": False, "honest_scaffold": True,
            "spec": "§141 fine-tune"}
    (LOG / f"{scenario}_scaffold.json").write_text(json.dumps(out, indent=2))
    print(f"  ✓ {scenario} scaffold → {LOG}/{scenario}_scaffold.json")


def qlora():
    emit("qlora", {
        "purpose": "4-bit base + LoRA · larger base model in same memory budget",
        "base_model_candidate": "llama3.2:1b OR phi-2 OR qwen2.5:0.5b",
        "method": "bitsandbytes 4-bit · peft LoraConfig",
        "needed_lib": "bitsandbytes (NOT INSTALLED)",
        "needed_data": "labeled task dataset (≥500 rows)",
        "needed_compute": "CPU works but slow · GPU 8GB ideal",
        "estimated_runtime_cpu": "30-60 min for 2 epochs",
        "deepa_save_path": "/mnt/deepa/models/finetuned/qlora-<task>/",
        "drill_negative": "untrained model should perform at chance",
        "next_step": "pip install bitsandbytes accelerate · then mirror lora_demo.py",
    })


def full_finetune():
    emit("full", {
        "purpose": "Update ALL parameters · highest quality · highest cost",
        "base_model_candidate": "distilbert-base-uncased OR TinyLlama-1.1B",
        "method": "transformers.Trainer · learning_rate=2e-5 · 3 epochs",
        "needed_compute": "GPU required (CPU too slow for full param)",
        "estimated_runtime_gpu_t4": "10-30 min · CPU 6+ hours",
        "deepa_save_path": "/mnt/deepa/models/finetuned/full-<task>/",
        "drill_negative": "test set perplexity must drop vs base",
        "next_step": "ensure GPU is visible · run full-param training script",
    })


def ppo():
    emit("ppo", {
        "purpose": "Policy optimization with reward model (RLHF stage 2)",
        "base_model_candidate": "llama3.2:1b SFT-checkpoint",
        "method": "trl.PPOTrainer · reward model + value head",
        "needed_lib": "trl (NOT INSTALLED) · transformers · peft",
        "needed_data": "preference pairs (chosen/rejected) OR scalar rewards",
        "data_source_for_insur": "agent_invocation human_override field as proxy reward",
        "needed_compute": "GPU recommended · 2x H100 for stable training",
        "estimated_runtime_gpu": "1-3 hours · CPU not practical",
        "deepa_save_path": "/mnt/deepa/models/finetuned/ppo-rlhf-<task>/",
        "next_step": "pip install trl · prepare reward signal from corrections table",
    })


def dpo():
    emit("dpo", {
        "purpose": "Direct Preference Optimization · simpler than PPO",
        "base_model_candidate": "llama3.2:1b SFT-checkpoint",
        "method": "trl.DPOTrainer · pairwise preferences only · no reward model needed",
        "needed_lib": "trl (NOT INSTALLED) · transformers",
        "needed_data": "preference pairs (chosen vs rejected response)",
        "data_source_for_insur": "agent_invocation pairs where one rejected by HITL",
        "needed_compute": "GPU recommended · less than PPO",
        "estimated_runtime_gpu": "30-60 min for 1000 pairs",
        "deepa_save_path": "/mnt/deepa/models/finetuned/dpo-<task>/",
        "next_step": "pip install trl · curate preference dataset from audit logs",
    })


def distillation():
    emit("distillation", {
        "purpose": "Shrink large teacher → small student · keep accuracy",
        "teacher_candidate": "llama3.1:8b OR qwen2.5-coder:14b",
        "student_candidate": "llama3.2:1b OR distilbert-base",
        "method": "KL divergence on teacher logits + task loss · 2-3x compression",
        "needed_data": "task dataset (no labels needed for response distillation)",
        "needed_compute": "GPU for teacher inference + student training",
        "estimated_runtime_gpu": "1-2 hours for 5k samples",
        "deepa_save_path": "/mnt/deepa/models/finetuned/distill-<task>/",
        "next_step": "implement KL distillation loop · evaluate student quality",
    })


def prompt():
    emit("prompt", {
        "purpose": "Soft prompt tuning · learn embeddings only · tiny",
        "base_model_candidate": "distilbert-base-uncased",
        "method": "peft.PromptTuningConfig · 20 virtual tokens",
        "needed_data": "small labeled task dataset (100-500)",
        "needed_compute": "CPU works · fastest of all methods",
        "estimated_runtime_cpu": "5-10 min for classification",
        "deepa_save_path": "/mnt/deepa/models/finetuned/prompt-<task>/",
        "next_step": "use peft.PromptTuningConfig + LoraConfig together (DESCRIPTOR)",
    })


def main():
    if len(sys.argv) < 2:
        print("Usage: scaffolds.py <qlora|full|ppo|dpo|distillation|prompt|all>")
        sys.exit(2)
    cmd = sys.argv[1]
    fns = {"qlora": qlora, "full": full_finetune, "ppo": ppo, "dpo": dpo,
           "distillation": distillation, "prompt": prompt}
    if cmd == "all":
        for f in fns.values():
            f()
    elif cmd in fns:
        fns[cmd]()
    else:
        print("Unknown:", cmd); sys.exit(2)


if __name__ == "__main__":
    main()
