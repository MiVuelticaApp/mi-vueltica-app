# Backend integration (mi-vueltica-api)

The app talks to the backend only through `MiVuelticaApi` (`src/data/api.ts`). Two implementations exist and `src/data/index.ts` picks one:

| `EXPO_PUBLIC_API_URL` | Backend |
|---|---|
| unset (default), or `EXPO_PUBLIC_E2E=1` | `MockApi`, the deterministic in-app demo data (Jest, Playwright) |
| `https://…` | `HttpApi` against `mi-vueltica-api` (`/api/v1`) |

Copy `.env.example` to `.env`. Google/Apple sign-in need a **development build** (`npx expo prebuild`, `npx expo run:ios|android`); they do not run in Expo Go. `GOOGLE_IOS_URL_SCHEME` must be set when prebuilding so the Google plugin is added.

## Code map (`src/data/http/`)
- `client.ts` fetch wrapper: bearer token, 15 s timeout, `{ message }` errors mapped to the app's error classes (network → `OfflineError`, 401 → `AuthRequiredError` + sign-out, 403 `ForbiddenError`, 404 `NotFoundError`, 409 `ConflictError`, 400/422 `ValidationError`), `getAll` follows pagination.
- `tokenStore.ts` JWT in Keychain/Keystore (`expo-secure-store`); the sign-in provider is stored too because Apple account deletion needs it.
- `socialAuth.ts` native Sign in with Apple (`expo-apple-authentication`, iOS) and Google (`@react-native-google-signin/google-signin`, lazy-loaded).
- `HttpApi.ts` + `mappers.ts` the contract implementation. App ids are `p-<uuid>` (place), `e-<uuid>` (event), `s-<uuid>` (submission = a pending plan).
- `version.ts` calls `GET /system/min-frontend-version` on launch and shows a toast when the app is older.

## What is connected
Sign-in (`POST /auth/apple|google`), session (`GET /me`, cached for offline), sign-out (`POST /auth/logout`), delete account (`POST /me`, fresh Apple code for revocation), places and events lists/detail (radius search, filters applied client-side), categories, favorites (places), submissions (create, list mine, withdraw), moderation (approve/reject as MODERATOR/ADMIN), data export (assembled client-side).

## Gaps (the app is the source of truth; each is an issue on the API repo)
| Area | App behaviour today | Issue |
|---|---|---|
| Google audience on Android; email sign-in | Android Google login is rejected until the API accepts the web client id; email option hidden | [#35](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/35) |
| Price, free-for, accessibility, multi-audience | Neutral defaults (tier `hasta5000`); price filters cannot work; not sent on create | [#36](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/36) |
| Events: location, embedded place, geo filter, favorites | Events without a place are dropped; one request per place; events cannot be saved (`NotSupportedError`) | [#37](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/37) |
| Reviews | Empty list; writing rejected | [#38](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/38) (extends #15) |
| Verifications and reports | Rejected | [#39](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/39) |
| Submissions: province, created id, edit, reasons | Sends the province's central canton (`x01`); cannot open a published submission | [#40](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/40) |
| Photo upload | Photos are not sent | [#41](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/41) (follow-up to #12) |
| Profile and reputation | Points/counts are 0; moderators shown as level 3 | [#42](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/42) |
| Community moderation | Approve/reject by role; `votesNeeded` 1; no Reportadas, no Deshacer | [#43](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/43) |
| Export, settings sync, push | Local only | [#44](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/44) |

When an issue lands, replace the matching `unsupported(...)` / default in `HttpApi.ts` and the DTOs in `dto.ts` (which are hand-copied from the API's response interfaces).

## Not verified here
Everything was built against the API source and unit-tested with a mocked `fetch` (`src/data/http/__tests__`). It has **not** been run against a live API, and Apple/Google sign-in has not been run on a device (needs a development build, client ids and, for Apple, the capability on the bundle id `cr.mivueltica.app`).
