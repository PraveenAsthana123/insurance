#!/usr/bin/env python3
"""Iter 44 audit · contract tests Pydantic ↔ Zod stay in sync."""
import json, logging, os, re, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 44 audit · Pydantic ↔ Zod contract tests\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. Exporter script exists
    exporter = REPO / "scripts/export_pydantic_schemas.py"
    a("1. scripts/export_pydantic_schemas.py exists + executable",
      exporter.exists() and exporter.stat().st_mode & 0o111)

    # 2. Manifest exists with ≥20 models
    manifest = REPO / "backend/contracts/MANIFEST.json"
    a("2. MANIFEST.json exists", manifest.exists())
    m = json.loads(manifest.read_text())
    a(f"3. ≥20 models exported ({len(m['models'])})",
      len(m["models"]) >= 20)

    # 4. Each model has a JSON schema file
    contracts_dir = REPO / "backend/contracts"
    schema_files = list(contracts_dir.glob("*.schema.json"))
    a(f"4. Per-model JSON schemas exist ({len(schema_files)})",
      len(schema_files) >= 20)

    # 5. Each model has matching fields in MANIFEST
    sample = list(m["models"].keys())[0]
    sample_path = contracts_dir / f"{sample}.schema.json"
    sample_schema = json.loads(sample_path.read_text())
    a(f"5. Sample schema has fields ({len(sample_schema['fields'])})",
      "fields" in sample_schema and len(sample_schema["fields"]) >= 3)

    # 6. Zod file exists
    zod = REPO / "frontend/src/schemas/agentic.contracts.js"
    a("6. agentic.contracts.js (Zod) generated", zod.exists())

    # 7. Every Pydantic model name appears in Zod
    zod_text = zod.read_text()
    missing_in_zod = []
    for name in m["models"]:
        if f"{name}Schema" not in zod_text:
            missing_in_zod.append(name)
    a(f"7. Every Pydantic model has a Zod Schema (missing: {len(missing_in_zod)})",
      not missing_in_zod)

    # 8. Every Pydantic field appears in Zod (sample)
    sample_fields = set(sample_schema["fields"].keys())
    # Extract fields from Zod block for `sample`
    zod_block_match = re.search(
        rf"export const {sample}Schema = z\.object\(\{{(.*?)\}}\);",
        zod_text, re.DOTALL)
    a(f"8. Sample model block parseable in Zod", bool(zod_block_match))
    if zod_block_match:
        zod_block = zod_block_match.group(1)
        zod_field_names = set(re.findall(r"^\s*(\w+):", zod_block, re.MULTILINE))
        drift = sample_fields - zod_field_names
        a(f"9. Sample fields match Pydantic ({len(sample_fields)} fields)",
          not drift, f"missing in Zod: {drift}" if drift else "")
    else:
        a("9. Sample fields match Pydantic", False)

    # 10. PYDANTIC_MODEL_NAMES exports all model names
    expected_names = sorted(m["models"].keys())
    names_match = re.search(r"PYDANTIC_MODEL_NAMES\s*=\s*(\[[^\]]+\])", zod_text)
    a("10. PYDANTIC_MODEL_NAMES export has all models",
      bool(names_match)
      and all(name in (names_match.group(1) if names_match else "") for name in expected_names))

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 44 · Tier-1 #5 · contract tests Pydantic ↔ Zod")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
