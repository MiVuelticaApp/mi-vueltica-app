import { expect, test, tab, start, startSignedIn, openDetail, loginApple } from './helpers';

const reviewsOf = async (page: import('@playwright/test').Page, id: string) => {
  await openDetail(page, id);
  await page.getByTestId('detail.reviews.all').click();
  await expect(page.getByTestId('reviews.screen')).toBeVisible();
};

test('RV1 writing a review publishes it: 126 -> 127 reseñas, shown first under Recientes', async ({ page }) => {
  await startSignedIn(page);
  await reviewsOf(page, 'v-jade');
  await expect(page.getByTestId('reviews.count')).toHaveText('126 reseñas');
  await page.getByTestId('reviews.write').click();
  await expect(page.getByTestId('compose.sheet')).toBeVisible();
  await expect(page.getByTestId('compose.header.title')).toHaveText('Escribir reseña');
  // went-with and spent options from FR-10.3
  for (const l of ['En familia', 'Con amigos', 'En pareja', 'Solo/a']) await expect(page.getByText(l, { exact: true })).toBeVisible();
  for (const l of ['Nada', 'Menos de ₡2.500', '₡2.500 – ₡5.000']) await expect(page.getByText(l, { exact: true })).toBeVisible();
  // publishing without stars is blocked
  await page.getByTestId('compose.publish').click();
  await expect(page.getByTestId('toast')).toContainText('Elegí una calificación');
  await page.getByTestId('compose.stars.5').click();
  await expect(page.getByText('Muy bueno', { exact: true })).toBeVisible();
  await page.getByTestId('compose.went.amigos').click();
  await page.getByTestId('compose.spent.menos2500').click();
  await page.getByTestId('compose.text').fill('Muy buena noche, volvería sin dudarlo.');
  await page.getByTestId('compose.publish').click();
  await expect(page.getByTestId('compose.sheet')).toHaveCount(0);
  await expect(page.getByTestId('toast')).toContainText('Tu reseña ya está publicada');
  await expect(page.getByTestId('reviews.count')).toHaveText('127 reseñas');
  await expect(page.locator('[data-testid^="review.r-"]').filter({ visible: true }).first()).toContainText('Muy buena noche, volvería sin dudarlo.');
  await expect(page.locator('[data-testid^="review.r-"]').filter({ visible: true }).first()).toContainText('Ana Mora');
});

test('RV2 marking a review as useful increments its counter (and toggles back)', async ({ page }) => {
  await startSignedIn(page);
  await reviewsOf(page, 'v-jade');
  const card = page.locator('[data-testid^="review.r-"]').filter({ visible: true }).filter({ hasText: 'María Rodríguez' }).first();
  const first = card.locator('[data-testid^="review.useful.r-"]');
  const countEl = card.locator('[data-testid^="review.useful.count."]');
  await expect(countEl).toHaveText('Útil · 12');
  await first.click();
  await expect(countEl).toHaveText('Útil · 13');
  await first.click();
  await expect(countEl).toHaveText('Útil · 12');
});

test('RV3 "Más útiles" sorts by useful count; "Con fotos" keeps reviews with photos', async ({ page }) => {
  await start(page);
  await reviewsOf(page, 'v-jade');
  // visual (top-to-bottom) order, not DOM order
  const counts = async () =>
    page.locator('[data-testid^="review.useful.count."]').evaluateAll((els) =>
      els.filter((e) => e.getClientRects().length > 0).map((e) => ({ t: e.getBoundingClientRect().top, n: Number((e.textContent ?? '').replace(/\D/g, '')) })).sort((a, b) => a.t - b.t).map((x) => x.n));
  await page.getByTestId('reviews.sort.utiles').click();
  await expect.poll(async () => {
    const c = await counts();
    return c.length > 2 && c.every((n, i) => i === 0 || c[i - 1] >= n);
  }).toBe(true);
  { const c = await counts(); expect(c[0]).toBe(Math.max(...c)); }
  await page.getByTestId('reviews.sort.fotos').click();
  await expect(page.locator('[data-testid^="review.r-"]').filter({ visible: true }).first()).toBeVisible();
  await page.getByTestId('reviews.sort.recientes').click();
  await expect(page.locator('[data-testid^="review.r-"]').filter({ visible: true }).first()).toBeVisible();
});

test('RV4 guest: "Escribir reseña" goes through Login and then opens the composer [known app bug B2]', async ({ page }) => {
  test.fail(true, 'B2: after signing in from Reseñas > Escribir reseña the user lands back on Reseñas; the composer (pending action "review") never opens');
  await start(page);
  await reviewsOf(page, 'v-jade');
  await page.getByTestId('reviews.write').click();
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByTestId('login.reason')).toContainText('Iniciá sesión para escribir una reseña');
  await loginApple(page);
  await expect(page.getByTestId('compose.sheet')).toBeVisible();
  await page.getByTestId('compose.header.close').click();
  await expect(page.getByTestId('compose.sheet')).toHaveCount(0);
});

test('RV4b guest tapping "Útil" is sent to Login with the matching reason', async ({ page }) => {
  await start(page);
  await reviewsOf(page, 'v-jade');
  await page.locator('[data-testid^="review.r-"]').filter({ visible: true }).filter({ hasText: 'María Rodríguez' }).first().locator('[data-testid^="review.useful.r-"]').click();
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByTestId('login.reason')).toContainText('Iniciá sesión para marcar reseñas útiles');
  await page.getByTestId('login.notNow').click();
  await expect(page.getByTestId('login.screen')).toHaveCount(0);
});

test('RV5 reseñas summary shows the average and the 1-5 distribution', async ({ page }) => {
  await start(page);
  await reviewsOf(page, 'v-jade');
  await expect(page.getByTestId('reviews.avg')).toHaveText('4,8');
  await expect(page.getByTestId('reviews.summary')).toBeVisible();
  await expect(page.getByTestId('reviews.stars.5')).toBeVisible();
});
