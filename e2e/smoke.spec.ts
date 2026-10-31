import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Clear once per test (not on every reload) so page.goto() keeps the app state.
    try {
      if (!sessionStorage.getItem('__e2e_cleared')) {
        localStorage.clear();
        sessionStorage.setItem('__e2e_cleared', '1');
      }
    } catch {
      /* ignore */
    }
  });
});

async function start(page: Page) {
  await page.goto('/');
  await page.getByTestId('welcome.allow').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
}

test('first launch shows the welcome screen and "Permitir ubicación" opens the map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome.screen')).toBeVisible();
  await expect(page.getByText('Descubrí planes cerca de vos')).toBeVisible();
  await page.getByTestId('welcome.allow').click();
  await expect(page.getByTestId('tabs.map')).toBeVisible();
});

test('map results card shows the counts from the design', async ({ page }) => {
  await start(page);
  await expect(page.getByTestId('map.results.title')).toHaveText('20 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.results.subtitle')).toHaveText('14 gratis');
});

test('guest saves a plan: login gate returns to the plan and saves it', async ({ page }) => {
  await start(page);
  await page.goto('/vueltica/v-sabana');
  await page.getByTestId('detail.save').click();
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('detail.save')).toContainText('Guardado');
});

test('profile shows level 3 for the signed-in user', async ({ page }) => {
  await start(page);
  await page.getByTestId('tabs.profile').click();
  await page.getByTestId('profile.signIn').click();
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('profile.levelBadge')).toContainText('Nivel 3 · De confianza');
  await expect(page.getByTestId('profile.points')).toContainText('172 puntos');
});
