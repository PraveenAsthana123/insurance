# ADR-007: Vite + React (JSX) now; plan Next.js + TypeScript migration

- **Status**: Accepted (with explicit migration commitment)
- **Date**: 2026-06-01
- **Tags**: frontend, framework

## Context

Frontend is currently Vite + React + JSX (152 .jsx files, 0 .tsx). Per brutal
review 2026-06-01 this received a "D" grade vs global §14 default (Next.js 14
+ App Router + vanilla CSS).

## Decision

**Keep Vite + React + JSX for the next 8-12 weeks. Commit to Next.js + TypeScript migration after pilot signoff.**

## Rationale

- Migration mid-build is high-risk; the existing 152 components work
- Pilot customer signoff is the trigger to invest in framework migration
- TypeScript migration alone is 4-6 weeks; Next.js adds 4 more
- Pre-migration: pin React patterns that translate cleanly (functional + hooks)

## Consequences

### Positive (status quo)
- No migration disruption during pilot
- Existing component library + Playwright e2e tests untouched
- Faster iteration on insurance domain UI

### Negative (technical debt)
- No type safety → runtime bugs caught by Playwright, not type-check
- No SSR / RSC → SEO + initial-load weaker
- Bundle bloat (152 components + 4 chart libs); CDN partly mitigates

### Risks accepted
- Component prop bugs caught at runtime, not compile
- Every new component is one more to migrate later

## Migration plan (post-pilot signoff)

1. Add TypeScript build (tsconfig + Vite TS support); allow .jsx + .tsx coexist
2. Migrate components by route, leaves first (atoms → molecules → organisms)
3. Add Next.js App Router; mount React tree under Next pages
4. Cut over routes one at a time
5. Sunset Vite once all routes are Next

Total estimate: 8-10 weeks at 1 FE engineer

## Alternatives considered

- **Migrate now**: Too risky during pilot; halts feature work
- **Stay Vite + React forever**: Misses §14 default; weak SEO
- **Astro / Remix**: Less ecosystem; over-novel for an insurance UI

## References

- Global §14 (frontend defaults)
- Brutal review 2026-06-01 (frontend D grade evidence)
- Vite config: `frontend/vite.config.js`
