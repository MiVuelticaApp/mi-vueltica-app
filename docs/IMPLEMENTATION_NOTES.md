# Implementation notes (frontend v1)

Everything runs against `MockApi` (`src/data/mock`) behind the `MiVuelticaApi` interface (`src/data/api.ts`). Swap the backend in `src/data/index.ts`.

## Commands
- `npm test` unit tests (jest-expo): domain rules, filters, formatters, MockApi (seed counts, gates, moderation, offline queue).
- `npm run e2e` builds the web export (`EXPO_PUBLIC_E2E=1`, `EXPO_PUBLIC_FAKE_NOW=2026-10-20T10:00:00-06:00`), serves it on :8081 and runs Playwright (light + dark projects; `*.denied.spec.ts` runs in the `denied` project with no geolocation permission). `E2E_SKIP_BUILD=1` reuses `./dist`.
- Specs must clear storage **once per test** (see `e2e/smoke.spec.ts`): an init script that clears on every load wipes state on `page.goto`.
- E2E hooks on web when `EXPO_PUBLIC_E2E=1`: `window.__mv.{setOffline(bool), simulate({kind:'votes'|'verifications'|'reports',...}), reset()}`; the dev rows in Ajustes expose the same actions.
- `/__kit` is a dev component gallery.

## Assumptions / deviations
- **Dates**: Figma says "Viernes 24 de octubre" but 24 Oct 2026 is a Saturday; dates are formatted from the real calendar ("Sábado 24 de octubre"). Seed events are relative to the fake clock.
- **Votes needed**: rules are followed literally (author level >= 3 needs 3 votes). Ana (level 3) therefore shows "0 de 3 votos" after submitting, not "0 de 5" (PLAN N1). Her seeded pending "Feria de emprendedores UCR" is 2 of 3. José A.'s identically named plan sits in the moderation queue (3 of 5).
- Seed: 20 published plans within 5 km (14 free, 18 eligible for students), 40+ plans in total, 4 new + 2 reported moderation items. The reported "Parque del Este · mirador" is hidden (3 reports); "Museo de los Niños" has 2 reports. Reports queue threshold: >= 2 reports.
- "Cerca de mí" (Lista) applies the distance limit; turning it off shows all provinces. The map always applies it.
- Search (19) is its own route `/buscar` (same filters). Name-only matching so "museo" gives 2 results.
- Sheets: native `formSheet` with detents; on web a transparent modal drawn by `Sheet` (web is a test target only). Web tab bar is a JS bar; native uses `NativeTabs`.
- Controls: `@expo/ui` universal Switch / Slider / Checkbox / Picker (menu) are used on all platforms. Text input, segmented control, chips and buttons are custom RN (the universal TextInput keeps native state, which does not fit controlled forms; no universal segmented control). Dates use `@react-native-community/datetimepicker` (iOS compact, Android dialog) and `<input type=date|time>` on web.
- Icons: `@expo/vector-icons` (Material Community) instead of the 37 Figma icons; tab icons are SF Symbols / Material Symbols.
- Map pins: Figma exports were opaque on white; the white background was removed programmatically to get transparent PNGs. `expo-maps` is untested on device (no native build here); `MapView.tsx` falls back to the image map if the module is missing.
- Map art base is the Figma "Map Base" raster for web/fallback.
- Android adaptive icon: foreground and monochrome both use the logo mark (`assets/adaptive-foreground.png`), background #1b3c8c; the designer flagged the monochrome silhouette as a rough approximation.
- Dark tokens use Figma values (surface #0f1522, senior/stale container #3a2e00, price container #1e2533, place container #0b2f1c).
- Level thresholds, penalties, 72 h flag, socials, BORRADOR legal screens, notification copy: PLAN §8 placeholders.
- Reminder time 9:00 a.m. one day before (changeable 1/2/3/7 days in Ajustes / Guardados "Cambiar").
- Verification of price counts from Level 2 only; guests can verify/report but earn no points; reports are de-duplicated per device.
- Offline: persisted react-query cache (list/detail/saved/recent), banner + saved/recent cards, queued verifications sent on reconnect; dev switch "Simular sin conexión".

## GAPS · v1 coverage (docs/GAPS_FIGMA.md)
Copy aligned with Figma for: toasts (G07), gate texts (G02b), delete-account dialog and data-ready dialog (G11), notification pre-prompt (G11g), dark tokens. Implemented as functional equivalents: signed-out Perfil/Guardados/Aportar, email sign-in with validation, category menu, location picker, date/time pickers, price validation, photo add/remove/limit, discard confirmation, Mis vuelticas with withdraw, Detalle states (pending/hidden/rejected, skeleton, error), error and empty states, moderation locked state, reminder/price/directions dialogs, filter date range.
Not implemented (visual follow-up): G04i exact dialog styling, G05d edit pending vuelticas, G06e gallery pager counter ("1 de 4"), G10b moderation item detail screen, G13c "Buscar en esta zona", G14 "No encontramos una app de mapas" sheet, G18 share landing, G20 rejection reason picker and "voto en contra de la mayoría" feedback, G16 variants beyond the settings (largest text/buttons/contrast are supported via Ajustes).
