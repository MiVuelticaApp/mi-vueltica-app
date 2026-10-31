import AxeBuilder from '@axe-core/playwright';
import { expect, test, tab, start, startSignedIn, openList, openDetail, type Page } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: Page, rules?: { only?: string[]; excludeSelectors?: string[] }) {
  let b = new AxeBuilder({ page }).withTags(TAGS);
  if (rules?.only) b = new AxeBuilder({ page }).withRules(rules.only);
  for (const sel of rules?.excludeSelectors ?? []) b = b.exclude(sel);
  const r = await b.analyze();
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, where: v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ') }));
}

/**
 * Rule ids that axe reports on the react-native-web export and that are tracked in docs/E2E_REPORT.md (section "Accessibility").
 * They are web-rendering artefacts of RN accessibility props (@expo/ui web switch/slider/select shims, expo-image <img>, nested
 * Pressables) or known gaps. The test fails on any rule id outside this list (regression guard) and on contrast always.
 */
const KNOWN_WEB_RULES = new Set([
  'image-alt', 'label-content-name-mismatch', 'nested-interactive', 'aria-required-attr', 'label', 'aria-prohibited-attr',
  'scrollable-region-focusable', 'aria-progressbar-name', 'select-name',
]);

type Route = { name: string; go: (p: Page) => Promise<void> };
const ROUTES: Route[] = [
  { name: 'Mapa', go: async (p) => { await start(p); } },
  { name: 'Lista', go: async (p) => { await start(p); await openList(p); } },
  { name: 'Detalle', go: async (p) => { await start(p); await openDetail(p, 'v-jade'); } },
  { name: 'Filtros', go: async (p) => { await start(p); await p.getByTestId('map.chip.filters').click(); await expect(p.getByTestId('filters.sheet')).toBeVisible(); } },
  { name: 'Login', go: async (p) => { await start(p); await tab(p, 'profile').click(); await p.getByTestId('profile.signIn').click(); await expect(p.getByTestId('login.screen')).toBeVisible(); } },
  { name: 'Guardados', go: async (p) => { await startSignedIn(p); await tab(p, 'saved').click(); await expect(p.getByTestId('card.v-jade')).toBeVisible(); } },
  { name: 'Perfil', go: async (p) => { await startSignedIn(p); } },
  { name: 'Aportar', go: async (p) => { await startSignedIn(p); await tab(p, 'contribute').click(); await expect(p.getByTestId('contribute.screen')).toBeVisible(); } },
  { name: 'Moderación', go: async (p) => { await startSignedIn(p); await p.getByTestId('profile.moderation').click(); await expect(p.getByTestId('mod.card.v-cuentos')).toBeVisible(); } },
  { name: 'Ajustes', go: async (p) => { await startSignedIn(p); await p.getByTestId('profile.settings').click(); await expect(p.getByTestId('settings.screen')).toBeVisible(); } },
];

for (const r of ROUTES) {
  test(`X1 axe color contrast (WCAG AA, NFR-12): ${r.name}`, async ({ page }) => {
    await r.go(page);
    await page.waitForTimeout(400);
    // A disabled "Enviar vueltica" is exempt from WCAG contrast but the web export does not expose `disabled` (bug B6), so axe cannot know.
    const excludeSelectors = r.name === 'Aportar' ? ['[data-testid="contribute.submit"]'] : [];
    expect(await scan(page, { only: ['color-contrast'], excludeSelectors })).toEqual([]);
  });
}

for (const r of ROUTES) {
  test(`X1b axe WCAG A/AA, no new rule violations: ${r.name}`, async ({ page }) => {
    await r.go(page);
    await page.waitForTimeout(400);
    const found = await scan(page);
    test.info().annotations.push({ type: 'axe', description: found.map((f) => `${f.id}x${f.n}`).join(', ') || 'clean' });
    const unknown = found.filter((f) => !KNOWN_WEB_RULES.has(f.id) && !(f.id === 'color-contrast' && r.name === 'Aportar'));
    expect(unknown).toEqual([]);
  });
}

const GLYPHS = /[\u{E000}-\u{F8FF}\u{F0000}-\u{10FFFF}]/gu;
for (const r of ROUTES) {
  test(`X2 every icon-only button has an accessible name (NFR-13): ${r.name}`, async ({ page }) => {
    await r.go(page);
    await page.waitForTimeout(300);
    const unnamed = await page.evaluate((glyphSrc) => {
      const glyphs = new RegExp(glyphSrc, 'gu');
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], a[href]'))) {
        if (el.getClientRects().length === 0) continue;
        const label = (el.getAttribute('aria-label') ?? '').trim();
        const text = (el.textContent ?? '').replace(glyphs, '').trim();
        const labelledby = el.getAttribute('aria-labelledby');
        if (!label && !text && !labelledby) out.push(el.getAttribute('data-testid') ?? el.outerHTML.slice(0, 80));
      }
      return out;
    }, GLYPHS.source);
    expect(unnamed).toEqual([]);
  });
}
