// @ts-check
// all-processes-link-check.spec.js — diagnostic per-URL audit.
//
// For every insurance process/domain URL:
//   - Visit /insurance/<deptId>/<domain>/<processSlug>
//   - Detect HTTP status, load time, console errors, tab count, feedback widget,
//     domain warning, actual sidebar menu row counts, and rendered content.
//   - Also visit every /insurance/<deptId>/<domain> landing page so B2C/B2B/B2E
//     links cannot silently expand without showing UI.
//   - Emit JSON to test-results/process-link-report.json
//
// Default targets only b2c. Override with PROCESS_LINK_DOMAIN env var (b2c|b2b|b2e|all).
//
// Run:
//   PLAYWRIGHT_BASE_URL=http://localhost:5173
//   PROCESS_LINK_DOMAIN=all
//   npx playwright test e2e/all-processes-link-check.spec.js --project=chromium --workers=1

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const BLUEPRINT_PATH = path.resolve(process.cwd(), '../data/insurance/blueprint.json');
const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, 'utf-8'));
const TARGET_DOMAIN = (process.env.PROCESS_LINK_DOMAIN || 'b2c').toLowerCase();
const CANONICAL_DOMAINS = ['b2c', 'b2b', 'b2e'];

function slugify(s) {
  return (s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function domainsForDept(dept) {
  if (TARGET_DOMAIN === 'all') return CANONICAL_DOMAINS;
  return CANONICAL_DOMAINS.includes(TARGET_DOMAIN) ? [TARGET_DOMAIN] : ['b2c'];
}

const DOMAIN_PAGES = [];
const PROCESS_URLS = [];
for (const dept of bp.department_catalog || []) {
  const declaredDomains = Object.keys(dept.channel_scenarios || {}).map((d) => d.toLowerCase());
  for (const domain of domainsForDept(dept)) {
    DOMAIN_PAGES.push({
      dept_id: dept.id,
      dept_name: dept.name,
      domain,
      declared_domains: declaredDomains,
      process_count: (dept.processes || []).length,
    });
    for (const p of dept.processes || []) {
      PROCESS_URLS.push({
        dept_id: dept.id,
        dept_name: dept.name,
        domain,
        declared_domains: declaredDomains,
        proc_name: p.name,
        proc_slug: slugify(p.name),
        ai_count: (p.ai || []).length,
      });
    }
  }
}

const REPORT = {
  generated_at: new Date().toISOString(),
  base_url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
  target_domain: TARGET_DOMAIN,
  total_domain_pages: DOMAIN_PAGES.length,
  total_process_urls: PROCESS_URLS.length,
  tool_recommendations: [
    'Playwright: link, tab, F12 console, trace, screenshots, and load timing audit',
    'Lighthouse CI or PageSpeed Insights: web-vitals and bundle loading budgets',
    'Vite visualizer / rollup-plugin-visualizer: chunk and lazy-loading analysis',
    'React Profiler: component render cost and tab-refresh bottlenecks',
    'k6: API and 1000-request load testing',
    'Mermaid / React Flow / ECharts / Recharts: flowchart, pipeline, graph, and KPI visualization',
    'OpenTelemetry: frontend/backend trace correlation and history',
    'Sentry or OpenReplay: session replay, F12 runtime errors, and user-impact history',
  ],
  summary: {},
  domain_pages: [],
  process_pages: [],
};
const OUT_DIR = path.resolve(process.cwd(), 'test-results');
const OUT_JSON = path.join(OUT_DIR, 'process-link-report.json');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

test.describe('Insurance domain landing link check', () => {
  test(`enumerated ${DOMAIN_PAGES.length} domain landing URLs (domain=${TARGET_DOMAIN})`, () => {
    expect(DOMAIN_PAGES.length).toBeGreaterThan(0);
  });

  for (const item of DOMAIN_PAGES) {
    test(`domain [${item.dept_id}/${item.domain}] ${item.dept_name}`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const url = `/insurance/${item.dept_id}/${item.domain}`;
      const start = Date.now();
      const row = {
        url,
        dept_id: item.dept_id,
        dept_name: item.dept_name,
        domain: item.domain,
        domain_declared: item.declared_domains,
        domain_is_declared: item.declared_domains.includes(item.domain),
        http_status: null,
        load_ms: null,
        heading: '',
        process_card_count: 0,
        submenu_domain_rows: 0,
        submenu_process_rows: 0,
        has_empty_state: false,
        console_error_count: 0,
        console_errors: [],
        load_error: null,
      };

      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        row.http_status = resp?.status() ?? null;
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      } catch (e) {
        row.load_error = e?.message || String(e);
        REPORT.domain_pages.push(row);
        return;
      }

      row.load_ms = Date.now() - start;
      row.heading = (await page.locator('h1, h2').first().innerText({ timeout: 3000 }).catch(() => ''))?.trim() || '';
      row.process_card_count = await page.locator('.insurance-content-pane .insurance-card[role="button"]').count().catch(() => 0);
      row.submenu_domain_rows = await page.locator('.insurance-sub-menu .insurance-subprocess-row').count().catch(() => 0);
      row.submenu_process_rows = await page.locator('.insurance-sub-menu .insurance-process-row').count().catch(() => 0);
      row.has_empty_state = (await page.locator('.insurance-empty-state').count().catch(() => 0)) > 0;
      row.console_error_count = consoleErrors.length;
      row.console_errors = consoleErrors.slice(0, 5);
      REPORT.domain_pages.push(row);

      expect(row.http_status).toBeLessThan(400);
      expect(row.heading.length).toBeGreaterThan(0);
      expect(row.process_card_count).toBeGreaterThan(0);
      expect(row.submenu_domain_rows).toBeGreaterThan(0);
      expect(row.submenu_process_rows).toBeGreaterThan(0);
    });
  }
});

