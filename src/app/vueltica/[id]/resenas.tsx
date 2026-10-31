import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewItem } from '@/components/ui/ReviewItem';
import { Segmented } from '@/components/ui/Segmented';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { StarInput, Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useReviews, useVuelticaDetail } from '@/data/queries';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { useReviewActions } from '@/features/detail/useReviewActions';
import { formatRating } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

type Sort = 'recientes' | 'fotos' | 'utiles';

/** 07 Reseñas: summary + distribution, "Escribir reseña", sort (Android also filters by Familias / Estudiantes). */
export default function Resenas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, isAndroid } = useAppTheme();
  const [sort, setSort] = useState<Sort>('recientes');
  const [audience, setAudience] = useState<'familias' | 'estudiantes' | undefined>();
  const q = useReviews({ vuelticaId: id, sort, audience });
  const detail = useVuelticaDetail(id);
  const requireAuth = useRequireAuth();
  const rev = useReviewActions(`/vueltica/${id}/resenas`);
  const [stars, setStars] = useState(0);
  const sum = q.data?.summary;
  const max = Math.max(1, ...(sum?.distribution ?? [1]));
  const write = (n = 0) => requireAuth('review', { kind: 'review', id }, { next: `/vueltica/${id}/resenas` }, () => router.push({ pathname: '/vueltica/[id]/escribir-resena', params: { id, stars: String(n) } }));

  const header = (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <Text variant="callout" color="labelSecondary" align="center" testID="reviews.subtitle">{detail.data?.vuelticaView.name ?? ''}</Text>
      {sum ? (
        <View testID="reviews.summary" style={{ marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: c.surface, flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text testID="reviews.avg" variant="display" style={{ fontSize: 44, lineHeight: 50 }}>{formatRating(sum.avg)}</Text>
            <Stars value={sum.avg} size={14} />
            <Text testID="reviews.count" variant="caption" color="labelSecondary">{t.reviews.summary(sum.count)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="caption" color="labelSecondary" style={{ width: 10 }}>{n}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.priceContainer }}>
                  <View style={{ width: `${Math.max(3, (sum.distribution[n - 1] / max) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: c.surface, gap: 12, alignItems: 'center' }}>
        <Text variant="headline" align="center">{t.reviews.didYouGo}</Text>
        <StarInput testID="reviews.stars" value={stars} onChange={(n) => { setStars(n); write(n); }} size={32} />
        <Button testID="reviews.write" label={t.reviews.write} variant="glass" onPress={() => write(stars)} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented<Sort>
          testID="reviews.sort"
          value={sort}
          onChange={setSort}
          options={[{ value: 'recientes', label: t.reviews.recent }, { value: 'fotos', label: t.reviews.withPhotos }, { value: 'utiles', label: t.reviews.useful }]}
        />
      </View>
      {isAndroid ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <Chip testID="reviews.filter.familias" label={t.reviews.families} icon="people" selected={audience === 'familias'} onPress={() => setAudience(audience === 'familias' ? undefined : 'familias')} />
          <Chip testID="reviews.filter.estudiantes" label={t.reviews.students} icon="school" selected={audience === 'estudiantes'} onPress={() => setAudience(audience === 'estudiantes' ? undefined : 'estudiantes')} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View testID="reviews.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }}>
      <Stack.Screen options={{ title: t.reviews.title }} />
      <FlatList
        data={q.data?.items ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
        renderItem={({ item }) => <ReviewItem review={item} onUseful={() => rev.useful(item)} onReport={rev.report} />}
        ListEmptyComponent={q.isPending ? <ListSkeleton count={3} /> : q.isError ? <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void q.refetch()} /></EmptyState> : <EmptyState testID="reviews.empty" icon="star" title={t.empty.reviews} body={t.empty.reviewsBody} />}
      />
    </View>
  );
}
