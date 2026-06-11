#!/usr/bin/env python3
"""brutal · §122 · score any response on 11 top-1% dimensions · terminal output.

Usage:
  python3 scripts/brutal.py "the response text to score"
  echo "the response" | python3 scripts/brutal.py -
  python3 scripts/brutal.py --last-claude-response   # scores most recent
"""
import json
import os
import sys
from datetime import datetime
import urllib.request


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRN = "\033[32m"; YLW = "\033[33m"; CYN = "\033[36m"
    RED = "\033[31m"; MAG = "\033[35m"; BGR = "\033[42m"; BRD = "\033[41m"
    BYW = "\033[43m"


def ts():
    os.environ["TZ"] = "America/Edmonton"
    try:
        import time; time.tzset()
    except Exception:
        pass
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def score(text: str) -> dict:
    """Call /brutal-feedback/score endpoint."""
    body = json.dumps({"response_text": text[:5000]}).encode()
    req = urllib.request.Request(
        "http://localhost:8001/api/v1/agent-kernel/brutal-feedback/score",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def render(d: dict, original_text: str):
    pct = d.get("pct", 0)
    band = d.get("band", "?")
    band_color = (C.BGR if band == "TOP_1_PCT" else
                   C.BYW if band == "TOP_5_PCT" else
                   C.YLW if band == "TOP_25_PCT" else
                   C.MAG if band == "MID" else C.BRD)

    print()
    print(f"  {C.B}{C.MAG}╔════ §122 BRUTAL FEEDBACK · {ts()} ════╗{C.R}")
    print(f"  {C.B}{C.MAG}║ correlation: {d.get('correlation_id', '?'):<22}              ║{C.R}")
    print(f"  {C.B}{C.MAG}╚══════════════════════════════════════════════════════╝{C.R}")
    print()
    print(f"  {C.B}SCORE:{C.R}        {band_color}{C.B} {pct}% · {band} {C.R}")
    print(f"  {C.B}VERDICT:{C.R}      {d.get('verdict', '?')}")
    print()

    # All 11 dims sorted
    print(f"  {C.B}11 DIMENSIONS (out of 10):{C.R}")
    scores = d.get("scores_out_of_10", {})
    for dim, s in sorted(scores.items(), key=lambda x: -x[1]):
        bar = "█" * s + "░" * (10 - s)
        color = C.GRN if s >= 8 else C.YLW if s >= 5 else C.RED
        print(f"    {dim:<18} {color}{bar}{C.R} {s}/10")

    print()
    print(f"  {C.B}{C.RED}WEAKEST 3 (fix these to climb a band):{C.R}")
    for dim, s in d.get("weakest_3", []):
        print(f"    · {C.RED}{dim:<18}{C.R} {s}/10")

    print()
    print(f"  {C.B}{C.GRN}STRONGEST 3 (keep doing this):{C.R}")
    for dim, s in d.get("strongest_3", []):
        print(f"    · {C.GRN}{dim:<18}{C.R} {s}/10")

    print()
    print(f"  {C.B}RECOMMENDATIONS:{C.R}")
    for rec in d.get("improvement_recommendations", []):
        print(f"    → {rec}")

    print()
    print(f"  {C.D}Text scored ({len(original_text)} chars):{C.R}")
    print(f"  {C.D}  '{original_text[:120].strip()}...'{C.R}")
    print()


def main():
    if len(sys.argv) < 2:
        print(f"\n  {C.B}brutal · §122 mandatory scoring{C.R}")
        print(f"  Usage:")
        print(f"    python3 scripts/brutal.py \"your response text\"")
        print(f"    echo 'response' | python3 scripts/brutal.py -")
        print()
        return

    if sys.argv[1] == "-":
        text = sys.stdin.read()
    else:
        text = " ".join(sys.argv[1:])

    try:
        result = score(text)
        render(result, text)
    except Exception as e:
        print(f"\n  {C.RED}ERROR scoring: {str(e)[:200]}{C.R}")
        print(f"  {C.D}Is backend up? curl http://localhost:8001/api/v1/health{C.R}")
        sys.exit(1)


if __name__ == "__main__":
    main()
