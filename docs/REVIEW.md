# MiVueltica frontend: independent review

Branch `claude/admiring-cray-qxnk8j`, commits `014dd9f..c252549`. Reviewer: independent agent (no code changed).
Reference: `docs/requirements.pdf` (FR-1..16, rules, data model, NFR-1..18), `docs/PLAN.md` §10, `docs/IMPLEMENTATION_NOTES.md`, `docs/GAPS_FIGMA.md`, Figma `hK6ZmxpUjxlz7NT3fxoFVd`.

## How it was checked
| Check | Result |
|---|---|
| `npm test` | 56/56 pass (4 suites: rules, filters, format, MockApi) |
| `npx tsc --noEmit` | clean |
| `npx expo lint` | clean |
| `npx expo-doctor` | 20/20 |
| Web export rebuilt (`npm run build:web`) and driven with Playwright at 402x874, light and dark, plus direct calls to `window.__mv.api` to probe the rules | done, see below |
| Axe (wcag2a/aa) on web export, 7 routes x 2 themes | violations listed under M3/m9 |
| Figma | iOS 01 Mapa (12:194) compared; the app matches layout, chips, results card, tab bar. Other screens compared against GAPS_FIGMA copy and PLAN descriptions only |
| Expo v58 docs | expo-maps, @expo/ui, expo-file-system, expo-notifications, native tabs, formSheet fetched; findings below |
| `npm run e2e` | At HEAD only `e2e/smoke.spec.ts` (4 tests) is committed. The working tree has 6 further untracked spec files from the coder (in progress); a run against `dist` gave 40 passed and some light/dark failures (F1, F3, F4, M5, M2, S2c, L1). That work was not reviewed |

Native behaviour (expo-maps, NativeTabs, formSheet, @expo/ui native views, notifications, Apple/Google Maps links) could not be run here. Those items are verified against v58 docs and code reading only and are marked "unverified on device".

## Blockers
None. The app builds, type-checks and runs. The items below are Major because they break a stated business rule or a requirement.

## Major

**M1. One person can flip a listing alone: verifications are not de-duplicated per person or device (FR-9.1, "3 people").**
`src/data/mock/MockApi.ts:310-349` (`applyVerification`), `:351-362` (`verify`), `:364` (`quickConfirm`). The rule is "when 3 people report the same change". Nothing limits one user or device to one verification per plan (reports are limited per device, verifications are not). `myVerifiedToday` is computed (`:200`) but never read by any UI (`grep` shows only `api.ts:73` and `MockApi.ts:200`).
Reproduced in the export: a guest calling `verify({stillHappening:'no'})` three times hides "Parque La Sabana" (`hidden:true` on the 3rd call, then NotFound for everyone). Ana (level 3) sending `pricePaid:'mas5000'` three times hides it alone. Ana pressing "Sí, sigue igual" five times earns +10 points (+2 each).
Fix: key verifications by `userId ?? deviceId` per plan, one counted per person (and one points award per plan per day); count distinct people in `outcomeOfVerifications`; use `myVerifiedToday` in Detalle/Verificar to disable the buttons ("Ya verificaste hoy"). Add a unit test (3 verifications from the same person do not change the listing).

**M2. Moderation vote state is lost on re-entry and the UI lies about it (FR-14.4).**
`src/app/moderacion.tsx:30` (`voted` is local `useState`), `src/components/ui/ModerationCard.tsx:50` (only `voted` is read) while `ModerationItem.myVote` is returned by the API and never used in any `.tsx` (`grep myVote src` returns nothing). Scenario (reproduced via API): vote "Aprobar" on an item, leave Moderación, come back. The card shows Rechazar/Aprobar again. Tapping Rechazar shows "¡Gracias! Tu voto quedó registrado · +1 confianza" but the server kept the first vote (`MockApi.ts:549` ignores the second; counts stay 4-0 and `myVote` stays `for`). The user can also no longer "Deshacer" the earlier vote.
Fix: initialise `voted` from `item.myVote`; render the thanks/Deshacer state from it; in `vote()` either reject the second vote or replace the previous one (and then adjust points), and have the UI reflect the result.

