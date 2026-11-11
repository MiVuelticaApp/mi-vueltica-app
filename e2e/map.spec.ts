import { expect, test, tab, start, startSignedIn, openMap } from './helpers';

test('E1 first launch -> welcome -> "Permitir ubicación" -> map with user location', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome.screen')).toBeVisible();
  await expect(page.getByTestId('welcome.title')).toHaveText('Descubrí planes cerca de vos');
  await expect(page.getByTestId('welcome.body')).toContainText('solo mientras usás la app');
  // all seven provinces are offered
  for (const p of ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón']) {
    await expect(page.getByTestId(`welcome.province.${p}`)).toBeVisible();
  }
  await page.getByTestId('welcome.allow').click();
  await expect(page.getByTestId('map.screen')).toBeVisible();
  await expect(page.getByTestId('map.userLocation')).toBeVisible();
  for (const id of ['tabs.map', 'tabs.list', 'tabs.contribute', 'tabs.saved', 'tabs.profile']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.reload();
  await expect(page.getByTestId('welcome.screen')).toHaveCount(0);
  await expect(page.getByTestId('map.results')).toBeVisible();
});

test('M1 results card "20 planes de hasta ₡5.000 · 14 gratis" opens Lista', async ({ page }) => {
  await start(page);
  await expect(page.getByTestId('map.results.title')).toHaveText('20 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.results.subtitle')).toHaveText('14 gratis');
  await page.getByTestId('map.results').click();
  await expect(page.getByTestId('list.screen')).toBeVisible();
});

test('M2 Estudiantes chip -> "18 planes para estudiantes" and "Filtros · 1"', async ({ page }) => {
  await start(page);
  const chip = page.getByTestId('map.chip.students');
  const bgBefore = await chip.evaluate((e) => getComputedStyle(e).backgroundColor);
  await chip.click();
  await expect(page.getByTestId('map.results.title')).toHaveText('18 planes para estudiantes');
  await expect(page.getByTestId('map.chip.filters')).toContainText('Filtros · 1');
  // selected chips are filled with the brand colour (differs from the unselected glass fill, in both themes)
  await expect(chip).not.toHaveCSS('background-color', bgBefore);
  await expect(chip).toHaveCSS('background-color', await page.evaluate(() => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(157, 182, 255)' : 'rgb(27, 60, 140)')));
  // toggling it off restores the unfiltered card
  await page.getByTestId('map.chip.students').click();
  await expect(page.getByTestId('map.results.title')).toHaveText('20 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.chip.filters')).toHaveAttribute('aria-label', 'Filtros');
});

test('M3 tapping a pin opens the Detalle sheet', async ({ page }) => {
  await start(page);
  const pin = page.getByTestId('map.pin.v-sabana');
  await expect(pin).toBeVisible();
  await pin.click();
  await expect(page.getByTestId('detail.sheet')).toBeVisible();
  await expect(page.getByTestId('detail.title')).toHaveText('Parque La Sabana');
  await page.getByTestId('detail.close').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
});

test('M4 cluster tap zooms in and splits the cluster', async ({ page }) => {
  await start(page);
  const clusters = page.locator('[data-testid^="map.cluster."]');
  // zoom out until at least one cluster appears
  for (let i = 0; i < 6 && (await clusters.count()) === 0; i++) await page.getByTestId('map.zoomOut').click();
  await expect(clusters.first()).toBeVisible();
  const zoomBefore = await page.getByTestId('map.zoomLevel').getAttribute('aria-label');
  const label = await clusters.first().getAttribute('aria-label');
  expect(label).toMatch(/^\d+ planes agrupados$/);
  await clusters.first().click();
  await expect(page.getByTestId('map.zoomLevel')).not.toHaveAttribute('aria-label', zoomBefore!);
});

test('M5 pin opacity by price tier: gratis 1, hasta ₡2.500 .75, hasta ₡5.000 .5, selected 1', async ({ page }) => {
  await start(page);
  const opacity = (id: string) => page.getByTestId(`map.pin.${id}`).evaluate((el) => getComputedStyle(el).opacity);
  await expect(page.getByTestId('map.pin.v-plaza')).toBeVisible();
  expect(await opacity('v-plaza')).toBe('1'); // gratis
  expect(await opacity('v-melico')).toBe('0.75'); // hasta ₡2.500
  expect(await opacity('v-zoo')).toBe('0.5'); // hasta ₡5.000
  // a selected pin is always at full strength
  await page.getByTestId('map.pin.v-zoo').click();
  await expect(page.getByTestId('detail.sheet')).toBeVisible();
  await expect.poll(() => opacity('v-zoo')).toBe('1');
});

test('M6 Pendiente pins: none for guests; own pending + moderation queue for a level 3 user', async ({ page }) => {
  await start(page);
  await expect(page.locator('[data-testid^="map.pin.pending."]')).toHaveCount(0);
  await tab(page, 'profile').click();
  await page.getByTestId('profile.signIn').click();
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('profile.levelBadge')).toBeVisible();
  await openMap(page);
  // Ana is the author of "Feria de emprendedores UCR" and a moderator (queue items show as Pendiente too)
  await expect(page.getByTestId('map.pin.pending.v-feria-ana')).toBeVisible();
  await expect(page.getByTestId('map.pin.pending.v-cine-laura')).toBeVisible();
  // the rejected plan of Ana is not drawn
  await expect(page.getByTestId('map.pin.pending.v-cine-ana')).toHaveCount(0);
  // the author's own pending pin opens "Vueltica enviada"
  await page.getByTestId('map.pin.pending.v-feria-ana').click();
  await expect(page.getByTestId('sent.screen')).toBeVisible();
});

test('M6b moderators tapping a queue Pendiente pin land on Moderación', async ({ page }) => {
  await startSignedIn(page);
  await openMap(page);
  await page.getByTestId('map.pin.pending.v-cine-laura').click();
  await expect(page.getByTestId('mod.screen')).toBeVisible();
});

test('M7 account button opens Perfil', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.account').click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByTestId('profile.signedOut')).toBeVisible(); // guest
  await page.getByTestId('profile.signIn').click();
  await page.getByTestId('login.apple').click();
  await openMap(page);
  await page.getByTestId('map.account').click();
  await expect(page.getByTestId('profile.screen')).toBeVisible(); // signed in
});
