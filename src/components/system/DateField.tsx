import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { formatShortDate, formatTime } from '@/i18n/format';
import { useAppTheme } from '@/theme/useAppTheme';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  testID?: string;
  accessibilityLabel: string;
  minimumDate?: Date;
}

/** System date / time picker: compact SwiftUI-style picker on iOS, Material dialog on Android. */
export function DateField({ value, onChange, mode, testID, accessibilityLabel, minimumDate }: Props) {
  const { c, dark } = useAppTheme();
  if (Platform.OS === 'ios') {
    return (
      <View testID={testID} accessibilityLabel={accessibilityLabel}>
        <DateTimePicker value={value} mode={mode} display="compact" themeVariant={dark ? 'dark' : 'light'} minimumDate={minimumDate} locale="es-CR" onChange={(_, d) => d && onChange(d)} />
      </View>
    );
  }
  const open = () =>
    DateTimePickerAndroid.open({ value, mode, is24Hour: false, minimumDate, onChange: (e, d) => e.type === 'set' && d && onChange(d) });
  return (
    <Tap testID={testID} label={accessibilityLabel} onPress={open} style={{ backgroundColor: c.priceContainer, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text variant="body">{mode === 'date' ? `${formatShortDate(value)} ${value.getFullYear()}` : formatTime(value)}</Text>
    </Tap>
  );
}