test.describe('Insurance process link check', () => {
  test(`enumerated ${PROCESS_URLS.length} process URLs (domain=${TARGET_DOMAIN})`, () => {
    expect(PROCESS_URLS.length).toBeGreaterThan(0);
  });

  for (const p of PROCESS_URLS) {
    test(`[${p.dept_id}/${p.domain}] ${p.proc_name}`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const url = `/insurance/${p.dept_id}/${p.domain}/${p.proc_slug}`;
      const start = Date.now();
      const row = {
        url,
        dept_id: p.dept_id,
        dept_name: p.dept_name,
        domain: p.domain,
        domain_declared: p.declared_domains,
        domain_is_declared: p.declared_domains.includes(p.domain),
        proc_name: p.proc_name,
        proc_slug: p.proc_slug,
        ai_count: p.ai_count,
        http_status: null,
        load_ms: null,
        heading: '',
        tab_count: 0,
        active_tab_count: 0,
        has_warning_banner: false,
        warning_text: '',
        submenu_domain_rows: 0,
        submenu_process_rows: 0,
        has_feedback_widget: false,
        has_empty_state: false,
        console_error_count: 0,
        console_errors: [],
        load_error: null,
      };

      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        row.http_status = resp?.status() ?? null;
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      } catch (e) {
        row.load_error = e?.message || String(e);
        REPORT.process_pages.push(row);
        return;
      }

      row.load_ms = Date.now() - start;
      row.heading = (await page.locator('h1, h2').first().innerText({ timeout: 3000 }).catch(() => ''))?.trim() || '';
      row.tab_count = await page.getByRole('tab').count().catch(() => 0);
      row.active_tab_count = await page.getByRole('tab', { selected: true }).count().catch(() => 0);
      const warningSel = page.locator('text=/not mapped to/i');
      if (await warningSel.count().catch(() => 0) > 0) {
        row.has_warning_banner = true;
        row.warning_text = (await warningSel.first().innerText().catch(() => ''))?.trim() || '';
      }
      row.submenu_domain_rows = await page.locator('.insurance-sub-menu .insurance-subprocess-row').count().catch(() => 0);
      row.submenu_process_rows = await page.locator('.insurance-sub-menu .insurance-process-row').count().catch(() => 0);
      row.has_feedback_widget = (await page.getByTestId('feedback-widget').count().catch(() => 0)) > 0;
      row.has_empty_state = (await page.locator('.insurance-empty-state').count().catch(() => 0)) > 0;
      row.console_error_count = consoleErrors.length;
      row.console_errors = consoleErrors.slice(0, 5);
      REPORT.process_pages.push(row);

      expect(row.http_status).toBeLessThan(400);
      expect(row.heading).toContain(p.proc_name.slice(0, Math.min(10, p.proc_name.length)));
      expect(row.tab_count).toBeGreaterThanOrEqual(22);
      expect(row.active_tab_count).toBe(1);
      expect(row.has_feedback_widget).toBeTruthy();
      expect(row.submenu_domain_rows).toBeGreaterThan(0);
      expect(row.submenu_process_rows).toBeGreaterThan(0);
      expect(row.has_empty_state).toBeFalsy();
    });
  }

  test.afterAll(async () => {
    const processFailures = REPORT.process_pages.filter((row) => row.load_error || row.http_status >= 400 || row.tab_count < 22 || !row.has_feedback_widget || row.has_empty_state);
    const domainFailures = REPORT.domain_pages.filter((row) => row.load_error || row.http_status >= 400 || row.process_card_count < 1 || row.has_empty_state);
    REPORT.summary = {
      generated_at: new Date().toISOString(),
      domain_pages_checked: REPORT.domain_pages.length,
      process_pages_checked: REPORT.process_pages.length,
      domain_failures: domainFailures.length,
      process_failures: processFailures.length,
      console_error_pages: [...REPORT.domain_pages, ...REPORT.process_pages].filter((row) => row.console_error_count > 0).length,
      slow_pages_over_5000ms: [...REPORT.domain_pages, ...REPORT.process_pages].filter((row) => (row.load_ms || 0) > 5000).length,
      domain_failure_urls: domainFailures.slice(0, 20).map((row) => row.url),
      process_failure_urls: processFailures.slice(0, 20).map((row) => row.url),
    };
    writeFileSync(OUT_JSON, JSON.stringify(REPORT, null, 2));
    console.log(`
  wrote ${OUT_JSON}`);
    console.log(`  domains=${REPORT.summary.domain_pages_checked} domain_failures=${REPORT.summary.domain_failures}`);
    console.log(`  processes=${REPORT.summary.process_pages_checked} process_failures=${REPORT.summary.process_failures}
`);
  });
});
