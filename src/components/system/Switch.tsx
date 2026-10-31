import { Host, Switch as UISwitch } from '@expo/ui';
import { useAppTheme } from '@/theme/useAppTheme';

/** System switch (SwiftUI Toggle on iOS, Material 3 Switch on Android) via the universal @expo/ui component. */
export function Switch({ value, onValueChange, testID, accessibilityLabel, disabled }: { value: boolean; onValueChange: (v: boolean) => void; testID?: string; accessibilityLabel: string; disabled?: boolean }) {
  const { dark, c } = useAppTheme();
  return (
    <Host matchContents colorScheme={dark ? 'dark' : 'light'} seedColor={c.primary} accessible accessibilityLabel={accessibilityLabel} accessibilityRole="switch" accessibilityState={{ checked: value, disabled }}>
      <UISwitch value={value} onValueChange={onValueChange} disabled={disabled} testID={testID} />
    </Host>
  );
}
