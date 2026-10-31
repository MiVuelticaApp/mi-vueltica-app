import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ContributeForm } from '@/features/contribute/ContributeForm';
import { t } from '@/i18n/es-CR';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme/useAppTheme';

/** Aportar tab: the form when signed in, a sign-in prompt otherwise (FR-11 / accounts rule). */
export default function AportarScreen() {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.userLoaded);
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.groupedBackground }} />;
  if (!user) {
    return (
      <View testID="contribute.signedOut" style={{ flex: 1, backgroundColor: c.groupedBackground, justifyContent: 'center', paddingTop: insets.top }}>
        <EmptyState icon="add" title={t.contribute.title} body={t.login.gate.contribute}>
          <Button testID="contribute.signIn" label={t.profile.signIn} full={false} onPress={() => router.push({ pathname: '/login', params: { reason: 'contribute', next: '/aportar' } })} />
        </EmptyState>
      </View>
    );
  }
  return <ContributeForm />;
}
