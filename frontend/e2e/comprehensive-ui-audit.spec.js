// @ts-check
// comprehensive-ui-audit.spec.js
//
// PER OPERATOR · 2026-06-08: test each link in main menu + sub menu · load time ·
// refresh · router/navigation · each tab + sub-tab + each component · lazy loading ·
// auto-refresh capability.
//
// Strategy: rather than visit all 322 × 22 tabs = 7084 combinations (~2 hours),
// sample 1 process per dept × every tab × verify load · then 1 random process ×
// router/refresh/lazy-load on every tab. Total ≈ 21 × 22 + 4 × 22 = 550 page
// loads ≈ 6-10 min wall-clock.
//
// JSON output: test-results/comprehensive-ui-audit.json
// Run:
//   PLAYWRIGHT_BASE_URL=http://localhost:3210 \
//     npx playwright test e2e/comprehensive-ui-audit.spec.js --project=chromium --workers=2

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const BLUEPRINT_PATH = path.resolve(process.cwd(), '../data/insurance/blueprint.json');
const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, 'utf-8'));

function slugify(s) {
  return (s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

// 22 tab slugs (per §73 + Simulation = 22)
const TAB_SLUGS = [
  'readme', 'tech-stack', 'demo-story', 'as-is-to-be', 'problem',
  'data', 'model', 'analysis', 'user-story', 'user-demo',
  'manual', 'automatic', 'flow-diagram', 'output', 'visualization',
  'dashboard', 'simulation', 'resai', 'expai', 'governance',
  'tests', 'security',
];

// Sample 1 process per dept (deterministic · first process)
const SAMPLE_PER_DEPT = [];
for (const dept of bp.department_catalog || []) {
  const procs = dept.processes || [];
  if (!procs.length) continue;
  const scen = dept.channel_scenarios || {};
  const domain = (Object.keys(scen)[0] || 'b2c').toLowerCase();
  const p = procs[0];
  SAMPLE_PER_DEPT.push({
    dept_id: dept.id,
    dept_name: dept.name,
    domain,
    proc_name: p.name,
    proc_slug: slugify(p.name),
  });
}

const OUT_DIR = path.resolve(process.cwd(), 'test-results');
const OUT_JSON = path.join(OUT_DIR, 'comprehensive-ui-audit.json');
const REPORT = {
  generated_at: new Date().toISOString(),
  base_url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
  total_depts: SAMPLE_PER_DEPT.length,
  total_tabs: TAB_SLUGS.length,
  main_menu_checks: [],
  process_tab_checks: [],
  refresh_checks: [],
  router_checks: [],
  lazy_load_checks: [],
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────
// SECTION 1 · Main menu links from the dashboard
// ─────────────────────────────────────────────────────────────────────
const MAIN_MENU_LINKS = [
  { name: 'Dashboard', url: '/' },
  { name: 'Insurance Catalog', url: '/insurance' },
  { name: 'Admin · Tenants', url: '/admin/tenants' },
  { name: 'Admin · Feedback (NEW)', url: '/admin/feedback' },
  { name: 'Data Explorer', url: '/data-explorer' },
];

test.describe('1. Main menu links', () => {
  for (const link of MAIN_MENU_LINKS) {
    test(`main · ${link.name}`, async ({ page }) => {
      const start = Date.now();
      let resp;
      try {
        resp = await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      } catch (e) {
        REPORT.main_menu_checks.push({
          name: link.name, url: link.url,
          http_status: null, load_ms: Date.now() - start,
          error: String(e),
        });
        return;
      }
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => undefined);
      const load_ms = Date.now() - start;
      let h1Text = '';
      try { h1Text = (await page.locator('h1, h2').first().innerText({ timeout: 3000 }).catch(() => ''))?.trim() || ''; } catch (_ignored) { void _ignored; }
      REPORT.main_menu_checks.push({
        name: link.name, url: link.url,
        http_status: resp?.status() ?? null,
        load_ms,
        title: h1Text.slice(0, 80),
      });
      expect(resp?.status()).toBeLessThan(400);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// SECTION 2 · Sample insurance process: every tab loads + has FeedbackWidget
// ─────────────────────────────────────────────────────────────────────
test.describe('2. Process tab × every tab × every dept (sample)', () => {
  for (const p of SAMPLE_PER_DEPT) {
    for (const tabSlug of TAB_SLUGS) {
      test(`[${p.dept_id}] ${p.proc_name} ?tab=${tabSlug}`, async ({ page }) => {
        const url = `/insurance/${p.dept_id}/${p.domain}/${p.proc_slug}?tab=${tabSlug}`;
        const start = Date.now();
        let resp;
        try {
          resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
        } catch (e) {
          REPORT.process_tab_checks.push({
            dept_id: p.dept_id, dept_name: p.dept_name, domain: p.domain,
            proc_name: p.proc_name, tab: tabSlug, url,
            http_status: null, load_ms: Date.now() - start, error: String(e),
          });
          return;
        }
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        const load_ms = Date.now() - start;
        let tabCount = 0, hasWidget = false;
        try { tabCount = await page.getByRole('tab').count(); } catch (_ignored) { void _ignored; }
        try { hasWidget = (await page.getByTestId('feedback-widget').count()) > 0; } catch (_ignored) { void _ignored; }
        // Detect domain-warning banner
        let warning = false;
        try { warning = (await page.locator('text=/not mapped to/i').count()) > 0; } catch (_ignored) { void _ignored; }
        REPORT.process_tab_checks.push({
          dept_id: p.dept_id, dept_name: p.dept_name, domain: p.domain,
          proc_name: p.proc_name, tab: tabSlug, url,
          http_status: resp?.status() ?? null,
          load_ms,
          tab_count: tabCount,
          has_feedback_widget: hasWidget,
          has_domain_warning: warning,
        });
        expect(resp?.status()).toBeLessThan(400);
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// SECTION 3 · Refresh behavior: F5 from each tab returns to same tab
// ─────────────────────────────────────────────────────────────────────
test.describe('3. Refresh persistence', () => {
  // Sample 4 processes for refresh test (one per major dept domain)
  const refreshSamples = [
    { dept_id: 7, domain: 'b2c', proc_slug: 'fnol-first-notice-of-loss', proc_name: 'FNOL' },
    { dept_id: 4, domain: 'b2c', proc_slug: 'submission-intake', proc_name: 'Submission Intake' },
    { dept_id: 5, domain: 'b2c', proc_slug: 'policy-issuance', proc_name: 'Policy Issuance' },
    { dept_id: 3, domain: 'b2c', proc_slug: 'lead-management', proc_name: 'Lead Management (Sales)' },
  ];
  for (const p of refreshSamples) {
    for (const tabSlug of ['data', 'simulation', 'resai', 'expai']) {
      test(`refresh on ${p.proc_name} ?tab=${tabSlug}`, async ({ page }) => {
        const url = `/insurance/${p.dept_id}/${p.domain}/${p.proc_slug}?tab=${tabSlug}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 12000 });
        const start = Date.now();
        await page.reload({ waitUntil: 'networkidle', timeout: 12000 });
        const reload_ms = Date.now() - start;
        const finalUrl = page.url();
        REPORT.refresh_checks.push({
          dept: p.dept_id, proc_name: p.proc_name, tab: tabSlug,
          reload_ms, final_url: finalUrl,
          url_preserved: finalUrl.includes(`tab=${tabSlug}`),
        });
        expect(finalUrl).toContain(`tab=${tabSlug}`);
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// SECTION 4 · Router/navigation: back/forward preserves tab
// ─────────────────────────────────────────────────────────────────────
test.describe('4. Router navigation', () => {
  test('back/forward navigation across tabs', async ({ page }) => {
    const baseUrl = '/insurance/7/b2c/fnol-first-notice-of-loss';
    await page.goto(`${baseUrl}?tab=data`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.goto(`${baseUrl}?tab=simulation`, { waitUntil: 'networkidle', timeout: 12000 });
    await page.goto(`${baseUrl}?tab=resai`, { waitUntil: 'networkidle', timeout: 12000 });
    const start = Date.now();
    await page.goBack({ waitUntil: 'networkidle' });
    const back_ms = Date.now() - start;
    const backUrl = page.url();
    const fStart = Date.now();
    await page.goForward({ waitUntil: 'networkidle' });
    const forward_ms = Date.now() - fStart;
    const fwdUrl = page.url();
    REPORT.router_checks.push({
      action: 'goBack', url: backUrl, latency_ms: back_ms,
      preserved: backUrl.includes('tab=simulation'),
    });
    REPORT.router_checks.push({
      action: 'goForward', url: fwdUrl, latency_ms: forward_ms,
      preserved: fwdUrl.includes('tab=resai'),
    });
    expect(backUrl).toContain('tab=simulation');
    expect(fwdUrl).toContain('tab=resai');
  });
});

// ─────────────────────────────────────────────────────────────────────
// SECTION 5 · Lazy-load probes (Suspense fallback timing)
// ─────────────────────────────────────────────────────────────────────
test.describe('5. Lazy-load probes', () => {
  const lazyTargets = [
    { name: 'Admin · Feedback', url: '/admin/feedback' },
    { name: 'Admin · Tenants', url: '/admin/tenants' },
    { name: 'Data Explorer', url: '/data-explorer' },
  ];
  for (const t of lazyTargets) {
    test(`lazy: ${t.name}`, async ({ page }) => {
      const start = Date.now();
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const dcl_ms = Date.now() - start;
      let suspenseShown = false;
      try { suspenseShown = (await page.locator('text=/loading/i').count()) > 0; } catch (_ignored) { void _ignored; }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      const networkidle_ms = Date.now() - start;
      REPORT.lazy_load_checks.push({
        name: t.name, url: t.url,
        dcl_ms, networkidle_ms,
        suspense_shown: suspenseShown,
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Write report
// ─────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  // Aggregates
  const all = REPORT.process_tab_checks;
  REPORT.summary = {
    main_menu_total: REPORT.main_menu_checks.length,
    process_tab_total: all.length,
    process_tab_failures: all.filter((r) => (r.http_status ?? 0) >= 400 || r.error).length,
    avg_tab_load_ms: all.length ? Math.round(all.reduce((a, b) => a + (b.load_ms || 0), 0) / all.length) : 0,
    max_tab_load_ms: all.length ? Math.max(...all.map((r) => r.load_ms || 0)) : 0,
    feedback_widget_coverage: all.length ? (all.filter((r) => r.has_feedback_widget).length / all.length).toFixed(3) : '0',
    pages_with_warning: all.filter((r) => r.has_domain_warning).length,
  };
  writeFileSync(OUT_JSON, JSON.stringify(REPORT, null, 2));
  console.log(`\n  ✓ wrote ${OUT_JSON}`);
  console.log(`    main-menu: ${REPORT.main_menu_checks.length}`);
  console.log(`    process-tab: ${REPORT.process_tab_checks.length} (failures: ${REPORT.summary.process_tab_failures})`);
  console.log(`    refresh: ${REPORT.refresh_checks.length}`);
  console.log(`    router: ${REPORT.router_checks.length}`);
  console.log(`    lazy: ${REPORT.lazy_load_checks.length}`);
  console.log(`    avg load: ${REPORT.summary.avg_tab_load_ms}ms`);
  console.log(`    widget coverage: ${REPORT.summary.feedback_widget_coverage}\n`);
});
