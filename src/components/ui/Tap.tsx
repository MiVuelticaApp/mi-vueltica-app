import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export interface TapProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  /** Required for icon-only controls (NFR-13). */
  label?: string;
}

/** Pressable with pressed feedback, optional haptic and a mandatory-by-convention accessibility label. */
export function Tap({ style, haptic, label, onPress, accessibilityRole = 'button', ...rest }: TapProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed ? { opacity: 0.7 } : null]}
      {...rest}
    />
  );
}
