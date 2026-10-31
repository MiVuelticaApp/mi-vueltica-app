import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityCard } from '@/components/ui/ActivityCard';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Segmented';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useSaved, useToggleSave } from '@/data/queries';
import type { SavedItem } from '@/data/api';
import { OfflineList } from '@/features/list/ResultsList';
import { ReminderPicker } from '@/features/saved/ReminderPicker';
import { daysUntil } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useIsOffline } from '@/state/network';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';

type Seg = 'todo' | 'lugares' | 'eventos';

function groupOf(i: SavedItem): 'week' | 'month' | 'later' | 'places' {
  const v = i.vuelticaView;
  if (v.type === 'lugar' || !v.startAt) return 'places';
  const start = new Date(v.startAt);
  const days = daysUntil(start, now());
  if (days <= 7) return 'week';
  const n = now();
  const nextMonth = (n.getMonth() + 1) % 12;
  return start.getMonth() === nextMonth ? 'month' : 'later';
}

/** 13 Guardados: Todo / Lugares / Eventos, reminder note, groups Esta semana / Próximo mes, verification status. */
export default function GuardadosScreen() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.userLoaded);
  const q = useSaved();
  const toggle = useToggleSave();
  const offset = useSettings((s) => s.settings.reminderOffsetDays);
  const offline = useIsOffline();
  const [seg, setSeg] = useState<Seg>('todo');
  const [picker, setPicker] = useState(false);

  const sections = useMemo(() => {
    const items = (q.data ?? []).filter((i) => seg === 'todo' || (seg === 'lugares' ? i.vuelticaView.type === 'lugar' : i.vuelticaView.type === 'evento'));
    const order = ['week', 'month', 'later', 'places'] as const;
    const titles = { week: t.saved.thisWeek, month: t.saved.nextMonth, later: t.saved.later, places: t.saved.places2 };
    return order
      .map((g) => ({ key: g, title: titles[g], data: items.filter((i) => groupOf(i) === g).sort((a, b) => (a.vuelticaView.startAt ?? '').localeCompare(b.vuelticaView.startAt ?? '')) }))
      .filter((s) => s.data.length > 0);
  }, [q.data, seg]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.groupedBackground }} />;
  if (!user) {
    return (
      <View testID="saved.signedOut" style={{ flex: 1, backgroundColor: c.groupedBackground, justifyContent: 'center', paddingTop: insets.top }}>
        <EmptyState icon="bookmark" title={t.saved.signedOutTitle} body={t.saved.signedOutBody}>
          <Button testID="saved.signIn" label={t.saved.signIn} full={false} onPress={() => router.push({ pathname: '/login', params: { reason: 'save', next: '/guardados' } })} />
        </EmptyState>
      </View>
    );
  }
  return (
    <View testID="saved.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top }}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.vuelticaView.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingTop: 12, paddingBottom: 4 }}>
            <Text variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 41, paddingHorizontal: 16 }}>{t.saved.title}</Text>
            <View style={{ paddingHorizontal: 16 }}>
              <Segmented<Seg> testID="saved.segment" value={seg} onChange={setSeg} options={[{ value: 'todo', label: t.saved.all }, { value: 'lugares', label: t.saved.places }, { value: 'eventos', label: t.saved.events }]} />
            </View>
            <Banner testID="saved.reminder" icon="clock" text={t.saved.reminder(offset)} action={t.saved.change} actionTestID="saved.reminder.change" onAction={() => setPicker(true)} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text testID={`saved.group.${section.key}`} variant="caption" color="labelSecondary" style={{ textTransform: 'uppercase', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 8 }}>{section.title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <ActivityCard
            item={item.vuelticaView}
            showVerification="saved"
            onPress={() => router.push({ pathname: '/vueltica/[id]', params: { id: item.vuelticaView.id } })}
            onToggleSave={() => toggle.mutate({ id: item.vuelticaView.id, saved: true }, { onSuccess: () => toast(t.saved.removedToast) })}
          />
        )}
        ListEmptyComponent={
          offline && q.isError ? <OfflineList /> : q.isPending ? <ListSkeleton count={3} /> : q.isError ? <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void q.refetch()} full={false} /></EmptyState>
          : <EmptyState testID="saved.empty" icon="bookmark" title={t.empty.saved} body={t.empty.savedBody}><Tap label={t.list.mapButton} onPress={() => router.navigate('/')}><Text variant="body" color="primary" bold>{t.list.mapButton}</Text></Tap></EmptyState>
        }
      />
      <ReminderPicker visible={picker} onClose={() => setPicker(false)} />
    </View>
  );
}
