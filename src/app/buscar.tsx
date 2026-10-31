import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { glassStyle } from '@/components/ui/glass';
import { FilterChipsRow } from '@/features/map/FilterChipsRow';
import { ResultsList } from '@/features/list/ResultsList';
import { TypeSegment } from '@/features/list/TypeSegment';
import { t } from '@/i18n/es-CR';
import { textStyle } from '@/theme/typography';
import { useAppTheme } from '@/theme/useAppTheme';

/** 19 Resultados de búsqueda: opens from the search field; same filters; Cancelar (iOS) / back arrow (Android). */
export default function Buscar() {
  const { c, isAndroid, fontScale } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View testID="search.screen" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: insets.top }}>
      <ResultsList
        kind="search"
        text={text}
        idle={text.trim().length === 0}
        header={
          <View style={{ gap: 12, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
              {isAndroid ? <IconButton testID="search.back" icon="arrowLeft" label={t.search.back} onPress={close} glass={false} /> : null}
              <View style={[{ flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }, glassStyle(c)]}>
                <Icon name="search" size={18} color="labelSecondary" />
                <TextInput
                  testID="search.input"
                  accessibilityLabel={t.map.searchPlaceholder}
                  value={text}
                  onChangeText={setText}
                  autoFocus
                  placeholder={t.map.searchPlaceholder}
                  placeholderTextColor={c.labelSecondary}
                  returnKeyType="search"
                  allowFontScaling={false}
                  style={[textStyle('body', fontScale), { flex: 1, color: c.onSurface, outlineStyle: 'none', paddingVertical: 0 } as object]}
                />
                {text ? (
                  <Tap testID="search.clear" label={t.search.clearText} onPress={() => setText('')} hitSlop={8}>
                    <Icon name="close" size={18} color="labelSecondary" />
                  </Tap>
                ) : null}
              </View>
              {!isAndroid ? (
                <Tap testID="search.cancel" label={t.search.cancel} onPress={close} hitSlop={8}>
                  <Text variant="body" color="primary" system>{t.search.cancel}</Text>
                </Tap>
              ) : null}
            </View>
            <TypeSegment testID="search.segment" />
            <FilterChipsRow variant="list" />
          </View>
        }
      />
    </View>
  );
}
