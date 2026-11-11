import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Términos / Política de privacidad: placeholder screens marked BORRADOR. */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { c } = useAppTheme();
  const title = doc === 'privacidad' ? t.rules.privacy : t.rules.terms;
  return (
    <ScrollView testID="legal.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title }} />
      <Badge kind="stale" label={t.rules.draft} />
      <Text variant="title">{title}</Text>
      <Text variant="body" style={{ lineHeight: 24 }}>{t.rules.draftNote}</Text>
    </ScrollView>
  );
}
