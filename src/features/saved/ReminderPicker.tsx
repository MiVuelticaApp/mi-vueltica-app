import { Modal, View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n/es-CR';
import { useSettings } from '@/state/settings';
import { useAppTheme } from '@/theme/useAppTheme';

/** "Cambiar" for the saved-event reminder: 1, 2, 3 or 7 days before (applies to every saved event). */
export function ReminderPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useAppTheme();
  const offset = useSettings((s) => s.settings.reminderOffsetDays);
  const update = useSettings((s) => s.update);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View testID="reminder.dialog" style={{ width: '100%', maxWidth: 340, backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 4 }}>
          <Text variant="title" align="center" style={{ paddingBottom: 8 }}>{t.settings.reminderTitle}</Text>
          {t.settings.reminderOptions.map((d) => (
            <Tap key={d} testID={`reminder.option.${d}`} label={t.settings.reminderOption(d)} accessibilityState={{ selected: offset === d }} onPress={() => { update({ reminderOffsetDays: d }); onClose(); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <Text variant="body">{t.settings.reminderOption(d)}</Text>
              {offset === d ? <Icon name="check" size={20} color="primary" /> : null}
            </Tap>
          ))}
          <Button testID="reminder.close" label={t.common.cancel} variant="text" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
