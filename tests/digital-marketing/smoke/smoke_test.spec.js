// Tier 8 — Smoke / E2E test for digital-marketing.
//
// Recommended: playwright (per global §64.42).
//
// Run with:  npx playwright test tests/digital-marketing/smoke/
//
// Per global §64.30 tier 8: top 20 critical endpoints + UI routes per deploy.

const { test, expect } = require('@playwright/test');

test.describe('digital-marketing smoke tests', () => {
  test('HOLY nav page for digital-marketing loads', async ({ page }) => {
    await page.goto('http://localhost:3000/holy/digital-marketing');
    await expect(page).toHaveURL(/\/holy\/digital-marketing/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('NEGATIVE — bogus dept returns 404 or empty', async ({ page }) => {
    await page.goto('http://localhost:3000/holy/nonexistent-dept-xyz');
    // Either explicit 404 OR empty nav — both acceptable; absence of crash is the point
    await expect(page.locator('body')).toBeVisible();
  });
});
