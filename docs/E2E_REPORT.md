# E2E report (Playwright on the web export)

Run: `npm run e2e` (builds `EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_FAKE_NOW=2026-10-20T10:00:00-06:00`, serves on :8081). `E2E_SKIP_BUILD=1` reuses `dist`.
For parallel runs on one checkout (several agents/CI jobs) use `E2E_PORT`, `E2E_DIST`, `E2E_OUTPUT`, `E2E_REPORT`: Playwright wipes `test-results/` at start, so two runs sharing it break each other with `ENOENT .../.playwright-artifacts` errors.
Source state tested: commit `6d2f5ca` (review fixes), web export rebuilt from it. Chromium: system/`/opt/pw-browsers` fallback in `playwright.config.ts`.

**Result (final full run `npm run e2e`): 234 passed, 0 failed, 0 flaky, 8.3 min, 2 workers.**
That is 116 tests in `light`, 116 in `dark`, 2 in `denied`. 8 of the 116 per theme are *expected failures* (`test.fail`) that document open app bugs (B1-B5): they pass the run today and will turn red ("expected to fail but passed") the moment the bug is fixed, at which point remove the `test.fail(...)` line.
So per theme: 108 genuine passes + 8 known-bug xfails.

## Files
`e2e/helpers.ts` (storage cleared once per test, `start`, `startSignedIn`, `tab`, `vis`, `setOffline`, `simulate`, `stubWindowOpen`), `map`, `onboarding.denied`, `list`, `search`, `filters`, `detail` (D + C), `verify-report` (V + R), `reviews`, `contribute`, `saved-profile` (G, P, MO), `settings` (A, MO2, login), `offline`, `a11y` (X1/X2) `.spec.ts`, plus the original `smoke.spec.ts`. Native flows: `.maestro/*.yaml`.

## Cases (PLAN §11) -> tests -> result (light = dark)
| Case | Test | Result |
|---|---|---|
| E1 first launch -> Permitir ubicación -> map | map E1 | pass |
| E2 denied -> Heredia persists | onboarding.denied E2 (`denied` project) | pass |
| E3 Ahora no | onboarding.denied E3 | pass |
| M1 results card 20 / 14 gratis -> Lista | map M1 | pass |
| M2 Estudiantes -> "18 planes para estudiantes", "Filtros · 1" | map M2 | pass |
| M3 pin -> Detalle | map M3 | pass |
| M4 cluster zoom | map M4 | pass |
| M5 pin opacities 1 / .75 / .5, selected 1 | map M5 | pass |
| M6 Pendiente pins (guest none; Ana own + queue) | map M6, M6b | pass |
| M7 account button -> Perfil | map M7 | pass |
| L1 skeleton >= 1 s | list L1 | pass |
| L2 Eventos / Lugares segment | list L2 (+L4 chips) | pass |
| L3 sort | list L3 | pass |
| S1 "museo" -> "2 RESULTADOS PARA «MUSEO»", Cancelar | search S1 | pass |
| S2 "zzz" -> Sin resultados, Ampliar / Aportar / Limpiar | search S2, S2b, S2c | pass |
| F1 live count -> map | filters F1 | pass |
| F2 Limpiar | filters F2 | pass |
| F3 Hoy / Fin de semana (+ Elegir fechas) | filters F3, F3b | pass |
| F4 Accesible | filters F4 | pass |
| D1 Museo del Jade | detail D1 | pass |
| D2 guest Guardar -> Login -> saved -> Guardados | detail D2 | pass |
| D3 Compartir | detail D3 | pass |
| D4 Ver todas -> Reseñas | detail D4 (+D5 close X/backdrop) | pass |
| C1 Waze URL | detail C1, C1b (Google) | pass |
| C2 Recordar mi elección | detail C2 | pass |
| C3 no Apple Maps off iOS | detail C3, settings A5 | pass |
| V1 "Sí, sigue igual" +2 | verify-report V1, V1b, V4 (guest) | pass |
| V2 Más de ₡5.000 x3 hides | verify-report V2, V2b, V3 (same person cannot repeat) | pass |
| R1 anonymous report | verify-report R1 | pass |
| R2 3 reports -> hidden + Moderación › Reportadas | verify-report R2 | pass |
| RV1 126 -> 127 | reviews RV1 | pass |
| RV2 Útil | reviews RV2 | pass |
| RV3 Más útiles | reviews RV3 | pass |
| RV4 guest -> Login | reviews RV4b (login gate) pass; RV4 (resume to composer) = xfail **B2** | partial |
| N1 submit -> "en revisión" -> Mis vuelticas | contribute N1 (UI) xfail **B3**; N1c (via API hook + real UI) pass | partial |
| N2 price 6.000 blocked | contribute N2 | pass |
| N3 submit disabled until checkbox | contribute N3 (full) xfail **B3**; N3b/N3c extra pass | partial |
| N4 votes -> Publicado +10 | contribute N4 (UI) xfail **B3**; N4b (via API) + saved-profile MO4 pass | partial |
| G1 grouping / segmented / unsave | saved-profile G1, G1b | pass |
| G2 reminder Cambiar | saved-profile G2 | pass |
| P1 Nivel 3, 172, 28 to go | saved-profile P1 (+smoke) | pass |
| P2 14b dialog | saved-profile P2 | pass |
| P3 Cerrar sesión | saved-profile P3 | pass |
| MO1 Aprobar -> "+1 confianza", Deshacer | saved-profile MO1, MO1b | pass |
| MO2 < L3 no entry | settings MO2 | pass |
| MO3 Ocultar / Sigue igual | saved-profile MO3, MO3b | pass |
| A1 dark mode persists | settings A1 | pass |
| A2 text size | settings A2, A2b | pass |
| A3 delete account -> Anónimo | settings A3 | pass |
| A4 export download | settings A4 | pass |
| O1 offline banner / cache / disabled | offline O1 pass; O1b (saved plan never opened) xfail **B4**; O4 freeze xfail **B5** | partial |
| O2 queued verification | offline O2 (+O3 dev switch) | pass |
| X1 axe, both themes | a11y X1 (contrast, 10 routes) + X1b (no new rule ids) | pass |
| X2 icon-button names | a11y X2 (10 routes) | pass |

