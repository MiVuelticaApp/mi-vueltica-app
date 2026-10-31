import { expect, test, tab, start, startSignedIn, simulate, type Page } from './helpers';

const flip = (page: Page, id: string) => page.getByTestId(id).evaluate((el: HTMLInputElement) => el.click());

async function openForm(page: Page) {
  await startSignedIn(page);
  await tab(page, 'contribute').click();
  await expect(page.getByTestId('contribute.screen')).toBeVisible();
}

/** Fill a valid free "Lugar" (name, category, location). Does NOT tick the confirmation. */
async function fillPlace(page: Page, name = 'Parque de prueba E2E') {
  await page.getByTestId('contribute.type.lugar').click();
  await page.getByTestId('contribute.name').fill(name);
  await page.getByTestId('contribute.category').selectOption({ label: 'Parque' });
  await page.getByTestId('contribute.location').click();
  await expect(page.getByTestId('location.sheet')).toBeVisible();
  await page.getByTestId('map.surface').click({ position: { x: 150, y: 250 } });
  await page.getByTestId('location.address').fill('Frente al parque central, San José', { timeout: 4000 });
  await page.getByTestId('location.confirm').click();
  await expect(page.getByTestId('location.sheet')).toHaveCount(0);
  await expect(page.getByTestId('contribute.address')).toContainText('Frente al parque central');
}

test('N0 signed-out Aportar asks to sign in, then shows the form', async ({ page }) => {
  await start(page);
  await tab(page, 'contribute').click();
  await expect(page.getByTestId('contribute.signedOut')).toBeVisible();
  await page.getByTestId('contribute.signIn').click();
  await expect(page.getByTestId('login.reason')).toContainText('Iniciá sesión para aportar');
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('contribute.screen')).toBeVisible();
  await expect(page.getByTestId('contribute.info')).toContainText('La comunidad revisa cada vueltica');
});

test('N1 submit a place: confirmation with status steps, then Mis vuelticas "En revisión · 0 de 3 votos"', async ({ page }) => {
  test.fail(true, 'B3: tapping the map in "Elegir ubicación" crashes the web fallback map (ImageMap.onMapPress reads nativeEvent.locationX/Y, undefined for react-native-web press events -> NaN centre -> supercluster getClusters TypeError, white screen)');
  await openForm(page);
  await fillPlace(page);
  await flip(page, 'contribute.confirm');
  await expect(page.getByTestId('contribute.submit')).toHaveCSS('opacity', '1');
  await page.getByTestId('contribute.submit').click();
  await expect(page.getByTestId('sent.screen')).toBeVisible();
  await expect(page.getByTestId('sent.title')).toHaveText('¡Gracias por tu vueltica!');
  await expect(page.getByTestId('sent.body')).toContainText('«Parque de prueba E2E» está en revisión');
  await expect(page.getByTestId('sent.step.sent')).toContainText('Enviado');
  await expect(page.getByTestId('sent.step.queue')).toContainText('En cola de moderación');
  // Ana is level 3 so the rules (PDF: author at level >= 3 needs 3 votes) give "0 de 3 votos", not the Figma sample "0 de 5"
  await expect(page.getByTestId('sent.step.queue')).toContainText('0 de 3 votos');
  await expect(page.getByTestId('sent.step.published')).toContainText('Publicado en el mapa');
  await page.getByTestId('sent.mine').click();
  await expect(page.getByTestId('mine.screen')).toBeVisible();
  await expect(page.locator('[data-testid^="mine.status."]').filter({ hasText: 'En revisión · 0 de 3 votos' }).first()).toBeVisible();
});

test('N1b "Volver al mapa" from the confirmation shows the Pendiente pin to its author', async ({ page }) => {
  test.fail(true, 'B3: tapping the map in "Elegir ubicación" crashes the web fallback map (ImageMap.onMapPress reads nativeEvent.locationX/Y, undefined for react-native-web press events -> NaN centre -> supercluster getClusters TypeError, white screen)');
  await openForm(page);
  await fillPlace(page, 'Mirador pendiente E2E');
  await flip(page, 'contribute.confirm');
  await page.getByTestId('contribute.submit').click();
  await page.getByTestId('sent.map').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
  const pending = page.locator('[data-testid^="map.pin.pending."]');
  await expect(pending.first()).toBeVisible();
  expect(await pending.count()).toBeGreaterThanOrEqual(5); // 4 queue items + own pending ones + the new one
});

