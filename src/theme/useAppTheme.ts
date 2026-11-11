import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { useSettings } from '@/state/settings';
import { type ColorTokens, darkColors, highContrast, lightColors } from './tokens';

export interface AppTheme {
  c: ColorTokens;
  dark: boolean;
  /** Multiplier applied to every content font size (system font scale or the Ajustes slider). */
  fontScale: number;
  largerButtons: boolean;
  moreContrast: boolean;
  reduceMotion: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  /** Minimum touch target: 44 normally, 56 with "Botones más grandes". */
  hit: number;
}

/** System color scheme + user override (system/on/off) + high contrast, plus accessibility prefs. */
export function useAppTheme(): AppTheme {
  const system = useColorScheme();
  const s = useSettings((x) => x.settings);
  const { fontScale: systemFontScale } = useWindowDimensions();
  const [osReduce, setOsReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => mounted && setOsReduce(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setOsReduce(v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const dark = s.darkMode === 'on' ? true : s.darkMode === 'off' ? false : system === 'dark';
  return useMemo(() => {
    const base = dark ? darkColors : lightColors;
    const c = s.moreContrast ? highContrast(base, dark) : base;
    const largerButtons = s.largerButtons;
    return {
      c,
      dark,
      fontScale: s.textScale ?? systemFontScale ?? 1,
      largerButtons,
      moreContrast: s.moreContrast,
      reduceMotion: s.reduceMotion || osReduce,
      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
      isWeb: Platform.OS === 'web',
      hit: largerButtons ? 56 : 44,
    };
  }, [dark, s.moreContrast, s.largerButtons, s.textScale, s.reduceMotion, systemFontScale, osReduce]);
}
