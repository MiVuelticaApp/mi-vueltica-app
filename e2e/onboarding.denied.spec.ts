import { expect, test, tab } from './helpers';

// Runs in the `denied` project: geolocation permission is NOT granted.

test('E2 location denied -> pick Heredia -> map centred on Heredia, choice persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome.allow').click();
  // Permission denied: stays on Bienvenida and offers the province list.
  await expect(page.getByTestId('welcome.screen')).toBeVisible();
  await expect(page.getByTestId('welcome.zoneHint')).toContainText('Sin ubicación podés elegir una zona');
  await page.getByTestId('welcome.province.Heredia').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('map.results.title')).toContainText('planes');
  // Heredia has plans of its own (not the 20 of San José).
  await expect(page.getByTestId('map.results.title')).not.toHaveText('20 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.userLocation')).toHaveCount(0);
  // Persistence: reload goes straight to the map, no onboarding.
  await page.reload();
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('welcome.screen')).toHaveCount(0);
  await expect(page.getByTestId('map.results.title')).not.toHaveText('20 planes de hasta ₡5.000');
});

test('E3 "Ahora no" skips onboarding without a zone and persists', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome.notNow').click();
  await expect(tab(page, 'map')).toBeVisible();
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('map.userLocation')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('welcome.screen')).toHaveCount(0);
});
