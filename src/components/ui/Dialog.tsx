import { Alert, Modal, Platform, View } from 'react-native';
import { create } from 'zustand';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogState {
  open: (ConfirmOptions & { resolve: (v: boolean) => void }) | null;
  set: (o: DialogState['open']) => void;
}

const useDialog = create<DialogState>((set) => ({ open: null, set: (open) => set({ open }) }));

/** Native alert on iOS/Android (system look); a themed modal on web. Resolves true when confirmed. */
export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  if (Platform.OS !== 'web') {
    return new Promise((resolve) => {
      Alert.alert(o.title, o.message, [
        { text: o.cancelLabel ?? t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: o.confirmLabel, style: o.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) });
    });
  }
  return new Promise((resolve) => useDialog.getState().set({ ...o, resolve }));
}

/** Info-only dialog with a single OK button. */
export function infoDialog(title: string, message: string, ok = t.common.ok): Promise<void> {
  return confirmDialog({ title, message, confirmLabel: ok, cancelLabel: undefined }).then(() => undefined);
}

export function DialogHost() {
  const { c } = useAppTheme();
  const open = useDialog((s) => s.open);
  if (!open) return null;
  const close = (v: boolean) => {
    open.resolve(v);
    useDialog.getState().set(null);
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={() => close(false)} visible>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View testID="dialog" accessibilityRole="alert" style={{ width: '100%', maxWidth: 340, backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 12 }}>
          <Text testID="dialog.title" variant="title" align="center">{open.title}</Text>
          {open.message ? <Text testID="dialog.message" variant="body" color="labelSecondary" align="center" style={{ lineHeight: 22 }}>{open.message}</Text> : null}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Button testID="dialog.confirm" label={open.confirmLabel} variant={open.destructive ? 'danger' : 'primary'} onPress={() => close(true)} />
            <Button testID="dialog.cancel" label={open.cancelLabel ?? t.common.cancel} variant="text" onPress={() => close(false)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
