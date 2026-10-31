import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Menu } from '@/components/system/Menu';
import { ActivityCard } from '@/components/ui/ActivityCard';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useSaved, useToggleSave, useVuelticas, useRecentlyViewed } from '@/data/queries';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { activeFilterCount, DEFAULT_FILTERS, MAX_DISTANCE_KM } from '@/domain/filters';
import type { Filters, SortKey, VuelticaView } from '@/domain/types';
import { formatCRC } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useFilters } from '@/state/filters';
import { useIsOffline, useNetwork } from '@/state/network';
import { useAppTheme } from '@/theme/useAppTheme';
import { Icon } from '@/components/icons/Icon';

const SORTS: SortKey[] = ['cercanos', 'calificados', 'recientes', 'fecha'];

function useCardActions() {
  const toggle = useToggleSave();
  const requireAuth = useRequireAuth();
  return {
    open: (id: string) => router.push({ pathname: '/vueltica/[id]', params: { id } }),
    save: (v: VuelticaView) =>
      requireAuth('save', { kind: 'save', id: v.id }, { next: undefined }, () => toggle.mutate({ id: v.id, saved: !!v.saved }, { onSuccess: () => toast(v.saved ? t.saved.removedToast : t.saved.savedToast) })),
  };
}

/** Active-filter summary chips for the empty state ("Hasta ₡2.500", "Ciudadanos de oro", "A 1 km"). */
function ActiveFilters({ f }: { f: Filters }) {
  const items: string[] = [];
  if (f.maxPrice === 'gratis') items.push(t.filters.onlyFree);
  if (f.maxPrice === 'hasta2500') items.push(t.empty.maxPrice(formatCRC(2500)));
  if (f.students) items.push(t.map.students);
  if (f.seniors) items.push(t.map.seniors);
  if (f.families) items.push(t.filters.families);
  if (f.wheelchair) items.push(t.card.wheelchair);
  if (f.types.length === 1) items.push(f.types[0] === 'lugar' ? t.map.places : t.map.events);
  if (f.distanceKm < MAX_DISTANCE_KM) items.push(t.empty.atKm(f.distanceKm));
  if (f.text) items.push(`«${f.text}»`);
  if (items.length === 0) return null;
  return (
    <View testID="empty.activeFilters" accessibilityLabel={t.empty.activeFilters} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 12 }}>
      {items.map((x) => (
        <Chip key={x} label={x} option selected />
      ))}
    </View>
  );
}

export function OfflineList() {
  const saved = useSaved();
  const recent = useRecentlyViewed();
  const a = useCardActions();
  const lastOnline = useNetwork((s) => s.lastOnlineAt);
  void lastOnline;
  const map = new Map<string, VuelticaView>();
  for (const s of saved.data ?? []) map.set(s.vuelticaView.id, s.vuelticaView);
  for (const r of recent.data ?? []) if (!map.has(r.id)) map.set(r.id, r);
  const items = [...map.values()];
  return (
    <View style={{ gap: 12 }}>
      <Text variant="caption" color="labelSecondary" style={{ textTransform: 'uppercase', paddingHorizontal: 32 }} testID="offline.header">{t.offline.availableOffline}</Text>
      {items.map((v) => (
        <ActivityCard key={v.id} item={v} onPress={() => a.open(v.id)} onToggleSave={() => {}} />
      ))}
      <EmptyState testID="offline.mapNeeds" icon="map" title={t.offline.mapNeeds} body={t.offline.mapBody} />
    </View>
  );
}

interface Props {
  text?: string;
  kind: 'list' | 'search';
  header: ReactNode;
  /** Wait at least this long showing the skeleton (prototype: 1 s whenever Lista opens). */
  forceSkeleton?: boolean;
  caps?: boolean;
  /** Show the empty search hint instead of results when there is nothing typed. */
  idle?: boolean;
}

export function ResultsList({ text, kind, header, forceSkeleton, caps, idle }: Props) {
  const { isAndroid, c } = useAppTheme();
  const { filters, sort, setSort, set, reset } = useFilters();
  const offline = useIsOffline();
  const f = { ...filters, text: text ?? '' };
  const query = useVuelticas(f, sort, kind);
  const a = useCardActions();
  const items = query.data?.items ?? [];
  const n = activeFilterCount(filters);
  const loading = forceSkeleton || (query.isPending && !query.data);
  const countText = kind === 'search' && text ? t.search.resultsFor(items.length, text) : caps && !isAndroid ? t.list.countCaps(items.length) : t.list.count(items.length, formatCRC(5000));

  const sortHeader = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
      <Text testID={`${kind}.count`} variant="caption" color="labelSecondary" style={{ textTransform: isAndroid ? 'none' : 'uppercase' }}>{countText}</Text>
      <Menu testID={`${kind}.sort`} accessibilityLabel={t.list.sortA11y} value={sort} onChange={setSort} options={SORTS.map((k) => ({ value: k, label: t.list.sort[k] }))} />
    </View>
  );

  let body: ReactNode;
  if (idle) {
    body = <EmptyState testID="search.idle" icon="search" title={t.search.beforeTyping} />;
  } else if (query.isError && offline) {
    body = (
      <View style={{ gap: 12 }}>
        <Banner testID="offline.banner" tone="warning" icon="wifiOff" text={t.offline.banner('hace 2 h')} action={t.offline.retry} actionTestID="offline.retry" onAction={() => void query.refetch()} />
        <OfflineList />
      </View>
    );
  } else if (loading) {
    body = <ListSkeleton />;
  } else if (query.isError) {
    body = <EmptyState testID="list.error" icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void query.refetch()} /></EmptyState>;
  } else if (items.length === 0) {
    body = (
      <View testID="empty.state">
        <ActiveFilters f={f} />
        <EmptyState icon="search" title={t.empty.title} body={t.empty.body}>
          <Button testID="empty.widen" label={t.empty.widen} icon="locate" full={false} onPress={() => set({ distanceKm: MAX_DISTANCE_KM, nearMe: true, maxPrice: filters.maxPrice === 'hasta2500' ? 'hasta5000' : filters.maxPrice })} />
          <Button testID="empty.contribute" label={t.empty.contribute} icon="add" variant="glass" onPress={() => router.navigate('/aportar')} />
          <Button testID="empty.clear" label={t.empty.clearFilters} variant="text" onPress={() => { reset(); if (kind === 'search') set({ ...DEFAULT_FILTERS }); }} />
        </EmptyState>
      </View>
    );
  } else {
    body = null;
  }
  const showResults = !idle && !loading && !query.isError && items.length > 0;
  void n;
  void Icon;
  return (
    <FlatList
      testID={`${kind}.scroll`}
      data={showResults ? items : []}
      keyExtractor={(v) => v.id}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListFooterComponent={<View style={{ paddingBottom: 140 }}>{body}</View>}
      initialNumToRender={8}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void query.refetch()} tintColor={c.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          {header}
          {!offline && !idle && !loading && (items.length > 0 || query.data) && !query.isError ? sortHeader : null}
        </View>
      }
      renderItem={({ item: v }) => <ActivityCard item={v} onPress={() => a.open(v.id)} onToggleSave={() => a.save(v)} />}
    />
  );
}
