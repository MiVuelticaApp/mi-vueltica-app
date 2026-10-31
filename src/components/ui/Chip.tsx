import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useAppTheme } from '@/theme/useAppTheme';
import { glassStyle } from './glass';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
  /** Over the map: glass fill when unselected. */
  glass?: boolean;
  /** Smaller option chip used in sheets (single-choice answers). */
  option?: boolean;
  accessibilityLabel?: string;
}

/** Filter / option chip. Selected = brand fill with on-primary label (switches label color in dark mode: NFR-12). */
export function Chip({ label, selected, onPress, icon, testID, glass, option, accessibilityLabel }: Props) {
  const { c, largerButtons, isAndroid } = useAppTheme();
  const h = (option ? 40 : 36) + (largerButtons ? 8 : 0);
  const bg = selected ? (isAndroid && !option ? c.primaryContainer : c.primary) : option ? c.priceContainer : glass ? undefined : c.surface;
  const fg = selected ? (isAndroid && !option ? c.onPrimaryContainer : c.onPrimary) : c.onSurface;
  return (
    <Tap
      testID={testID}
      label={accessibilityLabel ?? label}
      onPress={onPress}
      accessibilityState={{ selected: !!selected }}
      accessibilityRole={option ? 'radio' : 'button'}
      haptic
      style={[
        { minHeight: h, borderRadius: isAndroid ? 8 : 4, paddingLeft: 12, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg },
        !selected && !option ? { borderWidth: 1, borderColor: c.lineStrong } : null,
        glass && !selected ? glassStyle(c) : null,
        glass && !selected ? { borderColor: c.lineStrong } : null,
        selected && !option ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Icon name={selected && isAndroid && !option ? 'check' : icon} size={16} color={fg} /> : selected && isAndroid && !option ? <Icon name="check" size={16} color={fg} /> : null}
        <Text variant="label" color={fg}>{label}</Text>
      </View>
    </Tap>
  );
}