test('N2 a price above ₡5.000 is blocked with an error', async ({ page }) => {
  await openForm(page);
  await page.getByTestId('contribute.type.lugar').click();
  await page.getByTestId('contribute.name').fill('Caro E2E');
  await page.getByTestId('contribute.category').selectOption({ label: 'Parque' });
  await flip(page, 'contribute.confirm');
  await page.getByTestId('contribute.cost.paid').click();
  await page.getByTestId('contribute.price').fill('6000');
  await expect(page.getByTestId('contribute.priceError')).toHaveText('Cuesta más de ₡5.000: no podemos publicarla');
  await expect(page.getByTestId('contribute.submit')).toHaveCSS('opacity', '0.45');
  await page.getByTestId('contribute.submit').click({ force: true });
  await expect(page.getByTestId('contribute.screen')).toBeVisible(); // did not navigate
  await page.getByTestId('contribute.price').fill('5000');
  await expect(page.getByTestId('contribute.priceError')).toHaveCount(0);
  await expect(page.getByTestId('contribute.maxNote').or(page.getByText('Máximo ₡5.000 por persona'))).toBeVisible();
});

test('N3 "Enviar vueltica" stays disabled until the ₡5.000 confirmation is ticked', async ({ page }) => {
  test.fail(true, 'B3: tapping the map in "Elegir ubicación" crashes the web fallback map (ImageMap.onMapPress reads nativeEvent.locationX/Y, undefined for react-native-web press events -> NaN centre -> supercluster getClusters TypeError, white screen)');
  await openForm(page);
  await fillPlace(page);
  const submit = page.getByTestId('contribute.submit');
  await expect(submit).toHaveCSS('opacity', '0.45');
  await page.getByTestId('contribute.submit').click({ force: true });
  await expect(page.getByTestId('sent.screen')).toHaveCount(0);
  await flip(page, 'contribute.confirm');
  await expect(submit).toHaveCSS('opacity', '1');
  await flip(page, 'contribute.confirm');
  await expect(submit).toHaveCSS('opacity', '0.45');
});

test('N3b missing fields are listed and the type toggle switches the form to Evento', async ({ page }) => {
  await openForm(page);
  await expect(page.getByTestId('contribute.missing')).toContainText('Poné un nombre');
  await expect(page.getByTestId('contribute.date')).toBeVisible(); // default type: Evento
  await page.getByTestId('contribute.type.lugar').click();
  await expect(page.getByTestId('contribute.hours')).toBeVisible(); // Lugar: opening hours
  await expect(page.getByTestId('contribute.date')).toHaveCount(0);
  await page.getByTestId('contribute.type.evento').click();
  await expect(page.getByTestId('contribute.date')).toBeVisible();
  await expect(page.getByTestId('contribute.start')).toBeVisible();
  await expect(page.getByTestId('contribute.hours')).toHaveCount(0);
});

test('N3c closing a dirty form asks to discard', async ({ page }) => {
  await openForm(page);
  await page.getByTestId('contribute.name').fill('Algo');
  await page.getByTestId('contribute.close').click();
  await expect(page.getByTestId('dialog.title')).toHaveText('¿Descartar vueltica?');
  await page.getByTestId('dialog.cancel').click();
  await expect(page.getByTestId('contribute.name')).toHaveValue('Algo');
  await page.getByTestId('contribute.close').click();
  await page.getByTestId('dialog.confirm').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
});

