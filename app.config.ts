import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'MiVueltica',
  slug: 'mi-vueltica-app',
  version: '1.0.0',
  scheme: 'mivueltica',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'cr.mivueltica.app',
    supportsTablet: false,
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
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '' },
    },
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
        backgroundColor: '#1b3c8c',
        image: './assets/splash.png',
        imageWidth: 160,
        dark: { backgroundColor: '#0f1522', image: './assets/splash.png' },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'MiVueltica usa tu ubicación solo mientras usás la app, para mostrarte planes cerca.',
      },
    ],
    [
      'expo-maps',
      {
        requestLocationPermission: true,
        locationPermission:
          'MiVueltica usa tu ubicación solo mientras usás la app, para mostrarte planes cerca.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'MiVueltica necesita tus fotos para que puedas adjuntarlas a una vueltica o reseña.',
        cameraPermission: 'MiVueltica necesita la cámara para que puedas sacar fotos de una vueltica.',
      },
    ],
    'expo-notifications',
    'expo-sqlite',
    'expo-sharing',
    'expo-font',
  ],
  experiments: { typedRoutes: true },
};

export default config;
