import { Platform, type ViewStyle } from 'react-native';
import type { ColorTokens } from '@/theme/tokens';

/** "Liquid Glass" material: translucent fill, hairline stroke, soft shadow (blur on web). */
export function glassStyle(c: ColorTokens): ViewStyle {
  return {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassStroke,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as ViewStyle) : null),
  };
}
