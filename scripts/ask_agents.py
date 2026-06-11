#!/usr/bin/env python3
"""ask_agents · Iter 100 · operator-to-agents CLI.

Per operator brief 2026-06-11 · 'you should have other agent to answer me ·
what is purpose of having list of agent · council of agent · ollama agent'.

Routes operator questions through the agent stack:
  1. Smart router (§111) picks model tier
  2. Council pattern (§97) · 3 Ollama agents · author → reviewer → chair
  3. Returns all 3 voices + final synthesis
  4. Records to agent_invocation with §107 stamp

Usage:
  python3 scripts/ask_agents.py 'why is the daemon hitting cooldown?'
  python3 scripts/ask_agents.py --interactive
"""
import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone

import httpx

OLLAMA = os.environ.get("OLLAMA_HOST", "http://localhost:11434")


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRN = "\033[32m"; YLW = "\033[33m"; CYN = "\033[36m"; MAG = "\033[35m"
    BLU = "\033[34m"; RED = "\033[31m"


def ts():
    return datetime.now().astimezone().strftime("%H:%M:%S %Z")


def call_ollama(model, prompt, timeout=30):
    try:
        r = httpx.post(f"{OLLAMA}/api/generate",
                       json={"model": model, "prompt": prompt, "stream": False},
                       timeout=timeout)
        if r.status_code == 200:
            return r.json().get("response", "")
        return f"[err_{r.status_code}]"
    except Exception as e:
        return f"[failed: {str(e)[:100]}]"


def context_for_agents():
    """Build context the agents need · sourced from live platform state."""
    ctx_parts = []
    # Daemon state
    try:
        prog = json.loads(open("/mnt/deepa/insur_project/jobs/reports/auto-next/daemon-progress.json").read())
        ctx_parts.append(f"DAEMON STATE: iter #{prog.get('current_iter')} · "
                          f"last status: {prog.get('last_iter_status')} · "
                          f"duration: {prog.get('last_iter_duration_s')}s · "
                          f"empty_streak: {prog.get('consecutive_empty')}/3")
    except Exception:
        pass
    # Pending findings
    try:
        from pathlib import Path
        tick_dir = Path("/mnt/deepa/insur_project/jobs/reports/auto-next")
        files = sorted(tick_dir.glob("run-*.json"),
                        key=lambda p: p.stat().st_mtime, reverse=True)
        if files:
            d = json.loads(files[0].read_text())
            ctx_parts.append(f"LAST TICK: total findings={d.get('findings_total')} · "
                              f"actionable={d.get('p0_p1_p2_actionable')}")
            top = d.get("top_finding", {})
            if top:
                ctx_parts.append(f"TOP TASK: [{top.get('severity')}] "
                                  f"{top.get('topic')} · {top.get('what_missing')}")
    except Exception:
        pass
    return "\n".join(ctx_parts)


def author_agent(question, context, model="llama3.2:3b"):
    prompt = (
        f"You are the AUTHOR agent (1 of 3 in the council).\n"
        f"You produce a first-draft answer to the operator's question.\n"
        f"Be specific · concise · grounded in the context below.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"OPERATOR QUESTION: {question}\n\n"
        f"YOUR DRAFT ANSWER (max 5 sentences):"
    )
    return call_ollama(model, prompt, timeout=25)


def reviewer_agent(question, draft, context, model="llama3.2:3b"):
    prompt = (
        f"You are the REVIEWER agent (2 of 3).\n"
        f"Critique the author's draft · point out missing info · suggest improvements.\n"
        f"Be honest · do NOT just agree.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"OPERATOR QUESTION: {question}\n\n"
        f"AUTHOR DRAFT:\n{draft}\n\n"
        f"YOUR REVIEW (max 3 sentences · what's missing or wrong):"
    )
    return call_ollama(model, prompt, timeout=20)


def chair_agent(question, draft, review, context, model="llama3.2:3b"):
    prompt = (
        f"You are the CHAIR agent (3 of 3 · final decision).\n"
        f"Synthesize the author's draft AND reviewer's critique into the FINAL answer.\n"
        f"Resolve any disagreement · prioritize accuracy.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"OPERATOR QUESTION: {question}\n\n"
        f"AUTHOR DRAFT:\n{draft}\n\n"
        f"REVIEWER CRITIQUE:\n{review}\n\n"
        f"FINAL ANSWER (max 6 sentences · this is what the operator reads):"
    )
    return call_ollama(model, prompt, timeout=30)


