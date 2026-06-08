import { test, expect } from '@playwright/test';

const PROCESS_URL = '/insurance/1/b2c/product-strategy';

async function openTab(page, name) {
  await page.getByRole('tab', { name }).click();
}

test.describe('Insurance process detail tabs', () => {
  test('renders required process tabs and key content surfaces', async ({ page }) => {
    await page.goto(PROCESS_URL);

    for (const name of [
      'Data',
      'Model',
      'Analysis',
      'User story',
      'User demo',
      'Visualization',
      'Simulation',
      'ResAI',
      'ExpAI',
    ]) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }

    await openTab(page, 'Data');
    await expect(page.getByRole('heading', { name: /Data visualization.*Before vs After/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Before vs After comparison' })).toBeVisible();

    await openTab(page, 'Visualization');
    await expect(page.getByRole('heading', { name: 'Before/after visualization' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Primary chart' })).toBeVisible();

    await openTab(page, 'Model');
    await expect(page.getByRole('heading', { name: /Model candidates/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Model readiness by capability' })).toBeVisible();

    await openTab(page, 'Analysis');
    await expect(page.getByRole('heading', { name: /Before\/after analysis/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analysis coverage' })).toBeVisible();

    await openTab(page, 'User story');
    await expect(page.getByRole('heading', { name: /Persona and business story/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acceptance criteria' })).toBeVisible();

    await openTab(page, 'User demo');
    await expect(page.getByRole('heading', { name: /Demo setup/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Demo readiness' })).toBeVisible();

    await openTab(page, 'Simulation');
    await expect(page.getByRole('heading', { name: /Scenario controls/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Simulation results/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Before vs after KPI simulation/i })).toBeVisible();

    await openTab(page, 'ResAI');
    await expect(page.getByRole('heading', { name: /Fairness \+ bias audit/i })).toBeVisible();

    await openTab(page, 'ExpAI');
    await expect(page.getByRole('heading', { name: /Explanation methods/i })).toBeVisible();

    // FeedbackWidget present on every tab · per GLOBAL_INPUT_PERSISTENCE_POLICY
    // aria-label='Thumbs up'/'Thumbs down' is the accessible name; visible text is "👍 Helpful"
    await expect(page.getByTestId('feedback-widget')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thumbs up' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thumbs down' })).toBeVisible();
  });
});
