import { expect, test, tab, start, openDetail, loginApple, stubWindowOpen, openedUrls } from './helpers';

test('D1 Museo del Jade detail shows the designed information', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-jade');
  await expect(page.getByTestId('detail.title')).toHaveText('Noche de Museos: Museo del Jade');
  await expect(page.getByTestId('detail.rating')).toContainText('4,8 (126)');
  await expect(page.getByTestId('detail.scroll')).toContainText('Evento · a 2,4 km');
  // badges: Evento, Gratis, Estudiantes, Ciudadanos de oro, Verificado hace N días
  const scroll = page.getByTestId('detail.scroll');
  for (const b of ['Evento', 'Gratis', 'Estudiantes', 'Ciudadanos de oro', 'Verificado hace 3 días']) await expect(scroll.getByText(b, { exact: true }).first()).toBeVisible();
  // real calendar: 24 Oct 2026 is a Saturday (the Figma sample says "Viernes")
  await expect(page.getByTestId('detail.row.date')).toContainText('Sábado 24 de octubre');
  await expect(page.getByTestId('detail.row.date')).toContainText('6:00 p.m. – 10:00 p.m.');
  await expect(page.getByTestId('detail.row.place')).toContainText('Museo del Jade');
  await expect(page.getByTestId('detail.row.price')).toContainText('Entrada gratuita');
  await expect(page.getByTestId('detail.row.audience')).toContainText('Estudiantes');
  await expect(page.getByTestId('detail.row.accessibility')).toContainText('Accesible en silla de ruedas');
  await expect(page.getByTestId('detail.description')).toContainText('Una noche con entrada gratuita');
  await expect(page.getByTestId('detail.directions')).toBeVisible();
  await expect(page.getByTestId('detail.save')).toBeVisible();
  await expect(page.getByTestId('detail.share')).toBeVisible();
  await expect(page.getByTestId('detail.verification')).toContainText('¿Sigue siendo gratis?');
  await expect(page.getByTestId('detail.verify.same')).toHaveAttribute('aria-label', 'Sí, sigue igual');
  await expect(page.getByTestId('detail.verify.changed')).toHaveAttribute('aria-label', 'Algo cambió');
  await expect(page.getByTestId('detail.community')).toContainText('Vueltica de Carlos M. · verificada por 23 personas');
  await expect(page.getByTestId('detail.report')).toHaveAttribute('aria-label', 'Reportar vueltica');
  await expect(page.getByTestId('detail.reviews.all')).toHaveAttribute('aria-label', 'Ver todas (126)');
  await expect(page.getByTestId('review.r-1').or(page.locator('[data-testid^="review.r-"]').first())).toBeVisible();
});

test('D2 guest "Guardar" -> Login -> returns to the plan saved -> appears in Guardados; unsave', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.pin.v-sabana').click();
  await expect(page.getByTestId('detail.save')).toHaveAttribute('aria-label', 'Guardar');
  await page.getByTestId('detail.save').click();
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByTestId('login.reason')).toContainText('Iniciá sesión para guardar');
  await loginApple(page);
  await expect(page.getByTestId('detail.title')).toHaveText('Parque La Sabana');
  await expect(page.getByTestId('detail.save')).toContainText('Guardado');
  await page.getByTestId('detail.close').click();
  await tab(page, 'saved').click();
  await expect(page.getByTestId('saved.screen')).toBeVisible();
  await expect(page.getByTestId('card.v-sabana')).toBeVisible();
  // unsave from the card
  await page.getByTestId('card.save.v-sabana').click();
  await expect(page.getByTestId('card.v-sabana')).toHaveCount(0);
});

test('D3 Compartir copies the link and confirms with a toast (web has no share sheet)', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-jade');
  await page.getByTestId('detail.share').click();
  await expect(page.getByTestId('toast')).toContainText('Enlace copiado');
});

test('D4 "Ver todas (126)" opens Reseñas', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-jade');
  await page.getByTestId('detail.reviews.all').click();
  await expect(page.getByTestId('reviews.screen')).toBeVisible();
  await expect(page.getByTestId('reviews.count')).toHaveText('126 reseñas');
  await expect(page.getByTestId('reviews.avg')).toHaveText('4,8');
  await expect(page.getByTestId('reviews.subtitle')).toContainText('Museo del Jade');
});

test('D5 closing the sheet via X and via the backdrop returns to the map', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.pin.v-sabana').click();
  await expect(page.getByTestId('detail.sheet')).toBeVisible();
  await page.getByTestId('detail.close').click();
  await expect(page.getByTestId('detail.sheet')).toHaveCount(0);
  await page.getByTestId('map.pin.v-sabana').click();
  await expect(page.getByTestId('detail.sheet')).toBeVisible();
  await page.getByTestId('detail.sheet.backdrop').click({ position: { x: 200, y: 40 } });
  await expect(page.getByTestId('detail.sheet')).toHaveCount(0);
  await expect(page.getByTestId('map.results')).toBeVisible();
});

test('C1 Cómo llegar -> Waze opens the waze URL with the plan coordinates', async ({ page }) => {
  await stubWindowOpen(page);
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.directions').click();
  await expect(page.getByTestId('directions.sheet')).toBeVisible();
  await expect(page.getByTestId('directions.subtitle')).toContainText('Parque La Sabana · a 1,2 km');
  await page.getByTestId('directions.waze').click();
  await expect.poll(async () => (await openedUrls(page)).length).toBe(1);
  const [url] = await openedUrls(page);
  expect(url).toMatch(/^https:\/\/waze\.com\/ul\?ll=9\.9\d+,-84\.\d+&navigate=yes$/);
});

test('C1b Google Maps URL uses the dir API with the destination', async ({ page }) => {
  await stubWindowOpen(page);
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.directions').click();
  await page.getByTestId('directions.google').click();
  await expect.poll(async () => (await openedUrls(page)).length).toBe(1);
  expect((await openedUrls(page))[0]).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=9\.9\d+,-84\.\d+$/);
});

test('C2 "Recordar mi elección" skips the chooser next time', async ({ page }) => {
  await stubWindowOpen(page);
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.directions').click();
  await page.getByTestId('directions.remember').evaluate((el: HTMLInputElement) => el.click());
  await page.getByTestId('directions.google').click();
  await expect.poll(async () => (await openedUrls(page)).length).toBe(1);
  await expect(page.getByTestId('directions.sheet')).toHaveCount(0);
  // back on a plan: the chooser is skipped and Google Maps opens directly
  await openDetail(page, 'v-jade');
  await page.getByTestId('detail.directions').click();
  await expect.poll(async () => (await openedUrls(page)).length).toBeGreaterThan(0);
  await expect(page.getByTestId('directions.sheet')).toHaveCount(0);
  const urls = await openedUrls(page);
  expect(urls[urls.length - 1]).toContain('google.com/maps/dir');
});

test('C3 Apple Maps is not offered outside iOS', async ({ page }) => {
  await start(page);
  await openDetail(page, 'v-sabana');
  await page.getByTestId('detail.directions').click();
  await expect(page.getByTestId('directions.google')).toBeVisible();
  await expect(page.getByTestId('directions.waze')).toBeVisible();
  await expect(page.getByTestId('directions.apple')).toHaveCount(0);
  await expect(page.getByText('Mapas', { exact: true })).toHaveCount(0);
  await page.getByTestId('directions.close').click();
  await expect(page.getByTestId('directions.sheet')).toHaveCount(0);
});
