"""§141 · LoRA fine-tune demo · DistilBERT on REAL agent_invocation status.

CPU-friendly · PEFT LoRA · trains in <5 min on CPU.
Honest §57.7: this trains a CLASSIFIER LoRA · saves to /mnt/deepa/models/finetuned/
"""
from __future__ import annotations
import json
import os
import sys
import warnings
from datetime import datetime
from pathlib import Path
warnings.filterwarnings("ignore")

os.environ["USE_TF"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import numpy as np
import pandas as pd
import psycopg2
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import LoraConfig, get_peft_model, TaskType
from sklearn.metrics import accuracy_score, f1_score

R = Path("/mnt/deepa/insur_project")
SAVE = Path("/mnt/deepa/models/finetuned/distilbert-lora-status")
SAVE.mkdir(parents=True, exist_ok=True)
LOG = R / "data/finetune"; LOG.mkdir(parents=True, exist_ok=True)


def load_real():
    conn = psycopg2.connect(host="localhost", port=5434, user="insur_user",
                             password="insur_secret_password", dbname="insur_analytics")
    df = pd.read_sql_query("""
        SELECT COALESCE(input_text, output_text, agent_id) AS text,
               CASE WHEN status='Success' THEN 1 ELSE 0 END AS y
        FROM agent_invocation
        WHERE LENGTH(COALESCE(input_text, output_text, agent_id, '')) > 5
        LIMIT 1000
    """, conn)
    conn.close()
    return df


class TextDS(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=64):
        self.texts = texts; self.labels = labels; self.tok = tokenizer; self.max_len = max_len
    def __len__(self): return len(self.texts)
    def __getitem__(self, i):
        enc = self.tok(self.texts[i], padding="max_length", truncation=True,
                        max_length=self.max_len, return_tensors="pt")
        return {"input_ids": enc["input_ids"][0],
                "attention_mask": enc["attention_mask"][0],
                "labels": torch.tensor(self.labels[i], dtype=torch.long)}


def main():
    print(f"\n[§141] LoRA fine-tune DistilBERT · REAL data · {datetime.now()}")
    print("=" * 70)
    df = load_real()
    print(f"  Loaded {len(df)} real samples · class balance: {df['y'].value_counts().to_dict()}")

    base = "distilbert-base-uncased"
    tok = AutoTokenizer.from_pretrained(base)
    model = AutoModelForSequenceClassification.from_pretrained(base, num_labels=2)

    # LoRA config · rank=4 · alpha=8 · light
    lora_cfg = LoraConfig(
        task_type=TaskType.SEQ_CLS, r=4, lora_alpha=8, lora_dropout=0.1,
        target_modules=["q_lin", "v_lin"], bias="none",
    )
    model = get_peft_model(model, lora_cfg)
    n_trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    n_total = sum(p.numel() for p in model.parameters())
    print(f"  Trainable: {n_trainable:,} / Total: {n_total:,} ({n_trainable/n_total*100:.2f}%)")

    texts = df["text"].astype(str).tolist()
    labels = df["y"].tolist()
    n = len(texts)
    split = int(0.8 * n)
    train_ds = TextDS(texts[:split], labels[:split], tok)
    test_ds = TextDS(texts[split:], labels[split:], tok)
    train_dl = DataLoader(train_ds, batch_size=8, shuffle=True)
    test_dl = DataLoader(test_ds, batch_size=8)

    opt = torch.optim.AdamW(model.parameters(), lr=5e-4)
    model.train()
    losses = []
    for epoch in range(2):
        for batch in train_dl:
            opt.zero_grad()
            out = model(**batch)
            out.loss.backward()
            opt.step()
            losses.append(float(out.loss.item()))
        print(f"  Epoch {epoch+1}/2 · last loss: {losses[-1]:.4f}")

    model.train(False)
    preds, gts = [], []
    with torch.no_grad():
        for batch in test_dl:
            logits = model(input_ids=batch["input_ids"],
                            attention_mask=batch["attention_mask"]).logits
            p = logits.argmax(-1).tolist()
            preds.extend(p)
            gts.extend(batch["labels"].tolist())
    acc = float(accuracy_score(gts, preds))
    f1 = float(f1_score(gts, preds, average="weighted", zero_division=0))
    print(f"  Test acc: {acc:.4f}  F1: {f1:.4f}")

    # Save LoRA adapter to deepa drive
    model.save_pretrained(str(SAVE))
    tok.save_pretrained(str(SAVE))
    print(f"  Saved LoRA adapter → {SAVE}")

    metrics = {
        "method": "LoRA fine-tune",
        "base_model": base,
        "task": "agent_invocation status classification",
        "lora_rank": 4, "lora_alpha": 8,
        "trainable_params": n_trainable, "total_params": n_total,
        "trainable_pct": round(n_trainable / n_total * 100, 4),
        "n_samples_train": split, "n_samples_test": n - split,
        "n_epochs": 2,
        "final_loss": float(losses[-1]),
        "accuracy": round(acc, 4), "f1_weighted": round(f1, 4),
        "save_path": str(SAVE),
        "data_source": "REAL · agent_invocation",
        "synthetic": False,
        "trained_at": datetime.now().isoformat(),
        "spec": "§141 LoRA",
    }
    (LOG / "lora_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  Metrics → {LOG}/lora_metrics.json")


if __name__ == "__main__":
    main()
