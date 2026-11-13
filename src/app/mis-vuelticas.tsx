import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { MyVuelticaRow } from '@/features/contribute/MyVuelticaRow';
import { useMyVuelticas, useWithdraw } from '@/data/queries';
import { draftFromVueltica, isDirty, useDraft } from '@/state/draft';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Mis vuelticas: every submission with its status (FR-13.5); pending ones can be edited (`PUT /me/submissions/:id`) or withdrawn. */
export default function MisVuelticas() {
  const { c } = useAppTheme();
  const q = useMyVuelticas();
  const withdraw = useWithdraw();
  const onEdit = async (v: Parameters<typeof draftFromVueltica>[0]) => {
    const { draft, load } = useDraft.getState();
    // A new suggestion half written in Aportar would be replaced.
    if (!draft.editingId && isDirty(draft)) {
      const ok = await confirmDialog({ title: t.contribute.discardTitle, message: t.contribute.discardBody, confirmLabel: t.contribute.discard, cancelLabel: t.contribute.keepEditing, destructive: true });
      if (!ok) return;
    }
    load(draftFromVueltica(v));
    router.navigate('/aportar');
  };
  const onWithdraw = async (id: string) => {
    const ok = await confirmDialog({ title: t.mine.withdrawTitle, confirmLabel: t.mine.withdraw, destructive: true });
    if (ok) withdraw.mutate(id, { onSuccess: () => toast(t.mine.withdrawn) });
  };
  return (
    <View testID="mine.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.vuelticaView.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <MyVuelticaRow item={item} onEdit={() => void onEdit(item.vuelticaView)} onWithdraw={() => void onWithdraw(item.vuelticaView.id)} />}
        ListEmptyComponent={
          q.isPending ? <ListSkeleton count={3} /> : q.isError ? <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} onPress={() => void q.refetch()} full={false} /></EmptyState>
          : <EmptyState testID="mine.empty" icon="add" title={t.empty.myVuelticas} body={t.empty.myVuelticasBody}><Button label={t.empty.contribute} full={false} onPress={() => router.navigate('/aportar')} /></EmptyState>
        }
      />
    </View>
  );
}