**M3. Light-theme secondary text fails WCAG AA (NFR-12).**
`src/theme/tokens.ts:74` `labelSecondary: '#3c3c4399'`. Axe on the export: contrast 3.28:1 for the 13px section headers on `#f2f2f7` (Ajustes, Filtros) and 3.41:1 for the 17px count/subtitle on `/lista`, `/guardados`, `/perfil`, `/aportar`. Dark mode is clean. The value is the iOS system colour from Figma, but the requirement is AA in both themes, and the app uses it on small caption text.
Fix: use a darker light-mode token for `labelSecondary` on content text (about `#5c5c63` or `onSurfaceVariant #3e4857`, ratio over 4.5) and keep the system colour only for chrome; re-run axe.

**M4. Offline mode only partly meets FR-16.1 / NFR-17.**
(a) `src/features/list/ResultsList.tsx:115` renders `t.offline.banner('hace 2 h')`: the age is a hard-coded literal, so it is wrong in every case. `lastOnlineAt` is in the store but `void lastOnline` (`:62`) discards it.
(b) "Actions that need the network are disabled" is not done: Detalle (Guardar, Sí sigue igual, Algo cambió, Reportar, Útil), Verificar, Reportar, Reseñas and Aportar do not read `useIsOffline`. Offline, "Guardar" and "Reportar" fail with a generic error toast. `OfflineList` passes `onToggleSave={() => {}}` (`:72`, a silent no-op button). Only verification is queued.
(c) The banner appears only when the list query errors (`query.isError && offline`, `:113`), so a user who goes offline while looking at cached results sees no banner until a refetch fails. The offline Detalle (probed) shows no banner.
Fix: a single `<OfflineBanner>` driven by `useIsOffline` and `lastOnlineAt` (formatted with `formatRelative`), mounted in the tab layout and the sheets; `disabled={offline}` plus a11y hint on network actions.

**M5. "Guardados" lists plans that were hidden or unpublished, then fails on tap.**
`MockApi.ts:303` filters only `status !== 'rechazada'`. Probe: save "Parque La Sabana", have 3 people verify "ya no existe", reopen Guardados: it returns `["v-sabana","oculta"]`. Tapping it calls `getVueltica`, which throws NotFound for non-authors (`:185`), so the Detalle shows "No encontramos este plan". The rule says plans that are hidden must not be listed on the map; a saved card with old price/badges is also misleading (FR-12.1 shows verification status).
Fix: filter `isVisibleTo` in `listSaved`, or return a `unavailable` flag and render "Ya no está disponible" with a remove action.

**M6. Native pin tap on iOS < 18 is impossible; selected-pin behaviour depends on unverified native API (FR-3.6).**
`src/components/map/MapView.tsx:117` relies on `onAnnotationClick`/`onMarkerClick`; docs v58 mark pin events "iOS 18.0+". The plan knew this, but the app has no fallback (for example, tapping the results card or a nearby list), so on iOS 16-17 the main map->Detalle path does not exist. Also `cameraPosition={camera}` is rebuilt on every render (`MapView.tsx:~111`); if the native view treats a new object as a move command, panning/zooming will snap back to the centre after any re-render (cluster icons loading, selection). Unverified on device. Please test on a device and memoise `camera` or drive it only through `setCameraPosition`.

**M7. E2E coverage is far below the plan (PLAN §10/§11).**
Committed e2e is 4 smoke tests; PLAN §11 lists about 60 P0 cases and M12 says "full e2e". The working tree has new untracked specs but they are not committed and show failures (see table). No test covers rules at API level for: same-person verification (M1), report anonymity, Mis vuelticas states, sign-in resume, or offline queue in the UI.

## Minor

**m1. `update({ notifyReminders: ok || true })`** (`src/app/ajustes.tsx:162`) is always true: if the OS denies notification permission the switch still turns on and no reminders can fire. Use `ok`, and show the "Activá las notificaciones" hint when denied. Also `syncReminders` (`src/lib/notifications.ts`) calls `requestPermissionsAsync` automatically at sign-in when saved events exist, skipping the G11g pre-prompt design.

**m2. Pin images are pre-blended with white, and the web/Expo-Go fallback fades them twice.** `assets/pins/place-2500.png` has an opaque (72,144,107) body (= 75 % over white), `place-5000` (133,181,156). That matches the Figma export, but it is not real opacity (the map does not show through, dark map pins look grey-white). `ImageMap`/`Markers.tsx:16` then multiplies by `pinOpacity` again, giving about 56 % / 25 % effective on the image map (fallback used in Expo Go and for Playwright). Pick one: use full-strength PNGs with `opacity` (web) and tinted native icons, or use the baked PNGs and drop the extra opacity.

