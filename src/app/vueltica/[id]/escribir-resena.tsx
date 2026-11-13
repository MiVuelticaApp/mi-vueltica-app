import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { Group, SectionHeader } from '@/components/ui/Section';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { StarInput } from '@/components/ui/Stars';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useCreateReview, useReviews, useUpdateReview, useVuelticaDetail } from '@/data/queries';
import type { Review, SpentTier, WentWith } from '@/domain/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { formatEventShort } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { errorMessage } from '@/lib/errors';
import { pickPhotos } from '@/lib/photos';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

const WENT: WentWith[] = ['familia', 'amigos', 'pareja', 'solo'];
const SPENT: SpentTier[] = ['nada', 'menos2500', 'entre2500y5000'];

/**
 * 10 Escribir reseña. iOS/web: sheet with ✓ in the header. Android: full-screen with "Publicar" (FR-1.2, FR-10.3).
 * With `?reviewId=` it edits the caller's own review (`PUT /reviews/:id`), prefilled once the review is loaded.
 */
export default function EscribirResena() {
  const { id, reviewId } = useLocalSearchParams<{ id: string; reviewId?: string }>();
  const list = useReviews({ vuelticaId: id, sort: 'recientes' });
  const existing = reviewId ? list.data?.items.find((r) => r.id === reviewId) : undefined;
  if (reviewId && !existing) {
    return list.isPending ? <Sheet testID="compose.sheet" tall><ListSkeleton count={2} /></Sheet> : <Sheet testID="compose.sheet" tall><EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody} /></Sheet>;
  }
  return <Composer key={existing?.id ?? 'new'} existing={existing} />;
}

function Composer({ existing }: { existing?: Review }) {
  const { id, stars: starsParam, reviewId } = useLocalSearchParams<{ id: string; stars?: string; reviewId?: string }>();
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const q = useVuelticaDetail(id);
  const create = useCreateReview();
  const update = useUpdateReview();
  const saving = create.isPending || update.isPending;

  const [stars, setStars] = useState(existing?.stars ?? (Number(starsParam) || 0));
  const [went, setWent] = useState<WentWith>(existing?.wentWith ?? 'familia');
  const [spent, setSpent] = useState<SpentTier>(existing?.spent ?? 'nada');
  const [text, setText] = useState(existing?.text ?? '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const v = q.data?.vuelticaView;
  const title = reviewId ? t.reviews.editTitle : t.reviews.compose.title;

  useEffect(() => {
    // Direct deep links while signed out go through Login first.
    if (useSession.getState().userLoaded && !user) router.replace({ pathname: '/login', params: { reason: 'review', next: `/vueltica/${id}/resenas` } });
  }, [user, id]);

  const publish = () => {
    if (stars < 1) return toast(t.reviews.compose.needStars);
    const input = { vuelticaId: id, stars, wentWith: went, spent, text, photos };
    if (reviewId) {
      update.mutate({ id: reviewId, input }, { onSuccess: () => { toast(t.reviews.updated); closeSheet(); }, onError: (e) => toast(errorMessage(e)) });
      return;
    }
    create.mutate(input, { onSuccess: () => { toast(t.reviews.compose.published); closeSheet(); }, onError: (e) => toast(errorMessage(e)) });
  };
  const body = (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
      {v ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PhotoTile item={v} uri={v.photos[0]} size={48} radius={8} />
          <View style={{ flex: 1 }}>
            <Text variant="headline" numberOfLines={1}>{v.name}</Text>
            <Text variant="callout" color="labelSecondary">{`${v.type === 'evento' ? t.common.event : v.category}${v.startAt ? ` · ${formatEventShort(v.startAt).split(' · ')[0]}` : ''}`}</Text>
          </View>
        </View>
      ) : null}
      <View style={{ paddingTop: 16 }}>
        <StarInput testID="compose.stars" value={stars} onChange={setStars} showLabel />
      </View>
      <SectionHeader title={t.reviews.compose.withWhom} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
        {WENT.map((w) => <Chip key={w} option testID={`compose.went.${w}`} label={t.reviews.wentWithShort[w]} selected={went === w} onPress={() => setWent(w)} />)}
      </View>
      <SectionHeader title={t.reviews.compose.spent} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
        {SPENT.map((s) => <Chip key={s} option testID={`compose.spent.${s}`} label={t.reviews.spent[s]} selected={spent === s} onPress={() => setSpent(s)} />)}
      </View>
      <SectionHeader title={t.reviews.compose.experience} />
      <Group>
        <View style={{ padding: 16 }}>
          <TextField testID="compose.text" accessibilityLabel={t.reviews.compose.experience} value={text} onChangeText={setText} placeholder={t.reviews.compose.placeholder} multiline rows={4} />
        </View>
      </Group>
      <View style={{ marginTop: 12 }}>
        <Group>
          <Tap testID="compose.photos" label={t.reviews.compose.photos} onPress={async () => { const p = await pickPhotos(5 - photos.length); if (p.length) setPhotos([...photos, ...p]); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
            <Icon name="camera" size={22} color="primary" />
            <Text variant="body" color="primary">{photos.length ? `${t.reviews.compose.photos} (${photos.length}/5)` : t.reviews.compose.photos}</Text>
          </Tap>
        </Group>
      </View>
      <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 12 }}>{t.reviews.compose.footer}</Text>
    </ScrollView>
  );
  if (isAndroid) {
    return (
      <View testID="compose.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top }}>
        <SheetHeader testID="compose.header" title={title} right={undefined} left={<IconButton testID="compose.close" icon="close" label={t.common.close} onPress={closeSheet} />} />
        {body}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
          <Button testID="compose.publish" label={t.reviews.compose.publish} onPress={publish} loading={saving} />
        </View>
      </View>
    );
  }
  return (
    <Sheet testID="compose.sheet" tall>
      <SheetHeader testID="compose.header" title={title} right={<IconButton testID="compose.publish" icon="check" label={t.reviews.compose.publish} prominent onPress={publish} disabled={saving} />} />
      {body}
    </Sheet>
  );
}
