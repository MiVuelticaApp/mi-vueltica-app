/** Design tokens, named after the Figma variables (file hK6ZmxpUjxlz7NT3fxoFVd). */
export type ColorTokens = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  place: string;
  placeContainer: string;
  event: string;
  eventContainer: string;
  free: string;
  freeContainer: string;
  student: string;
  studentContainer: string;
  senior: string;
  seniorContainer: string;
  stale: string;
  staleContainer: string;
  priceContainer: string;
  onPriceContainer: string;
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  lineStrong: string;
  glass: string;
  glassStroke: string;
  danger: string;
  success: string;
  labelPrimary: string;
  labelSecondary: string;
  labelTertiary: string;
  separator: string;
  fillTertiary: string;
  background: string;
  groupedBackground: string;
  groupedSecondary: string;
  segmentThumb: string;
  scrim: string;
  map: { land: string; road: string; roadMajor: string; park: string; water: string };
};

export const lightColors: ColorTokens = {
  primary: '#1b3c8c',
  onPrimary: '#ffffff',
  primaryContainer: '#dfe6f6',
  onPrimaryContainer: '#0f2457',
  place: '#0b6b3a',
  placeContainer: '#d9efe2',
  event: '#b8321a',
  eventContainer: '#fadfd8',
  free: '#0b6b3a',
  freeContainer: '#d9efe2',
  student: '#5a2d91',
  studentContainer: '#ede3f8',
  senior: '#6e4a00',
  seniorContainer: '#fff4cc',
  stale: '#6e4a00',
  staleContainer: '#fff4cc',
  priceContainer: '#e6e9ee',
  onPriceContainer: '#0b1220',
  surface: '#ffffff',
  surfaceVariant: '#f1f3f6',
  onSurface: '#0b1220',
  onSurfaceVariant: '#3e4857',
  outline: '#c4cad3',
  lineStrong: '#4a5361',
  glass: '#ffffffb8',
  glassStroke: '#ffffffe5',
  danger: '#b3261e',
  success: '#0b6b3a',
  labelPrimary: '#000000',
  labelSecondary: '#5c5c63',
  labelTertiary: '#3c3c434d',
  separator: '#3c3c431f',
  fillTertiary: '#7676801f',
  background: '#ffffff',
  groupedBackground: '#f2f2f7',
  groupedSecondary: '#ffffff',
  segmentThumb: '#ffffff',
  scrim: '#00000066',
  map: { land: '#efefea', road: '#ffffff', roadMajor: '#f5dda0', park: '#c9e2c3', water: '#a8cdeb' },
};

export const darkColors: ColorTokens = {
  primary: '#9db6ff',
  onPrimary: '#05080f',
  primaryContainer: '#16264f',
  onPrimaryContainer: '#dfe6f6',
  place: '#6fd79c',
  placeContainer: '#0f2e1d',
  event: '#ff9a86',
  eventContainer: '#43140b',
  free: '#6fd79c',
  freeContainer: '#0b2f1c',
  student: '#d2b8ff',
  studentContainer: '#2b1747',
  senior: '#ffd24d',
  seniorContainer: '#3a2e00',
  stale: '#ffd24d',
  staleContainer: '#3a2e00',
  priceContainer: '#1e2533',
  onPriceContainer: '#f4f6fa',
  surface: '#0f1522',
  surfaceVariant: '#1e2533',
  onSurface: '#f4f6fa',
  onSurfaceVariant: '#c3cad5',
  outline: '#3a4352',
  lineStrong: '#aab3c0',
  glass: '#1c2230b8',
  glassStroke: '#ffffff1f',
  danger: '#ffb4ab',
  success: '#6fd79c',
  labelPrimary: '#ffffff',
  labelSecondary: '#ebebf599',
  labelTertiary: '#ebebf54d',
  separator: '#54545880',
  fillTertiary: '#7676803d',
  background: '#000000',
  groupedBackground: '#000000',
  groupedSecondary: '#1c1c1e',
  segmentThumb: '#4a5263',
  scrim: '#000000aa',
  map: { land: '#161b24', road: '#2a3240', roadMajor: '#3a3420', park: '#163322', water: '#12304d' },
};

/** High-contrast overrides (Ajustes → Aumentar contraste). */
export const highContrast = (c: ColorTokens, dark: boolean): ColorTokens => ({
  ...c,
  onSurfaceVariant: dark ? '#ffffff' : '#000000',
  labelSecondary: dark ? '#ffffffe6' : '#000000e6',
  outline: dark ? '#ffffff' : '#000000',
  lineStrong: dark ? '#ffffff' : '#000000',
  separator: dark ? '#ffffffcc' : '#000000cc',
  primary: dark ? '#c9d6ff' : '#0f2457',
});

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { chip: 8, card: 12, sheet: 24, button: 12, pill: 999 } as const;

export const fonts = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
} as const;
