import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { CONTACT_EMAIL, LEGAL_FINAL, PRIVACY_NOTICE, PRIVACY_VERSION, TERMS } from '@/config/legal';
import { LegalText } from '@/features/legal/LegalText';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';

/** Términos / Política de privacidad (texts in `config/legal.ts`; BORRADOR until `LEGAL_FINAL`). */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { c } = useAppTheme();
  const privacy = doc === 'privacidad';
  const title = privacy ? t.rules.privacy : t.rules.terms;
  return (
    <ScrollView testID="legal.screen" style={{ flex: 1, backgroundColor: c.groupedBackground }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
      <Stack.Screen options={{ title }} />
      {LEGAL_FINAL ? null : <Badge kind="stale" label={t.rules.draft} />}
      <Text variant="title" accessibilityRole="header">{title}</Text>
      <LegalText testID="legal.body" sections={privacy ? PRIVACY_NOTICE : TERMS} />
      <Text variant="caption" color="labelSecondary">{[privacy ? t.rules.version(PRIVACY_VERSION) : null, t.rules.contact(CONTACT_EMAIL)].filter(Boolean).join(' · ')}</Text>
      {LEGAL_FINAL ? null : <Text variant="caption" color="labelSecondary">{t.rules.draftNote}</Text>}
    </ScrollView>
  );
}
