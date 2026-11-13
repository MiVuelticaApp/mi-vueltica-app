import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import type { Review } from '@/domain/types';
import { formatRelative } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useAppTheme } from '@/theme/useAppTheme';
import { PhotoTile } from './PhotoTile';
import { Stars } from './Stars';
import { Tap } from './Tap';
import { Text } from './Text';

/** Figma "Review Item": initials, name, date · went with, stars, text, photos, "útil" and report; the caller's own review gets Editar / Eliminar. */
export function ReviewItem({ review, mine, onUseful, onReport, onEdit, onDelete }: { review: Review; mine?: boolean; onUseful?: () => void; onReport?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const { c } = useAppTheme();
  const when = formatRelative(review.createdAt, now());
  const cap = when.charAt(0).toUpperCase() + when.slice(1);
  return (
    <View testID={`review.${review.id}`} style={{ marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="label" color="onPrimaryContainer">{review.authorInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{review.authorName}</Text>
          <Text variant="caption" color="labelSecondary">{`${cap} · ${t.reviews.wentWith[review.wentWith]}`}</Text>
        </View>
      </View>
      <Stars value={review.stars} size={16} />
      <Text variant="body" style={{ lineHeight: 24 }}>{review.text}</Text>
      {review.photos.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {review.photos.map((p, i) => (
            <PhotoTile key={p + i} uri={p} item={{ type: 'lugar', category: 'Museo' }} size={72} />
          ))}
        </View>
      ) : null}
      {mine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Text variant="caption" color="labelSecondary" style={{ flex: 1 }}>{t.reviews.mine}</Text>
          <Tap testID={`review.edit.${review.id}`} label={t.reviews.edit} onPress={onEdit} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text variant="callout" bold color="primary">{t.reviews.edit}</Text>
          </Tap>
          <Tap testID={`review.delete.${review.id}`} label={t.reviews.delete} onPress={onDelete} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text variant="callout" bold color="danger">{t.reviews.delete}</Text>
          </Tap>
        </View>
      ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <Tap testID={`review.useful.${review.id}`} label={t.reviews.helpfulA11y} accessibilityState={{ selected: review.markedUsefulByMe }} onPress={onUseful} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
          <Icon name="thumb" size={18} color={review.markedUsefulByMe ? 'primary' : 'onSurfaceVariant'} />
          <Text testID={`review.useful.count.${review.id}`} variant="caption" bold={review.markedUsefulByMe} color={review.markedUsefulByMe ? 'primary' : 'onSurfaceVariant'}>{t.reviews.helpful(review.usefulCount)}</Text>
        </Tap>
        <Tap testID={`review.report.${review.id}`} label={t.reviews.report} onPress={onReport} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
          <Icon name="flag" size={18} color="onSurfaceVariant" />
          <Text variant="caption" color="onSurfaceVariant">{t.reviews.report}</Text>
        </Tap>
      </View>
      )}
    </View>
  );
}