**m3. Strings outside i18n (PLAN §10 "no strings outside i18n").** `MapView.tsx:74` 'Ubicación elegida'; `ImageMap.tsx:85,107,108` 'Mapa', 'Acercar', 'Alejar'; `Skeleton.tsx:21` 'Cargando planes'; `vueltica/[id]/index.tsx` 'Evento', 'Fila preferencial presentando carné', 'cupo limitado', '… por persona', 'Gratis para …'; `ModerationCard.tsx` 'Evento', 'Lugar', 'Gratis'; `reportar.tsx` '1 foto agregada'; `ContributeForm.tsx` 'Elegir…'; `rules.ts` `hiddenReason: 'Ya no existe'` and MockApi reasons ('Ocultada por moderación', 'En revisión por reportes', 'La comunidad no la aprobó'). Move to `es-CR.ts`.

**m4. Report-queue threshold is not in the PDF.** `MockApi.ts:24,474` shows a report in "Reportadas" only from 2 reports; FR-14.1/14.3 say reported vuelticas. Documented in notes, but a single report is invisible to moderators. Reports are also deleted when moderators choose "Sigue igual" (`:535`) and `reportDevices` is never cleared, so that device can never report the plan again.

**m5. Moderator trust penalty differs from the placeholder.** PLAN §8: minority on 3 of last 5 votes = -2. `MockApi.ts:555` subtracts 2 only for the vote that completes the quorum and is against the earlier majority; earlier minority voters are never penalised, and undoing a vote does not restore the -2. Undoing a publishing vote does not take back the +10 either (`resolve` only guards double awards).

**m6. Points farming on "útil".** `MockApi.ts:446-460`: toggling Útil on, off, on gives the review author +1 each time it is switched on. Award once per (reviewer, review).

**m7. `authorName` for single-word names is wrong.** `MockApi.ts:245` builds `${first} ${second?.[0] ?? ''}.`, which gives "Persona ." for one-word names (the email sign-in path after account deletion creates such users). Also `createReview` recomputes the average from the rounded stored value, so the average drifts (`:438-440`).

**m8. Account deletion leaves residue (NFR-16).** `deleteAccount` (`MockApi.ts:650`) removes reviews but not the rating counts/distribution they contributed, removes the user's votes without re-running `resolve` (a vueltica that was published by that vote stays published), and keeps `reports.reporterId`. On the client, `useSignOut`/`useDeleteAccount` only invalidate queries: the persisted react-query cache (`src/lib/queryClient.ts:36` persists `list/detail/saved/recent`, 7 days) keeps user-specific data (pending plans, `mine`, moderation info) on disk after sign-out or deletion. Call `queryClient.clear()` and `persister.removeClient()` on both. The exported JSON file stays in `Paths.cache` after sharing (`ajustes.tsx`); delete it afterwards.

**m9. Web-only a11y noise.** The @expo/ui web Switch/Slider produce axe errors (`aria-required-attr`, `label`, `nested-interactive` on `/ajustes`, `/filtros`: the `Host` wrapper gets `role=switch` without `aria-checked` and wraps a second focusable input) and `ImageMap` images lack `alt`. Web is a test target, but the same `accessible`+`accessibilityRole="switch"` wrapper on native may duplicate the control's own semantics (unverified on device); confirm with VoiceOver/TalkBack and drop the wrapper-level role if so.

**m10. "Reducir movimiento" is almost a no-op.** `reduceMotion` is read only by `Skeleton.tsx`; stack/sheet animations, toasts and `animation:'slide_from_bottom'/'fade'` ignore it (NFR-11). Pass `animation: 'none'` when set.

**m11. Sheets do not allow touching the map behind them.** `sheetOptions` (`src/components/ui/Sheet.tsx`) never sets `sheetLargestUndimmedDetentIndex`, so the half-height Detalle dims the map and G13b (selected pin with Detalle open, tap another pin) cannot happen; a pin tap while Detalle is open would `push` another sheet rather than replace (`index.tsx:66`). Add `sheetLargestUndimmedDetentIndex: 0` for Detalle and replace on re-select. Unverified on device.

**m12. `NativeTabs.Trigger testID`** is used in `(tabs)/_layout.tsx` but the v58 docs do not list a `testID` prop on `Trigger`; confirm it compiles to something on device or e2e tests on native will not find tabs (tsc passes).

