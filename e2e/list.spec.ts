import { expect, test, tab, start, openList } from './helpers';

test('L1 Lista shows the skeleton for at least 1 s every time it opens', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 2; i++) {
    const t0 = Date.now();
    await tab(page, 'list').click();
    await expect(page.getByTestId('list.skeleton')).toBeVisible();
    await expect(page.getByTestId('list.skeleton')).toBeHidden({ timeout: 5000 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
    await expect(page.getByTestId('list.count')).toBeVisible();
    await tab(page, 'map').click();
    await expect(page.getByTestId('map.results')).toBeVisible();
  }
});

test('L2 segmented control Todo / Lugares / Eventos filters the list; chips present', async ({ page }) => {
  await start(page);
  await openList(page);
  await expect(page.getByTestId('list.count')).toHaveText('20 RESULTADOS · HASTA ₡5.000');
  for (const id of ['filters', 'nearMe', 'free', 'students', 'seniors']) await expect(page.getByTestId(`list.chip.${id}`)).toBeVisible();
  await page.getByTestId('list.segment.eventos').click();
  await expect(page.getByTestId('list.count')).toContainText('9 RESULTADOS');
  await expect(page.getByTestId('card.v-jade')).toBeVisible();
  await expect(page.getByTestId('card.v-sabana')).toHaveCount(0);
  await expect(page.getByTestId('card.v-jade')).toContainText('Evento');
  await page.getByTestId('list.segment.lugares').click();
  await expect(page.getByTestId('list.count')).toContainText('11 RESULTADOS');
  await expect(page.getByTestId('card.v-sabana')).toBeVisible();
  await expect(page.getByTestId('card.v-jade')).toHaveCount(0);
  await page.getByTestId('list.segment.todo').click();
  await expect(page.getByTestId('list.count')).toContainText('20 RESULTADOS');
});

test('L3 sort menu: Más cercanos (default) then Mejor calificados reorders the list', async ({ page }) => {
  await start(page);
  await openList(page);
  const sort = page.getByTestId('list.sort');
  await expect(sort).toHaveValue('cercanos');
  const titles = () => page.locator('[data-testid^="card.title."]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('card.title.', '')));
  expect((await titles())[0]).toBe('v-plaza'); // 0,6 km is the nearest
  await sort.selectOption('calificados');
  await expect.poll(async () => (await titles())[0]).toMatch(/^v-(concierto|luz)$/); // 4,9 stars
  await sort.selectOption('cercanos');
  await expect.poll(async () => (await titles())[0]).toBe('v-plaza');
});

test('L4 "Cerca de mí" and "Solo gratis" chips on Lista update the count', async ({ page }) => {
  await start(page);
  await openList(page);
  await page.getByTestId('list.chip.free').click();
  await expect(page.getByTestId('list.count')).toContainText('14 RESULTADOS');
  await page.getByTestId('list.chip.free').click();
  await expect(page.getByTestId('list.count')).toContainText('20 RESULTADOS');
  // turning off "Cerca de mí" shows plans of all provinces
  await page.getByTestId('list.chip.nearMe').click();
  await expect(page.getByTestId('list.count')).not.toContainText('20 RESULTADOS');
});
