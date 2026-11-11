import { Checkbox as UICheckbox, Host } from '@expo/ui';
import { useAppTheme } from '@/theme/useAppTheme';

export function Checkbox({ value, onValueChange, testID, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; testID?: string; accessibilityLabel: string }) {
  const { dark, c } = useAppTheme();
  return (
    <Host matchContents colorScheme={dark ? 'dark' : 'light'} seedColor={c.primary} accessibilityLabel={accessibilityLabel}>
      <UICheckbox value={value} onValueChange={onValueChange} testID={testID} />
    </Host>
  );
}
