import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import MapView from '@/components/map/MapView';
import { Banner } from '@/components/ui/Banner';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { IconButton } from '@/components/ui/IconButton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { glassStyle } from '@/components/ui/glass';
import { useAppLocation, useVuelticas } from '@/data/queries';
import { activeFilterCount } from '@/domain/filters';
import { formatCRC } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { describeFilters } from '@/features/map/describe';
import { FilterChipsRow } from '@/features/map/FilterChipsRow';
import { requestAndLocate } from '@/lib/location';
import { useFilters } from '@/state/filters';
import { useMapSelection } from '@/state/mapSelection';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';

const NO_ITEMS: never[] = [];

/** 01 Mapa / 01b Mapa filtrado. */
export default function MapaScreen() {
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const filters = useFilters((s) => s.filters);
  const selectedId = useMapSelection((s) => s.id);
  const center = useAppLocation();
  const user = useSession((s) => s.user);
  const coords = useSession((s) => s.coords);
  const permission = useSettings((s) => s.settings.locationPermission);
  const [recenter, setRecenter] = useState(0);
  const query = useVuelticas({ ...filters, nearMe: true });
  const data = query.data;
  const n = activeFilterCount(filters);
  const label = describeFilters(filters);

  const card = data
    ? label || n > 0
      ? t.map.resultsCardFiltered(data.count, data.freeCount, label ?? t.map.upTo(formatCRC(5000)))
      : t.map.resultsCard(data.count, data.freeCount)
    : null;

  const locate = async () => {
    if (permission !== 'granted') await requestAndLocate();
    setRecenter((x) => x + 1);
  };

  return (
    <View testID="map.screen" style={{ flex: 1, backgroundColor: c.surface }}>
      {data || !query.isError ? (
        <MapView
          items={data?.items ?? NO_ITEMS}
          pending={data?.pending ?? NO_ITEMS}
          selectedId={selectedId}
          center={center}
          showUser={!!coords}
          recenterToken={recenter}
          onSelect={(id) => {
            useMapSelection.getState().set(id);
            router.push({ pathname: '/vueltica/[id]', params: { id } });
          }}
          onSelectPending={(v) => (v.mine ? router.push({ pathname: '/vueltica-enviada/[id]', params: { id: v.id } }) : router.push('/moderacion'))}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 }} testID="map.offline">
          <Icon name="map" size={56} color="labelTertiary" />
          <Text variant="title" align="center">{t.map.noMap}</Text>
        </View>
      )}

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Tap
            testID="map.search"
            label={t.map.searchPlaceholder}
            onPress={() => router.push('/buscar')}
            style={[{ flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }, glassStyle(c)]}
          >
            <Icon name="search" size={18} color="labelSecondary" />
            <Text variant="body" color="labelSecondary" system numberOfLines={1} style={{ flex: 1 }}>{t.map.searchPlaceholder}</Text>
            {isAndroid ? (
              <Tap testID="map.account" label={t.map.accountA11y} onPress={() => router.navigate('/perfil')} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="label" color={c.onPrimary}>{user?.initials?.[0] ?? 'A'}</Text>
              </Tap>
            ) : null}
          </Tap>
          {!isAndroid ? <IconButton testID="map.account" icon="person" label={t.map.accountA11y} onPress={() => router.navigate('/perfil')} /> : null}
        </View>
        <FilterChipsRow variant="map" />
        {permission === 'denied' ? (
          <Banner testID="map.locationBanner" tone="warning" icon="locate" text={t.map.locationOff} action={t.map.openSettings} onAction={() => void Linking.openSettings().catch(() => {})} />
        ) : null}
        <OfflineBanner testID="map.offlineBanner" onRetry={() => void query.refetch()} />
      </View>

      <View pointerEvents="box-none" style={{ position: 'absolute', right: 16, bottom: insets.bottom + 192, }}>
        <IconButton testID="map.locate" icon="locate" label={t.map.locate} onPress={locate} />
      </View>

      <Tap
        testID="map.results"
        label={card ? `${card.title}. ${card.subtitle}` : t.common.loading}
        onPress={() => router.navigate('/lista')}
        style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 92, borderRadius: isAndroid ? 20 : 26, paddingLeft: 20, paddingRight: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, glassStyle(c)]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text testID="map.results.title" variant="headline" system>{card?.title ?? t.common.loading}</Text>
          {card?.subtitle ? <Text testID="map.results.subtitle" variant="callout" color="labelSecondary" system>{card.subtitle}</Text> : null}
        </View>
        <Icon name="chevronRight" size={20} color="labelTertiary" />
      </Tap>
    </View>
  );
}
