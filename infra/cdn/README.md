# CDN — CloudFront / Cloudflare scaffold

Per operator 2026-06-01 (production-readiness): scaffold CDN config for
frontend static assets + API edge caching.

This directory contains the templates. Deployment is out of scope for
this commit — operator + cloud team apply when ready.

## Stack choice — recommended

| Layer | Cloudflare (recommended) | AWS CloudFront |
|---|---|---|
| Cost | Free → $20/mo Pro → $200/mo Business | Pay-per-request |
| TLS termination | Auto + Universal SSL | ACM cert required |
| Edge caching | Built-in | Origin shield + cache behaviours |
| WAF | Bundled in Pro+ | Separate ($5/mo + per-rule) |
| DDoS protection | Always-on, unmetered | AWS Shield Standard free; Advanced $3K/mo |
| Workers / Edge functions | Cloudflare Workers (V8) | Lambda@Edge |
| Integration with existing stack | DNS-only (insur.example.com) | Tighter with AWS services |
| **Recommendation for insur_project (multi-cloud, self-host)** | **✓** | secondary |

## Files in this directory

| File | Purpose |
|---|---|
| `cloudflare/zone-config.json` | Zone + page-rules + caching ruleset |
| `cloudflare/worker-router.js` | Edge Worker for cache + region routing |
| `cloudfront/main.tf` | Terraform CloudFront distribution + S3 origin |
| `cloudfront/distribution.json` | Standalone distribution config |
| `caching-strategy.md` | Per-route cache TTL + invalidation rules |

## Caching strategy summary

| Path pattern | Cache TTL | Notes |
|---|---|---|
| `/api/v1/insurance/depts` | 5 min | Dept list changes rarely |
| `/api/v1/insurance/depts/*/spec` | 1 hour | Spec doc; bust on commit |
| `/api/v1/insurance/depts/*/dashboards/*` | 1 hour | Role dashboards static-ish |
| `/api/v1/insurance/depts/*/pipelines/*/run` | **no-cache** | Side-effect endpoint |
| `/api/v1/holy/*` | 30s | Most reads tenant-scoped — short TTL |
| `/static/*` | 1 year | Hashed asset paths |
| `/index.html` | 5 min | SPA shell |

## Cache key

Per global §41.3 multi-tenant: cache key MUST include `X-Tenant-ID`
header (Cloudflare: custom cache key; CloudFront: cache policy → header
allowlist). Without this, tenant A's response gets served to tenant B.

## Invalidation

| Trigger | Action |
|---|---|
| Backend deploy | Purge `/api/v1/*` via Cloudflare API or CloudFront invalidation |
| Frontend deploy | Purge `/index.html` only (hashed assets cache-bust naturally) |
| Per-dept doc regen | Purge `/api/v1/insurance/depts/<dept>/*` |
| Per-role dashboard regen | Purge `/api/v1/insurance/depts/<dept>/dashboards/<role>` |

## Composes with

- §47 architecture — CDN is in front of NGINX LB in front of backend pool
- §38 governance — every cached response carries `X-Cache-Status` for audit
- §41.3 tenant isolation — cache key MUST include `X-Tenant-ID`
- §47.6 SOC2 CC6.6 — segmentation at edge

## Status

- [x] Cloudflare zone config template
- [x] Cloudflare Worker stub for routing
- [x] CloudFront Terraform template
- [x] Caching strategy doc
- [ ] Actual deployment (operator + cloud team)
- [ ] DNS cutover
- [ ] WAF rule tuning
- [ ] Cache-hit metrics dashboard
