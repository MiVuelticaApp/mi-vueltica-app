# Backend integration (mi-vueltica-api)

The app talks to the backend only through `MiVuelticaApi` (`src/data/api.ts`). Two implementations exist and `src/data/index.ts` picks one:

| `EXPO_PUBLIC_API_URL` | Backend |
|---|---|
| unset (default), or `EXPO_PUBLIC_E2E=1` | `MockApi`, the deterministic in-app demo data (Jest, Playwright) |
| `https://…` | `HttpApi` against `mi-vueltica-api` (`/api/v1`) |

Copy `.env.example` to `.env`. Google/Apple sign-in need a **development build** (`npx expo prebuild`, `npx expo run:ios|android`); they do not run in Expo Go. `GOOGLE_IOS_URL_SCHEME` must be set when prebuilding so the Google plugin is added.

## Code map (`src/data/http/`)
- `client.ts` fetch wrapper: bearer token, extra headers (`X-Device-Id`), multipart bodies, 15 s timeout, `{ message }` errors mapped to the app's error classes (network → `OfflineError`, 401 → `AuthRequiredError` + sign-out, 403 `ForbiddenError`, 404 `NotFoundError`, 409 `ConflictError`, 400/413/415/422 `ValidationError`), `getAll` follows pagination.
- `tokenStore.ts` JWT in Keychain/Keystore (`expo-secure-store`); the sign-in provider is stored too because Apple account deletion needs it.
- `socialAuth.ts` native Sign in with Apple (`expo-apple-authentication`, iOS) and Google (`@react-native-google-signin/google-signin`, lazy-loaded).
- `uploads.ts` `POST /uploads` (multipart `file`; React Native streams the picked URI, web sends a Blob). Returns the durable URL the other bodies take.
- `HttpApi.ts` + `mappers.ts` the contract implementation. App ids are `p-<uuid>` (place), `e-<uuid>` (event), `s-<uuid>` (submission = a pending plan).
- `dto.ts` wire types, hand-copied from the API's `*/responses` interfaces.
- `version.ts` calls `GET /system/min-frontend-version` on launch and shows a toast when the app is older.

## What is connected
| Area | Endpoints |
|---|---|
| Sign-in, session, sign-out, delete account | `POST /auth/apple\|google`, `GET /me` (cached for offline), `POST /auth/logout`, `POST /me` (fresh Apple code for revocation) |
| Profile (#42) | `GET /me`: `province`, `createdAt` (Miembro desde), `points`, `counts`. Picking a province (Bienvenida) → `PUT /me` `provinceId` (INEC 1-7, same order as `PROVINCES` in `mappers.ts`); if the account has none yet, the device's choice is sent on login |
| Reputation (#42) | `GET /me/reputation` → level / next level / progress / `recent` (names and perk texts stay in `config/levels.ts`); `minorityModerator` is a `ReputationKind` |
| Lists and detail | `GET /places`, `GET /events` (radius, `q`, `maxPrice` / `students` / `seniors` / `families` / `wheelchair` sent as a server-side pre-filter; the app re-applies its rules), `GET /places\|events/:id` (rating distribution, verification summary, `isFavorite`, `isMine`, gallery) |
| Price, free-for, audiences, accessibility (#36) | read from every place/event; sent on suggestions. An unknown price (`null`) is shown as the "hasta ₡5.000" tier |
| Events (#37) | own location or the place's (resolved `latitude`/`longitude`); no N+1; saveable (`PUT/DELETE /events/:id/favorite`); local reminders for saved events |
| Saved | `GET /me/favorites` (places and events), `PUT/DELETE /places\|events/:id/favorite` |
| Reviews (#38) | `GET /places\|events/:id/reviews` (`recientes` → `-createdAt`, `fotos` → `withPhotos` + `-photoCount`, `utiles` → `-usefulCount`, `audience`), `POST` (photos uploaded first), "útil" toggle `POST/DELETE /reviews/:id/useful` |
| Verifications and reports (#39) | `POST /places\|events/:id/verifications` and `/reports`; guests send `X-Device-Id` (random id kept on the device); verifications answered offline are queued and sent when back online; a second report → `DuplicateReportError` |
| Suggestions (#40, #41) | `POST /me/submissions` with price fields, photos (`POST /uploads`), the event's own location and the opening hours parsed from the form's text (`parseOpeningHours`; omitted when it cannot be read). An approved one opens the place/event it became (`created`). Rejections show `rejectionMessage` |
| Community moderation (#43) | `GET /moderation/queue` (Nuevas + Reportadas, opened by level 3+ or team role; 403 → "locked" screen), `POST/DELETE /moderation/submissions\|places\|events/:id/vote` (Deshacer while pending; 409 after a decision → toast). Team roles see the entry at any level. Pending pins for moderators come from the queue |
| Data export | assembled client-side from `/me`, `/me/favorites`, `/me/submissions`, `/me/reviews`, `/me/reputation` |

## Remaining gaps
| Area | App behaviour today | Where |
|---|---|---|
| Email sign-in | Hidden (product decision on API #35: Google/Apple only) | — |
| Canton of a suggested place | The form collects a province; the app sends its central canton (`x01`). A canton picker (`GET /provinces?include=cantons`) is still to do | API #40 note |
| Author's vote tally | `GET /me/submissions` has no votes, so "Mis vuelticas" shows 0 of N (N = 5, or 3 from level 3) until it is decided | API #43 |
| Edit a pending suggestion | `PUT /me/submissions/:id` exists; the app has no edit screen yet | — |
| Withdraw a published plan | `NotSupportedError` (no API route) | — |
| Export, settings sync, push | Export assembled client-side; settings local; no push token registered (`POST /me/devices` exists, needs an EAS project id + FCM/APNs) | [API #44](https://github.com/MiVuelticaApp/mi-vueltica-api/issues/44) |

#42 (reputation) and #43 (community moderation) need the API's PRs #61 and #62 deployed. Against an older API, `GET /me/reputation` (404) falls back to the points on `/me` (or 0) and moderation calls fail.

## Testing against a live API
`src/data/http/__tests__/live.api.test.ts` drives the real `HttpApi` against a running API (guest list/detail/verify/report, profile and province, saved places/events and reminders, reviews with a photo and "útil", a suggestion with price and photo published by five level-3 votes, a reported plan hidden by votes, export, sign-out). It is skipped unless `MV_LIVE_API` is set and runs in a plain Node environment so the real `fetch` is used:

```bash
MV_LIVE_API=http://127.0.0.1:3000 MV_LIVE_TOKENS=./tokens.json npx jest -c jest.live.config.js
```

`tokens.json` maps `author`, `v1`..`v5` (users with at least 120 points), and `admin` (role ADMIN) to `{ id, token }`: JWTs signed with the API's `JWT_SECRET` (payload `{ id, email }`) for users inserted in that database. Use a disposable database: the test creates and hides content. The API needs MariaDB/MySQL and an S3 endpoint (SeaweedFS, or any S3 stand-in) for the photo uploads.

Last run: 2026-11-13, API branch `feat/issue-43-community-voting` (includes #42) on MariaDB 10.11, 7/7 passing. Apple/Google sign-in itself still needs a development build on a device (client ids and, for Apple, the capability on the bundle id `cr.mivueltica.app`).
