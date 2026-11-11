import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useAppTheme } from '@/theme/useAppTheme';
import type { ColorTokens } from '@/theme/tokens';
import { textStyle, type TypeVariant } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: keyof ColorTokens | (string & {});
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  /** Use the platform system font instead of the content font (tab labels, native chrome). */
  system?: boolean;
}

/** Content text in Ruta Clara (Atkinson Hyperlegible), scaled by system / Ajustes text size. */
export function Text({ variant = 'body', color = 'onSurface', align, bold, system, style, ...rest }: TextProps) {
  const { c, fontScale } = useAppTheme();
  const resolved = (c as unknown as Record<string, string>)[color as string] ?? color;
  const base = textStyle(variant, fontScale);
  return (
    <RNText
      allowFontScaling={false}
      {...rest}
      style={[
        base,
        system ? { fontFamily: undefined } : null,
        bold !== undefined ? { fontFamily: bold ? 'AtkinsonHyperlegible_700Bold' : 'AtkinsonHyperlegible_400Regular' } : null,
        { color: resolved as string, textAlign: align },
        style,
      ]}
    />
  );
}