**m13. Share link is a custom scheme.** `lib/share.ts` uses `Linking.createURL` (`mivueltica://`), which messaging apps do not linkify; G18 (share landing/universal link) is not built. Recipients without the app get nothing.

**m14. Dev surface in production.** `/__kit` is a registered route (`_layout.tsx:43`) available in release builds. Gate with `__DEV__`. `MapView.tsx:39` (`void boundsAround`), `Slider.tsx` (`void onSlidingComplete`), `ResultsList.tsx:62,138` (`void lastOnline; void n; void Icon`) are placeholders for unused values.

**m15. Dead code.** `MockApi.visible()` (unused), `infoDialog`, `useToast`, `tierMaxPrice`, `levelByNumber`, `ratingSummary`, `plural`, `formatDayMonth`, `formatMonthYear`, `formatInt`, `placeholderFor`, `project/unproject` (exported, no importers). Remove or use.

**m16. Smaller correctness items.** `formatDistance(0.9996)` prints "1000 m" instead of "1,0 km" (`format.ts`). Event end time is not validated against start, and past dates are accepted in the form. `signIn` ignores the e-mail/provider and always returns Ana while she exists (fine for the mock, but note for the real `HttpApi`; a real backend needs a distinct test user per level for QA). Android `googleMaps.apiKey` falls back to `''` when `GOOGLE_MAPS_API_KEY` is missing (blank map; add a build-time warning). Expo location plugin's default iOS strings for "Always" are added by the plugin even though the app only requests when-in-use; check the generated Info.plist at prebuild (unverified).

**m17. Dates.** The notes correctly flag that 24 Oct 2026 is a Saturday. Dates are formatted in the device timezone rather than America/Costa_Rica; a traveller sees shifted event hours.

## Unbuilt gap items (coder list) and severity
| Gap | Status | Severity / comment |
|---|---|---|
| G05d Edit pending vuelticas | not built (withdraw only) | Minor: no PDF requirement |
| G06e Gallery counter "1 de 4" | not built (horizontal strip only) | Minor |
| G10b Moderation item detail | not built (card opens Detalle) | Minor |
| G13c "Buscar en esta zona" | not built | Minor, nice to have |
| G14 No maps app installed | not built; `Linking.openURL(https…)` always opens browser fallback, so mostly moot | Minor |
| G18 Share landing | not built | Minor (see m13) |
| G20 Rejection reason / "voto en contra de la mayoría" feedback | not built (fixed reason text) | Minor; PDF only says moderators lose trust |
| G04i exact dialog styling, G16 variants | partial | Minor |
None of these is required by an FR; M2 (G20b-like feedback) and M4 matter more.

## Checked deviations in IMPLEMENTATION_NOTES.md
- "Votes needed 0 de 3 for Ana": correct per the rule (author level >= 3 -> 3). Accepted. PLAN N1 test expectation (0 de 5) should be updated.
- Reports queue threshold >= 2: see m4. Not accepted without product agreement.
- "Cerca de mí" off shows all provinces; map always limits to 5 km: acceptable, but search is also limited to 5 km by default (`nearMe: true`), so a plan 10 km away can never be found by name; consider dropping the limit when `text` is present.
- Controls: universal @expo/ui Switch/Slider/Checkbox/Picker; custom TextField/Segmented/Chips/Buttons. Import path `@expo/ui` with `Host` matches the v58 universal docs. Deviation from NFR-2 (text input, segmented, buttons not native) is documented and acceptable only if the team agrees; the checkbox/switch split (Android checkbox, iOS switch) follows the PDF.
- Icons from `@expo/vector-icons` instead of the 37 Figma icons: acceptable (PDF allows mapping to SF/Material), but tab icons use SF/Material Symbols as required.
- Dark tokens `#0f1522` etc. match GAPS_FIGMA T0.
- Verification price counts from level 2; guests earn no points; reports de-duplicated per device: consistent with PLAN §8, but see M1 for the missing verification de-dup.

