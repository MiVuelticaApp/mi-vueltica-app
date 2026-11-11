import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Text } from './Text';

export function EmptyState({ icon, title, body, children, testID }: { icon: IconName; title: string; body?: string; children?: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32, gap: 10 }}>
      <Icon name={icon} size={56} color="labelTertiary" />
      <Text variant="title" align="center" accessibilityRole="header">{title}</Text>
      {body ? <Text variant="body" color="labelSecondary" align="center" style={{ lineHeight: 22 }}>{body}</Text> : null}
      {children ? <View style={{ gap: 12, marginTop: 8, alignSelf: 'stretch', alignItems: 'center' }}>{children}</View> : null}
    </View>
  );
}