test('N4 community votes publish the submission: +10 points and a published step', async ({ page }) => {
  test.fail(true, 'B3: tapping the map in "Elegir ubicación" crashes the web fallback map (ImageMap.onMapPress reads nativeEvent.locationX/Y, undefined for react-native-web press events -> NaN centre -> supercluster getClusters TypeError, white screen)');
  await openForm(page);
  await fillPlace(page, 'Plaza votada E2E');
  await flip(page, 'contribute.confirm');
  await page.getByTestId('contribute.submit').click();
  await expect(page.getByTestId('sent.screen')).toBeVisible();
  const id = page.url().split('/').pop()!;
  await simulate(page, { kind: 'votes', vuelticaId: id, count: 3, choice: 'for' });
  await expect(page.getByTestId('sent.body')).toHaveText('Publicada en el mapa');
  await page.getByTestId('sent.map').click();
  await expect(page.getByTestId(`map.pin.${id}`)).toBeVisible();
  await tab(page, 'profile').click();
  await expect(page.getByTestId('profile.points')).toContainText('182 puntos');
});

test('N5 Mis vuelticas lists statuses (review / rejected) and lets the author withdraw a pending one', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.mine.all').click();
  await expect(page.getByTestId('mine.screen')).toBeVisible();
  await expect(page.getByTestId('mine.status.v-feria-ana').filter({ visible: true })).toContainText('En revisión · 2 de 3 votos');
  await expect(page.getByTestId('mine.status.v-cine-ana').filter({ visible: true })).toContainText('No publicado · costaba ₡6.000');
  await expect(page.getByTestId('mine.status.v-mirador').filter({ visible: true })).toContainText('Publicado · 1.240 vistas');
  await page.getByTestId('mine.withdraw.v-feria-ana').filter({ visible: true }).click();
  await page.getByTestId('dialog.confirm').click();
  await expect(page.getByTestId('mine.row.v-feria-ana').filter({ visible: true })).toHaveCount(0);
});

/** Workaround for B3: create the submission through the mock API hook, then drive the real confirmation / Mis vuelticas / publish UI. */
async function createViaApi(page: Page, name: string) {
  return page.evaluate(async (n) => {
    const api = (window as unknown as { __mv: { api: { createVueltica(i: unknown): Promise<{ vueltica: { id: string } }> } } }).__mv.api;
    const r = await api.createVueltica({
      type: 'lugar', name: n, category: 'Parque', description: '', lat: 9.9333, lng: -84.0833, address: 'Ubicación de prueba', province: 'San José',
      pricePerPerson: 0, freeFor: [], audiences: ['todo'], wheelchair: false, photos: [],
    });
    return r.vueltica.id;
  }, name);
}

test('N1c confirmation steps and Mis vuelticas for a submission (created through the API hook, see B3)', async ({ page }) => {
  await startSignedIn(page);
  const id = await createViaApi(page, 'Parque API E2E');
  await page.waitForTimeout(250);
  await page.goto(`/vueltica-enviada/${id}`);
  await expect(page.getByTestId('sent.title')).toHaveText('¡Gracias por tu vueltica!');
  await expect(page.getByTestId('sent.body')).toContainText('«Parque API E2E» está en revisión');
  await expect(page.getByTestId('sent.step.sent')).toContainText('Enviado');
  await expect(page.getByTestId('sent.step.queue')).toContainText('En cola de moderación');
  await expect(page.getByTestId('sent.step.queue')).toContainText('0 de 3 votos'); // level 3 author: 3 votes (PDF), not the Figma sample 5
  await expect(page.getByTestId('sent.step.published')).toContainText('Publicado en el mapa');
  await page.getByTestId('sent.mine').click();
  await expect(page.getByTestId(`mine.status.${id}`).filter({ visible: true })).toContainText('En revisión · 0 de 3 votos');
});

test('N4b three community votes publish the submission: +10 points, published step and map pin', async ({ page }) => {
  await startSignedIn(page);
  const id = await createViaApi(page, 'Plaza votada E2E');
  await simulate(page, { kind: 'votes', vuelticaId: id, count: 3, choice: 'for' });
  await page.waitForTimeout(250);
  await page.goto(`/vueltica-enviada/${id}`);
  await expect(page.getByTestId('sent.body')).toHaveText('Publicada en el mapa');
  await page.getByTestId('sent.map').click();
  await expect(page.getByTestId(`map.pin.${id}`)).toBeVisible();
  await tab(page, 'profile').click();
  await expect(page.getByTestId('profile.points')).toContainText('182 puntos');
});
