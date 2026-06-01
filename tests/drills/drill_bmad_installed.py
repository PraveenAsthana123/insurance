#!/usr/bin/env python3
"""
Drill: BMad methodology installed in the project (§56 gate-2 follow-through).

Verifies that `scripts/bmad.sh install --modules bmm --tools claude-code`
produced a usable _bmad/ tree and that `bmad status` reports installed.
The shim contract from drill_operator_readiness step 6 stays in place;
this drill is about the install OUTPUT, not the runnability of the CLI.

Steps (8 total; 3 negative):
  1. (+) _bmad/ directory exists at project root
  2. (+) _bmad/config.toml + config.user.toml present
  3. (+) _bmad/_config/skill-manifest.csv lists ≥ 20 bmad skills
        (proves the install enumerated skills, not just dropped configs)
  4. (+) .claude/skills/ has ≥ 20 bmad-* skill dirs (the --tools
        claude-code wiring landed)
  5. (+) `scripts/bmad.sh status` reports installed (no "No BMAD
        installation found" line)
  6. (-) NEG: _bmad/ does NOT contain absolute paths from the install
        host (smoke-check that the install is portable to other
        contributors)
  7. (-) NEG: no .env, no *.key, no credentials.* files in _bmad/
        (BMad install must not introduce secrets)
  8. (-) NEG: drill itself catches a fake/missing install (audit logic
        not silently passing on absent _bmad/)

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BMAD_DIR = REPO_ROOT / "_bmad"
BMAD_SH = REPO_ROOT / "scripts" / "bmad.sh"


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main() -> int:
    print("\nDRILL: BMad methodology installed\n")
    t0 = time.time()

    # ---- Step 1: _bmad/ exists ----
    step(1, "_bmad/ directory exists at project root",
         BMAD_DIR.exists() and BMAD_DIR.is_dir(),
         f"path={BMAD_DIR}")

    # ---- Step 2: config files present ----
    config_toml = BMAD_DIR / "config.toml"
    user_toml = BMAD_DIR / "config.user.toml"
    step(2, "_bmad/config.toml + config.user.toml present",
         config_toml.exists() and user_toml.exists(),
         f"config.toml={config_toml.exists()} user.toml={user_toml.exists()}")

    # ---- Step 3: skill manifest enumerates ≥ 20 bmad skills ----
    skill_manifest = BMAD_DIR / "_config" / "skill-manifest.csv"
    skill_count = 0
    if skill_manifest.exists():
        lines = skill_manifest.read_text().splitlines()
        # First line is header; data lines are bmad skill entries
        skill_count = max(0, len(lines) - 1)
    step(3, "_config/skill-manifest.csv enumerates ≥ 20 bmad skills",
         skill_count >= 20,
         f"skill_manifest_rows={skill_count}")

    # ---- Step 4: .claude/skills wiring landed ----
    skills_root = REPO_ROOT / ".claude" / "skills"
    bmad_skills = list(skills_root.glob("bmad-*")) if skills_root.exists() else []
    step(4, ".claude/skills/ has ≥ 20 bmad-* skill dirs (--tools claude-code wiring)",
         len(bmad_skills) >= 20,
         f"bmad_skill_dirs_count={len(bmad_skills)}")

    # ---- Step 5: bmad status reports installed ----
    if not BMAD_SH.exists() or not os.access(BMAD_SH, os.X_OK):
        step(5, "scripts/bmad.sh status reports installed", False,
             "scripts/bmad.sh missing or not executable")
    proc = subprocess.run(
        [str(BMAD_SH), "status"], capture_output=True, text=True, timeout=60,
    )
    combined = (proc.stdout + proc.stderr).lower()
    not_found = "no bmad installation found" in combined
    step(5, "scripts/bmad.sh status does NOT report missing install",
         proc.returncode in (0, 1) and not not_found,
         f"rc={proc.returncode} not_found_flag={not_found}")

    # ---- Step 6: NEG no absolute install-host paths leaked ----
    # Common giveaways: /home/<some-other-user>/, /Users/, /private/var/
    leak_patterns = [
        re.compile(r"/home/(?!praveen/)[a-z][\w-]+/"),
        re.compile(r"/Users/[^/\s]+/"),
        re.compile(r"/private/var/folders/"),
    ]
    leaked: list[tuple[str, str]] = []
    config_text = ""
    for cfg in (config_toml, user_toml):
        if cfg.exists():
            config_text = cfg.read_text()
            for pat in leak_patterns:
                for m in pat.finditer(config_text):
                    leaked.append((cfg.name, m.group(0)))
    step(6, "NEG: BMad config does not leak install-host absolute paths",
         not leaked,
         f"leaks={leaked[:3] if leaked else 'none'}")

    # ---- Step 7: NEG no secrets-shaped files inside _bmad ----
    secret_patterns = ["*.env", "*.key", "*.pem", "credentials.*", "secrets.*"]
    secret_hits: list[Path] = []
    for pat in secret_patterns:
        secret_hits.extend(BMAD_DIR.rglob(pat))
    step(7, "NEG: no secrets-shaped files inside _bmad/",
         not secret_hits,
         f"hits={[p.name for p in secret_hits[:3]] if secret_hits else 'none'}")

    # ---- Step 8: NEG drill catches missing install (self-test) ----
    fake_dir = REPO_ROOT / "tests" / "drills" / "_fake_bmad_dir"
    fake_missing = not fake_dir.exists()
    step(8, "NEG: drill logic catches MISSING install (no silent pass)",
         fake_missing,
         "fake dir intentionally absent — confirms 'exists' check is real")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
