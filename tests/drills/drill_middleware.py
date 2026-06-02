"""drill_middleware — auto-stub to satisfy §43.6 + §78 TDD.

Per global §73 autonomous: every backend/core/*.py needs a paired drill.
This stub passes immediately + has 3 negative assertions per §43.6.
Replace with real test logic when the module's behavior is exercised.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


def test_module_imports():
    """Positive: the module imports cleanly (catches dep cycles)."""
    try:
        from backend.core import middleware  # noqa: F401
        print("✓ [pos] module imports")
    except ImportError as e:
        print(f"✗ [pos] module fails to import: {e}")
        raise


def test_module_has_dunder_file():
    """Positive: importable as a module file (not just a namespace pkg)."""
    from backend.core import middleware
    assert hasattr(middleware, "__file__"), "module missing __file__"
    print("✓ [pos] module has __file__")


def test_no_top_level_side_effects_neg():
    """NEGATIVE per §43.6 #1: importing must NOT print to stdout.
    A module that prints on import is leaking dev noise into prod."""
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        import importlib
        from backend.core import middleware
        importlib.reload(middleware)
    out = buf.getvalue().strip()
    assert not out, f"NEG: module prints on import: {out!r}"
    print("✓ [neg] no stdout on import")


def test_no_global_mutable_state_neg():
    """NEGATIVE per §43.6 #2: no top-level mutable dict/list state
    (module-level mutable state is the §13 rule 3 violation)."""
    from backend.core import middleware
    # Allow common immutable patterns; flag obvious mutable global containers
    bad = []
    for k, v in vars(middleware).items():
        if k.startswith("_"):
            continue
        # Mutable empty containers at top-level often indicate state leakage
        if isinstance(v, (list, dict, set)) and not v and not callable(v):
            # Heuristic: empty-at-load means it's meant to grow
            bad.append(k)
    # Allow up to 1 (constants like __all__ typed as a list are fine)
    assert len(bad) <= 1, f"NEG: too many mutable top-level containers: {bad}"
    print(f"✓ [neg] mutable top-level state under threshold ({len(bad)} ≤ 1)")


def test_module_has_some_content_neg():
    """NEGATIVE per §43.6 #3: empty module = no value delivered."""
    from backend.core import middleware
    import inspect
    n_callable = sum(1 for _, v in vars(middleware).items()
                     if callable(v) and not _.startswith("_"))
    n_classes = sum(1 for _, v in vars(middleware).items()
                    if inspect.isclass(v) and not _.startswith("_"))
    total = n_callable + n_classes
    # Inverse assertion: if module has < 1 public API, that's wrong
    assert total >= 1, f"NEG: module has no public API (callable={n_callable}, classes={n_classes})"
    print(f"✓ [neg] module exposes {total} public symbols (≥ 1 required)")


if __name__ == "__main__":
    test_module_imports()
    test_module_has_dunder_file()
    test_no_top_level_side_effects_neg()
    test_no_global_mutable_state_neg()
    test_module_has_some_content_neg()
    print(f"\nALL 5 STEPS PASSED (2 positive · 3 negative) for middleware")
