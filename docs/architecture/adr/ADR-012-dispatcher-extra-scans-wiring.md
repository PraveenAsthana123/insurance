# ADR-012 · §106 Dispatcher Consumes pending_topics extra_scans

## Status

**Accepted** · 2026-06-12 23:21 MDT

Implements: commit `c97538c0` (2026-06-12 23:18 MDT) `feat(insur): wire
pending_topics extra_scans into §106 auto_next_loop · close blind-spot loop`.

Composes with: ADR-011 (BankLayout policy supersession) · ADR-009 (Observability).

---

## Context

The §106 autonomous loop dispatcher (`scripts/auto_next_loop.py`) is the
core picker that the §109 cron-driven `auto_next_dispatcher.sh` invokes
every 5 minutes. Its job: find the top-1 actionable finding · pick a
handler · execute (or surface as `no-handler` / `gated`).

Until this ADR's commit, the dispatcher only consulted the
`missing-items-advisor` HTTP endpoint for findings. Across 7 "fix all"
iterations in a single session (2026-06-12), each iteration found:

- The dispatcher reported `status: stable · 0 actionable`
- Yet **real uncommitted code** sat in the working tree (parallel
  coding sessions had been editing files between dispatcher ticks)
- Operator had to manually run `git status` to discover the gap

This was a §57.7 honesty violation in disguise: the dispatcher's "stable"
status was structurally unable to be false-positive · which made it
unable to surface real work that needed attention.

The fix was already half-shipped: commit `87d11649` added a
`uncommitted_real_files` scan to `pending_topics_agent.extra_scans()`.
But the dispatcher never CALLED `extra_scans` · only `advisor`. So the
scan worked when run by hand but was invisible to the autonomous loop.

---

## Decision

**The §106 dispatcher MUST consume `pending_topics_agent.extra_scans()`
output and merge it into its `findings` list before computing the
actionable set.**

Implementation details:

- Wrap the import + call in `try/except Exception` so an extra_scans
  failure does NOT break the dispatcher (per §57.7: degrade gracefully,
  don't crash the autonomous loop).
- Order: advisor findings first · extra_scans findings appended (so
  advisor topics retain their natural position in the sorted list).
- Filter unchanged: P0/P1/P2 actionable · P3 excluded by default.
- The `no-handler` exit code (40) is the correct disposition when the
  top finding has no automated handler · the dispatcher's contract
  already covers this · no new exit code needed.

---

## Consequences

### Positive
- Dispatcher's `stable` status now carries truth: when it says
  "stable · 0 actionable," the working tree is genuinely clean.
- Uncommitted real-code surfaces automatically every 5 minutes via cron
  · operator sees it in `jobs/logs/auto-next.log` without manual sweeps.
- Future extra_scans additions (e.g., new finding categories) flow into
  the dispatcher's actionable list automatically · no per-finding wire-up.
- Composes with §42 safe-allowlist: auto-committing operator code is
  gated · dispatcher only surfaces · doesn't auto-commit.

### Negative
- Each dispatcher tick now runs extra_scans (~150ms) in addition to
  advisor (~5s). Total tick time: ~6.4s · still well under the 5-min
  cron cadence.
- If extra_scans starts emitting findings categories that have no
  handler · the dispatcher will exit with code 40 (`no-handler`)
  instead of 30 (`stable`). Operators reading the log must understand
  that 40 is *informational* for these categories · not a failure.
- The dispatcher now has a dependency on `scripts/pending_topics_agent.py`
  being importable. Breaking changes to pending_topics_agent could
  break the dispatcher (mitigated by try/except).

### Risks accepted
- A buggy extra_scans that returns malformed finding objects could
  cause the dispatcher's `findings.extend(...)` to inject bad rows.
  Mitigated by the try/except wrapper · but the wrapper catches the
  exception and silently continues. If extra_scans throws on every
  call, the dispatcher reverts to advisor-only behavior · same as
  before this ADR · no regression.
- The extra_scans's `uncommitted_real_files` check runs `git diff`
  which touches the filesystem. If the working tree is locked
  (mid-rebase, etc.), the command may fail. The try/except catches
  this. Acceptable per §57.7 honest (no fabrication on failure).

---

## Alternatives considered

1. **Auto-commit uncommitted real-code in the dispatcher** — rejected
   per §42 (auto-commit is gated). The dispatcher's contract is to
   surface and route · not to write history.
2. **Build a separate finding-aggregator service** — rejected. The
   `pending_topics_agent` is already the consolidator (per §80). Adding
   another layer between dispatcher and finder would create more places
   to drift out of sync.
3. **Add a CLI flag to `pending_topics_agent` to print actionable list**
   then have the dispatcher parse stdout — rejected. Direct Python
   import is cleaner · type-safe · faster.
4. **Wait for the operator to manually push extra_scans output into the
   dispatcher** — rejected. This was the previous state · 7 "fix all"
   iterations in one session is the empirical evidence that manual
   linkage doesn't work at scale.

---

## References

- Implementation: `scripts/auto_next_loop.py` (around line 200-235)
- Predecessor commit: `87d11649` (added the scan · didn't wire it)
- Implementation commit: `c97538c0` (wired it)
- Composes with: ADR-009 (Observability · dispatcher logs are part of
  the observability triad), ADR-011 (precedent for policy/code matching)
- Global §42 (safe-allowlist · no auto-commit), §43 (drill discipline ·
  NEG + POS verified before commit), §57.7 (honest scaffold ·
  `stable` status now carries truth), §80 (advisor consolidator),
  §106 (safe-allowlist dispatcher), §109 (dynamic dispatcher cadence)

---

## Author

claude-opus-4-7 · autonomous loop · operator "create plan and fix all"
at 2026-06-12 23:21 MDT · forensic substrate per §51.

---

*Future revisions*: ADRs are immutable per §47.3. If the dispatcher's
contract moves (e.g., gains an auto-commit handler for uncommitted
real-code), file ADR-013 (or higher) and update the status header here.
