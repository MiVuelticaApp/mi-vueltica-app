import { ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Normas de la comunidad: placeholder copy (BORRADOR), PDF open question 5. */
export default function Normas() {
  const { c } = useAppTheme();
  return (
    <ScrollView testID="rules.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
      <Badge kind="stale" label={t.rules.draft} />
      {t.rules.body.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          <Text variant="body" color="primary">{`${i + 1}.`}</Text>
          <Text variant="body" style={{ flex: 1, lineHeight: 24 }}>{p}</Text>
        </View>
      ))}
      <Text variant="caption" color="labelSecondary">{t.rules.draftNote}</Text>
    </ScrollView>
  );
}
