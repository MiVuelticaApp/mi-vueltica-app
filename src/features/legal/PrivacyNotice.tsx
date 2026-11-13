import { router } from 'expo-router';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { LEGAL_FINAL, PRIVACY_NOTICE } from '@/config/legal';
import { t } from '@/i18n/es-CR';
import { useAppTheme } from '@/theme/useAppTheme';
import { LegalText } from './LegalText';

/**
 * Aviso de privacidad (Ley 8968 art. 5): what is stored, why, who sees it, who is responsible and how to revoke.
 * Shown before the first Google / Apple sign-in and again when the accepted version is outdated. Nothing is
 * recorded until "Acepto".
 */
export function PrivacyNotice({ visible, onAccept, onDecline, updated, busy }: { visible: boolean; onAccept: () => void; onDecline: () => void; updated?: boolean; busy?: boolean }) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDecline}>
      <View testID="privacy.notice" style={{ flex: 1, backgroundColor: c.groupedBackground, paddingTop: 16 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }}>
          {LEGAL_FINAL ? null : <Badge kind="stale" label={t.rules.draft} />}
          <Text testID="privacy.title" variant="title" accessibilityRole="header">{updated ? t.privacy.updatedTitle : t.privacy.title}</Text>
          <Text variant="callout" color="labelSecondary" style={{ lineHeight: 22 }}>{updated ? t.privacy.updatedIntro : t.privacy.intro}</Text>
          <LegalText sections={PRIVACY_NOTICE} />
          <Button testID="privacy.full" label={t.privacy.full} variant="text" full={false} style={{ alignSelf: 'flex-start' }} onPress={() => { onDecline(); router.push({ pathname: '/legal/[doc]', params: { doc: 'privacidad' } }); }} />
        </ScrollView>
        <View style={{ padding: 16, gap: 8, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: c.separator }}>
          <Button testID="privacy.accept" label={t.privacy.accept} onPress={onAccept} loading={busy} />
          <Button testID="privacy.decline" label={updated ? t.privacy.signOut : t.privacy.decline} variant="text" onPress={onDecline} />
        </View>
      </View>
    </Modal>
  );
}
