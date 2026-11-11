import { Modal, View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { Button } from './Button';
import { Tap } from './Tap';
import { Text } from './Text';

/** Single-choice dialog (Precio máximo, App para cómo llegar, reminders). */
export function ChoiceDialog<T extends string | number>({ visible, title, options, value, onSelect, onClose, testID }: {
  visible: boolean; title: string; options: { value: T; label: string }[]; value: T; onSelect: (v: T) => void; onClose: () => void; testID: string;
}) {
  const { c } = useAppTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View testID={testID} accessibilityViewIsModal style={{ width: '100%', maxWidth: 340, backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 4 }}>
          <Text variant="title" align="center" style={{ paddingBottom: 8 }}>{title}</Text>
          {options.map((o) => (
            <Tap key={String(o.value)} testID={`${testID}.${o.value}`} label={o.label} accessibilityRole="radio" accessibilityState={{ selected: o.value === value }} onPress={() => { onSelect(o.value); onClose(); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <Text variant="body">{o.label}</Text>
              {o.value === value ? <Icon name="check" size={20} color="primary" /> : null}
            </Tap>
          ))}
          <Button testID={`${testID}.cancel`} label={t.common.cancel} variant="text" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
