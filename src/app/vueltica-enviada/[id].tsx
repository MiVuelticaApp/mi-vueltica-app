import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Section';
import { Text } from '@/components/ui/Text';
import { useVuelticaDetail } from '@/data/queries';
import { formatTime } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

function Step({ done, active, title, sub, testID }: { done?: boolean; active?: boolean; title: string; sub: string; testID: string }) {
  const { c } = useAppTheme();
  return (
    <View testID={testID} accessibilityState={{ checked: !!done }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.primary : active ? c.event : 'transparent', borderWidth: done || active ? 0 : 2, borderColor: c.outline }}>
        {done ? <Icon name="check" size={16} color={c.onPrimary} /> : active ? <Icon name="clock" size={16} color="#ffffff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body">{title}</Text>
        <Text variant="caption" color="labelSecondary">{sub}</Text>
      </View>
    </View>
  );
}

/** 11 Vueltica enviada: confirmation + status steps Enviado → En cola de moderación → Publicado (FR-11.4). */
export default function VuelticaEnviada() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const q = useVuelticaDetail(id);
  const v = q.data?.vuelticaView;
  const m = q.data?.moderation;
  const published = v?.status === 'publicada';
  return (
    <View testID="sent.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top + 24 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 16, alignItems: 'center', paddingBottom: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={52} color={c.onPrimary} />
        </View>
        <Text testID="sent.title" variant="display" align="center" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>{t.sent.title}</Text>
        <Text testID="sent.body" variant="body" color="labelSecondary" align="center" style={{ lineHeight: 24 }}>{v ? (published ? t.sent.published : t.sent.body(v.name)) : t.common.loading}</Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Group style={{ marginHorizontal: 0 }}>
            <Step testID="sent.step.sent" done title={t.sent.step1} sub={t.sent.step1Sub(v ? formatTime(new Date(v.createdAt)) : '')} />
            <View style={{ height: 1, backgroundColor: c.separator, marginLeft: 56 }} />
            <Step testID="sent.step.queue" done={published} active={!published} title={t.sent.step2} sub={m ? t.sent.step2Sub(m.votesFor + m.votesAgainst, m.votesNeeded) : ''} />
            <View style={{ height: 1, backgroundColor: c.separator, marginLeft: 56 }} />
            <Step testID="sent.step.published" done={published} title={t.sent.step3} sub={t.sent.step3Sub} />
          </Group>
        </View>
      </ScrollView>
      <View style={{ padding: 16, gap: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button testID="sent.mine" label={t.sent.seeMine} onPress={() => router.replace('/mis-vuelticas')} />
        <Button testID="sent.map" label={t.sent.backToMap} variant="glass" full onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}
