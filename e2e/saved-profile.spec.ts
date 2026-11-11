import { expect, test, tab, start, startSignedIn, openMap, simulate } from './helpers';

test('G1 Guardados: groups, segmented control and unsave', async ({ page }) => {
  await startSignedIn(page);
  await tab(page, 'saved').click();
  await expect(page.getByTestId('saved.screen')).toBeVisible();
  // seed: Noche de Museos (24 oct) + Concierto (25 oct) this week, Festival de la Luz (28 nov) next month
  await expect(page.getByTestId('saved.group.week')).toHaveText('Esta semana');
  await expect(page.getByTestId('saved.group.month')).toHaveText('Próximo mes');
  for (const id of ['v-jade', 'v-concierto', 'v-luz']) await expect(page.getByTestId(`card.${id}`)).toBeVisible();
  // cards show verification status
  await expect(page.getByTestId('card.v-jade')).toContainText('Verificado hace 3 días');
  await page.getByTestId('saved.segment.lugares').click();
  await expect(page.getByTestId('saved.empty')).toBeVisible();
  await page.getByTestId('saved.segment.eventos').click();
  await expect(page.getByTestId('card.v-jade')).toBeVisible();
  await page.getByTestId('saved.segment.todo').click();
  await page.getByTestId('card.save.v-luz').click();
  await expect(page.getByTestId('toast')).toContainText('Quitada de guardados');
  await expect(page.getByTestId('card.v-luz')).toHaveCount(0);
  await expect(page.getByTestId('saved.group.month')).toHaveCount(0);
});

test('G1b signed-out Guardados invites to sign in and returns after login', async ({ page }) => {
  await start(page);
  await tab(page, 'saved').click();
  await expect(page.getByTestId('saved.signedOut')).toBeVisible();
  await page.getByTestId('saved.signIn').click();
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('saved.screen')).toBeVisible();
});

test('G2 reminder note "Te avisamos 1 día antes" and Cambiar to 3 days', async ({ page }) => {
  await startSignedIn(page);
  await tab(page, 'saved').click();
  await expect(page.getByTestId('saved.reminder')).toContainText('Te avisamos 1 día antes de cada evento guardado.');
  await page.getByTestId('saved.reminder.change').click();
  await expect(page.getByTestId('reminder.dialog')).toBeVisible();
  for (const d of [1, 2, 3, 7]) await expect(page.getByTestId(`reminder.option.${d}`)).toBeVisible();
  await page.getByTestId('reminder.option.3').click();
  await expect(page.getByTestId('reminder.dialog')).toHaveCount(0);
  await expect(page.getByTestId('saved.reminder')).toContainText('Te avisamos 3 días antes');
});

test('P1 profile header, level, points and progress to the next level', async ({ page }) => {
  await startSignedIn(page);
  await expect(page.getByTestId('profile.name')).toHaveText('Ana Mora');
  await expect(page.getByTestId('profile.initials')).toHaveText('AM');
  await expect(page.getByTestId('profile.since')).toContainText('San José · desde 2026');
  await expect(page.getByTestId('profile.levelBadge')).toContainText('Nivel 3 · De confianza');
  await expect(page.getByTestId('profile.points')).toContainText('172 puntos');
  await expect(page.getByTestId('profile.toNext')).toContainText('28 puntos');
  await expect(page.getByTestId('profile.stat.vuelticas.value')).toHaveText('12');
  await expect(page.getByTestId('profile.stat.reviews.value')).toHaveText('8');
  await expect(page.getByTestId('profile.stat.verifications.value')).toHaveText('31');
  await expect(page.getByTestId('profile.moderation')).toContainText('Revisar vuelticas · 6 pendientes');
  for (const s of ['instagram', 'tiktok', 'facebook', 'whatsapp']) await expect(page.getByTestId(`profile.social.${s}`)).toContainText('@mivueltica');
  await expect(page.getByTestId('profile.settings')).toBeVisible();
  await expect(page.getByTestId('profile.rules')).toBeVisible();
});

test('P2 the info button and the level badge open the Confianza pop-up; "Entendido" closes it', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.levelBadge').click();
  await expect(page.getByTestId('trust.dialog')).toBeVisible();
  await expect(page.getByTestId('trust.dialog')).toContainText('Confianza en tus vuelticas');
  for (const n of [1, 2, 3, 4, 5]) await expect(page.getByTestId(`trust.level.${n}`)).toBeVisible();
  await page.getByTestId('trust.close').click();
  await expect(page.getByTestId('trust.dialog')).toHaveCount(0);
  await page.getByTestId('profile.trustInfo').click();
  await expect(page.getByTestId('trust.dialog')).toBeVisible();
  await expect(page.getByTestId('trust.close')).toHaveAttribute('aria-label', 'Entendido');
});

