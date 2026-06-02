#!/usr/bin/env python3
"""agent_token_logger — wrap every Ollama call with token + purpose accounting.

Per operator 2026-06-01 token-budget mechanism + global §41.1 cost cap.

Logs to .agent/token_usage.jsonl with: ts, task_id, purpose, model,
prompt_eval_count (input), eval_count (output), total_duration_ns, status.

Auto-rolls up to .agent/token_summary.md per call.

Usage as library:
    from scripts.agent_token_logger import call
    answer = call(model="qwen2.5-coder:7b",
                  prompt="fix this fn",
                  purpose="coding",
                  task_id="TASK-042")

CLI:
    python scripts/agent_token_logger.py qwen2.5-coder:3b "hello" --purpose=planning
    python scripts/agent_token_logger.py --summary             # print table
    python scripts/agent_token_logger.py --budget 20000        # warn if any task > 20k
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import requests

REPO = Path(__file__).resolve().parents[1]
AGENT_DIR = REPO / ".agent"
AGENT_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = AGENT_DIR / "token_usage.jsonl"
SUMMARY_FILE = AGENT_DIR / "token_summary.md"
OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")

VALID_PURPOSES = {
    "planning", "coding", "debugging", "testing", "review",
    "documentation", "summarization", "monitoring",
}


def call(model: str, prompt: str, purpose: str = "coding",
         task_id: str = "TASK-AD-HOC", num_ctx: int | None = None,
         temperature: float = 0.1, timeout: int = 300) -> dict[str, Any]:
    """Call Ollama, log token usage, return the response body."""
    if purpose not in VALID_PURPOSES:
        purpose = "coding"  # fallback
    payload: dict[str, Any] = {
        "model": model, "prompt": prompt, "stream": False,
        "options": {"temperature": temperature},
    }
    if num_ctx:
        payload["options"]["num_ctx"] = num_ctx
    t0 = time.time()
    try:
        r = requests.post(f"{OLLAMA}/api/generate", json=payload, timeout=timeout)
        r.raise_for_status()
        body = r.json()
        status = "success"
        err = None
    except Exception as e:
        body = {}
        status = "fail"
        err = f"{type(e).__name__}: {str(e)[:200]}"
    wall_ms = int((time.time() - t0) * 1000)

    row = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "task_id": task_id,
        "purpose": purpose,
        "model": model,
        "input_tokens": body.get("prompt_eval_count", 0),
        "output_tokens": body.get("eval_count", 0),
        "total_tokens": body.get("prompt_eval_count", 0) + body.get("eval_count", 0),
        "duration_ns": body.get("total_duration"),
        "wall_ms": wall_ms,
        "status": status,
        "error": err,
    }
    with LOG_FILE.open("a") as f:
        f.write(json.dumps(row) + "\n")

    # Roll summary every 5 calls
    if sum(1 for _ in LOG_FILE.open()) % 5 == 0:
        write_summary()

    return {**body, "_logged_row": row, "response": body.get("response", "")}


def write_summary() -> None:
    """Aggregate token_usage.jsonl → token_summary.md."""
    if not LOG_FILE.exists():
        SUMMARY_FILE.write_text("# token_summary.md\n\n(no calls yet)\n")
        return
    by_purpose: dict[str, dict] = defaultdict(
        lambda: {"calls": 0, "input": 0, "output": 0, "total": 0, "ms": 0})
    by_model: dict[str, dict] = defaultdict(
        lambda: {"calls": 0, "input": 0, "output": 0, "total": 0, "ms": 0})
    by_task: dict[str, dict] = defaultdict(
        lambda: {"calls": 0, "total": 0})
    grand_total = 0
    fails = 0
    for ln in LOG_FILE.read_text().splitlines():
        if not ln.strip():
            continue
        try:
            r = json.loads(ln)
        except json.JSONDecodeError:
            continue
        for bucket, key in [(by_purpose, "purpose"), (by_model, "model")]:
            b = bucket[r[key]]
            b["calls"] += 1
            b["input"] += r.get("input_tokens", 0)
            b["output"] += r.get("output_tokens", 0)
            b["total"] += r.get("total_tokens", 0)
            b["ms"] += r.get("wall_ms", 0)
        t = by_task[r.get("task_id", "?")]
        t["calls"] += 1
        t["total"] += r.get("total_tokens", 0)
        grand_total += r.get("total_tokens", 0)
        if r.get("status") == "fail":
            fails += 1

    lines = [
        f"# token_summary.md — generated {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        "",
        f"**Grand total tokens**: {grand_total:,}",
        f"**Calls**: {sum(p['calls'] for p in by_purpose.values())}",
        f"**Failures**: {fails}",
        "",
        "## By purpose",
        "| Purpose | Calls | Input | Output | Total | Avg ms |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for p, s in sorted(by_purpose.items(), key=lambda kv: -kv[1]["total"]):
        avg = s["ms"] // max(s["calls"], 1)
        lines.append(f"| {p} | {s['calls']} | {s['input']:,} | {s['output']:,} | {s['total']:,} | {avg} |")
    lines += ["", "## By model",
              "| Model | Calls | Input | Output | Total | Avg ms |",
              "|---|---:|---:|---:|---:|---:|"]
    for m, s in sorted(by_model.items(), key=lambda kv: -kv[1]["total"]):
        avg = s["ms"] // max(s["calls"], 1)
        lines.append(f"| {m} | {s['calls']} | {s['input']:,} | {s['output']:,} | {s['total']:,} | {avg} |")
    lines += ["", "## Top 10 tasks by token spend",
              "| Task | Calls | Total |", "|---|---:|---:|"]
    for t, s in sorted(by_task.items(), key=lambda kv: -kv[1]["total"])[:10]:
        lines.append(f"| {t} | {s['calls']} | {s['total']:,} |")
    SUMMARY_FILE.write_text("\n".join(lines) + "\n")


def check_budget(threshold: int) -> int:
    """Return number of tasks over budget. Print warnings to stderr."""
    if not LOG_FILE.exists():
        return 0
    by_task: dict[str, int] = defaultdict(int)
    for ln in LOG_FILE.read_text().splitlines():
        try:
            r = json.loads(ln)
        except json.JSONDecodeError:
            continue
        by_task[r.get("task_id", "?")] += r.get("total_tokens", 0)
    over = [(t, n) for t, n in by_task.items() if n > threshold]
    for t, n in sorted(over, key=lambda kv: -kv[1]):
        print(f"WARN: {t} used {n:,} tokens (over {threshold:,})", file=sys.stderr)
    return len(over)


def main() -> None:
    ap = argparse.ArgumentParser(description="Ollama call w/ token + purpose accounting")
    ap.add_argument("model", nargs="?", help="Ollama model name (e.g. qwen2.5-coder:3b)")
    ap.add_argument("prompt", nargs="?", help="The prompt")
    ap.add_argument("--purpose", default="coding",
                    help=f"one of {sorted(VALID_PURPOSES)}")
    ap.add_argument("--task-id", default="TASK-AD-HOC")
    ap.add_argument("--num-ctx", type=int, default=None)
    ap.add_argument("--summary", action="store_true", help="Just write+print summary")
    ap.add_argument("--budget", type=int, help="Warn if any task exceeds this token count")
    args = ap.parse_args()

    if args.budget:
        n_over = check_budget(args.budget)
        if n_over:
            print(f"\n{n_over} task(s) over budget", file=sys.stderr)
        sys.exit(0 if n_over == 0 else 1)

    if args.summary:
        write_summary()
        print(SUMMARY_FILE.read_text())
        return

    if not args.model or not args.prompt:
        ap.error("model and prompt are required (or use --summary / --budget)")

    res = call(model=args.model, prompt=args.prompt, purpose=args.purpose,
               task_id=args.task_id, num_ctx=args.num_ctx)
    print(res.get("response", ""))
    row = res["_logged_row"]
    print(f"\n--- {row['input_tokens']}↑ + {row['output_tokens']}↓ = "
          f"{row['total_tokens']} tokens · {row['wall_ms']}ms · "
          f"purpose={row['purpose']} task={row['task_id']}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
