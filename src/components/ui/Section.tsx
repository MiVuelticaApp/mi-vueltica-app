import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import type { ColorTokens } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';
import { Tap } from './Tap';
import { Text } from './Text';

export function SectionHeader({ title, testID, right }: { title: string; testID?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 6 }}>
      <Text testID={testID} accessibilityRole="header" variant="caption" color="labelSecondary" style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{title}</Text>
      {right}
    </View>
  );
}

/** Inset grouped list container (rounded white card with separators). */
export function Group({ children, testID, style }: { children: ReactNode; testID?: string; style?: object }) {
  const { c } = useAppTheme();
  return <View testID={testID} style={[{ marginHorizontal: 16, borderRadius: 16, backgroundColor: c.groupedSecondary, overflow: 'hidden' }, style]}>{children}</View>;
}

export function Separator({ inset = 16 }: { inset?: number }) {
  const { c } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: c.separator, marginLeft: inset }} />;
}

interface RowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  iconBg?: keyof ColorTokens;
  iconColor?: string;
  onPress?: () => void;
  chevron?: boolean;
  right?: ReactNode;
  destructive?: boolean;
  testID?: string;
  last?: boolean;
  accessibilityLabel?: string;
  titleColor?: keyof ColorTokens;
}

/** Grouped-list row: optional colored icon tile, title/subtitle, trailing value/chevron/control. */
export function Row({ title, subtitle, value, icon, iconBg = 'primary', iconColor = '#ffffff', onPress, chevron, right, destructive, testID, last, accessibilityLabel, titleColor }: RowProps) {
  const { c, hit } = useAppTheme();
  const body = (
    <View style={{ minHeight: Math.max(hit, 48), flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
      {icon ? (
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c[iconBg] as string, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="body" color={destructive ? 'danger' : (titleColor ?? 'onSurface')} style={{ lineHeight: 22 }}>{title}</Text>
        {subtitle ? <Text variant="caption" color="labelSecondary">{subtitle}</Text> : null}
      </View>
      {value ? <Text variant="body" color="labelSecondary">{value}</Text> : null}
      {right}
      {chevron ? <Icon name="chevronRight" size={20} color="labelTertiary" /> : null}
    </View>
  );
  return (
    <>
      {onPress ? (
        <Tap testID={testID} label={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')} onPress={onPress}>{body}</Tap>
      ) : (
        <View testID={testID}>{body}</View>
      )}
      {last ? null : <Separator inset={icon ? 60 : 16} />}
    </>
  );
}
