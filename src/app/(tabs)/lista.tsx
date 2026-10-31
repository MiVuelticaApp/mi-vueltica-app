import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { glassStyle } from '@/components/ui/glass';
import { TypeSegment } from '@/features/list/TypeSegment';
import { FilterChipsRow } from '@/features/map/FilterChipsRow';
import { ResultsList } from '@/features/list/ResultsList';
import { t } from '@/i18n/es-CR';
import { useFilters } from '@/state/filters';
import { useAppTheme } from '@/theme/useAppTheme';

/** 02 Lista (+ 18 Cargando skeleton ≥ 1 s every time the tab opens, 16 Sin resultados, 17 Sin conexión). */
export default function ListaScreen() {
  const { c, isAndroid } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [skeleton, setSkeleton] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setSkeleton(true);
      const tm = setTimeout(() => setSkeleton(false), 1000);
      return () => clearTimeout(tm);
    }, []),
  );
  useEffect(() => () => setSkeleton(true), []);
  return (
    <View testID="list.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top }}>
      <ResultsList
        kind="list"
        forceSkeleton={skeleton}
        caps
        header={
          <View style={{ gap: 12, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <Text variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 41 }}>{t.list.title}</Text>
              <IconButton testID="list.mapButton" icon="map" label={t.list.mapButton} onPress={() => router.navigate('/')} />
            </View>
            <Tap testID="list.search" label={t.map.searchPlaceholder} onPress={() => router.push('/buscar')} style={[{ marginHorizontal: 16, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }, glassStyle(c)]}>
              <Icon name="search" size={18} color="labelSecondary" />
              <Text variant="body" color="labelSecondary" system numberOfLines={1}>{t.map.searchPlaceholder}</Text>
              {isAndroid ? null : null}
            </Tap>
            <TypeSegment testID="list.segment" />
            <FilterChipsRow variant="list" />
          </View>
        }
      />
    </View>
  );
}
