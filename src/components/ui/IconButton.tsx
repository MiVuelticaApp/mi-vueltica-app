import type { StyleProp, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useAppTheme } from '@/theme/useAppTheme';
import { glassStyle } from './glass';
import { Tap } from './Tap';

interface Props {
  icon: IconName;
  label: string;
  onPress?: () => void;
  testID?: string;
  size?: number;
  prominent?: boolean;
  glass?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

/** Circular icon button (glass by default). `label` is the accessible name (required: NFR-13). */
export function IconButton({ icon, label, onPress, testID, size = 44, prominent, glass = true, disabled, style, color }: Props) {
  const { c, largerButtons } = useAppTheme();
  const s = size + (largerButtons ? 8 : 0);
  return (
    <Tap
      testID={testID}
      label={label}
      onPress={disabled ? undefined : onPress}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      haptic
      style={[
        { width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 },
        prominent ? { backgroundColor: c.primary } : glass ? glassStyle(c) : null,
        style,
      ]}
    >
      <Icon name={icon} size={prominent ? 22 : 20} color={color ?? (prominent ? c.onPrimary : 'onSurface')} />
    </Tap>
  );
}