Adapted expectations (per requirements.pdf, not weakened): dates use the real calendar ("Sábado 24 de octubre", Friday 30 oct for the Melico); Ana is level 3 so a new vueltica needs 3 votes ("0 de 3 votos", PDF rule: author >= L3 needs 3); formatted views "1.240 vistas"; verification, reports and votes by one person are counted once.

## App bugs found (NOT fixed; src untouched)
| ID | Bug | Repro | Expected / actual | Suspected file |
|---|---|---|---|---|
| B1 | Applying filters stacks a second `(tabs)` navigator | Mapa -> Filtros -> "Mostrar N resultados" | Expected: sheet dismissed, one map. Actual: URL `/` but 2 `map.screen` + 2 tab bars in the DOM, and browser/Android back re-opens `/filtros`. | `src/app/filtros.tsx` `apply` uses `router.navigate('/')` (same pattern in `contribute/ContributeForm.tsx` `close`, `vueltica-enviada/[id].tsx`). Use `router.dismissTo('/')`/`back()`. Tests: filters F5 (xfail) and `tab()` helper uses `.last()` as workaround. |
| B2 | Sign-in gate does not resume "Escribir reseña" | Guest on Reseñas -> Escribir reseña -> Login (Apple) | Expected: composer opens (pending action `review`). Actual: back on Reseñas, nothing opens. (Save and Útil resume fine.) | `src/features/auth/useResumePending.ts` pushes the composer while `login.tsx` also navigates to `next`; race removes it. |
| B3 | Tapping the map in "Elegir ubicación" crashes the web fallback map (white screen, `TypeError: Cannot read properties of undefined (reading 'range')` in supercluster `getClusters`) | Aportar -> Ubicación -> tap map | Expected: pin dropped. Actual: `onMapPress` computes lat/lng from `e.nativeEvent.locationX/locationY`, which react-native-web press events do not provide -> NaN centre -> NaN zoom -> `trees[NaN]`. Blocks the whole new-vueltica flow on web / Expo Go fallback. | `src/components/map/ImageMap.tsx` (Pressable `map.surface` onPress). Use `onPressIn`/pointer position via `e.nativeEvent.pageX - layout` or `onLayout` offset; also guard `useClusters` against non-finite zoom. Tests: contribute N1, N1b, N3, N4 (xfail); N1c/N4b cover the rest via `window.__mv.api`. |
| B4 | A saved plan never opened is not available offline | Signed in -> Guardados (card shows) -> go offline -> tap card | Expected (FR-16.1): cached data. Actual: Detalle shows "No encontramos este plan". | `src/data/queries` `useVuelticaDetail` is not seeded from saved/list cache. Test: offline O1b (xfail). |
| B5 | Page freezes (main thread hang ~1 s after render) | Signed in -> Lista -> simulate offline -> Guardados -> Mapa | Expected: map shows banner. Actual: page unresponsive (`page.evaluate` never returns). Not reproduced without Lista before, or as guest, or going Guardados first. Probable render loop between `OfflineList`/saved/recent queries and the map offline state. | `ResultsList.tsx` OfflineList / `useRecentlyViewed`, `state/network.ts`. Test: offline O4 (xfail). |

