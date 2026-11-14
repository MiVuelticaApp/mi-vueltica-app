# Release checklist (#24)

How testers and the stores get the app. Each step says who does it; tick it in issue #24.

## Build profiles (`eas.json`)

| Profile | What it is | Command |
|---|---|---|
| `development` | Dev client (needs `npx expo start`), internal install | `npx eas-cli@latest build --profile development -p android\|ios` |
| `preview` | Standalone internal build: **APK** on Android, ad hoc on iOS (devices registered with `eas device:create`) | `npx eas-cli@latest build --profile preview -p android\|ios` |
| `production` | Store build, version code / build number auto-incremented by EAS | `npx eas-cli@latest build --profile production -p android\|ios`, then `eas submit` |

Expo Go cannot run the app (expo-maps, Google / Apple sign-in), so **usability testers install the `preview` build**
(APK link from EAS on Android, ad hoc or TestFlight on iOS). Plan B from the proposal: the web build
(`npx expo export -p web`) and the APK.

## One-time setup

- [ ] `npx eas-cli@latest init` (links the EAS project; it writes the project id) and set `EAS_PROJECT_ID` for builds.
- [ ] EAS environment variables (per environment, at expo.dev): `EXPO_PUBLIC_API_URL` (deployed API), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME`, `GOOGLE_MAPS_API_KEY`, `EAS_PROJECT_ID`.
      Without `EXPO_PUBLIC_API_URL` the build runs on the offline demo data.
- [ ] Apple Developer ($99): Sign in with Apple capability on `cr.mivueltica.app`; APNs key uploaded to EAS (push).
- [ ] Google Play ($25): new personal accounts need 20 testers for 14 days before production; use internal testing / the APK meanwhile. FCM v1 service account uploaded to EAS (push).
- [ ] Google Cloud: Android OAuth client with the EAS keystore SHA-1, iOS client, Web client (its id is the `webClientId`).

## Before each tester / store build

- [ ] API deployed with every "Pending deploy actions" item done (mi-vueltica-api AGENTS.md, issue #4).
- [ ] Sign in with Google (Android + iOS) and Apple (iOS) on a real device against the deployed API.
- [ ] Photo upload, block and report checked on a device (#15, #17).
- [ ] Store review: `TEST_LOGIN_ENABLED=true` in the API while in review (demo data is seeded), **off once approved**.
- [ ] Legal texts final (`LEGAL_FINAL = true`), privacy policy at a public URL in `PRIVACY_URL` (#18).
- [ ] Store listing: description, screenshots, privacy policy URL, contact `mivuelticacr@gmail.com`.
