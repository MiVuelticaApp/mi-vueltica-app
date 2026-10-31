import { expect, test, tab, start, startSignedIn, openDetail, openMap, simulate } from './helpers';

const points = async (page: import('@playwright/test').Page) => {
  await tab(page, 'profile').click();
  const txt = await page.getByTestId('profile.points').innerText();
  return Number(txt.match(/(\d+) puntos/)![1]);
};

test('V1 "Sí, sigue igual" gives +2 points and a confirmation toast', async ({ page }) => {
  await startSignedIn(page);
  await expect(page.getByTestId('profile.points')).toContainText('172 puntos');
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.verify.same').click();
  await expect(page.getByTestId('toast')).toContainText('Verificación enviada · +2 puntos');
  await page.getByTestId('detail.close').click();
  expect(await points(page)).toBe(174);
});

test('V1b "Algo cambió" opens the verification sheet; chips are single choice; send closes it with +2', async ({ page }) => {
  await startSignedIn(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.verify.changed').click();
  await expect(page.getByTestId('verify.sheet')).toBeVisible(); // replaces the detail sheet (FR-1.3)
  await expect(page.getByTestId('detail.sheet')).toHaveCount(0);
  await expect(page.getByTestId('verify.header.title')).toHaveText('¿Sigue igual?');
  for (const id of ['verify.still.si', 'verify.still.no', 'verify.still.nose', 'verify.price.gratis', 'verify.price.menos2500', 'verify.price.entre2500y5000', 'verify.price.mas5000', 'verify.schedule.si', 'verify.schedule.no']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId('verify.photo')).toBeVisible();
  // single choice: selecting another price deselects the previous one
  const bg = (id: string) => page.getByTestId(id).evaluate((e) => getComputedStyle(e).backgroundColor);
  const unselected = await bg('verify.price.gratis');
  await page.getByTestId('verify.price.gratis').click();
  await expect.poll(() => bg('verify.price.gratis')).not.toBe(unselected);
  await page.getByTestId('verify.price.menos2500').click();
  await expect.poll(() => bg('verify.price.gratis')).toBe(unselected);
  await expect.poll(() => bg('verify.price.menos2500')).not.toBe(unselected);
  await page.getByTestId('verify.schedule.no').click();
  await expect(page.getByTestId('verify.time')).toBeVisible();
  await page.getByTestId('verify.send').click();
  await expect(page.getByTestId('verify.sheet')).toHaveCount(0);
  await expect(page.getByTestId('toast')).toContainText('Verificación enviada · +2 puntos');
});

test('V2 three "Más de ₡5.000" answers hide the plan from the map', async ({ page }) => {
  await startSignedIn(page);
  await openMap(page);
  await expect(page.getByTestId('map.pin.v-zoo')).toBeVisible();
  await expect(page.getByTestId('map.results.title').last()).toHaveText('20 planes de hasta ₡5.000');
  // one real verification from Ana (level 3: price counts) + two from other people
  await openDetail(page, 'v-zoo');
  await page.getByTestId('detail.verify.changed').click();
  await page.getByTestId('verify.price.mas5000').click();
  await page.getByTestId('verify.send').click();
  await expect(page.getByTestId('verify.sheet')).toHaveCount(0);
  await expect(page.getByTestId('toast')).toContainText('Verificación enviada');
  await simulate(page, { kind: 'verifications', vuelticaId: 'v-zoo', count: 2, pricePaid: 'mas5000' });
  await page.goto('/');
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('map.results.title')).toHaveText('19 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.pin.v-zoo')).toHaveCount(0);
});

test('V2b fewer than 3 matching answers do not hide the plan', async ({ page }) => {
  await start(page);
  await simulate(page, { kind: 'verifications', vuelticaId: 'v-zoo', count: 2, pricePaid: 'mas5000' });
  await page.goto('/');
  await expect(page.getByTestId('map.results.title')).toHaveText('20 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.pin.v-zoo')).toBeVisible();
});

