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
import { useCreateReview, useVuelticaDetail } from '@/data/queries';
import type { SpentTier, WentWith } from '@/domain/types';
import { formatEventShort } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { pickPhotos } from '@/lib/photos';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

const WENT: WentWith[] = ['familia', 'amigos', 'pareja', 'solo'];
const SPENT: SpentTier[] = ['nada', 'menos2500', 'entre2500y5000'];

/** 10 Escribir reseña. iOS/web: sheet with ✓ in the header. Android: full-screen with "Publicar" (FR-1.2, FR-10.3). */
export default function EscribirResena() {
  const { id, stars: starsParam } = useLocalSearchParams<{ id: string; stars?: string }>();
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const q = useVuelticaDetail(id);
  const create = useCreateReview();
  const [stars, setStars] = useState(Number(starsParam) || 0);
  const [went, setWent] = useState<WentWith>('familia');
  const [spent, setSpent] = useState<SpentTier>('nada');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const v = q.data?.vuelticaView;

  useEffect(() => {
    // Direct deep links while signed out go through Login first.
    if (useSession.getState().userLoaded && !user) router.replace({ pathname: '/login', params: { reason: 'review', next: `/vueltica/${id}/resenas` } });
  }, [user, id]);

  const publish = () => {
    if (stars < 1) return toast(t.reviews.compose.needStars);
    create.mutate(
      { vuelticaId: id, stars, wentWith: went, spent, text, photos },
      { onSuccess: () => { toast(t.reviews.compose.published); closeSheet(); } },
    );
  };
  const body = (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
      {v ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PhotoTile item={v} uri={v.photos[0]} size={48} radius={8} />
          <View style={{ flex: 1 }}>
            <Text variant="headline" numberOfLines={1}>{v.name}</Text>
            <Text variant="callout" color="labelSecondary">{`${v.type === 'evento' ? 'Evento' : v.category}${v.startAt ? ` · ${formatEventShort(v.startAt).split(' · ')[0]}` : ''}`}</Text>
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
        <SheetHeader testID="compose.header" title={t.reviews.compose.title} right={undefined} left={<IconButton testID="compose.close" icon="close" label={t.common.close} onPress={closeSheet} />} />
        {body}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
          <Button testID="compose.publish" label={t.reviews.compose.publish} onPress={publish} loading={create.isPending} />
        </View>
      </View>
    );
  }
  return (
    <Sheet testID="compose.sheet" tall>
      <SheetHeader testID="compose.header" title={t.reviews.compose.title} right={<IconButton testID="compose.publish" icon="check" label={t.reviews.compose.publish} prominent onPress={publish} disabled={create.isPending} />} />
      {body}
    </Sheet>
  );
}
