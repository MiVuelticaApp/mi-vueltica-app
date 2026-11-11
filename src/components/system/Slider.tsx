import { Host, Slider as UISlider } from '@expo/ui';
import { useAppTheme } from '@/theme/useAppTheme';

export function Slider({ value, onValueChange, min, max, step, testID, accessibilityLabel, onSlidingComplete }: {
  value: number; onValueChange: (v: number) => void; min: number; max: number; step?: number; testID?: string; accessibilityLabel: string; onSlidingComplete?: (v: number) => void;
}) {
  const { dark, c } = useAppTheme();
  void onSlidingComplete;
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }} colorScheme={dark ? 'dark' : 'light'} seedColor={c.primary} accessibilityLabel={accessibilityLabel}>
      <UISlider value={value} onValueChange={onValueChange} min={min} max={max} step={step} testID={testID} />
    </Host>
  );
}
