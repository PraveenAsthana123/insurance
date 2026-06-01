"""External data feed adapters — KYC / NICB / CLUE / EHR.

Per §56 Stage-1 adapter contract: feature-flag opt-in + lazy import +
drill-locked signature. Each adapter has:
    - is_enabled() -> bool   (reads ENABLE_<FEED> env var)
    - fetch(query) -> dict   (returns structured response)
    - close()                (cleanup)

When the feature flag is OFF, fetch() returns a placeholder response
with a `synthetic=True` flag so downstream code can branch safely.
"""
