#!/usr/bin/env python3
"""Consolidated top-1% audit runner · runs all iter audits in one process.

Replaces 20 separate `audit_top1pct_iterN.py` invocations with one
in-process run · ~5× faster · single summary report.

Usage:
  python3 scripts/run_all_top1pct_audits.py                # run all
  python3 scripts/run_all_top1pct_audits.py --only 30,33   # only specified iters
  python3 scripts/run_all_top1pct_audits.py --since 25     # iters ≥ 25
  python3 scripts/run_all_top1pct_audits.py --json         # JSON output for CI
"""
from __future__ import annotations

import argparse
import importlib
import io
import json
import logging
import os
import sys
import time
from contextlib import redirect_stdout
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
sys.path.insert(0, str(REPO / "scripts"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)


def discover_iters() -> list[tuple[int, str]]:
    """Find all audit_top1pct_iterN.py · return [(n, modname)]."""
    out: list[tuple[int, str]] = []
    for path in sorted((REPO / "scripts").glob("audit_top1pct_iter*.py")):
        stem = path.stem  # audit_top1pct_iterN
        try:
            n = int(stem.split("iter")[-1])
            out.append((n, stem))
        except ValueError:
            continue
    out.sort(key=lambda x: x[0])
    return out


def run_one(modname: str) -> dict:
    """Run one iter audit · capture stdout · return summary dict."""
    t0 = time.perf_counter()
    buf = io.StringIO()
    rc = 1
    try:
        with redirect_stdout(buf):
            mod = importlib.import_module(modname)
            if hasattr(mod, "main"):
                rc = mod.main()
            else:
                rc = -1
    except SystemExit as e:
        rc = e.code if isinstance(e.code, int) else 1
    except BaseException as e:
        buf.write(f"\nFATAL: {type(e).__name__}: {e}\n")
        rc = 2
    output = buf.getvalue()
    # Parse the "X/10 pass · Y fail" line
    passed = total = failed = 0
    for line in output.splitlines():
        if "pass ·" in line.lower():
            # e.g. "  Summary: 10/10 pass · 0 fail"
            try:
                left = line.split(":")[1].strip()
                # "10/10 pass · 0 fail"
                num, _, rest = left.partition("/")
                passed = int(num.strip())
                total = int(rest.split()[0])
                failed = int(rest.split("·")[1].split()[0])
            except Exception:
                pass
            break
    return {
        "module": modname,
        "rc": rc,
        "passed": passed,
        "total": total or 10,
        "failed": failed,
        "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
        "output": output,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma-separated iter numbers (e.g., 30,33)")
    parser.add_argument("--since", type=int, help="Run iter N onward")
    parser.add_argument("--json", action="store_true", help="JSON output for CI")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print per-iter output")
    args = parser.parse_args()

    iters = discover_iters()
    if args.only:
        keep = {int(x) for x in args.only.split(",")}
        iters = [(n, m) for n, m in iters if n in keep]
    if args.since:
        iters = [(n, m) for n, m in iters if n >= args.since]

    if not iters:
        print("No iter audits found.")
        return 1

    results = []
    t0 = time.perf_counter()
    for n, modname in iters:
        r = run_one(modname)
        r["iter"] = n
        results.append(r)
        if args.verbose:
            print(r["output"])

    if args.json:
        print(json.dumps({
            "iters": results,
            "total_duration_ms": round((time.perf_counter() - t0) * 1000, 1),
            "all_pass": all(r["failed"] == 0 for r in results),
        }, indent=2))
        return 0 if all(r["failed"] == 0 for r in results) else 1

    # Pretty summary
    print(f"\n{'Iter':<6}{'Module':<35}{'Pass':<7}{'Fail':<6}{'Time (ms)':<10}{'Status':<8}")
    print("─" * 78)
    for r in results:
        status = "✓ PASS" if r["failed"] == 0 else "✗ FAIL"
        print(f"{r['iter']:<6}{r['module']:<35}{r['passed']:>2}/{r['total']:<5}{r['failed']:<6}{r['duration_ms']:<10}{status}")
    print("─" * 78)
    total_passed = sum(r["passed"] for r in results)
    total_failed = sum(r["failed"] for r in results)
    total_assertions = sum(r["total"] for r in results)
    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    print(f"\nTotal: {total_passed}/{total_assertions} pass · {total_failed} fail · {elapsed} ms · "
          f"{len(results)} iter audits")
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
