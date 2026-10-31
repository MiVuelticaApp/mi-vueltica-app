import { Image } from 'expo-image';
import { View } from 'react-native';
import { pinOpacity } from '@/domain/rules';
import type { VuelticaView } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { Text } from '@/components/ui/Text';
import { Tap } from '@/components/ui/Tap';
import { PIN_SIZE, pinSource } from './pins';

/** Tip of the drop sits at (50%, 85%) of the exported image. */
export const PIN_ANCHOR = { x: 0.5, y: 54.5 / 64 };

export function PinMarker({ item, selected, pending, x, y, onPress }: { item: VuelticaView; selected: boolean; pending?: boolean; x: number; y: number; onPress: () => void }) {
  const size = selected ? PIN_SIZE.selected : PIN_SIZE.normal;
  const opacity = pending ? 1 : pinOpacity(item.priceTier, selected);
  const label = pending ? t.map.pinPending(item.name) : item.type === 'evento' ? t.map.pinEvent(item.name) : t.map.pinPlace(item.name);
  return (
    <Tap
      testID={pending ? `map.pin.pending.${item.id}` : `map.pin.${item.id}`}
      label={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ position: 'absolute', left: x - size.w * PIN_ANCHOR.x, top: y - size.h * PIN_ANCHOR.y, width: size.w, height: size.h, opacity, zIndex: selected ? 5 : pending ? 3 : 1 }}
    >
      <Image source={pinSource(pending ? 'pendiente' : item.type, 'gratis', selected)} style={{ width: size.w, height: size.h }} contentFit="contain" />
    </Tap>
  );
}

export function ClusterMarker({ id, count, x, y, onPress }: { id: string; count: number; x: number; y: number; onPress: () => void }) {
  const { c } = useAppTheme();
  return (
    <Tap
      testID={`map.cluster.${id}`}
      label={t.map.cluster(count)}
      onPress={onPress}
      style={{ position: 'absolute', left: x - 20, top: y - 20, width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, borderWidth: 3, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, zIndex: 2 }}
    >
      <Text variant="label" color={c.onPrimary} bold style={{ fontSize: 14 }}>{count}</Text>
    </Tap>
  );
}

export function UserDot({ x, y }: { x: number; y: number }) {
  return (
    <View testID="map.userLocation" accessibilityLabel={t.map.userLocation} accessible pointerEvents="none" style={{ position: 'absolute', left: x - 24, top: y - 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#2f7bff2e', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#2f7bff', borderWidth: 2.5, borderColor: '#ffffff' }} />
    </View>
  );
}
