// One-off: capture Project Manager archetype page screenshots across 3 depts
// to confirm the page renders with dept-specific synthetic values.

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../docs/screenshots/sales');

test.use({ viewport: { width: 1440, height: 900 } });

test('16b project manager — sales', async ({ page }) => {
  await page.goto('/sales/manager/archetype/project-manager');
  await expect(page.getByText(/Project Manager/i).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/16b-project-manager-sales.png`, fullPage: true });
});

test('16c project manager — supply-chain', async ({ page }) => {
  await page.goto('/supply-chain/manager/archetype/project-manager');
  await expect(page.getByText(/Project Manager/i).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/16c-project-manager-supply-chain.png`, fullPage: true });
});

test('16d project manager — customer', async ({ page }) => {
  await page.goto('/customer/manager/archetype/project-manager');
  await expect(page.getByText(/Project Manager/i).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/16d-project-manager-customer.png`, fullPage: true });
});
