#!/usr/bin/env python3
"""
Drill: LiteLLM gateway Stage-1 adapter (backend/services/llm_gateway.py).

Stage-1 adapter per §56.2: lazy import, feature-flag opt-in, NEVER
default-on, original code path always wins. The drill exercises the
default-off behavior + the env-enabled path with a monkeypatched LiteLLM
so no real network call is made.

Steps (11 total; 5 negative):
  1. (+) Default (env unset) → complete() returns outcome='disabled'
        + audit row written
  2. (-) NEG: disabled outcome has empty text + no leak of model creds
        in any field
  3. (+) Enabled + importable + mocked SDK → outcome='executed' with
        text from mocked response
  4. (+) Provider extracted from model string: "ollama/kivi" → "ollama";
        "gpt-4o-mini" → "openai" (default fallback)
  5. (-) NEG: LiteLLM raises → outcome='error' with structured
        error_type + error_msg; latency_ms still recorded
  6. (-) NEG: LiteLLM timeout → outcome='error' (wrapped, not propagated)
  7. (+) Audit row written for EVERY call (disabled, executed, error)
  8. (-) NEG: API key / token values never appear in audit row OR
        in LlmCompletion fields
  9. (+) tenant_id + request_id from caller propagated to audit row
  10.(+) status() returns a snapshot dict with enabled/importable/model
        without making any LLM call
  11.(-) NEG: when litellm package is hidden, importable=False AND
        complete() returns outcome='unavailable' (still no crash)

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _reset_modules():
    for mod in ("services.llm_gateway",):
        if mod in sys.modules:
            del sys.modules[mod]


def _audit_rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main() -> int:
    print("\nDRILL: LiteLLM gateway (§56 Stage-1 adapter)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "llm_runs.jsonl"
        os.environ["HOLY_LLM_GATEWAY_AUDIT_PATH"] = str(audit_path)

        # ---- Step 1: default disabled ----
        os.environ.pop("HOLY_LLM_GATEWAY_ENABLED", None)
        _reset_modules()
        from services import llm_gateway

        r1 = llm_gateway.complete("hello", tenant_id="tenant-a", request_id="req-1")
        rows = _audit_rows(audit_path)
        step(1, "default env: outcome='disabled' + audit row written",
             r1.outcome == "disabled" and len(rows) == 1
             and rows[0]["outcome"] == "disabled",
             f"outcome={r1.outcome} rows={len(rows)}")

        # ---- Step 2: NEG disabled response has empty text + no leak ----
        leak_fields = [r1.text, r1.error_msg or ""]
        has_leak = any("sk-" in str(f) or "API_KEY" in str(f) for f in leak_fields)
        step(2, "NEG: disabled response has empty text + no creds leak",
             r1.text == "" and not has_leak,
             f"text_len={len(r1.text)} leak={has_leak}")

        # ---- Step 3: enabled + mocked LiteLLM → executed ----
        os.environ["HOLY_LLM_GATEWAY_ENABLED"] = "true"
        os.environ["HOLY_LLM_MODEL"] = "ollama/kivi:local"

        # Mock the litellm module + its completion()
        mock_litellm = SimpleNamespace()
        def fake_completion(model, messages, timeout, temperature, **kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="mocked response"))],
                usage=SimpleNamespace(prompt_tokens=5, completion_tokens=3),
            )
        mock_litellm.completion = fake_completion

        with patch.dict(sys.modules, {"litellm": mock_litellm}):
            _reset_modules()
            from services import llm_gateway as gw3
            r3 = gw3.complete("explain", tenant_id="tenant-a", request_id="req-3")
        step(3, "enabled + mocked SDK → outcome='executed' with text",
             r3.outcome == "executed" and r3.text == "mocked response"
             and r3.prompt_tokens == 5 and r3.completion_tokens == 3,
             f"outcome={r3.outcome} text={r3.text!r}")

        # ---- Step 4: provider extraction ----
        from services.llm_gateway import _provider_from_model
        step(4, "_provider_from_model extracts provider prefix correctly",
             _provider_from_model("ollama/kivi:local") == "ollama"
             and _provider_from_model("gpt-4o-mini") == "openai"
             and _provider_from_model("anthropic/claude-3-5") == "anthropic",
             "")

        # ---- Step 5: NEG SDK raises → error wrapping ----
        bad_litellm = SimpleNamespace()
        def bad_completion(**kwargs):
            raise RuntimeError("simulated provider failure")
        bad_litellm.completion = bad_completion

        with patch.dict(sys.modules, {"litellm": bad_litellm}):
            _reset_modules()
            from services import llm_gateway as gw5
            r5 = gw5.complete("oops", tenant_id="tenant-b", request_id="req-5")
        step(5, "NEG: SDK exception → outcome='error' wrapped with structured fields",
             r5.outcome == "error"
             and r5.error_type == "RuntimeError"
             and "simulated provider failure" in r5.error_msg
             and r5.latency_ms >= 0,
             f"outcome={r5.outcome} error_type={r5.error_type}")

        # ---- Step 6: NEG SDK timeout → error wrapping ----
        timeout_litellm = SimpleNamespace()
        def timeout_completion(**kwargs):
            raise TimeoutError("provider timeout")
        timeout_litellm.completion = timeout_completion

        with patch.dict(sys.modules, {"litellm": timeout_litellm}):
            _reset_modules()
            from services import llm_gateway as gw6
            r6 = gw6.complete("slow", tenant_id="tenant-c", request_id="req-6")
        step(6, "NEG: timeout → outcome='error' (wrapped, not propagated)",
             r6.outcome == "error" and r6.error_type == "TimeoutError",
             f"error_type={r6.error_type}")

        # ---- Step 7: audit row per call (disabled + executed + error + error) ----
        rows = _audit_rows(audit_path)
        outcomes = [r["outcome"] for r in rows]
        step(7, "audit row written for EVERY call (any outcome)",
             outcomes == ["disabled", "executed", "error", "error"],
             f"outcomes={outcomes}")

        # ---- Step 8: NEG creds NEVER leak into audit row or response ----
        os.environ["OPENAI_API_KEY"] = "sk-FAKE-SHOULD-NOT-LEAK"
        with patch.dict(sys.modules, {"litellm": mock_litellm}):
            _reset_modules()
            from services import llm_gateway as gw8
            r8 = gw8.complete("hi", tenant_id="tenant-d", request_id="req-8")
        rows = _audit_rows(audit_path)
        last_row = rows[-1] if rows else {}
        row_str = json.dumps(last_row)
        completion_str = json.dumps(r8.__dict__)
        leaked_in_row = "sk-FAKE-SHOULD-NOT-LEAK" in row_str
        leaked_in_resp = "sk-FAKE-SHOULD-NOT-LEAK" in completion_str
        step(8, "NEG: API key value never appears in audit row OR LlmCompletion",
             not leaked_in_row and not leaked_in_resp,
             f"row_leak={leaked_in_row} resp_leak={leaked_in_resp}")
        del os.environ["OPENAI_API_KEY"]

        # ---- Step 9: tenant_id + request_id propagation ----
        step(9, "tenant_id + request_id from caller propagated to audit row",
             last_row.get("tenant_id") == "tenant-d"
             and last_row.get("request_id") == "req-8",
             f"tenant_id={last_row.get('tenant_id')} request_id={last_row.get('request_id')}")

        # ---- Step 10: status() snapshot ----
        with patch.dict(sys.modules, {"litellm": mock_litellm}):
            _reset_modules()
            from services import llm_gateway as gw10
            s = gw10.status()
        step(10, "status() returns snapshot dict without making any LLM call",
             s.get("key") == "llm-gateway"
             and s.get("enabled") is True
             and s.get("importable") is True
             and "default_model" in s,
             f"keys={sorted(s.keys())}")

        # ---- Step 11: NEG litellm unavailable → outcome='unavailable' ----
        # Hide litellm by setting its module to None in sys.modules + force
        # find_spec to miss. Use a sentinel that's not a real module.
        with patch("importlib.util.find_spec", return_value=None):
            _reset_modules()
            from services import llm_gateway as gw11
            r11 = gw11.complete("hi", tenant_id="tenant-e", request_id="req-11")
        step(11, "NEG: litellm not importable → outcome='unavailable' (no crash)",
             r11.outcome == "unavailable" and "not installed" in (r11.error_msg or ""),
             f"outcome={r11.outcome} error_msg={r11.error_msg!r}")

    print(f"\n\033[32mALL 11 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