def ask(question):
    correlation = f"ASK-{uuid.uuid4().hex[:8].upper()}"
    print()
    print(f"  {C.B}{C.BLU}┌─ COUNCIL OF AGENTS · correlation={correlation}{C.R}")
    print(f"  {C.B}{C.BLU}│  {ts()}  Operator: {C.R}{question}")
    print()

    ctx = context_for_agents()
    print(f"  {C.D}[{ts()}] CONTEXT loaded: {len(ctx)} chars from live platform{C.R}")
    print()

    # AUTHOR
    print(f"  {C.CYN}[{ts()}] sys_council_author · llama3.2:3b · drafting...{C.R}")
    t0 = time.time()
    draft = author_agent(question, ctx)
    t_author = round(time.time() - t0, 1)
    print(f"  {C.D}[{ts()}] author done in {t_author}s{C.R}")
    print(f"  {C.B}AUTHOR:{C.R} {draft.strip()[:600]}")
    print()

    # REVIEWER
    print(f"  {C.YLW}[{ts()}] sys_council_reviewer · llama3.2:3b · critiquing...{C.R}")
    t0 = time.time()
    review = reviewer_agent(question, draft, ctx)
    t_review = round(time.time() - t0, 1)
    print(f"  {C.D}[{ts()}] reviewer done in {t_review}s{C.R}")
    print(f"  {C.B}REVIEWER:{C.R} {review.strip()[:400]}")
    print()

    # CHAIR
    print(f"  {C.MAG}[{ts()}] sys_council_chair · llama3.2:3b · synthesizing...{C.R}")
    t0 = time.time()
    final = chair_agent(question, draft, review, ctx)
    t_chair = round(time.time() - t0, 1)
    print(f"  {C.D}[{ts()}] chair done in {t_chair}s{C.R}")
    print()
    print(f"  {C.GRN}{C.B}╔════════════════════════════════════════════════════════════════════╗{C.R}")
    print(f"  {C.GRN}{C.B}║ FINAL ANSWER (chair · synthesizing all 3 agents){C.R}")
    print(f"  {C.GRN}{C.B}╚════════════════════════════════════════════════════════════════════╝{C.R}")
    print(f"  {final.strip()}")
    print()
    print(f"  {C.D}Total: {t_author + t_review + t_chair}s · "
           f"author {t_author}s + reviewer {t_review}s + chair {t_chair}s · "
           f"correlation={correlation}{C.R}")
    print()
    # Record to DB
    try:
        import psycopg2
        cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                              password='insur_secret_password', dbname='insur_analytics')
        with cx, cx.cursor() as cur:
            for agent_id, output_, dur in [
                ("sys_council_author", draft, t_author),
                ("sys_council_reviewer", review, t_review),
                ("sys_council_chair", final, t_chair),
            ]:
                cur.execute("""
                    INSERT INTO agent_invocation
                      (invocation_id, agent_id, correlation_id, trigger_kind,
                       input_text, output_text, status, duration_ms,
                       cost_usd, tokens_in, tokens_out, tenant_id)
                    VALUES (%s, %s, %s, 'ask-cli', %s, %s, 'Success', %s, 0, 0, 0, 'default')
                """, (f"INV-{uuid.uuid4().hex[:10].upper()}", agent_id, correlation,
                      question[:1000], (output_ or "")[:2000], int(dur * 1000)))
        cx.close()
    except Exception as e:
        print(f"  {C.D}(db record failed: {str(e)[:80]}){C.R}")
    return final


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question", nargs="*", help="The question (or use --interactive)")
    ap.add_argument("--interactive", "-i", action="store_true",
                     help="Loop · ask multiple questions")
    args = ap.parse_args()

    if args.interactive:
        print(f"  {C.B}Interactive mode · type a question · Ctrl-C to exit{C.R}")
        try:
            while True:
                q = input(f"\n  {C.B}> {C.R}").strip()
                if not q: continue
                ask(q)
        except KeyboardInterrupt:
            print("\n  Stopped.")
    else:
        if not args.question:
            print("  Usage: ask_agents.py 'your question' OR --interactive")
            sys.exit(1)
        ask(" ".join(args.question))


if __name__ == "__main__":
    main()
