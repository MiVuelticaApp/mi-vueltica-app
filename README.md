# Mi VuelTica · Mobile app

Mobile app to discover free and low-cost places and events in Costa Rica on a map, with community reviews, verifications and moderation.

| Repository | What it is |
|---|---|
| **mi-vueltica-app** | Mobile app (iOS, Android and web) |
| [mi-vueltica-api](https://github.com/MiVuelticaApp/mi-vueltica-api) | REST API and MCP server |
| [mi-vueltica-web](https://github.com/MiVuelticaApp/mi-vueltica-web) | Marketing website |
| [mi-vueltica-crawler](https://github.com/MiVuelticaApp/mi-vueltica-crawler) | Event crawler (private) |

## Features

- Map and lists of places and events, filtered by price, audience, accessibility, distance and visible area.
- Plan detail with photos, opening hours, directions, reviews and community verifications ("¿Sigue siendo gratis?").
- Saved plans and event reminders.
- Community suggestions, moderated by votes, with a warning from the automatic AI check.
- "Armame el plan": an ordered itinerary for a time window and a number of stops.
- Profile with points and level, reports, blocking people, push notifications and a privacy notice (Ley 8968).
- Without `EXPO_PUBLIC_API_URL` it runs offline on demo data.

## Tech stack

- Expo SDK 58, React Native and TypeScript
- Expo Router (routes in `src/app/`)
- TanStack Query and zustand
- Jest (unit tests) and Playwright (end-to-end tests on the web export)
- EAS Build for builds and store submissions

## Requirements

- Node.js 22
- A development build for Google Sign-In and push notifications (they do not run in Expo Go)

## Getting started

```bash
npm install
cp .env.example .env
npx expo start
```

Open it on Android, iOS or web from the Expo terminal. To test on a phone against a local API, put your LAN IP (not `localhost`) in `EXPO_PUBLIC_API_URL`.

## Commands

| Command | What it does |
|---|---|
| `npx expo start` | Development server |
| `npm run lint` | Lint (`expo lint`) |
| `npm run typecheck` | Type check (`tsc --noEmit`) |
| `npm test` | Unit tests (Jest) |
| `npm run e2e` | End-to-end tests (Playwright; builds the demo web export first) |
| `npx expo install <package>` | Add a dependency at an SDK-compatible version |

## Configuration

Variables in `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | mi-vueltica-api base URL, without `/api/v1`. Empty = demo data |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google web client id (required for Android sign-in) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google iOS client id |
| `EXPO_PUBLIC_IS_ON_REVIEW` | `true` / `1` only in app-store review builds: shows the "QA" login link (email + password, `POST /auth/qa`) |
| `GOOGLE_IOS_URL_SCHEME` | Reversed Google iOS client id (build time only) |
| `GOOGLE_MAPS_API_KEY` | Google Maps key for Android (build time only) |
| `EAS_PROJECT_ID` | EAS project id, required to register the push token |

## Project structure

```
src/
├── app/          # Screens and navigation (Expo Router)
├── components/   # UI components
├── config/       # Configuration (API, legal texts, social links)
├── data/         # HTTP client, DTOs, mappers and MockApi
├── domain/       # Types and rules (including the planner)
├── features/     # Feature logic
├── i18n/         # Costa Rican Spanish strings
├── lib/          # Utilities
├── state/        # Global state (zustand)
└── theme/        # Colors, typography and spacing
e2e/              # Playwright tests
docs/             # Plan, API integration, review and release guide
```

## Deployment

Builds run on EAS (profiles in `eas.json`):

```bash
npx eas-cli@latest build --profile preview      # internal APK for testers
npx eas-cli@latest build --profile production   # store builds
```

The full steps (EAS project, environment variables, Apple and Google accounts) are in [`docs/RELEASE.md`](docs/RELEASE.md).

## Documentation

- [`AGENTS.md`](AGENTS.md): project conventions
- [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md): how the app uses each API route
- [`docs/RELEASE.md`](docs/RELEASE.md): builds and releases
- [`docs/PLAN.md`](docs/PLAN.md) and [`docs/REVIEW.md`](docs/REVIEW.md): implementation plan and review
