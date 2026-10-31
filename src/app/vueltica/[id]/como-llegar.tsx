import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Switch } from '@/components/system/Switch';
import { type IconName } from '@/components/icons/Icon';
import { Group, Row } from '@/components/ui/Section';
import { Sheet, closeSheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useVuelticaDetail } from '@/data/queries';
import { formatDistance } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { availableApps, openDirections, type DirectionsApp } from '@/lib/directions';
import { useSettings } from '@/state/settings';
import { IconButton } from '@/components/ui/IconButton';

const META: Record<DirectionsApp, { title: string; hint: string; icon: IconName; bg: string; fg: string }> = {
  apple: { title: t.directions.apple, hint: t.directions.appleHint, icon: 'map', bg: '#34c759', fg: '#ffffff' },
  waze: { title: t.directions.waze, hint: t.directions.wazeHint, icon: 'directions', bg: '#33ccff', fg: '#ffffff' },
  google: { title: t.directions.google, hint: t.directions.googleHint, icon: 'pin', bg: '#ffffff', fg: '#ea4335' },
};

/** 12 Cómo llegar: Apple Maps (iOS only), Waze, Google Maps; "Recordar mi elección" (FR-8.x). */
export default function ComoLlegar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useVuelticaDetail(id);
  const v = q.data?.vuelticaView;
  const [remember, setRemember] = useState(false);
  const update = useSettings((s) => s.update);
  const choose = async (app: DirectionsApp) => {
    if (!v) return;
    if (remember) update({ rememberedDirections: app });
    const ok = await openDirections(app, v);
    if (!ok) toast(t.directions.openFailed);
    else closeSheet();
  };
  return (
    <Sheet testID="directions.sheet">
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" accessibilityRole="header">{t.directions.title}</Text>
          <Text variant="callout" color="labelSecondary" testID="directions.subtitle">{v ? t.directions.subtitle(v.name.split(':').pop()!.trim(), formatDistance(v.distanceKm)) : t.common.loading}</Text>
        </View>
        <IconButton testID="directions.close" icon="close" label={t.common.close} onPress={closeSheet} />
      </View>
      <Group>
        {availableApps().map((app, i, arr) => (
          <Row
            key={app}
            testID={`directions.${app}`}
            title={META[app].title}
            subtitle={META[app].hint}
            onPress={() => void choose(app)}
            chevron
            last={i === arr.length - 1}
            right={undefined}
            icon={META[app].icon}
            iconBg="primary"
          />
        ))}
      </Group>
      <View style={{ height: 12 }} />
      <Group>
        <Row title={t.directions.remember} last right={<Switch testID="directions.remember" accessibilityLabel={t.directions.remember} value={remember} onValueChange={setRemember} />} />
      </Group>
    </Sheet>
  );
}
