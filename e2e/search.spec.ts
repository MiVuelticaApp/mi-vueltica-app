import { expect, test, tab, start } from './helpers';

test('S1 search "museo" -> "2 RESULTADOS PARA «MUSEO»"; Cancelar returns', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.search').click();
  await expect(page.getByTestId('search.screen')).toBeVisible();
  await expect(page.getByTestId('search.idle')).toBeVisible();
  await page.getByTestId('search.input').fill('museo');
  await expect(page.getByTestId('search.count')).toHaveText('2 RESULTADOS PARA «MUSEO»');
  await expect(page.getByTestId('card.v-jade')).toBeVisible();
  await expect(page.getByTestId('card.v-ninos')).toBeVisible();
  // same filters row as Lista
  await expect(page.getByTestId('list.chip.students')).toBeVisible();
  await expect(page.getByTestId('search.segment')).toBeVisible();
  await page.getByTestId('search.cancel').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
});

test('S2 search "zzz" -> Sin resultados with Ampliar / Aportar / Limpiar and the active filters', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.search').click();
  await page.getByTestId('list.chip.students').click();
  await page.getByTestId('search.input').fill('zzz');
  await expect(page.getByTestId('empty.state')).toBeVisible();
  await expect(page.getByText('Sin resultados')).toBeVisible();
  await expect(page.getByTestId('empty.widen')).toContainText('Ampliar a 5 km');
  await expect(page.getByTestId('empty.contribute')).toContainText('Aportar un lugar');
  await expect(page.getByTestId('empty.clear')).toContainText('Limpiar filtros');
  const active = page.getByTestId('empty.activeFilters');
  await expect(active).toContainText('Estudiantes');
  await expect(active).toContainText('«zzz»');
  // Limpiar filtros resets the filters (the chip is deselected again)
  await page.getByTestId('empty.clear').click();
  await expect(active).not.toContainText('Estudiantes');
  // clearing the text brings results back
  await page.getByTestId('search.clear').click();
  await page.getByTestId('search.input').fill('parque');
  await expect(page.getByTestId('card.v-sabana')).toBeVisible();
});

test('S2b contribute button on the empty state goes to Aportar', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.search').click();
  await page.getByTestId('search.input').fill('zzz');
  await page.getByTestId('empty.contribute').click();
  await expect(page).toHaveURL(/\/aportar$/);
});

test('S2c "Ampliar a 5 km" restores results after a narrow distance filter', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.chip.filters').last().click();
  await page.getByTestId('filters.distance').fill('0.5');
  await expect(page.getByTestId('filters.distance.value')).toHaveText('0,5 km');
  await page.getByTestId('filters.apply').click();
  await expect(page.getByTestId('map.chip.filters').last()).toHaveAttribute('aria-label', 'Filtros · 1');
  await tab(page, 'list').click();
  await expect(page.getByTestId('empty.state')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('empty.activeFilters')).toContainText('A 0.5 km');
  await page.getByTestId('empty.widen').click();
  await expect(page.getByTestId('list.count')).toContainText('20 RESULTADOS');
});
