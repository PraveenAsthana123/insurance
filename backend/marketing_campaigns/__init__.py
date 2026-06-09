"""Marketing campaigns · multi-channel (email · banner · survey · form).

Per operator 2026-06-08: 4 channels alongside voice (which has its own
voice_ai_campaigns table in migration 053).

Top 1% gates per run · §76 + §82.21 + §38.3:
  1. Consent
  2. Segment match
  3. DLP scan on rendered payload
  4. Per-customer attempt count cap
  5. §38.3 audit row + correlation_id
"""
