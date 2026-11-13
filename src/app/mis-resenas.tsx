import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewItem } from '@/components/ui/ReviewItem';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useMyReviews } from '@/data/queries';
import { useReviewActions } from '@/features/detail/useReviewActions';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Perfil › Mis reseñas (#23): the caller's reviews with the plan they are about; each can be opened, edited or deleted. */
export default function MisResenas() {
  const { c } = useAppTheme();
  const q = useMyReviews();
  const rev = useReviewActions('/mis-resenas');
  return (
    <View testID="myReviews.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.review.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View testID={`myReviews.row.${item.review.id}`} style={{ marginHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, overflow: 'hidden' }}>
            <Tap
              testID={`myReviews.plan.${item.review.id}`}
              label={t.myReviews.open(item.planName)}
              onPress={() => router.push({ pathname: '/vueltica/[id]', params: { id: item.review.vuelticaId } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}
            >
              <Text variant="headline" color="primary" numberOfLines={1} style={{ flex: 1 }}>{item.planName || t.myReviews.unknownPlan}</Text>
              {item.pending ? <Badge kind="pending" label={t.myReviews.pending} /> : null}
            </Tap>
            <ReviewItem review={item.review} mine onEdit={() => rev.edit(item.review)} onDelete={() => void rev.remove(item.review)} />
          </View>
        )}
        ListEmptyComponent={
          q.isPending ? <ListSkeleton count={3} />
          : q.isError ? <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void q.refetch()} full={false} /></EmptyState>
          : <EmptyState testID="myReviews.empty" icon="star" title={t.myReviews.empty} body={t.myReviews.emptyBody} />
        }
      />
    </View>
  );
}
