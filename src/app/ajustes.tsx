import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Modal, Platform, ScrollView, View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { Slider } from '@/components/system/Slider';
import { Switch } from '@/components/system/Switch';
import { Button } from '@/components/ui/Button';
import { ChoiceDialog } from '@/components/ui/ChoiceDialog';
import { confirmDialog } from '@/components/ui/Dialog';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { api } from '@/data';
import { useDeleteAccount, useSimulate } from '@/data/queries';
import type { MaxPrice, SettingsDirections } from '@/domain/types';
import { ReminderPicker } from '@/features/saved/ReminderPicker';
import { formatCRC } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import { ensureNotificationPermission } from '@/lib/notifications';
import { requestAndLocate } from '@/lib/location';
import { availableApps } from '@/lib/directions';
import { useNetwork } from '@/state/network';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';
import * as ClipboardApi from 'expo-clipboard';

const PRICE_LABEL: Record<MaxPrice, string> = { hasta5000: formatCRC(5000), hasta2500: formatCRC(2500), gratis: t.card.free };
const showDev = __DEV__ || process.env.EXPO_PUBLIC_E2E === '1';

/** 15 Ajustes: appearance, accessibility, notifications, preferences, privacy and account (FR-15.x). */
export default function Ajustes() {
  const { c, fontScale, dark } = useAppTheme();
  const s = useSettings((x) => x.settings);
  const update = useSettings((x) => x.update);
  const user = useSession((x) => x.user);
  const del = useDeleteAccount();
  const sim = useSimulate();
  const simulated = useNetwork((x) => x.simulatedOffline);
  const [dlg, setDlg] = useState<null | 'price' | 'directions' | 'reminder' | 'prompt' | 'export'>(null);
  const [exported, setExported] = useState<{ filename: string; content: string; uri?: string } | null>(null);
  const sysScale = 1;
  const scaleValue = s.textScale ?? Math.min(1.5, Math.max(0.85, fontScale || sysScale));

  const toggleReminders = async (v: boolean) => {
    if (v && Platform.OS !== 'web') {
      setDlg('prompt');
      return;
    }
    update({ notifyReminders: v });
  };
  const exportData = async () => {
    try {
      const data = await api.exportMyData();
      let uri: string | undefined;
      if (Platform.OS !== 'web') {
        const f = new File(Paths.cache, data.filename);
        f.create({ overwrite: true });
        await f.write(data.content);
        uri = f.uri;
      }
      setExported({ filename: data.filename, content: data.content, uri });
      setDlg('export');
    } catch {
      toast(t.common.errorBody);
    }
  };
  const shareExport = async () => {
    if (!exported) return;
    if (Platform.OS === 'web') {
      const blob = new Blob([exported.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exported.filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (exported.uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(exported.uri, { mimeType: 'application/json' });
    else await ClipboardApi.setStringAsync(exported.content);
  };
  const remove = async () => {
    const ok = await confirmDialog({ title: t.settings.deleteTitle, message: t.settings.deleteBody, confirmLabel: t.settings.deleteConfirm, destructive: true });
    if (ok) del.mutate(undefined, { onSuccess: () => { toast(t.settings.deleted); router.replace('/'); } });
  };
  const dirLabel = (d: SettingsDirections) => (d === 'preguntar' ? t.settings.ask : d === 'apple' ? t.directions.apple : d === 'waze' ? t.directions.waze : t.directions.google);

  return (
    <ScrollView testID="settings.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ paddingBottom: 140 }}>
      <SectionHeader title={t.settings.appearance} />
      <Group>
        <Row title={t.settings.dark} last right={<Switch testID="settings.dark" accessibilityLabel={t.settings.dark} value={dark} onValueChange={(v) => update({ darkMode: v ? 'on' : 'off' })} />} />
      </Group>

      <SectionHeader title={t.settings.accessibility} />
      <Group>
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body">{t.settings.textSize}</Text>
            <Text testID="settings.textSize.value" variant="body" color="labelSecondary">{s.textScale === null ? t.settings.followsSystem : `${Math.round(s.textScale * 100)} %`}</Text>
          </View>
          <Slider testID="settings.textSize" accessibilityLabel={t.settings.textSize} min={0.85} max={1.5} step={0.05} value={scaleValue} onValueChange={(v) => update({ textScale: Math.abs(v - (fontScale || 1)) < 0.02 && s.textScale === null ? null : Math.round(v * 100) / 100 })} />
        </View>
        <View style={{ height: 1, backgroundColor: c.separator, marginLeft: 16 }} />
        <Row title={t.settings.largerButtons} subtitle={t.settings.largerButtonsHint} right={<Switch testID="settings.largerButtons" accessibilityLabel={t.settings.largerButtons} value={s.largerButtons} onValueChange={(v) => update({ largerButtons: v })} />} />
        <Row title={t.settings.contrast} right={<Switch testID="settings.contrast" accessibilityLabel={t.settings.contrast} value={s.moreContrast} onValueChange={(v) => update({ moreContrast: v })} />} />
        <Row title={t.settings.reduceMotion} last right={<Switch testID="settings.reduceMotion" accessibilityLabel={t.settings.reduceMotion} value={s.reduceMotion} onValueChange={(v) => update({ reduceMotion: v })} />} />
      </Group>

      <SectionHeader title={t.settings.notifications} />
      <Group>
        <Row title={t.settings.reminders} right={<Switch testID="settings.reminders" accessibilityLabel={t.settings.reminders} value={s.notifyReminders} onValueChange={(v) => void toggleReminders(v)} />} />
        <Row testID="settings.reminderWhen" title={t.settings.reminderWhen} value={t.settings.reminderOption(s.reminderOffsetDays)} chevron onPress={() => setDlg('reminder')} />
        <Row title={t.settings.newNearby} subtitle={t.settings.newNearbyHint} right={<Switch testID="settings.newNearby" accessibilityLabel={t.settings.newNearby} value={s.notifyNewNearby} onValueChange={(v) => update({ notifyNewNearby: v })} />} />
        <Row title={t.settings.myStatus} last right={<Switch testID="settings.myStatus" accessibilityLabel={t.settings.myStatus} value={s.notifyMyStatus} onValueChange={(v) => update({ notifyMyStatus: v })} />} />
      </Group>

      <SectionHeader title={t.settings.preferences} />
      <Group>
        <Row testID="settings.maxPrice" title={t.settings.maxPrice} value={PRICE_LABEL[s.maxPrice]} chevron onPress={() => setDlg('price')} />
        <Row testID="settings.directionsApp" title={t.settings.directionsApp} value={dirLabel(s.directionsApp)} chevron last onPress={() => setDlg('directions')} />
      </Group>

      <SectionHeader title={t.settings.privacy} />
      <Group>
        <Row testID="settings.location" title={t.settings.location} value={s.locationPermission === 'granted' ? t.settings.whileUsing : s.locationPermission === 'denied' ? t.settings.denied : t.settings.whileUsing} chevron onPress={async () => { if (s.locationPermission !== 'granted') { const r = await requestAndLocate(); if (r === 'denied') void Linking.openSettings().catch(() => {}); } else void Linking.openSettings().catch(() => {}); }} />
        <Row testID="settings.export" title={t.settings.download} chevron last={!user} onPress={() => (user ? void exportData() : router.push({ pathname: '/login', params: { next: '/ajustes' } }))} />
      </Group>
      {user ? (
        <>
          <View style={{ height: 12 }} />
          <Group>
            <Row testID="settings.delete" title={t.settings.deleteAccount} destructive last onPress={() => void remove()} />
          </Group>
          <Text variant="caption" color="labelSecondary" style={{ paddingHorizontal: 32, paddingTop: 8, lineHeight: 18 }}>{t.settings.deleteFooter}</Text>
        </>
      ) : null}

      {showDev ? (
        <>
          <SectionHeader title={t.settings.dev} />
          <Group>
            <Row title={t.settings.simulateOffline} right={<Switch testID="settings.simulateOffline" accessibilityLabel={t.settings.simulateOffline} value={simulated} onValueChange={(v) => useNetwork.getState().setSimulated(v)} />} />
            <Row testID="settings.simulateCommunity" title={t.settings.simulateCommunity} last onPress={() => sim.mutate({ kind: 'votes', count: 1 }, { onSuccess: () => toast(t.settings.simulated) })} />
          </Group>
        </>
      ) : null}

      <ChoiceDialog testID="settings.priceDialog" visible={dlg === 'price'} title={t.settings.maxPrice} value={s.maxPrice} onClose={() => setDlg(null)} onSelect={(v) => update({ maxPrice: v })} options={[{ value: 'hasta5000', label: `${t.filters.upTo5000}` }, { value: 'hasta2500', label: t.filters.upTo2500 }, { value: 'gratis', label: t.filters.onlyFree }]} />
      <ChoiceDialog testID="settings.directionsDialog" visible={dlg === 'directions'} title={t.settings.directionsApp} value={s.directionsApp} onClose={() => setDlg(null)} onSelect={(v) => update({ directionsApp: v, rememberedDirections: null })} options={[{ value: 'preguntar' as SettingsDirections, label: t.settings.ask }, ...availableApps().map((a) => ({ value: a as SettingsDirections, label: dirLabel(a) }))]} />
      <ReminderPicker visible={dlg === 'reminder'} onClose={() => setDlg(null)} />

      <Modal transparent visible={dlg === 'prompt'} animationType="fade" onRequestClose={() => setDlg(null)}>
        <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View testID="settings.promptDialog" style={{ width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 24, gap: 12, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={30} color="onPrimaryContainer" /></View>
            <Text variant="title" align="center">{t.settings.promptHeadline}</Text>
            <Text variant="body" color="labelSecondary" align="center" style={{ lineHeight: 22 }}>{t.settings.promptBody}</Text>
            <Button testID="settings.promptAccept" label={t.settings.promptAccept} onPress={async () => { setDlg(null); const ok = await ensureNotificationPermission(); update({ notifyReminders: ok });
              if (!ok) toast(t.common.notifDenied); }} />
            <Button label={t.settings.promptLater} variant="text" onPress={() => setDlg(null)} />
          </View>
        </View>
      </Modal>
      <Modal transparent visible={dlg === 'export'} animationType="fade" onRequestClose={() => setDlg(null)}>
        <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View testID="settings.exportDialog" style={{ width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 24, gap: 12 }}>
            <Text variant="title" align="center">{t.settings.exportDone}</Text>
            <Text variant="body" color="labelSecondary" align="center">{t.settings.exportBody}</Text>
            <Text testID="settings.exportFile" variant="callout" align="center">{exported?.filename}</Text>
            <Button testID="settings.exportShare" label={t.settings.exportShare} icon="download" onPress={() => void shareExport()} />
            <Button testID="settings.exportClose" label={t.common.close} variant="text" onPress={() => setDlg(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
