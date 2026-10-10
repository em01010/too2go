import type { ConfigContext, ExpoConfig } from 'expo/config';

// Las variables EXPO_PUBLIC_* están disponibles en tiempo de configuración al correr `expo start`.
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Too2Go',
  slug: 'too2go',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'too2go',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'hn.too2go.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usamos tu ubicación para mostrarte las bolsas más cercanas.',
    },
    ...(googleMapsKey ? { config: { googleMapsApiKey: googleMapsKey } } : {}),
  },
  android: {
    package: 'hn.too2go.app',
    adaptiveIcon: {
      backgroundColor: '#F3F6F2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
    ...(googleMapsKey ? { config: { googleMaps: { apiKey: googleMapsKey } } } : {}),
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#2E7D5B',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Usamos tu ubicación para mostrarte las bolsas más cercanas.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
