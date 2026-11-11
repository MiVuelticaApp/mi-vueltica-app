import { View } from 'react-native';
import { useAppTheme } from '@/theme/useAppTheme';
import { Icon } from '@/components/icons/Icon';
import { Tap } from './Tap';
import { Text } from './Text';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
  /** testID per option = `${testID}.${value}` */
}

/** Segmented control (iOS capsule / Material outlined with check on Android). */
export function Segmented<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { c, isAndroid, largerButtons } = useAppTheme();
  const h = largerButtons ? 48 : 40;
  if (isAndroid) {
    return (
      <View testID={testID} accessibilityRole="tablist" style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.lineStrong, borderRadius: 22, overflow: 'hidden', height: h }}>
        {options.map((o, i) => {
          const sel = o.value === value;
          return (
            <Tap
              key={o.value}
              testID={testID ? `${testID}.${o.value}` : undefined}
              label={o.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: sel }}
              onPress={() => onChange(o.value)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: sel ? c.primaryContainer : undefined, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: c.lineStrong }}
            >
              {sel ? <Icon name="check" size={16} color="onPrimaryContainer" /> : null}
              <Text variant="callout" bold color={sel ? 'onPrimaryContainer' : 'onSurface'}>{o.label}</Text>
            </Tap>
          );
        })}
      </View>
    );
  }
  return (
    <View testID={testID} accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.fillTertiary, borderRadius: 20, padding: 2, height: h }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Tap
            key={o.value}
            testID={testID ? `${testID}.${o.value}` : undefined}
            label={o.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o.value)}
            style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }, sel ? { backgroundColor: c.segmentThumb, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } : null]}
          >
            <Text variant="callout" bold={sel} color="onSurface">{o.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}
