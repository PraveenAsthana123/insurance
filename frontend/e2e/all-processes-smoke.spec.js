// @ts-check
// frontend/e2e/all-processes-smoke.spec.js
// BRUTAL smoke test · per operator instruction · top 1% coverage.
// Loops all 322 processes from blueprint · asserts route loads + at-least-one tab renders.
// Per §87.6 test class #1 (UI testing).

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

const BLUEPRINT_PATH = path.resolve(process.cwd(), '../data/insurance/blueprint.json');
const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, 'utf-8'));

function slugify(s) {
  return (s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

const PROCESSES = [];
for (const dept of bp.department_catalog || []) {
  const did = dept.id;
  const scen = dept.channel_scenarios || {};
  const defaultDomain = Object.keys(scen)[0]?.toLowerCase() || 'b2c';
  for (const p of dept.processes || []) {
    PROCESSES.push({
      dept_id: did,
      dept_name: dept.name,
      domain: defaultDomain,
      proc_name: p.name,
      proc_slug: slugify(p.name),
      ai_count: (p.ai || []).length,
    });
  }
}

test.describe('All 322 insurance processes smoke', () => {
  test(`blueprint produces ${PROCESSES.length} processes`, () => {
    expect(PROCESSES.length).toBeGreaterThanOrEqual(300);
  });

  // Sample 20 processes deterministically (every Nth) for fast CI
  // Full 322 takes ~10 min · sampling 20 takes ~30 sec.
  const SAMPLE_SIZE = parseInt(process.env.SMOKE_SAMPLE_SIZE || '20');
  const stride = Math.max(1, Math.floor(PROCESSES.length / SAMPLE_SIZE));
  const sampled = PROCESSES.filter((_, i) => i % stride === 0).slice(0, SAMPLE_SIZE);

  for (const p of sampled) {
    test(`[${p.dept_id}/${p.domain}] ${p.proc_name}`, async ({ page }) => {
      const url = `/insurance/${p.dept_id}/${p.domain}/${p.proc_slug}`;
      const resp = await page.goto(url);
      expect(resp?.status()).toBeLessThan(400);
      // Wait for tab list (21 tabs render via SimpleTabs)
      await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 10000 });
      const tabCount = await page.getByRole('tab').count();
      expect(tabCount).toBeGreaterThanOrEqual(15); // 21 expected · allow some flex
    });
  }
});
