import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { ReviewItem } from '@/components/ui/ReviewItem';
import { Group, Row } from '@/components/ui/Section';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useToggleSave, useVerify, useVuelticaDetail } from '@/data/queries';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { daysSince } from '@/features/list/format';
import { useReviewActions } from '@/features/detail/useReviewActions';
import { needsReview } from '@/domain/rules';
import type { VuelticaView } from '@/domain/types';
import { daysUntil, formatCRC, formatDistance, formatLongDate, formatRating, formatRelative, formatTime } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { availableApps, openDirections } from '@/lib/directions';
import { now } from '@/lib/clock';
import { shareVueltica } from '@/lib/share';
import { useMapSelection } from '@/state/mapSelection';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';

function audienceLines(v: VuelticaView): { title: string; sub: string } {
  const names: string[] = [];
  if (v.audiences.includes('estudiantes') || v.freeFor.includes('estudiantes')) names.push(t.contribute.students);
  if (v.audiences.includes('ciudadanosOro') || v.freeFor.includes('ciudadanosOro')) names.push(t.contribute.seniors);
  if (v.audiences.includes('familias')) names.push(t.contribute.families);
  if (names.length === 0) return { title: t.contribute.everyone, sub: '' };
  const title = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1].toLowerCase()}` : names[0];
  return { title, sub: v.freeFor.length > 0 ? 'Fila preferencial presentando carné' : t.contribute.everyone };
}

function InfoRows({ v }: { v: VuelticaView }) {
  const { c } = useAppTheme();
  const rows: { icon: IconName; title: string; sub?: string; onPress?: () => void; testID: string; chevron?: boolean }[] = [];
  if (v.type === 'evento' && v.startAt) {
    const start = new Date(v.startAt);
    const days = daysUntil(start, now());
    rows.push({ icon: 'calendar', title: formatLongDate(start), sub: `${formatTime(start)}${v.endAt ? ` – ${formatTime(new Date(v.endAt))}` : ''}${days >= 0 ? ` · ${t.detail.remaining(days)}` : ''}`, testID: 'detail.row.date' });
  } else if (v.openingHours) {
    rows.push({ icon: 'clock', title: t.detail.openingHours, sub: v.openingHours, testID: 'detail.row.hours' });
  }
  const [placeTitle, placeSub] = v.address.includes(' · ') ? v.address.split(' · ') : [v.address, v.province];
  rows.push({ icon: 'pin', title: placeTitle, sub: placeSub, chevron: true, testID: 'detail.row.place', onPress: () => router.replace({ pathname: '/vueltica/[id]/como-llegar', params: { id: v.id } }) });
  rows.push({
    icon: 'ticket',
    title: v.priceTier === 'gratis' ? t.detail.freeEntry : `${formatCRC(v.pricePerPerson)} por persona`,
    sub: v.priceTier === 'gratis' ? (v.type === 'evento' ? `${t.detail.noReservation} · cupo limitado` : t.detail.noReservation) : v.freeFor.length ? `Gratis para ${v.freeFor.map((x) => (x === 'estudiantes' ? 'estudiantes' : 'ciudadanos de oro')).join(' y ')}` : undefined,
    testID: 'detail.row.price',
  });
  const aud = audienceLines(v);
  rows.push({ icon: 'school', title: aud.title, sub: aud.sub || undefined, testID: 'detail.row.audience' });
  rows.push({ icon: 'wheelchair', title: v.wheelchair ? t.detail.accessible : t.detail.notAccessible, testID: 'detail.row.accessibility' });
  return (
    <Group style={{ backgroundColor: c.fillTertiary }}>
      {rows.map((r, i) => (
        <Row key={r.testID} testID={r.testID} title={r.title} subtitle={r.sub} onPress={r.onPress} chevron={r.chevron} last={i === rows.length - 1} right={undefined} icon={undefined} titleColor="onSurface" accessibilityLabel={[r.title, r.sub].filter(Boolean).join('. ')} />
      ))}
    </Group>
  );
}

/** 03 Detalle (bottom sheet): everything about a plan (FR-7.x). */
export default function Detalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const q = useVuelticaDetail(id);
  const requireAuth = useRequireAuth();
  const toggle = useToggleSave();
  const verify = useVerify();
  const rev = useReviewActions(`/vueltica/${id}`);
  const settings = useSettings((s) => s.settings);
  const d = q.data;
  const v = d?.vuelticaView;

  useEffect(() => {
    useMapSelection.getState().set(id);
    return () => {
      if (useMapSelection.getState().id === id) useMapSelection.getState().set(null);
    };
  }, [id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const howToGet = async () => {
    if (!v) return;
    const pick = settings.directionsApp !== 'preguntar' ? settings.directionsApp : settings.rememberedDirections;
    if (pick && pick !== 'preguntar' && availableApps().includes(pick)) {
      const ok = await openDirections(pick, v);
      if (!ok) toast(t.directions.openFailed);
      return;
    }
    router.replace({ pathname: '/vueltica/[id]/como-llegar', params: { id } });
  };
  const save = () => {
    if (!v) return;
    requireAuth('save', { kind: 'save', id }, { next: `/vueltica/${id}`, replace: true }, () =>
      toggle.mutate({ id, saved: !!d?.saved }, { onSuccess: () => toast(d?.saved ? t.saved.removedToast : t.saved.savedToast) }),
    );
  };
  const confirm = () =>
    verify.mutate({ vuelticaId: id, stillHappening: 'si' }, { onSuccess: (r) => toast(r.queued ? t.offline.queued : r.points > 0 ? t.detail.thanks : t.detail.thanksGuest) });

  let body;
  if (q.isPending) {
    body = (
      <View testID="detail.loading" style={{ padding: 16, gap: 12 }}>
        <SkeletonBlock w="80%" h={26} /><SkeletonBlock w="50%" h={14} /><SkeletonBlock w="100%" h={180} r={16} /><SkeletonBlock w="100%" h={50} r={25} />
      </View>
    );
  } else if (q.isError || !v || !d) {
    body = (
      <View testID="detail.error" style={{ padding: 24, gap: 12, alignItems: 'center' }}>
        <Text variant="title" align="center">{t.detail.notFound}</Text>
        <Button label={t.common.retry} onPress={() => void q.refetch()} full={false} />
      </View>
    );
  } else {
    const verified = daysSince(v.lastVerifiedAt);
    const mod = d.moderation;
    const studentElig = v.audiences.includes('estudiantes') || v.freeFor.includes('estudiantes');
    const seniorElig = v.audiences.includes('ciudadanosOro') || v.freeFor.includes('ciudadanosOro');
    body = (
      <ScrollView testID="detail.scroll" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 16 }}>
        <View style={{ paddingHorizontal: 16, gap: 6 }}>
          <Text testID="detail.title" variant="title" accessibilityRole="header" style={{ paddingRight: 56 }}>{v.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {v.ratingCount > 0 ? <><Icon name="star" size={14} color="#f5a623" /><Text testID="detail.rating" variant="callout" color="labelSecondary">{`${formatRating(v.ratingAvg)} (${v.ratingCount}) · `}</Text></> : null}
            <Text variant="callout" color="labelSecondary">{`${v.type === 'evento' ? 'Evento' : v.category} · ${t.detail.away(formatDistance(v.distanceKm))}`}</Text>
          </View>
        </View>

        {v.status !== 'publicada' ? (
          <View testID="detail.status" style={{ marginHorizontal: 16, padding: 12, borderRadius: 12, backgroundColor: c.staleContainer, gap: 2 }}>
            <Text variant="headline" color="stale">{v.status === 'pendiente' ? t.detail.pending : v.status === 'oculta' ? t.detail.hidden : t.detail.rejected}</Text>
            {v.status === 'pendiente' && mod ? <Text variant="callout" color="stale">{t.mine.review(mod.votesFor + mod.votesAgainst, mod.votesNeeded)}</Text> : null}
            {v.status === 'rechazada' && v.rejectionReason ? <Text variant="callout" color="stale">{v.rejectionReason}</Text> : null}
            {v.status === 'oculta' && v.hiddenReason ? <Text variant="callout" color="stale">{v.hiddenReason}</Text> : null}
            {needsReview(v.reportedAt, now()) ? <Text variant="callout" color="stale">{t.moderation.needsReview}</Text> : null}
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {v.type === 'evento' ? <Badge kind="event" label={t.card.event} /> : null}
          {v.priceTier === 'gratis' ? <Badge kind="free" label={t.card.free} /> : <Badge kind="price" label={formatCRC(v.pricePerPerson)} icon={null} />}
          {studentElig ? <Badge kind="student" label={t.card.students} /> : null}
          {seniorElig ? <Badge kind="senior" label={t.card.seniors} /> : null}
          {v.audiences.includes('familias') ? <Badge kind="family" label={t.card.families} /> : null}
          {verified !== null ? <Badge kind="verified" label={verified === 0 ? t.card.verifiedToday : t.card.verifiedAgo(verified)} /> : null}
        </ScrollView>

        <ScrollView horizontal pagingEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} testID="detail.photos">
          {(v.photos.length ? v.photos : ['ph:none']).map((p, i) => (
            <View key={p + i} style={{ width: v.photos.length > 1 ? 300 : 370, aspectRatio: 1.6 }}>
              <PhotoTile uri={p} item={v} size="100%" radius={20} testID={`detail.photo.${i}`} />
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
          <Button testID="detail.directions" label={t.detail.howToGet} icon="directions" onPress={howToGet} style={{ flex: 1 }} full={false} />
          <Button testID="detail.save" label={d.saved ? t.detail.saved : t.detail.save} icon={d.saved ? 'bookmarkFilled' : 'bookmark'} variant="glass" onPress={save} full={false} accessibilityLabel={d.saved ? t.card.unsave : t.detail.save} />
          <IconButton testID="detail.share" icon="share" label={t.detail.share} onPress={() => void shareVueltica(v.id, v.name)} />
        </View>

        <InfoRows v={v} />

        {v.description ? <Text testID="detail.description" variant="body" style={{ paddingHorizontal: 16, lineHeight: 24 }}>{v.description}</Text> : null}

        {v.status === 'publicada' ? (
          <View testID="detail.verification" style={{ marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: c.surface, gap: 10, borderWidth: 1, borderColor: c.outline }}>
            <Text variant="headline">{t.detail.verifyTitle}</Text>
            <Text variant="caption" color="labelSecondary">{t.detail.verifyLast(d.verification.lastVerifiedAt ? formatRelative(d.verification.lastVerifiedAt, now()) : '—', d.verification.count)}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button testID="detail.verify.same" label={t.detail.stillSame} variant="secondary" size="compact" onPress={confirm} loading={verify.isPending} full={false} style={{ flex: 1 }} />
              <Button testID="detail.verify.changed" label={t.detail.changed} variant="outline" size="compact" full={false} style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/vueltica/[id]/verificar', params: { id } })} />
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <Text testID="detail.community" variant="caption" color="labelSecondary">
            {`${t.detail.community(v.authorName, d.community.verifiedBy)} · ${t.detail.updated(formatRelative(d.community.updatedAt, now()))}`}
          </Text>
          <Button testID="detail.report" label={t.detail.report} variant="text" icon="flag" full={false} style={{ alignSelf: 'flex-start' }} onPress={() => router.replace({ pathname: '/vueltica/[id]/reportar', params: { id } })} />
        </View>

        {v.status === 'publicada' ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <Text variant="headline">{t.detail.reviews}</Text>
              <Tap testID="detail.reviews.all" label={t.detail.seeAll(d.rating.count)} onPress={() => router.push({ pathname: '/vueltica/[id]/resenas', params: { id } })} hitSlop={8}>
                <Text variant="callout" bold color="primary">{t.detail.seeAll(d.rating.count)}</Text>
              </Tap>
            </View>
            {d.reviewsPreview.length === 0 ? <Text variant="callout" color="labelSecondary" style={{ paddingHorizontal: 16 }}>{t.detail.noReviews}</Text> : null}
            {d.reviewsPreview.map((r) => (
              <ReviewItem key={r.id} review={r} onUseful={() => rev.useful(r)} onReport={rev.report} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <Sheet testID="detail.sheet">
      <View style={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
        <IconButton testID="detail.close" icon="close" label={t.common.close} onPress={close} />
      </View>
      <View style={{ height: 8 }} />
      {body}
    </Sheet>
  );
}
