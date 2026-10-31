import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { daysSince, priceBadge, scheduleLine, stale, typeLine } from '@/features/list/format';
import type { VuelticaView } from '@/domain/types';
import { formatDistance } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { Badge } from './Badge';
import { PhotoTile } from './PhotoTile';
import { RatingInline } from './Stars';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props {
  item: VuelticaView;
  onPress: () => void;
  onToggleSave: () => void;
  /** Guardados shows "Verificado hace 3 días" / "¿Sigue igual? Verificar". */
  showVerification?: 'saved' | 'list';
  testID?: string;
  saveDisabled?: boolean;
}

/** Figma "Activity Card": photo, title, type · distance, schedule, badges, rating, save. */
export function ActivityCard({ item, onPress, onToggleSave, showVerification = 'list', testID, saveDisabled }: Props) {
  const { c } = useAppTheme();
  const d = daysSince(item.lastVerifiedAt);
  const dist = formatDistance(item.distanceKm);
  const price = priceBadge(item);
  const studentElig = item.audiences.includes('estudiantes') || item.freeFor.includes('estudiantes');
  const seniorElig = item.audiences.includes('ciudadanosOro') || item.freeFor.includes('ciudadanosOro');
  return (
    <Tap
      testID={testID ?? `card.${item.id}`}
      label={`${item.name}. ${typeLine(item, dist)}`}
      onPress={onPress}
      style={{ marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, flexDirection: 'row', gap: 16 }}
    >
      <PhotoTile item={item} uri={item.photos[0]} size={76} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text variant="headline" numberOfLines={1} style={{ flex: 1 }} testID={`card.title.${item.id}`}>{item.name}</Text>
          <Tap testID={`card.save.${item.id}`} label={item.saved ? t.card.unsave : t.card.save} onPress={saveDisabled ? undefined : onToggleSave} accessibilityState={{ selected: !!item.saved, disabled: !!saveDisabled }} hitSlop={10} style={{ marginTop: -2 }}>
            <Icon name={item.saved ? 'bookmarkFilled' : 'bookmark'} size={24} color={item.saved ? 'primary' : 'onSurface'} />
          </Tap>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="callout" color="onSurfaceVariant" numberOfLines={1} style={{ flex: 1 }}>{typeLine(item, dist)}</Text>
          {item.ratingCount > 0 ? <RatingInline avg={item.ratingAvg} /> : null}
        </View>
        <Text variant="caption" color="onSurface" style={{ lineHeight: 17 }}>{scheduleLine(item)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {item.type === 'evento' ? <Badge kind="event" label={t.card.event} /> : null}
          {item.priceTier === 'gratis' ? <Badge kind="free" label={t.card.free} /> : null}
          {studentElig && item.type === 'evento' ? <Badge kind="student" label={t.card.students} /> : null}
          {seniorElig ? <Badge kind="senior" label={t.card.seniors} /> : null}
          {item.audiences.includes('familias') && item.type === 'lugar' && !seniorElig ? <Badge kind="family" label={t.card.families} /> : null}
          {d === 0 && showVerification === 'list' && item.priceTier === 'gratis' ? <Badge kind="verified" label={t.card.verifiedToday} /> : null}
          {showVerification === 'saved' && !stale(item) && d !== null ? <Badge kind="verified" label={d === 0 ? t.card.verifiedToday : t.card.verifiedAgo(d)} /> : null}
          {showVerification === 'saved' && stale(item) ? <Badge kind="stale" label={t.card.verify} /> : null}
          {price ? <Badge kind="price" label={price} icon={null} /> : null}
        </View>
      </View>
    </Tap>
  );
}
