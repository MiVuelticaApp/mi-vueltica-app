import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { activeFilterCount } from '@/domain/filters';
import { t } from '@/i18n/es-CR';
import { useFilters } from '@/state/filters';

/** Quick chips: Filtros · N, Lugares, Eventos (map) / Cerca de mí (list), Solo gratis, Estudiantes, Ciudadanos de oro. */
export function FilterChipsRow({ variant }: { variant: 'map' | 'list' }) {
  const { filters, set, toggleType } = useFilters();
  const n = activeFilterCount(filters);
  const glass = variant === 'map';
  const id = (k: string) => `${variant}.chip.${k}`;
  const both = filters.types.length === 2;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} testID={`${variant}.chips`} keyboardShouldPersistTaps="handled">
      <Chip testID={id('filters')} icon="filter" glass={glass} selected={n > 0 && variant === 'map'} label={n > 0 ? t.map.filtersN(n) : t.map.filters} onPress={() => router.push('/filtros')} />
      {variant === 'map' ? (
        <>
          <Chip testID={id('places')} icon="bench" glass label={t.map.places} selected={filters.types.includes('lugar')} accessibilityLabel={both ? t.map.places : `${t.map.places}`} onPress={() => toggleType('lugar')} />
          <Chip testID={id('events')} icon="ticket" glass label={t.map.events} selected={filters.types.includes('evento')} onPress={() => toggleType('evento')} />
        </>
      ) : (
        <Chip testID={id('nearMe')} icon="locate" label={t.map.nearMe} selected={filters.nearMe} onPress={() => set({ nearMe: !filters.nearMe })} />
      )}
      <Chip testID={id('free')} glass={glass} label={t.map.onlyFree} selected={filters.maxPrice === 'gratis'} onPress={() => set({ maxPrice: filters.maxPrice === 'gratis' ? 'hasta5000' : 'gratis' })} />
      <Chip testID={id('students')} glass={glass} icon="school" label={t.map.students} selected={filters.students} onPress={() => set({ students: !filters.students })} />
      <Chip testID={id('seniors')} glass={glass} icon="medal" label={t.map.seniors} selected={filters.seniors} onPress={() => set({ seniors: !filters.seniors })} />
    </ScrollView>
  );
}
