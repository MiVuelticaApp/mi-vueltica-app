import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { sheetOptions } from '@/components/ui/Sheet';
import { DialogHost } from '@/components/ui/Dialog';
import { ToastHost } from '@/components/ui/Toast';
import { t } from '@/i18n/es-CR';
import { Bootstrap } from '@/features/app/Bootstrap';
import { PrivacyRecheck } from '@/features/legal/PrivacyRecheck';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigator() {
  const { c, dark, reduceMotion } = useAppTheme();
  // "Reducir movimiento" (Ajustes or the OS setting, NFR-11): no push / fade / slide animations.
  const anim = <T extends string>(a: T) => (reduceMotion ? ('none' as const) : a);
  const onboarded = useSession((s) => s.onboarded);
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.groupedBackground, card: c.groupedBackground, text: c.onSurface, primary: c.primary, border: c.separator } };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Bootstrap />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.groupedBackground }, ...(reduceMotion ? { animation: 'none' as const } : null) }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="bienvenida" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          {/* Component kit: development builds only (review m14). */}
          <Stack.Protected guard={__DEV__ || process.env.EXPO_PUBLIC_E2E === '1'}>
            <Stack.Screen name="__kit" />
          </Stack.Protected>
          <Stack.Screen name="buscar" options={{ animation: anim('fade') }} />
          <Stack.Screen name="vueltica/[id]/index" options={sheetOptions([0.5, 1], 0, 0)} />
          <Stack.Screen name="vueltica/[id]/resenas" options={{ headerShown: true, title: t.reviews.title, headerBackTitle: t.common.back, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="vueltica/[id]/escribir-resena" options={Platform.OS === 'android' ? { presentation: 'fullScreenModal', animation: anim('slide_from_bottom') } : sheetOptions([1])} />
          <Stack.Screen name="vueltica/[id]/verificar" options={sheetOptions([0.5, 1])} />
          <Stack.Screen name="vueltica/[id]/reportar" options={sheetOptions([0.5, 1])} />
          <Stack.Screen name="vueltica/[id]/decidir" options={sheetOptions([1])} />
          <Stack.Screen name="vueltica/[id]/como-llegar" options={sheetOptions([0.5])} />
          <Stack.Screen name="filtros" options={sheetOptions([1])} />
          <Stack.Screen name="elegir-ubicacion" options={sheetOptions([1])} />
          <Stack.Screen name="login" options={{ presentation: Platform.OS === 'web' ? 'card' : 'fullScreenModal', animation: anim('slide_from_bottom') }} />
          <Stack.Screen name="vueltica-enviada/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="mis-vuelticas" options={{ headerShown: true, title: t.mine.title, headerBackTitle: t.profile.title, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="moderacion" options={{ headerShown: true, title: t.moderation.title, headerBackTitle: t.profile.title, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="ajustes" options={{ headerShown: true, title: t.settings.title, headerBackTitle: t.profile.title, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="bloqueados" options={{ headerShown: true, title: t.blocks.title, headerBackTitle: t.settings.title, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="normas" options={{ headerShown: true, title: t.rules.title, headerBackTitle: t.profile.title, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary, headerTitleStyle: { color: c.onSurface } }} />
          <Stack.Screen name="legal/[doc]" options={{ headerShown: true, title: '', headerBackTitle: t.common.back, headerStyle: { backgroundColor: c.groupedBackground }, headerTintColor: c.primary }} />
        </Stack.Protected>
      </Stack>
      <PrivacyRecheck />
      <ToastHost />
      <DialogHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });
  const settingsHydrated = useSettings((s) => s.hydrated);
  const sessionHydrated = useSession((s) => s.hydrated);
  const ready = (fontsLoaded || !!fontError) && settingsHydrated && sessionHydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <Navigator />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
