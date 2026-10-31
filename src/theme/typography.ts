import { Platform, type TextStyle } from 'react-native';
import { fonts } from './tokens';

/** Ruta Clara content styles (Atkinson Hyperlegible). Sizes/line-heights from Figma. */
export type TypeVariant = 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'label' | 'display';

export const typeScale: Record<TypeVariant, { size: number; line: number; bold: boolean; tracking: number }> = {
  display: { size: 32, line: 36, bold: true, tracking: -0.3 },
  title: { size: 22, line: 28, bold: true, tracking: 0 },
  headline: { size: 17, line: 22, bold: true, tracking: 0 },
  body: { size: 17, line: 26, bold: false, tracking: 0 },
  callout: { size: 15, line: 20, bold: false, tracking: 0 },
  caption: { size: 13, line: 18, bold: false, tracking: 0 },
  label: { size: 13, line: 16, bold: true, tracking: 0.13 },
};

export function textStyle(variant: TypeVariant, fontScale = 1): TextStyle {
  const t = typeScale[variant];
  return {
    fontFamily: t.bold ? fonts.bold : fonts.regular,
    fontSize: t.size * fontScale,
    lineHeight: t.line * fontScale,
    letterSpacing: t.tracking,
  };
}

/** Platform system font, used by native-looking chrome (tab labels, iOS search). */
export const systemFont = Platform.select({ ios: 'System', android: 'Roboto', default: 'system-ui' });
