import { View } from 'react-native';
import { Segmented } from '@/components/ui/Segmented';
import { t } from '@/i18n/es-CR';
import { useFilters } from '@/state/filters';

export function TypeSegment({ testID }: { testID: string }) {
  const { filters, set } = useFilters();
  const value = filters.types.length === 2 ? 'todo' : filters.types[0] === 'lugar' ? 'lugares' : 'eventos';
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Segmented
        testID={testID}
        value={value}
        onChange={(v) => set({ types: v === 'todo' ? ['lugar', 'evento'] : v === 'lugares' ? ['lugar'] : ['evento'] })}
        options={[{ value: 'todo', label: t.list.all }, { value: 'lugares', label: t.list.places }, { value: 'eventos', label: t.list.events }]}
      />
    </View>
  );
}
