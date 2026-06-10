// @ts-check
// all-processes-link-check.spec.js — diagnostic per-URL audit.
//
// For every process in the blueprint:
//   - Visit /insurance/<deptId>/<domain>/<processSlug>
//   - Detect: HTTP status · tab count · "not mapped to domain" warning · sub-menu rows · FeedbackWidget
//   - Emit JSON to test-results/process-link-report.json
//
// Default targets only b2c. Override with PROCESS_LINK_DOMAIN env var (b2c|b2b|b2e|all).
//
// Run:
//   PLAYWRIGHT_BASE_URL=http://localhost:3210 \
//     npx playwright test e2e/all-processes-link-check.spec.js --project=chromium --workers=1

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const BLUEPRINT_PATH = path.resolve(process.cwd(), '../data/insurance/blueprint.json');
const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, 'utf-8'));
const TARGET_DOMAIN = (process.env.PROCESS_LINK_DOMAIN || 'b2c').toLowerCase();

function slugify(s) {
  return (s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

const PROCESSES = [];
for (const dept of bp.department_catalog || []) {
  const did = dept.id;
  const scen = dept.channel_scenarios || {};
  const declaredDomains = Object.keys(scen).map((d) => d.toLowerCase());
  const domainsToTest = TARGET_DOMAIN === 'all'
    ? (declaredDomains.length ? declaredDomains : ['b2c'])
    : [TARGET_DOMAIN];
  for (const p of dept.processes || []) {
    for (const domain of domainsToTest) {
      PROCESSES.push({
        dept_id: did,
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

const REPORT = [];
const OUT_DIR = path.resolve(process.cwd(), 'test-results');
const OUT_JSON = path.join(OUT_DIR, 'process-link-report.json');

test.describe('All processes link check', () => {
  test(`enumerated ${PROCESSES.length} URLs (domain=${TARGET_DOMAIN})`, () => {
    expect(PROCESSES.length).toBeGreaterThan(0);
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const p of PROCESSES) {
    test(`[${p.dept_id}/${p.domain}] ${p.proc_name}`, async ({ page }) => {
      const url = `/insurance/${p.dept_id}/${p.domain}/${p.proc_slug}`;
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
        tab_count: 0,
        has_warning_banner: false,
        warning_text: '',
        sub_menu_item_count: 0,
        has_feedback_widget: false,
        load_error: null,
      };

      let resp;
      try {
        resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        row.http_status = resp?.status() ?? null;
        // Allow time for SPA hydration
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      } catch (e) {
        row.load_error = e?.message || String(e);
        REPORT.push(row);
        // Still record; don't fail this test (we collect data on all 322)
        return;
      }

      try {
        row.tab_count = await page.getByRole('tab').count();
      } catch { /* noop */ }

      try {
        const warningSel = page.locator('text=/not mapped to/i');
        if (await warningSel.count() > 0) {
          row.has_warning_banner = true;
          row.warning_text = (await warningSel.first().innerText().catch(() => ''))?.trim() || '';
        }
      } catch { /* noop */ }

      // Sub-menu rows = sidebar nav items under the process · look for any `nav` aria-role
      // OR the insurance sub-menu's links. Conservative: count anchors inside a nav element.
      try {
        const navItems = page.locator('nav a, [role="navigation"] a');
        row.sub_menu_item_count = await navItems.count();
      } catch { /* noop */ }

      try {
        row.has_feedback_widget = (await page.getByTestId('feedback-widget').count()) > 0;
      } catch { /* noop */ }

      REPORT.push(row);
    });
  }

  test.afterAll(async () => {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_JSON, JSON.stringify({
      generated_at: new Date().toISOString(),
      base_url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
      target_domain: TARGET_DOMAIN,
      total_urls: PROCESSES.length,
      report: REPORT,
    }, null, 2));
    console.log(`\n  ✓ wrote ${OUT_JSON} (${REPORT.length} rows)\n`);
  });
});
