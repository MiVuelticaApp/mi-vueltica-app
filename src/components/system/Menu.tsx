import { Host, Picker } from '@expo/ui';
import { useAppTheme } from '@/theme/useAppTheme';

/** System dropdown menu (SwiftUI Menu picker / Material dropdown) for the sort control. */
export function Menu<T extends string>({ options, value, onChange, testID, accessibilityLabel }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string; accessibilityLabel: string }) {
  const { dark, c } = useAppTheme();
  return (
    <Host matchContents colorScheme={dark ? 'dark' : 'light'} seedColor={c.primary} accessibilityLabel={accessibilityLabel}>
      <Picker selectedValue={value} onValueChange={onChange} testID={testID}>
        {options.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} />
        ))}
      </Picker>
    </Host>
  );
}
