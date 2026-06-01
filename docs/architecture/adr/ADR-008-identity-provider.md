# ADR-008: Keycloak self-hosted for SSO; Auth0 / Cognito as managed alternative

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: auth, identity, security

## Context

Current state: API key middleware (`backend/core/auth.py`) for admin endpoints;
no end-user identity. Need:
- B2C policyholder login (insurance customer portal)
- B2E adjuster / underwriter SSO (corp identity)
- B2B broker portal (federated identity)

## Decision

**Keycloak self-hosted for SSO. Cognito / Auth0 acceptable for customers preferring managed.**

## Rationale

- Open-source (no vendor lock)
- OIDC + SAML + LDAP federation built-in
- Multi-tenant realms (per-customer SSO config)
- Free at any scale (paid hosting if we offer managed Keycloak)
- BAA not required (we host)

## Consequences

### Positive
- Per-tenant identity realm (matches §41.3 multi-tenancy)
- Federated brokers (their AD → Keycloak via SAML)
- Adjusters use corp Google / Okta via OIDC

### Negative
- Ops burden (we manage Keycloak HA, backups, upgrades)
- Initial config complexity
- Token-revocation patterns need design

## Alternatives considered

- **AWS Cognito**: Tight AWS lock; tenant model awkward
- **Auth0**: Excellent UX but expensive at customer scale; vendor lock
- **Build our own**: Worst option; auth is solved
- **Authentik / FusionAuth**: Open-source alternatives; ecosystem smaller than Keycloak

## Implementation status

- [x] Identity-provider module scaffolded at `~/.claude/templates/production-readiness/identity-provider/` (ADR companion)
- [ ] Keycloak service in docker-compose (TODO)
- [ ] Per-realm config for B2C / B2E / B2B (TODO)
- [ ] OIDC integration in FastAPI (planned)

## Migration trigger

Move to Cognito when:
- Customer explicitly requests managed (rare)
- We exit cloud-agnostic posture (AWS commit)

## References

- Global §47.6 SOC2 CC6.1 access control + CC6.2 secrets
- HIPAA §164.312(d) entity authentication
- ADR-006 multi-tenancy (realm-per-tenant pattern)