## What passes
- Tiers: `tierForPrice` boundaries 0 / 1 / 2.500 / 2.501 / 5.000 / 5.001 / -1 tested; > ₡5.000 rejected at submit with the field error and hidden via 3 matching "Más de ₡5.000" answers. Pin opacity 1 / 0.75 / 0.5, selected 1 (`rules.ts`, tested).
- Votes: 5 below level 3, 3 at level 3+, majority decides, vote undoable, author cannot vote on own item, level < 3 gets `ForbiddenError` and a locked screen; level 4 verifications double, level 5 moderation votes double (documented placeholders).
- Publishing: +10 once (`notified` guard), +2 per verification, +1 useful, +1 vote (-1 on undo), rejection -10, hidden -5, floor 0. 172 pts -> "28 para el siguiente" tested. Profile shows "Nivel 3 · De confianza", 12 / 8 / 31.
- 3 matching reports hide (same reason), reports are anonymous: the API strips `reporterId` (verified in the probe: `reporterId:""`), no screen shows reporters, the report sheet says so, guests can report, dedup per device.
- Pending visibility: pin and detail only for the author and moderators (`isVisibleTo`, tested, and verified in the list API); guests get NotFound.
- Sign-in gates: save, contribute, review, useful, moderate and export need an account (`AuthRequiredError`, tested), login opens by replacing the sheet and `useResumePending` finishes the action (save, review, useful, moderate); browsing, filters, directions and reading reviews work signed out.
- Account deletion: published vuelticas become "Anónimo", pending/rejected removed, reviews and saved removed (tested).
- Copy and format: `₡5.000` hand-formatted (no Intl), dates "Sábado 24 de octubre", "6:00 p.m.", "2,4 km"; voseo throughout (grep found no tú-forms); exact PDF strings for FR-3.4, FR-4.2, FR-5.1, FR-13.4, FR-14.4, report reasons list, level names. Figma 01 screen visually matches in light and dark (layout, chips, results card "20 planes de hasta ₡5.000 / 14 gratis", glass tab bar, pins, clusters).
- Navigation: routes only in `src/app`; no `ios/` or `android/`; 5 `NativeTabs`; formSheet with half/full detents (Android <= 3); Detalle -> Cómo llegar / Verificación / Reportar / Login use `router.replace` (FR-1.3); login and Android review composer are full-screen modals; account icon (iOS) / avatar (Android) opens Perfil.
- Location: foreground-only (`requestForegroundPermissionsAsync`, `blockedPermissions` has background location, coordinates are not persisted, only the chosen province); denied path shows the banner plus province picker; works with a province.
- Directions: Apple Maps only on iOS, Google Maps and Waze URLs match PLAN §7, "Recordar mi elección" and default app in Ajustes, `LSApplicationQueriesSchemes` set. No transit routing.
- Data layer: screens never import `MockApi` (they use `src/data/queries`, `api` from `src/data/index.ts`); rules live in `src/domain/rules.ts`; the UI cannot mutate server state (JSON copies in `read`); swap point is one line; settings mirrored locally.
- Lists use `FlatList` with `initialNumToRender` and `windowSize` (virtualized); clusters via supercluster with viewport bounds (NFR-4/18); pin images pre-loaded once (`Image.loadAsync`); cluster icons cached by count.
- Docs checks: `expo-maps` plugin options (`requestLocationPermission`, `locationPermission`) match v58; `File.create({overwrite})` + `await file.write()` correct; `setNotificationHandler` uses `shouldShowBanner/List`; DATE trigger with `channelId` correct; `sheetAllowedDetents` / initial index / grabber / corner radius are valid options.
- Dark mode: all 11 screens drawn in both themes without errors or console errors; axe is clean in dark on `/lista`, `/guardados`, `/perfil`, `/aportar`.
- Dev tools: "Simular comunidad/sin conexión" only under `__DEV__` or `EXPO_PUBLIC_E2E`; `window.__mv` hooks are compiled only when the env flag is set.
- a11y: icon buttons carry `accessibilityLabel` (`IconButton`, `Tap` require `label`), `testID`s follow `screen.element[.id]`, header roles on titles, content text honours the Ajustes scale (`allowFontScaling={false}` plus manual `fontScale`).

## Suggested order of fixes
1. M1 and M2 (rule integrity and moderation correctness), with tests.
2. M5, M4, m1, m8 (data consistency, offline, notification switch, privacy cleanup).
3. M3 (contrast token) and m9/m10 (a11y).
4. M6/m11/m12 on a device (expo-maps camera, pin taps, undimmed detents, tab testIDs).
5. Commit and run the full e2e suite (M7), then m3 and m14/m15 clean-ups.
