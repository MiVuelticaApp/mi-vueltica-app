import { FlatList, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Group, Row } from '@/components/ui/Section';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { NotSupportedError } from '@/data/api';
import { useBlocks, useUnblock } from '@/data/queries';
import { formatRelative } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { errorMessage } from '@/lib/errors';
import { useAppTheme } from '@/theme/useAppTheme';

/** Ajustes › Personas bloqueadas: names only, with "Desbloquear" (guideline 1.2). */
export default function Bloqueados() {
  const { c } = useAppTheme();
  const q = useBlocks();
  const unblock = useUnblock();
  return (
    <View testID="blocks.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
        renderItem={({ item, index }) => (
          <Group style={{ marginTop: index === 0 ? 0 : 12 }}>
            <Row
              testID={`blocks.row.${item.id}`}
              title={item.name}
              subtitle={t.blocks.since(formatRelative(item.blockedAt, now()))}
              last
              right={<Button testID={`blocks.unblock.${item.id}`} label={t.blocks.unblock} variant="outline" size="compact" full={false} accessibilityLabel={`${t.blocks.unblock} a ${item.name}`} onPress={() => unblock.mutate(item.id, { onSuccess: () => toast(t.blocks.unblocked(item.name)), onError: (e) => toast(errorMessage(e)) })} />}
            />
          </Group>
        )}
        ListEmptyComponent={
          q.isPending ? <ListSkeleton count={2} />
          : q.error instanceof NotSupportedError ? <EmptyState testID="blocks.unavailable" icon="alert" title={t.blocks.title} body={t.common.notSupported} />
          : q.isError ? <EmptyState icon="alert" title={t.common.errorTitle} body={t.common.errorBody}><Button label={t.common.retry} full={false} onPress={() => void q.refetch()} /></EmptyState>
          : <EmptyState testID="blocks.empty" icon="check" title={t.blocks.empty} body={t.blocks.emptyBody} />
        }
      />
    </View>
  );
}
