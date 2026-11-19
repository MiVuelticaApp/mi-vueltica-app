import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mi VuelTica',
  slug: 'mi-vueltica', // must match the EAS project's slug
  version: '1.0.0',
  scheme: 'mivueltica',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'cr.mivueltica.app',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze', 'maps'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'cr.mivueltica.app',
    adaptiveIcon: {
      backgroundColor: '#1b3c8c',
      foregroundImage: './assets/adaptive-foreground.png',
      monochromeImage: './assets/adaptive-foreground.png',
    },
    predictiveBackGestureEnabled: false,
    // Foreground location only (NFR-15).
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/icon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0b2f7a', // the logo's own blue, so the artwork blends into the splash with no visible edge
        image: './assets/splash.png',
        imageWidth: 160,
        dark: { backgroundColor: '#0f1522', image: './assets/splash.png' },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Mi VuelTica usa tu ubicación solo mientras usás la app, para mostrarte planes cerca.',
      },
    ],
    // Mapbox: the public token is read at runtime from EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN (MAPBOX_DOWNLOADS_TOKEN is only for native SDK downloads).
    '@rnmapbox/maps',
    [
      'expo-image-picker',
      {
        photosPermission: 'Mi VuelTica necesita tus fotos para que puedas adjuntarlas a una vueltica o reseña.',
        cameraPermission: 'Mi VuelTica necesita la cámara para que puedas sacar fotos de una vueltica.',
      },
    ],
    'expo-notifications',
    'expo-secure-store',
    'expo-apple-authentication',
    // Google sign-in needs the reversed iOS client id as URL scheme; the plugin throws without it, so it is opt-in.
    ...(process.env.GOOGLE_IOS_URL_SCHEME
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }] as [string, object]]
      : []),
    'expo-sqlite',
    'expo-sharing',
    'expo-font',
  ],
  experiments: { typedRoutes: true },
  // EAS project id (from `eas init`); push (#22) needs it for getExpoPushTokenAsync. Not a secret.
  // EAS_PROJECT_ID overrides it, e.g. to point a build at another EAS project.
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID ?? 'd8df3d35-8553-4d34-8611-90d729705d38' } },
};

export default config;
