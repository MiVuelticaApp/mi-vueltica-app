import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Stack options for sheets: native formSheet with half/full detents; on web a transparent modal drawn by `Sheet`. */
export function sheetOptions(detents: number[] = [0.5, 1], initial = 0) {
  if (Platform.OS === 'web') return { presentation: 'transparentModal', headerShown: false, animation: 'fade' } as const;
  return {
    presentation: 'formSheet', headerShown: false, sheetAllowedDetents: detents.slice(0, 3), sheetInitialDetentIndex: initial,
    sheetGrabberVisible: true, sheetCornerRadius: 24,
  } as const;
}

export function closeSheet() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Sheet body: rounded panel with grabber on web; plain filled container on native (the OS draws the sheet). */
export function Sheet({ children, testID, tall }: { children: ReactNode; testID?: string; tall?: boolean }) {
  const { c } = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return <View testID={testID} style={{ flex: 1, backgroundColor: c.groupedBackground }}>{children}</View>;
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }} testID={testID ? `${testID}.overlay` : undefined}>
      <Pressable testID={testID ? `${testID}.backdrop` : 'sheet.backdrop'} accessibilityLabel={t.common.close} accessibilityRole="button" onPress={closeSheet} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim }} />
      <View testID={testID} style={{ height: Math.min(height * (tall ? 0.93 : 0.62), height - insets.top - 8), backgroundColor: c.groupedBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.labelTertiary }} />
        </View>
        {children}
      </View>
    </View>
  );
}

/** Sheet header: close (X) left, centered title, optional trailing action (✓ on iOS). */
export function SheetHeader({ title, onClose, right, left, testID, subtitle }: { title?: string; onClose?: () => void; right?: ReactNode; left?: ReactNode; testID?: string; subtitle?: string }) {
  return (
    <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 }}>
      <View style={{ width: 44 }}>{left ?? <IconButton testID={testID ? `${testID}.close` : 'sheet.close'} icon="close" label={t.common.close} onPress={onClose ?? closeSheet} />}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? <Text variant="headline" bold align="center" accessibilityRole="header" testID={testID ? `${testID}.title` : undefined}>{title}</Text> : null}
        {subtitle ? <Text variant="callout" color="labelSecondary" align="center" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
