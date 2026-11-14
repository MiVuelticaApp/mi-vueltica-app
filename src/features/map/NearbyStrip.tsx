import { ScrollView, View } from 'react-native';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { glassStyle } from '@/components/ui/glass';
import type { VuelticaView } from '@/domain/types';
import { priceLabel } from '@/features/list/format';
import { formatDistance } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/**
 * The nearest plans as cards above the results card. Used where tapping a pin does nothing: expo-maps only reports
 * pin taps from iOS 18 (review M6), so on iOS 16-17 this is the map's direct way into Detalle.
 */
export function NearbyStrip({ items, onOpen }: { items: VuelticaView[]; onOpen: (id: string) => void }) {
  const { c } = useAppTheme();
  const nearest = items.filter((v) => !v.noLocation).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8);
  if (!nearest.length) return null;
  return (
    <ScrollView testID="map.nearby" horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t.map.nearby} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
      {nearest.map((v) => {
        const price = v.priceTier === 'gratis' ? t.common.free : priceLabel(v);
        return (
          <Tap key={v.id} testID={`map.nearby.${v.id}`} label={`${v.name}, ${formatDistance(v.distanceKm)}, ${price}`} onPress={() => onOpen(v.id)} style={[{ width: 220, borderRadius: 18, padding: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, glassStyle(c)]}>
            <PhotoTile item={v} uri={v.photos[0]} size={44} radius={10} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" bold numberOfLines={1}>{v.name}</Text>
              <Text variant="caption" color="labelSecondary" numberOfLines={1}>{`${formatDistance(v.distanceKm)} · ${price}`}</Text>
            </View>
          </Tap>
        );
      })}
    </ScrollView>
  );
}