test('V3 the same person cannot verify a plan twice in a day (no points farming, no one-person flips)', async ({ page }) => {
  await startSignedIn(page);
  await openDetail(page, 'v-zoo');
  await page.getByTestId('detail.verify.changed').click();
  await page.getByTestId('verify.price.mas5000').click();
  await page.getByTestId('verify.send').click();
  await expect(page.getByTestId('verify.sheet')).toHaveCount(0);
  await openDetail(page, 'v-zoo');
  await expect(page.getByTestId('detail.verify.done')).toHaveText('Ya verificaste este plan hoy');
  await expect(page.getByTestId('detail.verify.same')).toHaveCSS('opacity', '0.45');
  await expect(page.getByTestId('detail.verify.changed')).toHaveCSS('opacity', '0.45');
  // still visible on the map: one person is not "3 people"
  await page.waitForTimeout(250);
  await page.goto('/');
  await expect(page.getByTestId('map.results.title')).toHaveText('20 planes de hasta ₡5.000');
  expect(await points(page)).toBe(174);
});

test('V4 guests can verify but earn no points', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.verify.same').click();
  await expect(page.getByTestId('toast')).toContainText('Gracias por verificar');
  await expect(page.getByTestId('toast')).not.toContainText('+2');
});

test('R1 report is anonymous: pick a reason, optional text, send closes the sheet; duplicate is rejected', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.report').click();
  await expect(page.getByTestId('report.sheet')).toBeVisible();
  await expect(page.getByTestId('detail.sheet')).toHaveCount(0);
  for (const [k, label] of Object.entries({ cerro: 'Ya no existe o cerró', noGratis: 'Ya no es gratis', masDe5000: 'Cuesta más de ₡5.000', horario: 'Horario o lugar incorrecto', inapropiado: 'Contenido inapropiado', spam: 'Es spam o publicidad', otro: 'Otro' })) {
    await expect(page.getByTestId(`report.reason.${k}`)).toHaveAttribute('aria-label', label);
  }
  await expect(page.getByTestId('report.sheet')).toContainText('Tu reporte es anónimo');
  await page.getByTestId('report.reason.spam').click();
  await page.getByTestId('report.details').fill('Publicidad de un negocio');
  await page.getByTestId('report.send').click();
  await expect(page.getByTestId('report.sheet')).toHaveCount(0);
  await expect(page.getByTestId('toast')).toContainText('Reporte enviado. Gracias por cuidar de la comunidad');
  // the same device cannot report twice
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.report').click();
  await page.getByTestId('report.reason.spam').click();
  await page.getByTestId('report.send').click();
  await expect(page.getByTestId('toast')).toContainText('Ya reportaste esta vueltica');
});

test('R2 three reports hide the plan and queue it in Moderación › Reportadas', async ({ page }) => {
  await startSignedIn(page);
  await openMap(page);
  await expect(page.getByTestId('map.pin.v-zoo')).toBeVisible();
  await openDetail(page, 'v-zoo');
  await page.getByTestId('detail.report').click();
  await page.getByTestId('report.reason.noGratis').click();
  await page.getByTestId('report.send').click();
  await expect(page.getByTestId('report.sheet')).toHaveCount(0);
  await simulate(page, { kind: 'reports', vuelticaId: 'v-zoo', count: 2, reason: 'noGratis' });
  await openMap(page);
  await expect(page.getByTestId('map.results.title').last()).toHaveText('19 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.pin.v-zoo')).toHaveCount(0);
  await tab(page, 'profile').click();
  await page.getByTestId('profile.moderation').click();
  await expect(page.getByTestId('mod.reportedHeader')).toHaveText('REPORTADAS · 3');
  await expect(page.getByTestId('mod.card.v-zoo')).toBeVisible();
  await expect(page.getByTestId('mod.reports.v-zoo')).toContainText('3 reportes · «Ya no es gratis»');
});
