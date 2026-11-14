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

export interface ChooseOptions<T extends string> {
  title: string;
  options: { value: T; label: string }[];
  testID?: string;
}

interface DialogState {
  open: (ConfirmOptions & { resolve: (v: boolean) => void }) | null;
  choice: (ChooseOptions<string> & { resolve: (v: string | null) => void }) | null;
  set: (o: DialogState['open']) => void;
  setChoice: (o: DialogState['choice']) => void;
}

const useDialog = create<DialogState>((set) => ({ open: null, choice: null, set: (open) => set({ open }), setChoice: (choice) => set({ choice }) }));

/** Pick one option (a themed modal on every platform: Android alerts take at most three buttons). Null when cancelled. */
export function chooseDialog<T extends string>(o: ChooseOptions<T>): Promise<T | null> {
  return new Promise((resolve) => useDialog.getState().setChoice({ ...o, resolve: resolve as (v: string | null) => void }));
}

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

function ChoiceHost() {
  const { c } = useAppTheme();
  const choice = useDialog((s) => s.choice);
  if (!choice) return null;
  const close = (v: string | null) => {
    choice.resolve(v);
    useDialog.getState().setChoice(null);
  };
  const id = choice.testID ?? 'choice';
  return (
    <Modal transparent animationType="fade" onRequestClose={() => close(null)} visible>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View testID={id} accessibilityViewIsModal style={{ width: '100%', maxWidth: 340, backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 8 }}>
          <Text variant="title" align="center" style={{ paddingBottom: 4 }}>{choice.title}</Text>
          {choice.options.map((o) => (
            <Button key={o.value} testID={`${id}.${o.value}`} label={o.label} variant="secondary" onPress={() => close(o.value)} />
          ))}
          <Button testID={`${id}.cancel`} label={t.common.cancel} variant="text" onPress={() => close(null)} />
        </View>
      </View>
    </Modal>
  );
}

export function DialogHost() {
  return (
    <>
      <ConfirmHost />
      <ChoiceHost />
    </>
  );
}

function ConfirmHost() {
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
