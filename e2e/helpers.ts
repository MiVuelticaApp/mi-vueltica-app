import { expect, test as base, type Page } from '@playwright/test';
export type { Page };

/**
 * Shared fixtures. `test` clears the app storage ONCE per test (a sessionStorage flag keeps page.goto() reloads
 * from wiping state mid-test), exactly like smoke.spec.ts.
 */
export const test = base.extend<{ _clear: void }>({
  _clear: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        try {
          if (!sessionStorage.getItem('__e2e_cleared')) {
            localStorage.clear();
            sessionStorage.setItem('__e2e_cleared', '1');
          }
        } catch {
          /* ignore */
        }
      });
      await use();
    },
    { auto: true },
  ],
});
export { expect };

/** Fake "now" used by the web export (see playwright.config.ts). */
export const FAKE_NOW = new Date('2026-10-20T10:00:00-06:00');

/** First launch -> "Permitir ubicación" -> map. */
export async function start(page: Page) {
  await page.goto('/');
  await page.getByTestId('welcome.allow').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
  await expect(page.getByTestId('map.results.title')).toContainText('planes');
}

/** Skip onboarding with "Ahora no" (works in the denied project too). */
export async function startSkip(page: Page) {
  await page.goto('/');
  await page.getByTestId('welcome.notNow').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
}

/** Complete the login screen with Apple (Ana Mora, level 3). */
export async function loginApple(page: Page) {
  await expect(page.getByTestId('login.screen')).toBeVisible();
  await page.getByTestId('login.apple').click();
  await expect(page.getByTestId('login.screen')).toBeHidden();
}

/** Start + sign in from the Perfil tab. Leaves the app on Perfil. */
export async function startSignedIn(page: Page) {
  await start(page);
  await tab(page, 'profile').click();
  await page.getByTestId('profile.signIn').click();
  await loginApple(page);
  await expect(page.getByTestId('profile.levelBadge')).toBeVisible();
}

export async function openMap(page: Page) {
  await tab(page, 'map').click();
  await expect(page.getByTestId('map.results')).toBeVisible();
}

/** Open the Lista tab and wait for the 1 s skeleton to disappear. */
export async function openList(page: Page) {
  await tab(page, 'list').click();
  await expect(page.getByTestId('list.screen')).toBeVisible();
  await expect(page.getByTestId('list.skeleton')).toBeHidden({ timeout: 5000 });
  await expect(page.getByTestId('list.count')).toBeVisible();
}

/** Open a plan detail sheet from anywhere (direct route; the app state is kept). */
export async function openDetail(page: Page, id: string) {
  // MockApi persists its state ~50 ms after a write; give it time so the reload below sees the latest data.
  await page.waitForTimeout(250);
  await page.goto(`/vueltica/${id}`);
  await expect(page.getByTestId('detail.title')).toBeVisible();
}

/** Client-side navigation helper (keeps in-memory state, unlike page.goto). */
export async function gotoClient(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

/** Window test hooks exposed when EXPO_PUBLIC_E2E=1. */
export async function setOffline(page: Page, v: boolean) {
  await page.evaluate((x) => (window as unknown as { __mv: { setOffline(v: boolean): void } }).__mv.setOffline(x), v);
}
export async function simulate(page: Page, input: Record<string, unknown>) {
  await page.evaluate((i) => (window as unknown as { __mv: { simulate(i: unknown): Promise<void> } }).__mv.simulate(i), input);
}

/**
 * Tab bar button. `.last()` because the app can leave a second (tabs) navigator mounted underneath after a sheet
 * navigates back with router.navigate (see docs/E2E_REPORT.md, bug B1); the top-most one is the last in the DOM.
 */
export function tab(page: Page, name: 'map' | 'list' | 'contribute' | 'saved' | 'profile') {
  return page.getByTestId(`tabs.${name}`).last();
}

/** Record window.open calls (Linking.openURL on web) instead of opening new tabs. Read with `openedUrls`. */
export async function stubWindowOpen(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
}
export const openedUrls = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

/** Visible element with this testID (hidden copies of stacked/previous screens stay in the DOM on web). */
export const vis = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true }).first();
