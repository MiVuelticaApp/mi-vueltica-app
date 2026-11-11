import { expect, test, tab, vis, start, startSignedIn, openDetail, type Page } from './helpers';

const flip = (page: Page, id: string) => page.getByTestId(id).evaluate((el: HTMLInputElement) => el.click());
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
async function openSettings(page: Page) {
  await tab(page, 'profile').click();
  await page.getByTestId('profile.settings').click();
  await expect(page.getByTestId('settings.screen')).toBeVisible();
}

test('A1 Modo oscuro toggles the whole app and persists after a reload', async ({ page }) => {
  await start(page);
  await openSettings(page);
  const dark = page.getByTestId('settings.dark');
  const wasDark = await dark.isChecked();
  const surface = () => page.getByTestId('settings.screen').evaluate((e) => getComputedStyle(e).backgroundColor);
  const before = await surface();
  await flip(page, 'settings.dark');
  await expect(dark).toBeChecked({ checked: !wasDark });
  await expect.poll(surface).not.toBe(before);
  await page.waitForTimeout(250);
  await page.reload(); // stays on /ajustes
  await expect(page.getByTestId('settings.screen')).toBeVisible();
  await expect(page.getByTestId('settings.dark')).toBeChecked({ checked: !wasDark });
  await expect.poll(surface).not.toBe(before);
});

test('A2 text size slider scales the text and shows the percentage; system default label first', async ({ page }) => {
  await start(page);
  await openSettings(page);
  await expect(page.getByTestId('settings.textSize.value')).toHaveText('Sigue al sistema');
  const fs = () => page.getByTestId('settings.textSize.value').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const before = await fs();
  await page.getByTestId('settings.textSize').fill('1.5');
  await expect(page.getByTestId('settings.textSize.value')).toHaveText('150 %');
  await expect.poll(fs).toBeGreaterThan(before);
  await page.getByTestId('settings.textSize').fill('0.85');
  await expect(page.getByTestId('settings.textSize.value')).toHaveText('85 %');
  await expect.poll(fs).toBeLessThan(before);
});

test('A2b larger buttons, contrast and reduce motion switches are persisted', async ({ page }) => {
  await start(page);
  await openSettings(page);
  const h = () => page.getByTestId('tabs.profile').last().evaluate((e) => e.getBoundingClientRect().height);
  await flip(page, 'settings.largerButtons');
  await flip(page, 'settings.contrast');
  await flip(page, 'settings.reduceMotion');
  for (const id of ['largerButtons', 'contrast', 'reduceMotion']) await expect(page.getByTestId(`settings.${id}`)).toBeChecked();
  await page.waitForTimeout(250);
  await page.reload(); // stays on /ajustes
  await expect(page.getByTestId('settings.screen')).toBeVisible();
  for (const id of ['largerButtons', 'contrast', 'reduceMotion']) await expect(page.getByTestId(`settings.${id}`)).toBeChecked();
  void h;
});

test('A5 preferences: max price dialog and default directions app', async ({ page }) => {
  await start(page);
  await openSettings(page);
  await page.getByTestId('settings.maxPrice').click();
  await expect(page.getByTestId('settings.priceDialog')).toBeVisible();
  await page.getByTestId('settings.priceDialog.gratis').click();
  await expect(page.getByTestId('settings.maxPrice')).toContainText('Gratis');
  await page.getByTestId('settings.directionsApp').click();
  await expect(page.getByTestId('settings.directionsDialog')).toBeVisible();
  await expect(page.getByTestId('settings.directionsDialog.apple')).toHaveCount(0); // no Apple Maps off iOS
  await page.getByTestId('settings.directionsDialog.waze').click();
  await expect(page.getByTestId('settings.directionsApp')).toContainText('Waze');
});

test('A3 Eliminar cuenta: confirm dialog, then published plans stay credited to "Anónimo"', async ({ page }) => {
  await startSignedIn(page);
  await openDetail(page, 'v-mirador'); // published by Ana
  await expect(page.getByTestId('detail.community')).toContainText('Vueltica de Ana M.');
  await page.getByTestId('detail.close').click();
  await openSettings(page);
  await page.getByTestId('settings.delete').click();
  await expect(page.getByTestId('dialog.title')).toHaveText('¿Eliminar tu cuenta?');
  await expect(page.getByTestId('dialog.message')).toContainText('quedan a nombre de «Anónimo»');
  await page.getByTestId('dialog.cancel').click();
  await expect(page.getByTestId('settings.screen')).toBeVisible();
  await page.getByTestId('settings.delete').click();
  await page.getByTestId('dialog.confirm').click();
  await expect(page.getByTestId('toast')).toContainText('Cuenta eliminada');
  await expect(page.getByTestId('map.results').last()).toBeVisible();
  await openDetail(page, 'v-mirador');
  await expect(page.getByTestId('detail.community')).toContainText('Vueltica de Anónimo');
  await expect(page.getByTestId('detail.community')).not.toContainText('Ana');
});

test('MO2 a user below level 3 has no Moderación entry and the screen is locked', async ({ page }) => {
  await startSignedIn(page);
  await openSettings(page);
  await page.getByTestId('settings.delete').click();
  await page.getByTestId('dialog.confirm').click();
  await expect(page.getByTestId('map.results').last()).toBeVisible();
  // new account through the email flow: level 1 · Primeras vueltas, 0 points
  await tab(page, 'profile').click();
  await vis(page, 'profile.signIn').click();
  await page.getByTestId('login.email.button').click();
  await page.getByTestId('login.email').fill('luis.perez@ejemplo.com');
  await page.getByTestId('login.emailSubmit').click();
  await expect(vis(page, 'profile.levelBadge')).toContainText('Nivel 1 · Primeras vueltas');
  await expect(vis(page, 'profile.name')).toHaveText('Luis Perez');
  await expect(page.getByTestId('profile.moderation').filter({ visible: true })).toHaveCount(0);
  await page.waitForTimeout(250);
  await page.goto('/moderacion');
  await expect(page.getByTestId('mod.locked')).toContainText('La moderación se abre en el Nivel 3 · De confianza');
});

test('A4 Descargar mis datos creates a JSON file download', async ({ page }) => {
  await startSignedIn(page);
  await openSettings(page);
  await page.getByTestId('settings.export').click();
  await expect(page.getByTestId('settings.exportDialog')).toBeVisible();
  await expect(page.getByTestId('settings.exportDialog')).toContainText('Tus datos están listos');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('settings.exportShare').click()]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const path = await download.path();
  const fs = await import('node:fs');
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(JSON.stringify(json)).toContain('Ana');
  await page.getByTestId('settings.exportClose').click();
  await expect(page.getByTestId('settings.exportDialog')).toHaveCount(0);
});

test('A6 login screen: email validation and "Ahora no"', async ({ page }) => {
  await start(page);
  await tab(page, 'profile').click();
  await vis(page, 'profile.signIn').click();
  await page.getByTestId('login.email.button').click();
  await page.getByTestId('login.email').fill('no-es-un-correo');
  await page.getByTestId('login.emailSubmit').click();
  await expect(page.getByTestId('login.emailError')).toHaveText('Ingresá un correo válido');
  await page.getByTestId('login.notNow').click();
  await expect(page.getByTestId('profile.signedOut')).toBeVisible();
});
