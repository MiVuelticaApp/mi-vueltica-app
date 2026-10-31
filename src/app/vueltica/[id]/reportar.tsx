import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { TextField } from '@/components/system/TextField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Group, SectionHeader } from '@/components/ui/Section';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useReport, useVuelticaDetail } from '@/data/queries';
import { DuplicateReportError } from '@/data/api';
import type { ReportReason } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { pickPhotos } from '@/lib/photos';
import { useAppTheme } from '@/theme/useAppTheme';

const REASONS: ReportReason[] = ['cerro', 'noGratis', 'masDe5000', 'horario', 'inapropiado', 'spam', 'otro'];

/** 09b Reportar vueltica (FR-9.2): one reason, optional text and photo; anonymous; sending closes the sheet. */
export default function Reportar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const q = useVuelticaDetail(id);
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const send = () => {
    if (!reason) return;
    report.mutate(
      { vuelticaId: id, reason, details: details.trim() || undefined, photo: photo ?? undefined },
      {
        onSuccess: () => {
          toast(t.report.sent);
          closeSheet();
        },
        onError: (e) => {
          toast(e instanceof DuplicateReportError ? t.report.dupe : t.common.errorBody);
          if (e instanceof DuplicateReportError) closeSheet();
        },
      },
    );
  };
  return (
    <Sheet testID="report.sheet" tall>
      <SheetHeader testID="report.header" title={t.report.title} subtitle={q.data?.vuelticaView.name} right={!isAndroid ? <IconButton testID="report.send" icon="check" label={t.common.send} prominent onPress={send} disabled={!reason || report.isPending} /> : undefined} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <SectionHeader title={t.report.whatsUp} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {REASONS.map((r) => (
            <Chip key={r} option testID={`report.reason.${r}`} label={t.report.reasons[r]} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
        <SectionHeader title={t.report.tellUs} />
        <Group>
          <View style={{ padding: 16 }}>
            <TextField testID="report.details" accessibilityLabel={t.report.tellUs} value={details} onChangeText={setDetails} placeholder={t.report.placeholder} multiline rows={3} />
          </View>
        </Group>
        <View style={{ marginTop: 12 }}>
          <Group>
            <Tap testID="report.photo" label={t.report.photo} onPress={async () => { const [p] = await pickPhotos(1); if (p) setPhoto(p); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <Icon name="camera" size={22} color="primary" />
              <View style={{ flex: 1 }}>
                <Text variant="body" color="primary">{t.report.photo}</Text>
                <Text variant="caption" color="labelSecondary">{photo ? '1 foto agregada' : t.report.photoHint}</Text>
              </View>
            </Tap>
          </Group>
        </View>
        <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 12, lineHeight: 18 }}>{t.report.footer}</Text>
      </ScrollView>
      {isAndroid ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.groupedBackground }}>
          <Button testID="report.send" label={t.common.send} onPress={send} disabled={!reason} loading={report.isPending} />
        </View>
      ) : null}
    </Sheet>
  );
}
