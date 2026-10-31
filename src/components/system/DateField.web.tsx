import { createElement } from 'react';
import { useAppTheme } from '@/theme/useAppTheme';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  testID?: string;
  accessibilityLabel: string;
  minimumDate?: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Web (test target): native <input type=date|time>. */
export function DateField({ value, onChange, mode, testID, accessibilityLabel, minimumDate }: Props) {
  const { c, dark } = useAppTheme();
  const str = mode === 'date' ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return createElement('input', {
    type: mode,
    value: str,
    'data-testid': testID,
    'aria-label': accessibilityLabel,
    min: minimumDate && mode === 'date' ? `${minimumDate.getFullYear()}-${pad(minimumDate.getMonth() + 1)}-${pad(minimumDate.getDate())}` : undefined,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (!v) return;
      const d = new Date(value);
      if (mode === 'date') {
        const [y, m, dd] = v.split('-').map(Number);
        d.setFullYear(y, m - 1, dd);
      } else {
        const [h, mi] = v.split(':').map(Number);
        d.setHours(h, mi, 0, 0);
      }
      onChange(d);
    },
    style: { background: c.priceContainer, color: c.onSurface, border: 0, borderRadius: 8, padding: '8px 12px', fontSize: 15, colorScheme: dark ? 'dark' : 'light' },
  });
}