test('P3 Cerrar sesión asks for confirmation and returns to the signed-out profile', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.signOut').click();
  await expect(page.getByTestId('dialog.title')).toHaveText('¿Cerrar sesión?');
  await page.getByTestId('dialog.cancel').click();
  await expect(page.getByTestId('profile.screen')).toBeVisible();
  await page.getByTestId('profile.signOut').click();
  await page.getByTestId('dialog.confirm').click();
  await expect(page.getByTestId('profile.signedOut')).toBeVisible();
});

test('P4 Normas de la comunidad opens the (draft) rules', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.rules').click();
  await expect(page.getByTestId('rules.screen')).toBeVisible();
  await expect(page.getByTestId('rules.screen')).toContainText('BORRADOR');
});

test('MO1 Aprobar shows "¡Gracias! … +1 confianza"; Deshacer reverts it', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.moderation').click();
  await expect(page.getByTestId('mod.newHeader')).toHaveText('NUEVAS · 4 PENDIENTES');
  await expect(page.getByTestId('mod.reportedHeader')).toHaveText('REPORTADAS · 2');
  await expect(page.getByTestId('mod.intro')).toContainText('Con tu nivel 3 · De confianza');
  await expect(page.getByTestId('mod.progress.v-cuentos')).toHaveText('0 de 5 votos para publicar');
  await page.getByTestId('mod.for.v-cuentos').click();
  await expect(page.getByTestId('mod.thanks.v-cuentos')).toHaveText(/¡Gracias! Tu voto quedó registrado · \+1 confianzaDeshacer|¡Gracias! Tu voto quedó registrado · \+1 confianza/);
  await expect(page.getByTestId('mod.progress.v-cuentos')).toHaveText('1 de 5 votos para publicar');
  await page.getByTestId('mod.undo.v-cuentos').click();
  await expect(page.getByTestId('mod.thanks.v-cuentos')).toHaveCount(0);
  await expect(page.getByTestId('mod.progress.v-cuentos')).toHaveText('0 de 5 votos para publicar');
  await expect(page.getByTestId('mod.against.v-cuentos')).toBeVisible();
});

test('MO1b a vote is worth +1 point', async ({ page }) => {
  await startSignedIn(page);
  await page.getByTestId('profile.moderation').click();
  await page.getByTestId('mod.against.v-cuentos').click();
  await expect(page.getByTestId('mod.thanks.v-cuentos')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('profile.points')).toContainText('173 puntos');
});

test('MO3 Ocultar vueltica on a reported plan hides it from the map once the majority agrees', async ({ page }) => {
  await startSignedIn(page);
  await openMap(page);
  await expect(page.getByTestId('map.pin.v-ninos')).toBeVisible();
  await expect(page.getByTestId('map.results.title').last()).toHaveText('20 planes de hasta ₡5.000');
  await simulate(page, { kind: 'votes', vuelticaId: 'v-ninos', count: 2, choice: 'for' });
  await tab(page, 'profile').click();
  await page.getByTestId('profile.moderation').click();
  await expect(page.getByTestId('mod.reports.v-ninos')).toContainText('2 reportes · «Horario o lugar incorrecto»');
  await expect(page.getByTestId('mod.for.v-ninos')).toHaveAttribute('aria-label', 'Ocultar vueltica');
  await expect(page.getByTestId('mod.against.v-ninos')).toHaveAttribute('aria-label', 'Sigue igual');
  await page.getByTestId('mod.for.v-ninos').click();
  await expect(page.getByTestId('mod.thanks.v-ninos')).toBeVisible();
  await page.goBack();
  await openMap(page);
  await expect(page.getByTestId('map.results.title').last()).toHaveText('19 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.pin.v-ninos')).toHaveCount(0);
});

test('MO3b "Sigue igual" keeps a reported plan published', async ({ page }) => {
  await startSignedIn(page);
  await simulate(page, { kind: 'votes', vuelticaId: 'v-ninos', count: 2, choice: 'against' });
  await tab(page, 'profile').click();
  await page.getByTestId('profile.moderation').click();
  await page.getByTestId('mod.against.v-ninos').click();
  await expect(page.getByTestId('mod.thanks.v-ninos')).toBeVisible();
  await page.goBack();
  await openMap(page);
  await expect(page.getByTestId('map.pin.v-ninos')).toBeVisible();
});

test('MO4 community votes publish a pending plan: author gets +10 and the plan appears on the map', async ({ page }) => {
  await startSignedIn(page);
  await simulate(page, { kind: 'votes', vuelticaId: 'v-feria-ana', count: 1, choice: 'for' });
  await tab(page, 'profile').click();
  await expect(page.getByTestId('profile.points')).toContainText('182 puntos');
  await openMap(page);
  await expect(page.getByTestId('map.results.title').last()).toHaveText('21 planes de hasta ₡5.000');
  await expect(page.getByTestId('map.pin.v-feria-ana')).toBeVisible();
});
