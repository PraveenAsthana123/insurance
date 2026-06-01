// capture-all-depts.spec.js — screenshots for depts that lack dedicated
// ε-style enrichment but now render the shared "Data snapshot" block.
// Run: npm run test:e2e -- capture-all-depts.spec.js --project=chromium
// Produces PNGs in docs/screenshots/depts/

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../docs/screenshots/depts');

test.use({ viewport: { width: 1440, height: 900 } });

const DEPTS = [
  { slug: 'supply-chain', file: 'supply-chain-overview.png' },
  { slug: 'contact-center', file: 'contact-center-overview.png' },
  { slug: 'marketing', file: 'marketing-overview.png' },
  { slug: 'telehealth', file: 'telehealth-overview.png' },
];

test.describe('All depts — Data snapshot enrichment screenshots', () => {
  for (const { slug, file } of DEPTS) {
    test(`overview — ${slug}`, async ({ page }) => {
      await page.goto(`/${slug}`);
      // Generic block should render for every non-dashboard dept.
      await expect(
        page.getByRole('heading', { name: /Data snapshot/ }).first()
      ).toBeVisible({ timeout: 10_000 });
      // Let any async content + layout settle.
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    });
  }
});
