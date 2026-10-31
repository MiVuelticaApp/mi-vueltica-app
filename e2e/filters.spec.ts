import { expect, test, start, openList } from './helpers';

async function openFilters(page: import('@playwright/test').Page) {
  await page.getByTestId('map.chip.filters').last().click();
  await expect(page.getByTestId('filters.sheet')).toBeVisible();
}
/** The app's switches are visually-hidden checkboxes (role=switch). */
const flip = (page: import('@playwright/test').Page, id: string) => page.getByTestId(id).evaluate((el: HTMLInputElement) => el.click());

test('F1 sheet shows a live count; applying returns to the map with the filter active', async ({ page }) => {
  await start(page);
  await openFilters(page);
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 20 resultados');
  await flip(page, 'filters.students');
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 18 resultados');
  await page.getByTestId('filters.price.gratis').click();
  await expect(page.getByTestId('filters.apply')).not.toHaveAttribute('aria-label', 'Mostrar 18 resultados');
  await page.getByTestId('filters.price.hasta5000').click();
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 18 resultados');
  await page.getByTestId('filters.apply').click();
  await expect(page.getByTestId('map.results.title').last()).toHaveText('18 planes para estudiantes');
  await expect(page.getByTestId('map.chip.filters').last()).toHaveAttribute('aria-label', 'Filtros · 1');
  await expect(page.getByTestId('map.chip.students').last()).toHaveCSS('background-color', await page.evaluate(() => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(157, 182, 255)' : 'rgb(27, 60, 140)')));
});

test('F2 "Limpiar" resets the draft', async ({ page }) => {
  await start(page);
  await openFilters(page);
  await flip(page, 'filters.students');
  await flip(page, 'filters.wheelchair');
  await page.getByTestId('filters.type.evento').click(); // toggles Eventos off -> only Lugares
  await page.getByTestId('filters.distance').fill('2');
  await expect(page.getByTestId('filters.apply')).not.toHaveAttribute('aria-label', 'Mostrar 20 resultados');
  await page.getByTestId('filters.clear').click();
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 20 resultados');
  await expect(page.getByTestId('filters.students')).not.toBeChecked();
  await expect(page.getByTestId('filters.wheelchair')).not.toBeChecked();
  await expect(page.getByTestId('filters.distance.value')).toHaveText('5 km');
});

test('F3 date filter: Hoy and Fin de semana keep only the matching events', async ({ page }) => {
  await start(page);
  await openFilters(page);
  await page.getByTestId('filters.date.hoy').click();
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 12 resultados'); // 11 places + 1 event today
  await page.getByTestId('filters.date.weekend').click();
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 14 resultados'); // 11 places + 3 events on Sat/Sun
  await page.getByTestId('filters.apply').click();
  await expect(page.getByTestId('map.chip.filters').last()).toHaveAttribute('aria-label', 'Filtros · 1');
  await openList(page);
  await expect(page.getByTestId('card.v-jade')).toBeVisible(); // Sábado 24
  await expect(page.getByTestId('card.v-concierto')).toBeVisible(); // Domingo 25
  await expect(page.getByTestId('card.v-melico')).toHaveCount(0); // 30 oct
  await expect(page.getByTestId('card.v-lectura')).toHaveCount(0); // today (Tuesday)
});

test('F3b "Elegir fechas" shows a from/to range', async ({ page }) => {
  await start(page);
  await openFilters(page);
  await page.getByTestId('filters.date.range').click();
  await expect(page.getByTestId('filters.date.from')).toBeVisible();
  await expect(page.getByTestId('filters.date.to')).toBeVisible();
});

test('F4 Accesible filter keeps wheelchair-accessible plans only', async ({ page }) => {
  await start(page);
  await openFilters(page);
  await flip(page, 'filters.wheelchair');
  await expect(page.getByTestId('filters.apply')).toHaveAttribute('aria-label', 'Mostrar 8 resultados');
  await page.getByTestId('filters.apply').click();
  await expect(page.getByTestId('map.results.title').last()).toHaveText('8 planes accesibles');
  await openList(page);
  await expect(page.getByTestId('card.v-sabana')).toBeVisible();
  await expect(page.getByTestId('card.v-zoo')).toHaveCount(0);
});

test('F5 [known app bug B1] applying filters dismisses the sheet instead of stacking a second map', async ({ page }) => {
  test.fail(true, 'B1: "Mostrar N resultados" calls router.navigate("/") which pushes a second (tabs) navigator over the sheet');
  await start(page);
  await openFilters(page);
  await page.getByTestId('filters.apply').click();
  await expect(page.getByTestId('map.results')).toHaveCount(1);
});
