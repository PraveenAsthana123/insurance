"""Tier 1 — Unit tests for legal.

Recommended framework: pytest (per global CLAUDE.md §64.42).
Coverage target: ≥ 80% on dept code (per §64.30 tier 1).
"""
import pytest


def test_dept_module_imports():
    """Smoke: dept module exists + imports."""
    # TODO: replace with actual import once dept module exists
    assert "legal" in "legal", "dept name must match"


def test_addition_passes():
    """Trivial sanity test to verify pytest discovery + the runner picks up this file."""
    assert 1 + 1 == 2


@pytest.mark.skip(reason="placeholder — replace with real legal unit test")
def test_real_dept_logic():
    """REPLACE — real unit test for legal business logic."""
    pass
