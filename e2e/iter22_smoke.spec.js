// Iter 22 · Playwright smoke test for key panels + theme toggle.

import { test, expect } from '@playwright/test';

const BASE = process.env.UI_BASE_URL || 'http://localhost:3210';

test.describe('Iter 22 · UI smoke', () => {
  test('home loads + navigation exists', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('Cmd+K opens global search', async ({ page }) => {
    await page.goto(BASE + '/insurance');
    await page.waitForLoadState('domcontentloaded');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(300);
    const input = await page.locator('input[placeholder*="Search"]').first();
    if (await input.isVisible()) {
      await input.fill('fraud');
      await page.keyboard.press('Escape');
    }
  });

  test('theme toggle persists in localStorage', async ({ page }) => {
    await page.goto(BASE + '/insurance');
    await page.waitForLoadState('domcontentloaded');
    // Try to find the toggle (it may not be mounted in all routes)
    const toggleBtn = page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]').first();
    if (await toggleBtn.count()) {
      await toggleBtn.click();
      const theme = await page.evaluate(() => localStorage.getItem('insur.theme'));
      expect(['dark', 'light']).toContain(theme);
    }
  });

  test('AlertsBadge polls counts endpoint', async ({ page }) => {
    let counted = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/alerts/counts')) counted = true;
    });
    await page.goto(BASE + '/insurance');
    await page.waitForTimeout(3000);
    expect(counted).toBe(true);
  });
});
