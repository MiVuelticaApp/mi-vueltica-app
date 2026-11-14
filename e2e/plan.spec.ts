import { expect, test, start } from './helpers';

// FAKE_NOW is Tuesday 20 Oct 2026, 10:00 a.m. Costa Rica time.

test('P1 "Armame el plan" builds an ordered plan for the window and the stops asked', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.plan').last().click();
  await expect(page.getByTestId('plan.sheet')).toBeVisible();
  // Defaults: 10:00 → 1:00 p.m., 3 stops.
  await page.getByTestId('plan.build').click();
  await expect(page.getByTestId('plan.result')).toBeVisible();
  for (const i of [0, 1, 2]) await expect(page.getByTestId(`plan.stop.${i}`)).toBeVisible();
  await expect(page.getByTestId('plan.stop.3')).toHaveCount(0);
  await expect(page.getByTestId('plan.short')).toHaveCount(0);
  await expect(page.getByTestId('plan.total')).toContainText('Costo estimado');

  // "Otra opción" gives a different first stop.
  const first = await page.getByTestId('plan.stop.0').innerText();
  await page.getByTestId('plan.again').click();
  await expect(page.getByTestId('plan.stop.0')).not.toHaveText(first);

  // A stop opens its detail.
  await page.getByTestId('plan.stop.0').click();
  await expect(page.getByTestId('detail.scroll').last()).toBeVisible();
});

test('P2 asking for more stops than fit returns only what fits, with a message', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.plan').last().click();
  await page.getByTestId('plan.end').fill('10:30');
  await page.getByTestId('plan.stops.6').click();
  await page.getByTestId('plan.build').click();
  await expect(page.getByTestId('plan.short')).toContainText('entre');
  await expect(page.getByTestId('plan.stop.0')).toBeVisible();
  await expect(page.getByTestId('plan.stop.5')).toHaveCount(0);
});

test('P3 an end before the start is rejected', async ({ page }) => {
  await start(page);
  await page.getByTestId('map.plan').last().click();
  await page.getByTestId('plan.end').fill('09:00');
  await page.getByTestId('plan.build').click();
  await expect(page.getByText('La hora de fin tiene que ser después de la de inicio.')).toBeVisible();
  await expect(page.getByTestId('plan.result')).toHaveCount(0);
});
