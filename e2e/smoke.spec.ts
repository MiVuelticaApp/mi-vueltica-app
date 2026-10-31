import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
});

test('first launch shows the welcome screen and "Permitir ubicación" opens the map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome.screen')).toBeVisible();
  await expect(page.getByText('Descubrí planes cerca de vos')).toBeVisible();
  await page.getByTestId('welcome.allow').click();
  await expect(page.getByTestId('tabs.map')).toBeVisible();
});