Web-only accessibility observations (axe 4.x, wcag2a/aa/21; contrast is clean on all 10 routes in both themes after the reviewer fix, except B6):
- B6 `disabled`/`selected`/`checked` state of `Button`/`Chip`/`Tap` is not exposed to the DOM on web (RN `accessibilityState` is not mapped by react-native-web 0.21; use `aria-disabled`/`aria-selected`). Visible effect: axe flags the disabled "Enviar vueltica" label as low contrast although disabled controls are exempt (excluded in X1 with a comment). Native unaffected.
- Known rule ids tolerated by X1b (any new id fails): `image-alt` (expo-image `<img>` in pins/login art), `label-content-name-mismatch` (cards/results card/rows: aria-label differs from visible text, WCAG 2.5.3), `nested-interactive` (save button inside a pressable card; also in Switch wrappers), `aria-required-attr`/`label` (@expo/ui web Switch/Slider: wrapper `role=switch` without `aria-checked`, inner unlabeled input), `aria-prohibited-attr` (aria-label on role-less divs: zoom marker, Categoría picker), `scrollable-region-focusable` (Detalle photo strip), `aria-progressbar-name` (reputation progress), `select-name` (sort `<select>` on Lista has no name; the label is on the Host wrapper).
- X2 passes: every visible button/tab/link has an `aria-label` or text on all 10 routes.

## Flaky / stability
No flaky tests in the final run (0 retries needed; `retries` is 1 only on CI). Things that were unstable while writing and are now handled:
- MockApi persists ~50 ms after a write; a `page.goto` right after a mutation can load stale state -> `openDetail` waits 250 ms first.
- Persisted react-query cache has `staleTime` 15 s: reloading right after a simulated community event can show a stale moderation count -> tests navigate in-app instead of reloading.
- Stacked screens stay mounted (hidden) on web, so `getByTestId` can match 2 elements -> `tab()`, `vis()` and `.filter({visible:true})` helpers.
- Selected state colours differ per theme -> compared against the theme's own value.

## Not coverable on web (and suggested Maestro flows in `.maestro/`)
| Area | Why | Flow |
|---|---|---|
| expo-maps (real map, native pins, clustering, pin tap iOS 18+, user dot) | web uses the image-map fallback | 01, 02 |
| NativeTabs / formSheet detents / grabber / swipe-to-dismiss, Android back | web uses a JS tab bar and a drawn sheet | 02, 04 |
| Native location + notification permission dialogs, scheduled reminders | no OS dialogs in browser | 01, 05 |
| Apple Maps / Google Maps / Waze handoff, native share sheet | web only opens a URL / copies link | 03 |
| Native location picker (B3 workaround on device) and form with real keyboard | | 07 |
| @expo/ui native Switch/Slider/Picker/DateTimePicker, Dynamic Type, system dark mode, Larger buttons | web shims | 06 |
| Photo picker, haptics, offline OS network state (`expo-network`) | | add flows when device farm is available |
Maestro uses bundle id `cr.mivueltica.app`; flows were written but not run here (no emulator).
