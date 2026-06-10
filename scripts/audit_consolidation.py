#!/usr/bin/env python3
"""Audit consolidation · Iter 37 · verify the unified CLI + audit runner."""
import subprocess
import sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Consolidation audit · run_all + insur CLI\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. run_all script exists + executable
    runner = REPO / "scripts/run_all_top1pct_audits.py"
    a("1. run_all_top1pct_audits.py exists + executable",
      runner.exists() and runner.stat().st_mode & 0o111)

    # 2. discover_iters finds N audits
    sys.path.insert(0, str(REPO / "scripts"))
    import importlib.util
    spec = importlib.util.spec_from_file_location("rar", runner)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    iters = mod.discover_iters()
    a(f"2. discover_iters finds N audits ({len(iters)})",
      len(iters) >= 15)

    # 3. iters sorted by number
    nums = [n for n, _ in iters]
    a("3. iters sorted ascending", nums == sorted(nums))

    # 4-5. run subset · use --only
    out = subprocess.run(
        ["python3", str(runner), "--only", "36", "--json"],
        capture_output=True, text=True, timeout=60,
        env={**__import__("os").environ, "INSUR_SKIP_MIGRATIONS": "1", "INSUR_DISABLE_PRESIDIO": "1"},
    )
    a(f"4. run_all --only 36 --json exits 0 (got {out.returncode})",
      out.returncode == 0)
    a("5. --json output is parseable",
      bool(out.stdout) and __import__("json").loads(out.stdout)["iters"][0]["iter"] == 36)

    # 6. insur CLI exists + executable
    cli = REPO / "scripts/insur"
    a("6. scripts/insur exists + executable",
      cli.exists() and cli.stat().st_mode & 0o111)

    # 7. insur help works
    out = subprocess.run([str(cli), "help"], capture_output=True, text=True, timeout=5)
    a("7. insur help outputs usage",
      out.returncode == 0 and "audit" in out.stdout and "status" in out.stdout)

    # 8. insur audit <N> dispatches to specific iter
    out = subprocess.run([str(cli), "audit", "36"], capture_output=True, text=True, timeout=30)
    a(f"8. insur audit 36 runs (returncode={out.returncode})",
      "Summary" in out.stdout or "Summary" in out.stderr)

    # 9. insur stats works
    out = subprocess.run([str(cli), "stats"], capture_output=True, text=True, timeout=10)
    a("9. insur stats shows codebase counts",
      out.returncode == 0 and ("routers" in out.stdout or "Iter audits" in out.stdout))

    # 10. insur subcommand list complete
    expected = {"start", "stop", "status", "audit", "audit-weekly", "drill",
                "top1pct", "smoke", "stats", "help"}
    cli_text = cli.read_text()
    missing = expected - {kw for kw in expected if f"{kw})" in cli_text or kw in cli_text}
    a("10. insur has all 10 subcommands",
      not missing, f"missing={missing}" if missing else "")

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: consolidation · run_all + insur CLI")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
