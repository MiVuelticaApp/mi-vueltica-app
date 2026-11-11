import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPreview } from '@/components/map/MapPreview';
import { Button } from '@/components/ui/Button';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import type { Province } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { requestAndLocate } from '@/lib/location';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** 08 Bienvenida y ubicación: explain location use, ask permission, or pick a province / skip (FR-2.x). */
export default function Bienvenida() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const finish = (province: Province | null) => {
    useSession.getState().setProvince(province);
    useSession.getState().setOnboarded(true);
    router.replace('/');
  };

  const allow = async () => {
    setBusy(true);
    const res = await requestAndLocate();
    setBusy(false);
    if (res === 'granted') {
      useSession.getState().setProvince(null);
      useSession.getState().setOnboarded(true);
      router.replace('/');
    } else setDenied(true);
  };

  return (
    <View testID="welcome.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }} style={{ flex: 1 }}>
        <MapPreview height={210} withUser pins={[{ x: 18, y: 20, kind: 'lugar' }, { x: 42, y: 56, kind: 'evento' }, { x: 84, y: 8, kind: 'lugar' }, { x: 62, y: 100, kind: 'evento' }, { x: 26, y: 124, kind: 'lugar' }]} />
        <Text variant="display" accessibilityRole="header" testID="welcome.title" style={{ fontSize: 34 }}>{t.welcome.title}</Text>
        <Text variant="body" color="labelSecondary" style={{ lineHeight: 24 }} testID="welcome.body">{t.welcome.body}</Text>
        <Text variant="caption" color="labelSecondary" align="center" style={{ textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 8 }} testID="welcome.zoneHint">
          {denied ? t.welcome.deniedHint : t.welcome.chooseZone}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {t.provinces.map((p) => (
            <Tap key={p} testID={`welcome.province.${p}`} label={p} onPress={() => finish(p)} haptic style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 4, justifyContent: 'center', backgroundColor: c.priceContainer }}>
              <Text variant="label" color="onSurface">{p}</Text>
            </Tap>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Button testID="welcome.allow" label={t.welcome.allow} icon="locate" onPress={allow} loading={busy} />
        <Button testID="welcome.notNow" label={t.welcome.notNow} variant="text" onPress={() => finish(null)} />
      </View>
    </View>
  );
}
