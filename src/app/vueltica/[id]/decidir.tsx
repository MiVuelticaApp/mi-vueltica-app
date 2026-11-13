import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Group, SectionHeader } from '@/components/ui/Section';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { ConflictError, ValidationError } from '@/data/api';
import { useDecideSubmission, useVuelticaDetail } from '@/data/queries';
import { REJECTION_CODES, type RejectionCode } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { useIsOffline } from '@/state/network';
import { useAppTheme } from '@/theme/useAppTheme';

/**
 * Team decision on a suggestion (moderator / admin roles): publish it now, or reject it with one of the API's reason
 * codes (#40). The author sees the code's text, or the note for "Otro motivo".
 */
export default function Decidir() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const q = useVuelticaDetail(id);
  const decide = useDecideSubmission();
  const offline = useIsOffline();
  const [reason, setReason] = useState<RejectionCode | null>(null);
  const [note, setNote] = useState('');
  const needsNote = reason === 'otro' && !note.trim();

  const send = (decision: 'approve' | 'reject') =>
    decide.mutate(
      { vuelticaId: id, decision, reason: reason ?? undefined, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast(decision === 'approve' ? t.moderation.decide.approved : t.moderation.decide.rejected);
          if (router.canGoBack()) closeSheet();
        },
        onError: (e) => toast(e instanceof ConflictError ? t.moderation.undoDecided : e instanceof ValidationError && e.field === 'note' ? t.moderation.decide.needNote : t.moderation.decide.failed),
      },
    );

  return (
    <Sheet testID="decide.sheet" tall>
      <SheetHeader testID="decide.header" title={t.moderation.decide.title} subtitle={q.data?.vuelticaView.name} />
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
        <SectionHeader title={t.moderation.decide.reason} />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {REJECTION_CODES.map((r) => (
            <Chip key={r} option testID={`decide.reason.${r}`} label={t.moderation.decide.codes[r]} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
        <SectionHeader title={t.moderation.decide.note} />
        <Group>
          <View style={{ padding: 16 }}>
            <TextField testID="decide.note" accessibilityLabel={t.moderation.decide.note} value={note} onChangeText={setNote} placeholder={t.moderation.decide.notePlaceholder} multiline rows={3} maxLength={500} />
          </View>
        </Group>
        {needsNote ? <Text testID="decide.needNote" variant="caption" color="danger" style={{ paddingHorizontal: 32, paddingTop: 8 }}>{t.moderation.decide.needNote}</Text> : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
        <Button testID="decide.reject" label={t.moderation.decide.reject} variant="danger" onPress={() => send('reject')} disabled={!reason || needsNote || offline} loading={decide.isPending} />
        <Button testID="decide.approve" label={t.moderation.decide.approve} variant="outline" onPress={() => send('approve')} disabled={offline || decide.isPending} />
      </View>
    </Sheet>
  );
}
