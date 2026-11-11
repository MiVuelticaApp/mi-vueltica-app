import { View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { t } from '@/i18n/es-CR';
import { Tap } from './Tap';
import { Text } from './Text';

const GOLD = '#f5a623';

export function Stars({ value, size = 14, testID }: { value: number; size?: number; testID?: string }) {
  return (
    <View testID={testID} accessibilityLabel={`${value} de 5`} accessible style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={i <= Math.round(value) ? 'star' : 'starOutline'} size={size} color={i <= Math.round(value) ? GOLD : 'labelTertiary'} />
      ))}
    </View>
  );
}

/** Interactive 1–5 star input with the label under it ("Muy bueno"). */
export function StarInput({ value, onChange, size = 36, testID, showLabel }: { value: number; onChange: (n: number) => void; size?: number; testID?: string; showLabel?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View testID={testID} accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Tap key={i} testID={testID ? `${testID}.${i}` : undefined} label={t.reviews.star(i)} accessibilityRole="radio" accessibilityState={{ selected: value === i }} onPress={() => onChange(i)} hitSlop={4}>
            <Icon name={i <= value ? 'star' : 'starOutline'} size={size} color={i <= value ? GOLD : 'labelTertiary'} />
          </Tap>
        ))}
      </View>
      {showLabel && value > 0 ? <Text variant="callout" bold color="primary">{t.reviews.starLabels[value - 1]}</Text> : null}
    </View>
  );
}

export function RatingInline({ avg, testID }: { avg: number; testID?: string }) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name="star" size={14} color={GOLD} />
      <Text variant="label" color="onSurface">{avg.toFixed(1).replace('.', ',')}</Text>
    </View>
  );
}
