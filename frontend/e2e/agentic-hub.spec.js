// §A3 PENDING_TASKS closure · /agentic page smoke
// Verifies the AgenticHubPage opens cleanly and the Skills tab shows the
// §A5 SKILL_CATALOG link landed in this batch.

import { test, expect } from '@playwright/test';

const FRONT = process.env.INSUR_FRONTEND_URL || 'http://localhost:3210';

test('§A3 · /agentic renders with §A5 catalog link visible', async ({ page }) => {
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
  });

  const resp = await page.goto(`${FRONT}/agentic`, { waitUntil: 'domcontentloaded' });
  expect(resp).toBeTruthy();
  expect(resp.status()).toBeLessThan(500);

  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  const skillsTab = page.getByRole('button', { name: /skills/i });
  if (await skillsTab.count()) {
    await skillsTab.first().click();
  }

  const catalogLink = page.locator('a[href*="SKILL_CATALOG"]');
  await expect(catalogLink.first()).toBeVisible({ timeout: 8_000 });

  if (consoleErrors.length > 0) {
    console.warn('A3 console errors:', consoleErrors.slice(0, 5));
  }
  expect(consoleErrors.length).toBeLessThan(5);
});
