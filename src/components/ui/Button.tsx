import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useAppTheme } from '@/theme/useAppTheme';
import { glassStyle } from './glass';
import { Tap } from './Tap';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'text' | 'danger' | 'dark' | 'outline';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Fill the width (default true for primary/secondary/dark/outline). */
  full?: boolean;
  size?: 'regular' | 'compact';
}

/** Content button (Figma "iOS/Button"): primary = brand fill, glass = Liquid Glass capsule, text = link-style. */
export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, testID, accessibilityLabel, style, full, size = 'regular' }: Props) {
  const { c, largerButtons } = useAppTheme();
  const height = (size === 'compact' ? 40 : 50) + (largerButtons ? 8 : 0);
  const fill = variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'dark' ? c.onSurface : variant === 'secondary' ? c.primaryContainer : undefined;
  const fg =
    variant === 'primary' ? c.onPrimary : variant === 'danger' ? '#ffffff' : variant === 'dark' ? c.surface : variant === 'secondary' ? c.onPrimaryContainer : variant === 'text' ? c.primary : c.onSurface;
  const stretch = full ?? (variant !== 'text' && variant !== 'glass');
  return (
    <Tap
      testID={testID}
      label={accessibilityLabel ?? label}
      onPress={disabled || loading ? undefined : onPress}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      haptic
      style={[
        {
          minHeight: height, borderRadius: variant === 'text' ? 12 : height / 2, paddingHorizontal: variant === 'text' ? 8 : 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          alignSelf: stretch ? 'stretch' : 'center', backgroundColor: fill, opacity: disabled ? 0.45 : 1,
        },
        variant === 'glass' ? glassStyle(c) : null,
        variant === 'outline' ? { borderWidth: 1, borderColor: c.lineStrong } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} size={20} color={fg} /> : null}
        <Text variant="headline" color={fg} bold>{label}</Text>
      </View>}
    </Tap>
  );
}
