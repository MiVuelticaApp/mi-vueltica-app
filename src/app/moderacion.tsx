import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModerationCard } from '@/components/ui/ModerationCard';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { ForbiddenError } from '@/data/api';
import type { ModerationQueue } from '@/data/api';
import { useModerationQueue, useReputation, useUndoVote, useVote } from '@/data/queries';
import { useSession } from '@/state/session';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

type Item = ModerationQueue['nuevas'][number];

/** 20 Moderación: Nuevas / Reportadas, votes with "¡Gracias!" + Deshacer (FR-14.x). Level 3+ only. */
export default function Moderacion() {
  const { c } = useAppTheme();
  const user = useSession((s) => s.user);
  const q = useModerationQueue();
  const rep = useReputation();
  const vote = useVote();
  const undo = useUndoVote();
  // Items stay on screen after voting (even when the vote resolves them) so the user can undo.
  const [voted, setVoted] = useState<Record<string, { item: Item; choice: 'for' | 'against' }>>({});

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.groupedBackground, justifyContent: 'center' }}>
        <EmptyState icon="flag" title={t.login.gate.moderate}><Button label={t.profile.signIn} full={false} onPress={() => router.replace({ pathname: '/login', params: { reason: 'moderate', next: '/moderacion' } })} /></EmptyState>
      </View>
    );
  }
  if (q.error instanceof ForbiddenError) {
    return (
      <View testID="mod.locked" style={{ flex: 1, backgroundColor: c.groupedBackground, justifyContent: 'center' }}>
        <EmptyState icon="lock" title={t.moderation.locked} body={t.moderation.lockedBody} />
      </View>
    );
  }
  const data = q.data;
  const merge = (list: Item[]): Item[] => {
    const ids = new Set(list.map((i) => i.vuelticaId));
    const extra = Object.values(voted).map((x) => x.item).filter((i) => !ids.has(i.vuelticaId) && list === data?.nuevas === (i.kind === 'nueva'));
    return [...list, ...extra];
  };
  const nuevas = data ? merge(data.nuevas) : [];
  const reportadas = data ? merge(data.reportadas) : [];

  const onVote = (item: Item, choice: 'for' | 'against') =>
    vote.mutate({ vuelticaId: item.vuelticaId, choice }, { onSuccess: () => setVoted((s) => ({ ...s, [item.vuelticaId]: { item, choice } })) });
  const onUndo = (id: string) =>
    undo.mutate(id, {
      onSuccess: () => {
        setVoted(({ [id]: _removed, ...rest }) => rest);
        toast(t.moderation.voteUndone);
      },
    });
  const card = (i: Item) => (
    <ModerationCard key={i.vuelticaId} item={i} voted={voted[i.vuelticaId]?.choice ?? i.myVote} onVote={(ch) => onVote(i, ch)} onUndo={() => onUndo(i.vuelticaId)} onOpen={() => router.push({ pathname: '/vueltica/[id]', params: { id: i.vuelticaId } })} />
  );

  return (
    <ScrollView testID="mod.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ paddingBottom: 140, gap: 12, paddingTop: 8 }}>
      {rep.data ? <Text testID="mod.intro" variant="callout" color="labelSecondary" style={{ paddingHorizontal: 20 }}>{t.moderation.intro(rep.data.level.number, rep.data.level.name)}</Text> : null}
      {q.isPending ? <ListSkeleton count={2} /> : q.isError ? (
        <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void q.refetch()} full={false} /></EmptyState>
      ) : (
        <>
          <Text testID="mod.newHeader" variant="caption" color="labelSecondary" style={{ paddingHorizontal: 20, paddingTop: 8 }}>{t.moderation.newHeader(data!.nuevas.length)}</Text>
          {nuevas.length === 0 ? <EmptyState testID="mod.empty" icon="check" title={t.empty.moderation} body={t.empty.moderationBody} /> : nuevas.map(card)}
          <Text testID="mod.reportedHeader" variant="caption" color="labelSecondary" style={{ paddingHorizontal: 20, paddingTop: 12 }}>{t.moderation.reportedHeader(data!.reportadas.length)}</Text>
          {reportadas.map(card)}
          <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 20, paddingTop: 8 }}>{t.moderation.footer}</Text>
        </>
      )}
    </ScrollView>
  );
}
