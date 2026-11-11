import { expect, test, tab, vis, startSignedIn, openDetail, openList, setOffline } from './helpers';

test('O1 offline: banner with Reintentar, cached list/saved/recent plans, network actions disabled', async ({ page }) => {
  await startSignedIn(page);
  await openDetail(page, 'v-sabana'); // becomes a "recently viewed" plan and is cached
  await page.getByTestId('detail.close').click();
  await openList(page);
  await setOffline(page, true);
  // Lista: banner shown immediately and the cached plans stay
  await expect(page.getByTestId('offline.banner')).toContainText('Sin conexión. Mostrando lo guardado');
  await expect(page.getByTestId('offline.retry').filter({ visible: true }).first()).toHaveAttribute('aria-label', 'Reintentar');
  await expect(page.getByTestId('card.v-plaza')).toBeVisible();
  // Map: banner, no crash
  await tab(page, 'map').click();
  await expect(page.getByTestId('map.offlineBanner')).toContainText('Sin conexión');
  // Detalle of a recently viewed plan: opens from cache, with the banner and the network actions disabled
  await vis(page, 'map.pin.v-sabana').click();
  await expect(page.getByTestId('detail.title')).toHaveText('Parque La Sabana');
  await expect(vis(page, 'offline.banner')).toBeVisible();
  await expect(page.getByTestId('detail.save')).toHaveCSS('opacity', '0.45');
  await expect(page.getByTestId('detail.report')).toHaveCSS('opacity', '0.45');
  await page.getByTestId('detail.close').click();
  // back online: banners go away
  await setOffline(page, false);
  await expect(page.getByTestId('map.offlineBanner')).toHaveCount(0);
  // Guardados: saved plans are available offline
  await setOffline(page, true);
  await tab(page, 'saved').click();
  await expect(vis(page, 'offline.banner')).toBeVisible();
  await expect(page.getByTestId('card.v-jade')).toBeVisible();
});

test('O1b a saved plan that was never opened is available offline', async ({ page }) => {
  await startSignedIn(page);
  await tab(page, 'saved').click();
  await expect(page.getByTestId('card.v-jade')).toBeVisible();
  await setOffline(page, true);
  await page.getByTestId('card.v-jade').click();
  await expect(page.getByTestId('detail.title')).toHaveText('Noche de Museos: Museo del Jade', { timeout: 3000 });
});

test('O2 a verification made offline is queued and sent (+2 points) when the connection returns', async ({ page }) => {
  await startSignedIn(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.close').click();
  await setOffline(page, true);
  await vis(page, 'map.pin.v-sabana').click();
  await expect(page.getByTestId('detail.title')).toBeVisible();
  await page.getByTestId('detail.verify.same').click();
  await expect(page.getByTestId('toast')).toContainText('Verificación guardada. Se envía al reconectar');
  await page.getByTestId('detail.close').click();
  await setOffline(page, false);
  await tab(page, 'profile').click();
  await expect(page.getByTestId('profile.points')).toContainText('174 puntos', { timeout: 8000 });
});

test('O3 the dev switch "Simular sin conexión" in Ajustes toggles the offline state', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.settings').click();
  await page.getByTestId('settings.simulateOffline').evaluate((el: HTMLInputElement) => el.click());
  await page.goBack();
  await tab(page, 'map').click();
  await expect(page.getByTestId('map.offlineBanner')).toBeVisible();
});

test('O4 Lista -> offline -> Guardados -> Mapa must not freeze the page', async ({ page }) => {
  await startSignedIn(page);
  await openList(page);
  await setOffline(page, true);
  await tab(page, 'saved').click();
  await tab(page, 'map').click();
  await page.waitForTimeout(1200);
  const state = await Promise.race([page.evaluate(() => 'alive'), new Promise((r) => setTimeout(() => r('HUNG'), 3000))]);
  expect(state).toBe('alive');
});
