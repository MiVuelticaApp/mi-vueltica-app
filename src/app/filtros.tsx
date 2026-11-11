import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '@/components/system/DateField';
import { Slider } from '@/components/system/Slider';
import { Switch } from '@/components/system/Switch';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Group, Row, SectionHeader } from '@/components/ui/Section';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet, SheetHeader, closeSheet } from '@/components/ui/Sheet';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/icons/Icon';
import { useVuelticas } from '@/data/queries';
import { DEFAULT_FILTERS, MAX_DISTANCE_KM } from '@/domain/filters';
import type { Filters, MaxPrice, VuelticaType } from '@/domain/types';
import { t } from '@/i18n/es-CR';
import { now } from '@/lib/clock';
import { useFilters } from '@/state/filters';
import { useAppTheme } from '@/theme/useAppTheme';

type DateMode = 'any' | 'hoy' | 'finDeSemana' | 'range';

/** 04 Filtros sheet. Edits a draft; "Mostrar N resultados" applies it and returns to the map (FR-6.2). */
export default function Filtros() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const store = useFilters();
  const [draft, setDraft] = useState<Filters>(store.filters);
  const q = useVuelticas({ ...draft, nearMe: true });
  const count = q.data?.count;
  const patch = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));
  const toggleType = (tp: VuelticaType) => {
    const has = draft.types.includes(tp);
    const next = has ? draft.types.filter((x) => x !== tp) : [...draft.types, tp];
    patch({ types: next.length === 0 ? ['lugar', 'evento'] : next });
  };
  const dateMode: DateMode = typeof draft.date === 'object' ? 'range' : draft.date;
  const range = typeof draft.date === 'object' ? draft.date : null;
  const setDateMode = (m: DateMode) => {
    if (m === 'range') patch({ date: { from: now().toISOString(), to: now().toISOString() } });
    else patch({ date: m });
  };
  const apply = () => {
    store.set({ ...draft, nearMe: true });
    router.dismissTo('/');
  };
  return (
    <Sheet testID="filters.sheet" tall>
      <SheetHeader
        testID="filters.header"
        title={t.filters.title}
        right={
          <Tap testID="filters.clear" label={t.filters.clear} onPress={() => setDraft({ ...DEFAULT_FILTERS })} hitSlop={8} style={{ minWidth: 56, alignItems: 'flex-end' }}>
            <Text variant="body" color="primary" system>{t.filters.clear}</Text>
          </Tap>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <SectionHeader title={t.filters.sectionShow} />
        <Group>
          <Row testID="filters.type.lugar" icon="bench" iconBg="place" title={t.filters.places} onPress={() => toggleType('lugar')} accessibilityLabel={t.filters.places} right={draft.types.includes('lugar') ? <Icon name="check" size={20} color="primary" /> : null} />
          <Row testID="filters.type.evento" icon="ticket" iconBg="event" title={t.filters.events} onPress={() => toggleType('evento')} accessibilityLabel={t.filters.events} right={draft.types.includes('evento') ? <Icon name="check" size={20} color="primary" /> : null} last />
        </Group>

        <SectionHeader title={t.filters.priceHeader} />
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented<MaxPrice>
            testID="filters.price"
            value={draft.maxPrice}
            onChange={(v) => patch({ maxPrice: v })}
            options={[{ value: 'hasta5000', label: t.filters.upTo5000 }, { value: 'hasta2500', label: t.filters.upTo2500 }, { value: 'gratis', label: t.filters.onlyFree }]}
          />
        </View>

        <SectionHeader title={t.filters.benefits} />
        <Group>
          <Row icon="school" iconBg="student" title={t.filters.students} subtitle={t.filters.studentsHint} right={<Switch testID="filters.students" accessibilityLabel={t.filters.students} value={draft.students} onValueChange={(v) => patch({ students: v })} />} />
          <Row icon="medal" iconBg="senior" title={t.filters.seniors} subtitle={t.filters.seniorsHint} right={<Switch testID="filters.seniors" accessibilityLabel={t.filters.seniors} value={draft.seniors} onValueChange={(v) => patch({ seniors: v })} />} />
          <Row icon="people" iconBg="primary" title={t.filters.families} subtitle={t.filters.familiesHint} right={<Switch testID="filters.families" accessibilityLabel={t.filters.families} value={draft.families} onValueChange={(v) => patch({ families: v })} />} last />
        </Group>

        <SectionHeader title={t.filters.distance} />
        <Group>
          <View style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body">{t.filters.upTo}</Text>
              <Text testID="filters.distance.value" variant="body" bold color="primary">{`${String(draft.distanceKm).replace('.', ',')} km`}</Text>
            </View>
            <Slider testID="filters.distance" accessibilityLabel={t.filters.distance} value={draft.distanceKm} min={0.5} max={MAX_DISTANCE_KM} step={0.5} onValueChange={(v) => patch({ distanceKm: v })} />
          </View>
        </Group>

        <SectionHeader title={t.filters.when} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          <Chip option testID="filters.date.any" label={t.filters.anyDay} selected={dateMode === 'any'} onPress={() => setDateMode('any')} />
          <Chip option testID="filters.date.hoy" label={t.filters.today} selected={dateMode === 'hoy'} onPress={() => setDateMode('hoy')} />
          <Chip option testID="filters.date.weekend" label={t.filters.weekend} selected={dateMode === 'finDeSemana'} onPress={() => setDateMode('finDeSemana')} />
          <Chip option testID="filters.date.range" label={t.filters.pickDates} selected={dateMode === 'range'} onPress={() => setDateMode('range')} />
        </View>
        {range ? (
          <View style={{ marginTop: 12 }}>
            <Group>
              <Row title={t.filters.from} right={<DateField testID="filters.date.from" mode="date" accessibilityLabel={t.filters.from} value={new Date(range.from)} onChange={(d) => patch({ date: { from: d.toISOString(), to: new Date(range.to) < d ? d.toISOString() : range.to } })} />} />
              <Row title={t.filters.to} last right={<DateField testID="filters.date.to" mode="date" accessibilityLabel={t.filters.to} value={new Date(range.to)} minimumDate={new Date(range.from)} onChange={(d) => patch({ date: { from: range.from, to: d.toISOString() } })} />} />
            </Group>
          </View>
        ) : null}

        <SectionHeader title={t.filters.accessibility} />
        <Group>
          <Row icon="wheelchair" iconBg="primary" title={t.filters.wheelchair} subtitle={t.filters.wheelchairHint} last right={<Switch testID="filters.wheelchair" accessibilityLabel={t.filters.wheelchair} value={draft.wheelchair} onValueChange={(v) => patch({ wheelchair: v })} />} />
        </Group>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.groupedBackground }}>
        <Button testID="filters.apply" label={count === undefined ? t.common.loading : t.filters.show(count)} onPress={apply} />
      </View>
    </Sheet>
  );
}
void closeSheet;
