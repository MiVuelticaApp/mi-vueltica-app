import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import type { ColorTokens } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';
import { Text } from './Text';

export type BadgeKind = 'free' | 'event' | 'place' | 'student' | 'senior' | 'verified' | 'stale' | 'price' | 'family' | 'pending' | 'danger' | 'info';

const KINDS: Record<BadgeKind, { fg: keyof ColorTokens; bg: keyof ColorTokens; icon?: IconName }> = {
  free: { fg: 'free', bg: 'freeContainer', icon: 'check' },
  event: { fg: 'event', bg: 'eventContainer', icon: 'ticket' },
  place: { fg: 'place', bg: 'placeContainer', icon: 'bench' },
  student: { fg: 'student', bg: 'studentContainer', icon: 'school' },
  senior: { fg: 'senior', bg: 'seniorContainer', icon: 'medal' },
  verified: { fg: 'free', bg: 'freeContainer', icon: 'check' },
  stale: { fg: 'stale', bg: 'staleContainer', icon: 'clock' },
  price: { fg: 'onPriceContainer', bg: 'priceContainer' },
  family: { fg: 'onPriceContainer', bg: 'priceContainer', icon: 'people' },
  pending: { fg: 'stale', bg: 'staleContainer', icon: 'clock' },
  danger: { fg: 'danger', bg: 'priceContainer', icon: 'alert' },
  info: { fg: 'onPrimaryContainer', bg: 'primaryContainer', icon: 'info' },
};

/** Compact status label (Figma "Badge"). */
export function Badge({ kind, label, testID, icon }: { kind: BadgeKind; label: string; testID?: string; icon?: IconName | null }) {
  const { c } = useAppTheme();
  const k = KINDS[kind];
  const ic = icon === null ? undefined : (icon ?? k.icon);
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: c[k.bg] as string, alignSelf: 'flex-start' }}>
      {ic ? <Icon name={ic} size={14} color={k.fg} /> : null}
      <Text variant="label" color={k.fg}>{label}</Text>
    </View>
  );
}
