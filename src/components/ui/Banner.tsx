import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useAppTheme } from '@/theme/useAppTheme';
import { Tap } from './Tap';
import { Text } from './Text';

/** Inline notice: info (blue, e.g. reminder / community review) or warning (yellow, e.g. Sin conexión). */
export function Banner({ tone = 'info', icon, text, action, onAction, testID, actionTestID, children }: {
  tone?: 'info' | 'warning'; icon: IconName; text: string; action?: string; onAction?: () => void; testID?: string; actionTestID?: string; children?: ReactNode;
}) {
  const { c } = useAppTheme();
  const bg = tone === 'warning' ? c.staleContainer : c.primaryContainer;
  const fg = tone === 'warning' ? 'stale' : 'onPrimaryContainer';
  return (
    <View testID={testID} accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, padding: 14, borderRadius: 16, backgroundColor: bg }}>
      <Icon name={icon} size={22} color={fg} />
      <View style={{ flex: 1 }}>
        <Text variant="callout" color={fg} style={{ lineHeight: 20 }}>{text}</Text>
        {children}
      </View>
      {action ? (
        <Tap testID={actionTestID} label={action} onPress={onAction} hitSlop={8}>
          <Text variant="callout" bold color={tone === 'warning' ? 'primary' : 'onPrimaryContainer'}>{action}</Text>
        </Tap>
      ) : null}
    </View>
  );
}
